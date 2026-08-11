import { battles, ensureUsers, sessions, users } from './db.js'
import { settleBattle } from './elo.js'

/** Тулааны үргэлжлэх хугацаа. */
export const BATTLE_MS = 60_000
/** Хоёр тал бэлдэх завсар — хос олдоод шууд эхэлбэл нэг тал хоцорно. */
export const COUNTDOWN_MS = 5_000
/** Нэг тулаанд хүлээн зөвшөөрөх дээд тоо — утгагүй өгөгдлөөс хамгаална. */
const MAX_REPS = 200

/**
 * Тулааныг үүсгэнэ. Хоёр тал зэрэг дуудна тул давхардлыг Mongo дээр таслана —
 * _id нь roomId учраас хоёр дахь оролдлого унана, тэгвэл байгааг нь буцаана.
 *
 * Цагийг СЕРВЕР тавина. Клиент тавьбал хэн ч өөртөө илүү хугацаа өгнө.
 */
export async function createBattle(roomId, playerIds) {
  const ids = [...new Set(playerIds)].sort()
  if (ids.length !== 2) throw new Error('тулаанд яг хоёр тоглогч байх ёстой')

  const existing = await battles().findOne({ _id: roomId })
  if (existing) return existing

  await ensureUsers(ids)
  // Нэр, зураг, эхлэх рейтингийг тулаан дээр тогтооно — дэлгэц дээр харуулахад
  // өрсөлдөгч тус бүрийн профайлыг дахин татах шаардлагагүй болно.
  const docs = await users().find({ _id: { $in: ids } }).toArray()
  const profiles = Object.fromEntries(
    docs.map((u) => [u._id, { name: u.name, avatar: u.avatar ?? null, rating: u.rating }]),
  )

  const startsAt = new Date(Date.now() + COUNTDOWN_MS)
  const battle = {
    _id: roomId,
    players: ids,
    profiles,
    reps: { [ids[0]]: 0, [ids[1]]: 0 },
    startsAt,
    endsAt: new Date(startsAt.getTime() + BATTLE_MS),
    status: 'playing',
    winnerId: null,
    createdAt: new Date(),
  }

  try {
    await battles().insertOne(battle)
    return battle
  } catch (err) {
    if (err?.code === 11000) return battles().findOne({ _id: roomId })
    throw err
  }
}

/**
 * Нэг rep нэмнэ. Цонхны гадна ирсэн rep-ийг хаяна — тулаан дуусмагц
 * хожигдсон тал нэмж илгээгээд хожихоос сэргийлнэ.
 */
export async function addRep(roomId, userId, count = 1) {
  const now = new Date()
  const n = Math.max(1, Math.min(Math.round(count) || 1, 5))
  return battles().findOneAndUpdate(
    {
      _id: roomId,
      status: 'playing',
      players: userId,
      startsAt: { $lte: now },
      endsAt: { $gt: now },
      [`reps.${userId}`]: { $lt: MAX_REPS },
    },
    { $inc: { [`reps.${userId}`]: n } },
    { returnDocument: 'after' },
  )
}

/**
 * Хугацаа дууссан тулааныг хаана. Рейтингийг ЭНД л бичнэ — гаднаас
 * "би хожсон" гэж дуудах endpoint байхгүй.
 *
 * status-ыг нөхцөлт байдлаар сольж эзэмшлээ авна: хоёр процесс зэрэг
 * дуудсан ч зөвхөн нэг нь ELO бичнэ.
 */
export async function settleIfDue(roomId) {
  const claimed = await battles().findOneAndUpdate(
    { _id: roomId, status: 'playing', endsAt: { $lte: new Date() } },
    { $set: { status: 'settling' } },
    { returnDocument: 'after' },
  )
  if (!claimed) return null

  const [aId, bId] = claimed.players
  const aReps = claimed.reps[aId] ?? 0
  const bReps = claimed.reps[bId] ?? 0
  const winnerId = aReps === bReps ? null : aReps > bReps ? aId : bId

  const [a, b] = await Promise.all([users().findOne({ _id: aId }), users().findOne({ _id: bId })])
  const ratings = settleBattle({
    a: { userId: aId, rating: a.rating, battles: a.battles },
    b: { userId: bId, rating: b.rating, battles: b.battles },
    winnerId,
  })

  // Тулаанд хийсэн push-up нь нийт дүнд бас нэмэгдэнэ.
  const bump = (id, reps) => ({
    $set: { rating: ratings[id].after },
    $inc: {
      totalReps: reps,
      battles: 1,
      wins: winnerId === id ? 1 : 0,
      losses: winnerId !== null && winnerId !== id ? 1 : 0,
      draws: winnerId === null ? 1 : 0,
    },
    $max: { bestSet: reps },
  })

  await Promise.all([
    users().updateOne({ _id: aId }, bump(aId, aReps)),
    users().updateOne({ _id: bId }, bump(bId, bReps)),
  ])
  await sessions().insertMany(
    [
      { userId: aId, reps: aReps, seconds: BATTLE_MS / 1000, mode: 'battle', roomId, finishedAt: new Date() },
      { userId: bId, reps: bReps, seconds: BATTLE_MS / 1000, mode: 'battle', roomId, finishedAt: new Date() },
    ].filter((s) => s.reps > 0),
  )

  return battles().findOneAndUpdate(
    { _id: roomId },
    { $set: { status: 'finished', winnerId, ratings, finishedAt: new Date() } },
    { returnDocument: 'after' },
  )
}

/** Клиент рүү явуулах хэлбэр — өөрийг нь `you` талд тавина. */
export function view(battle, userId) {
  const opponentId = battle.players.find((id) => id !== userId) ?? null
  const side = (id) => ({
    userId: id,
    reps: battle.reps[id] ?? 0,
    ...(battle.profiles?.[id] ?? { name: id, avatar: null, rating: null }),
  })
  return {
    roomId: battle._id,
    status: battle.status === 'settling' ? 'playing' : battle.status,
    startsAt: battle.startsAt,
    endsAt: battle.endsAt,
    you: side(userId),
    opponent: opponentId ? side(opponentId) : null,
    winnerId: battle.winnerId ?? null,
    ratings: battle.ratings ?? null,
  }
}
