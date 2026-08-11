import { battles, ensureUsers, sessions, users } from './db.js'
import { settleBattle } from './elo.js'

/** Тулааны үргэлжлэх хугацаа. */
export const BATTLE_MS = 30_000
/** Хоёулаа орсны дараах бэлдэх завсар. */
export const COUNTDOWN_MS = 5_000
/** Өрсөлдөгчийг ийм хугацаанд хүлээнэ, ирэхгүй бол тулаан цуцлагдана. */
export const WAIT_MS = 45_000
/** Нэг тулаанд хүлээн зөвшөөрөх дээд тоо — утгагүй өгөгдлөөс хамгаална. */
export const MAX_REPS = 200

/**
 * Тулааныг үүсгэнэ. Хоёр тал зэрэг дуудна тул давхардлыг Mongo дээр таслана —
 * _id нь roomId учраас хоёр дахь оролдлого унана, тэгвэл байгааг нь буцаана.
 *
 * Цаг ЭНД тавигдахгүй: камер, модель ачаалах хугацаа хүн бүрд өөр тул үүсгэх
 * агшнаас тоолж эхэлбэл удаан ачаалсан хүн секунд алдана. Хоёулаа орсны
 * дараа `start()` цагийг тавина.
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

  const battle = {
    _id: roomId,
    players: ids,
    profiles,
    reps: { [ids[0]]: 0, [ids[1]]: 0 },
    startsAt: null,
    endsAt: null,
    status: 'waiting',
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
 * Хоёулаа орсны дараа цагийг тавина. Нөхцөлт шинэчлэлт тул хоёр тал зэрэг
 * дуудсан ч цаг ЗӨВХӨН НЭГ УДАА тавигдана — эс тэгвээс хоёр тал өөр өөр
 * эцсийн хугацаа хараад маргаан үүснэ.
 */
export async function start(roomId) {
  const startsAt = new Date(Date.now() + COUNTDOWN_MS)
  return battles().findOneAndUpdate(
    { _id: roomId, status: 'waiting' },
    {
      $set: {
        status: 'playing',
        startsAt,
        endsAt: new Date(startsAt.getTime() + BATTLE_MS),
      },
    },
    { returnDocument: 'after' },
  )
}

/** Өрсөлдөгч ирээгүй тулааныг цуцална. Рейтинг хөдлөхгүй. */
export async function cancelIfStale(roomId) {
  return battles().findOneAndUpdate(
    { _id: roomId, status: 'waiting', createdAt: { $lte: new Date(Date.now() - WAIT_MS) } },
    { $set: { status: 'cancelled', finishedAt: new Date() } },
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
  const rows = [
    { userId: aId, reps: aReps },
    { userId: bId, reps: bReps },
  ]
    .filter((s) => s.reps > 0)
    .map((s) => ({ ...s, seconds: BATTLE_MS / 1000, mode: 'battle', roomId, finishedAt: new Date() }))
  if (rows.length) await sessions().insertMany(rows)

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
    // Серверийн цаг. Утаснуудын цаг хоорондоо зөрдөг тул клиент зөрүүг нь
    // тооцоолж байж хоёр тал ижил секунд харна.
    now: new Date(),
    you: side(userId),
    opponent: opponentId ? side(opponentId) : null,
    winnerId: battle.winnerId ?? null,
    ratings: battle.ratings ?? null,
  }
}
