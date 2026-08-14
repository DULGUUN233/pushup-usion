import { battles, ensureUsers, invites, sessions, users } from './db.js'
import { settleBattle } from './elo.js'

/** Тулааны үргэлжлэх хугацаа. */
export const BATTLE_MS = 30_000
/** Combined battle-ийн хоёр round-ийн хоорондох амралт. */
export const INTERMISSION_MS = 10_000
/** Хоёулаа камераа бэлдсэний дараах тоолол. */
export const COUNTDOWN_MS = 5_000
/**
 * Хүлээлгийн өрөөнд өрсөлдөгчийг хүлээх хугацаа.
 *
 * Найз мэдэгдлээ хараад аппаа нээх, эхний удаа камерын зөвшөөрөл өгөх нь
 * минут авч болно. Богино байвал бэлдэж амжсан хүн хоосон цуцлагдана.
 */
export const WAIT_MS = 180_000
/** Start дарсны дараа камер асаахад өгөх хугацаа. */
export const ARM_MS = 45_000
/** Нэг тулаанд хүлээн зөвшөөрөх дээд тоо — утгагүй өгөгдлөөс хамгаална. */
export const MAX_REPS = 200
/** Урилга хүчинтэй байх хугацаа. Найз мэдэгдлээ хараад аппаа нээх зай. */
export const INVITE_TTL_MS = 3 * 60_000

export const BATTLE_TYPES = ['pushup', 'squat', 'combined']
export const normalizeBattleType = (value) => (BATTLE_TYPES.includes(value) ? value : 'pushup')
export const emptyReps = (players) => Object.fromEntries(players.map((id) => [id, 0]))

/** Нэг round-ийн ялагч. null нь тэнцээ. */
export function winnerFromReps(reps, players) {
  const [aId, bId] = players
  const a = reps?.[aId] ?? 0
  const b = reps?.[bId] ?? 0
  return a === b ? null : a > b ? aId : bId
}

/** Combined-д дасгал бүр ижил 1 оноотой; 1–1 бол draw. */
export function combinedWinner(roundWinners, players) {
  const points = Object.fromEntries(players.map((id) => [id, 0]))
  for (const exercise of ['pushup', 'squat']) {
    if (!Object.hasOwn(roundWinners ?? {}, exercise)) continue
    const winner = roundWinners[exercise]
    if (winner === null) players.forEach((id) => (points[id] += 0.5))
    else if (Object.hasOwn(points, winner)) points[winner] += 1
  }
  const [aId, bId] = players
  return points[aId] === points[bId] ? null : points[aId] > points[bId] ? aId : bId
}

/** Reconnect/хуучин invite нь аль төлөвийг үргэлжилж буй гэж үзэх вэ. */
export function battleIsLive(battle, now = new Date()) {
  if (!battle) return false
  if (['waiting', 'arming', 'intermission', 'settling'].includes(battle.status)) return true
  return battle.status === 'playing' && battle.endsAt && battle.endsAt > now
}

/** Эзэн найзаа хүлээж эхэлснээ мэдэгдэнэ. Нэг өрөөнд сүүлийнх нь хүчинтэй. */
export async function announceInvite(roomKey, hostId) {
  await invites().replaceOne(
    { _id: roomKey },
    { _id: roomKey, hostId, createdAt: new Date() },
    { upsert: true },
  )
}

/** Хүчинтэй урилга байвал буцаана. Хугацаа хэтэрсэн бол байхгүйтэй адил. */
export async function liveInvite(roomKey) {
  const inv = await invites().findOne({ _id: roomKey })
  if (!inv) return null
  if (inv.createdAt <= new Date(Date.now() - INVITE_TTL_MS)) return null
  return inv
}

/** Урилгыг хүчингүй болгоно — хэрэглэгдсэн, эсвэл эзэн нь буцсан. */
export async function dropInvite(roomKey) {
  await invites().deleteOne({ _id: roomKey })
}

/**
 * Өрөөнд орж ирсэн хүнд үүрэг хуваарилна: эзэн үү, зочин уу.
 *
 * Чатнаас илгээсэн урилгын картыг ХОЁУЛАА дардаг. Тэр үед хэн нь ч урьсан
 * эзэн биш — хоёулаа зүгээр л өрөө рүү нээгддэг. Тиймээс «эхэлж орсон нь
 * эзэн» гэсэн дүрэм хэрэгтэй, эс тэгвээс хоёулаа нөгөөгөө хүлээгээд царцана.
 *
 * Хоёулаа ЯГ ЗЭРЭГ орж ирж болзошгүй тул эзэмшлийг Mongo дээр таслана:
 * `_id` нь өрөө учраас хоёр дахь оролдлого давхардлаар унаж, тэр нь зочин
 * болно. Хугацаа нь хэтэрсэн урилгыг дарж бичихийг зөвшөөрнө.
 */
export async function claimRoom(roomKey, userId) {
  const live = await liveInvite(roomKey)
  if (live) return { role: live.hostId === userId ? 'host' : 'guest', hostId: live.hostId }

  try {
    await invites().findOneAndUpdate(
      // Амьд урилга байвал энэ шүүлт таарахгүй тул upsert давхардлаар унана
      { _id: roomKey, createdAt: { $not: { $gt: new Date(Date.now() - INVITE_TTL_MS) } } },
      { $set: { hostId: userId, createdAt: new Date() } },
      { upsert: true },
    )
    return { role: 'host', hostId: userId }
  } catch (err) {
    if (err?.code !== 11000) throw err
    const inv = await liveInvite(roomKey)
    if (!inv) return null
    return { role: inv.hostId === userId ? 'host' : 'guest', hostId: inv.hostId }
  }
}

/**
 * Тулааныг үүсгэнэ. Хоёр тал зэрэг дуудна тул давхардлыг Mongo дээр таслана —
 * _id нь roomId учраас хоёр дахь оролдлого унана, тэгвэл байгааг нь буцаана.
 *
 * Цаг ЭНД тавигдахгүй: камер, модель ачаалах хугацаа хүн бүрд өөр тул үүсгэх
 * агшнаас тоолж эхэлбэл удаан ачаалсан хүн секунд алдана. Хоёулаа орсны
 * дараа `start()` цагийг тавина.
 */
export async function createBattle(roomId, playerIds, hostId = null) {
  const ids = [...new Set(playerIds)].sort()
  if (ids.length !== 2) throw new Error('тулаанд яг хоёр тоглогч байх ёстой')

  // Usion-ы өрөө найзуудын хооронд ХАДГАЛАГДДАГ тул өрөөний ID-г тулааны
  // ID болгож болохгүй: дахин тоглоход дууссан тулаан олдож, хуучин үр дүн
  // шууд гарч ирнэ. Өрөө бүрд дугаарласан тулаанууд үүснэ.
  const latest = await battles().find({ roomKey: roomId }).sort({ seq: -1 }).limit(1).next()
  // Үргэлжилж БАЙГАА тулаанд л эргэж орно. Хугацаа нь дууссан мөртлөө
  // дүгнэгдээгүй байгаа тулаан руу буцаавал дууссан тоглолт руу оруулна —
  // дүгнэлт нь шүүрдэлтээр хийгдэж, энд шинийг эхлүүлнэ.
  if (battleIsLive(latest)) return latest
  const seq = (latest?.seq ?? 0) + 1
  // Тусгаарлагч нь URL-д аюулгүй байх ёстой: '#' нь хаягийн фрагмент эхлүүлж,
  // /api/battle/<id> зам таслагдана. '~' нь тайлбаргүй тэмдэг.
  const _id = `${roomId}~${seq}`

  await ensureUsers(ids)
  // Нэр, зураг, эхлэх рейтингийг тулаан дээр тогтооно — дэлгэц дээр харуулахад
  // өрсөлдөгч тус бүрийн профайлыг дахин татах шаардлагагүй болно.
  const docs = await users().find({ _id: { $in: ids } }).toArray()
  const profiles = Object.fromEntries(
    docs.map((u) => [u._id, { name: u.name, avatar: u.avatar ?? null, rating: u.rating }]),
  )

  const battle = {
    _id,
    roomKey: roomId,
    seq,
    players: ids,
    // Өрөөг үүсгэсэн хүн. ЗӨВХӨН тэр Start дарж чадна — эс тэгвээс зочин
    // эзнийг нь бэлэн болоогүй байхад тулааныг эхлүүлж чадна.
    hostId: ids.includes(hostId) ? hostId : ids[0],
    profiles,
    battleType: 'pushup',
    exercise: 'pushup',
    currentRound: 1,
    reps: emptyReps(ids),
    roundReps: { pushup: emptyReps(ids), squat: emptyReps(ids) },
    roundWinners: {},
    // Хүлээлгийн өрөөний төлөв: бэлэн үү, камераа асаасан уу
    ready: { [ids[0]]: false, [ids[1]]: false },
    armed: { [ids[0]]: false, [ids[1]]: false },
    startsAt: null,
    endsAt: null,
    status: 'waiting',
    winnerId: null,
    createdAt: new Date(),
  }

  try {
    await battles().insertOne(battle)
    // Урилга хэрэглэгдлээ. Устгахгүй бол чат дахь хуучин карт дахин ажиллаж,
    // өөр хүн дуусчихсан тулааны өрөө рүү орж ирнэ.
    await dropInvite(roomId)
    return battle
  } catch (err) {
    // Хоёр тал зэрэг үүсгэвэл нэг нь давхардлаар унана — нөгөөгийнхийг авна
    if (err?.code === 11000) return battles().findOne({ _id })
    throw err
  }
}

/** Хүлээлгийн өрөөнд «бэлэн» тэмдгээ тавина/авна. */
export async function setReady(roomId, userId, value) {
  return battles().findOneAndUpdate(
    { _id: roomId, status: 'waiting', players: userId },
    { $set: { [`ready.${userId}`]: !!value } },
    { returnDocument: 'after' },
  )
}

/** Waiting room-д зөвхөн host battle төрлийг сонгоно. Соливол Ready reset. */
export async function setBattleType(roomId, userId, value) {
  const battleType = normalizeBattleType(value)
  const battle = await battles().findOne({ _id: roomId, status: 'waiting' })
  if (!battle || battle.hostId !== userId) return null
  if (battle.battleType === battleType) return battle

  const exercise = battleType === 'squat' ? 'squat' : 'pushup'
  return battles().findOneAndUpdate(
    { _id: roomId, status: 'waiting', hostId: userId },
    {
      $set: {
        battleType,
        exercise,
        currentRound: 1,
        reps: emptyReps(battle.players),
        roundReps: {
          pushup: emptyReps(battle.players),
          squat: emptyReps(battle.players),
        },
        roundWinners: {},
        ready: emptyReps(battle.players),
        armed: emptyReps(battle.players),
      },
    },
    { returnDocument: 'after' },
  )
}

/**
 * Эзэн Start дарлаа. Тулаан ШУУД эхлэхгүй: хоёр тал камераа асаах ёстой тул
 * `arming` төлөвт орно. Цагийг энд ч тавихгүй — зөвшөөрлийн цонх хүн бүрд
 * өөр хугацаа авдаг тул хоёулаа бэлэн болсны дараа `setArmed` тавина.
 *
 * Нөхцөлт шинэчлэлт: зөвхөн эзэн, зөвхөн хоёулаа бэлэн үед, зөвхөн нэг удаа.
 */
export async function beginArming(roomId, userId) {
  const battle = await battles().findOne({ _id: roomId })
  if (!battle || battle.status !== 'waiting') return null
  if (battle.hostId !== userId) return null
  // Эзний хувьд Start дарах нь өөрөө «би бэлэн» гэсэн үг — Ready, Start гэж
  // хоёр удаа дарах шаардлагагүй. Бусад нь заавал бэлэн байх ёстой.
  if (!battle.players.every((id) => id === userId || battle.ready?.[id])) return null
  return battles().findOneAndUpdate(
    { _id: roomId, status: 'waiting' },
    { $set: { status: 'arming', armingAt: new Date(), [`ready.${userId}`]: true } },
    { returnDocument: 'after' },
  )
}

/**
 * Камер бэлэн боллоо. ХОЁУЛАА бэлэн болсон агшинд цаг тавигдана — тэр үед л
 * хоёр тал ижил секундээс эхэлнэ.
 *
 * Цаг тавих нь нөхцөлт: хоёр тал зэрэг мэдэгдсэн ч зөвхөн нэг нь стамп дарна.
 */
export async function setArmed(roomId, userId) {
  const armed = await battles().findOneAndUpdate(
    { _id: roomId, status: 'arming', players: userId },
    { $set: { [`armed.${userId}`]: true } },
    { returnDocument: 'after' },
  )
  if (!armed) return null
  if (!armed.players.every((id) => armed.armed?.[id])) return armed

  const startsAt = new Date(Date.now() + COUNTDOWN_MS)
  const exercise = armed.battleType === 'squat' ? 'squat' : 'pushup'
  const stamped = await battles().findOneAndUpdate(
    { _id: roomId, status: 'arming' },
    {
      $set: {
        status: 'playing',
        exercise,
        currentRound: 1,
        reps: emptyReps(armed.players),
        roundReps: { pushup: emptyReps(armed.players), squat: emptyReps(armed.players) },
        roundWinners: {},
        startsAt,
        endsAt: new Date(startsAt.getTime() + BATTLE_MS),
        intermissionEndsAt: null,
      },
    },
    { returnDocument: 'after' },
  )
  // Хоёр тал зэрэг мэдэгдвэл хоёулаа «бүгд бэлэн» гэж уншиж, хоёулаа стамп
  // дарахыг оролдоно. Хожигдсон нь null авна — тэр үед `armed`-ыг буцаавал
  // ЦАГГҮЙ, `arming` төлөвтэй ХУУЧИН баримт тарж, дөнгөж эхэлсэн тулааныг
  // клиент дээр буцаана. Тиймээс шинэчлэгдсэнийг нь дахин уншина.
  return stamped ?? (await battles().findOne({ _id: roomId })) ?? armed
}

/**
 * Хугацааг ЯГ ОДОО дуусгана — хоёулаа гарсан үед л дуудагдана. Нэг нь
 * гарвал энэ дуудагдахгүй: үлдсэн тоглогч бүтэн хугацаагаа ашиглах ёстой.
 */
export async function endNow(roomId) {
  const playing = await battles().findOneAndUpdate(
    { _id: roomId, status: 'playing' },
    { $set: { endsAt: new Date() } },
    { returnDocument: 'after' },
  )
  if (playing) return playing
  return battles().findOneAndUpdate(
    { _id: roomId, status: 'intermission' },
    { $set: { intermissionEndsAt: new Date() } },
    { returnDocument: 'after' },
  )
}

/**
 * Эхэлж чадаагүй тулааныг цуцална. Рейтинг хөдлөхгүй.
 *
 * Хоёр тохиолдол: өрсөлдөгч хүлээлгийн өрөөнд огт ирээгүй, эсвэл Start
 * дарсан ч нэг нь камераа асааж чадаагүй (зөвшөөрөл өгөөгүй).
 */
export async function cancelIfStale(roomId) {
  return battles().findOneAndUpdate(
    {
      _id: roomId,
      $or: [
        { status: 'waiting', createdAt: { $lte: new Date(Date.now() - WAIT_MS) } },
        { status: 'arming', armingAt: { $lte: new Date(Date.now() - ARM_MS) } },
      ],
    },
    { $set: { status: 'cancelled', cancelReason: 'no-opponent', finishedAt: new Date() } },
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
/** `settling`-д гацсан тулааныг дахин эзэмших хүртэл хүлээх хугацаа. */
export const SETTLE_STUCK_MS = 30_000

/**
 * `settling`-д хатсаныг таних шүүлт. `$lte` нь талбар БАЙХГҮЙ бичлэгийг
 * алгасдаг тул `$not: {$gt}` хэрэглэнэ — хуучин, `settlingAt`-гүй бичлэгүүд
 * үүнгүйгээр мөнхөд гацна.
 */
export const stuckSettling = () => ({
  settlingAt: { $not: { $gt: new Date(Date.now() - SETTLE_STUCK_MS) } },
})

export async function settleIfDue(roomId) {
  // Combined-ийн 10 секунд дууссан бол squat round-ийг серверийн цагаар
  // эхлүүлнэ. Хоёр timer зэрэг дуудсан ч status нөхцөлөөр нэг нь л ялна.
  const dueBreak = await battles().findOne({
    _id: roomId,
    status: 'intermission',
    intermissionEndsAt: { $lte: new Date() },
  })
  if (dueBreak) {
    const startsAt = new Date()
    const advanced = await battles().findOneAndUpdate(
      {
        _id: roomId,
        status: 'intermission',
        intermissionEndsAt: { $lte: new Date() },
      },
      {
        $set: {
          status: 'playing',
          exercise: 'squat',
          currentRound: 2,
          reps: emptyReps(dueBreak.players),
          startsAt,
          endsAt: new Date(startsAt.getTime() + BATTLE_MS),
        },
      },
      { returnDocument: 'after' },
    )
    if (advanced) return advanced
  }

  // Эзэмшлийг `settling` төлөвөөр авна. Дунд нь алдаа гарвал тулаан тэр
  // төлөвт үлдэнэ — тиймээс хугацаа өнгөрсөн бол ДАХИН эзэмшихийг зөвшөөрнө,
  // эс тэгвээс мөнхөд хатаж, ELO бичигдэхгүй үлдэнэ.
  const claimed = await battles().findOneAndUpdate(
    {
      _id: roomId,
      endsAt: { $lte: new Date() },
      $or: [{ status: 'playing' }, { status: 'settling', ...stuckSettling() }],
    },
    { $set: { status: 'settling', settlingAt: new Date() } },
    { returnDocument: 'after' },
  )
  if (!claimed) return null

  const [aId, bId] = claimed.players
  const battleType = normalizeBattleType(claimed.battleType)
  const currentExercise = claimed.exercise === 'squat' ? 'squat' : 'pushup'
  const roundReps = {
    pushup: { ...emptyReps(claimed.players), ...(claimed.roundReps?.pushup ?? {}) },
    squat: { ...emptyReps(claimed.players), ...(claimed.roundReps?.squat ?? {}) },
    [currentExercise]: { ...emptyReps(claimed.players), ...(claimed.reps ?? {}) },
  }
  const roundWinners = {
    ...(claimed.roundWinners ?? {}),
    [currentExercise]: winnerFromReps(roundReps[currentExercise], claimed.players),
  }

  // Combined-ийн эхний round дууслаа: ELO/нийт дүнг одоо бичихгүй. Round
  // дүнг хадгалаад 10 секундийн authoritative intermission эхлүүлнэ.
  if (battleType === 'combined' && (claimed.currentRound ?? 1) === 1) {
    return battles().findOneAndUpdate(
      { _id: roomId, status: 'settling' },
      {
        $set: {
          status: 'intermission',
          exercise: 'squat',
          currentRound: 2,
          roundReps,
          roundWinners,
          startsAt: null,
          endsAt: null,
          intermissionEndsAt: new Date(Date.now() + INTERMISSION_MS),
        },
      },
      { returnDocument: 'after' },
    )
  }

  const aPush = roundReps.pushup[aId] ?? 0
  const bPush = roundReps.pushup[bId] ?? 0
  const aSquat = roundReps.squat[aId] ?? 0
  const bSquat = roundReps.squat[bId] ?? 0

  // Хоёулаа нэг ч хийгээгүй бол тулаан болоогүй гэсэн үг — камер асаагүй,
  // холболт тасарсан, эсвэл зүгээр орхисон. Үүнийг тэнцсэн гэж бүртгэвэл
  // өндөр рейтингтэй нь юу ч хийлгүй оноо алдана.
  if (aPush + bPush + aSquat + bSquat === 0) {
    return battles().findOneAndUpdate(
      { _id: roomId },
      { $set: { status: 'cancelled', cancelReason: 'no-reps', finishedAt: new Date() } },
      { returnDocument: 'after' },
    )
  }

  const winnerId =
    battleType === 'combined'
      ? combinedWinner(roundWinners, claimed.players)
      : roundWinners[currentExercise]

  // Бүртгэл байхгүй бол доорх уншилт алдаа өгч, тулаан `settling`-д хатна
  await ensureUsers([aId, bId])
  const [a, b] = await Promise.all([users().findOne({ _id: aId }), users().findOne({ _id: bId })])
  const ratings = settleBattle({
    a: { userId: aId, rating: a.rating, battles: a.battles },
    b: { userId: bId, rating: b.rating, battles: b.battles },
    winnerId,
  })

  // Тулааны дасгал бүр зөвхөн өөрийн leaderboard нийтэд нэмэгдэнэ.
  const bump = (id, pushupReps, squatReps) => ({
    $set: { rating: ratings[id].after },
    $inc: {
      totalReps: pushupReps,
      squatTotalReps: squatReps,
      battles: 1,
      wins: winnerId === id ? 1 : 0,
      losses: winnerId !== null && winnerId !== id ? 1 : 0,
      draws: winnerId === null ? 1 : 0,
    },
    $max: { bestSet: pushupReps, squatBestSet: squatReps },
  })

  await Promise.all([
    users().updateOne({ _id: aId }, bump(aId, aPush, aSquat)),
    users().updateOne({ _id: bId }, bump(bId, bPush, bSquat)),
  ])
  const rows = claimed.players
    .flatMap((userId) => [
      { userId, exercise: 'pushup', reps: roundReps.pushup[userId] ?? 0 },
      { userId, exercise: 'squat', reps: roundReps.squat[userId] ?? 0 },
    ])
    .filter((s) => s.reps > 0)
    .map((s) => ({
      ...s,
      seconds: BATTLE_MS / 1000,
      mode: 'battle',
      battleType,
      roomId,
      finishedAt: new Date(),
    }))
  if (rows.length) await sessions().insertMany(rows)

  return battles().findOneAndUpdate(
    { _id: roomId },
    {
      $set: {
        status: 'finished',
        battleType,
        roundReps,
        roundWinners,
        winnerId,
        ratings,
        finishedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  )
}

/**
 * Клиент рүү явуулах хэлбэр — өөрийг нь `you` талд тавина.
 *
 * `present` нь ЯГ ОДОО socket-оор холбогдсон хүмүүс. Хүлээлгийн өрөө «найз
 * ирсэн үү» гэдгийг үүгээр мэднэ — өрөөний бүртгэл биш, амьд холболт.
 */
export function view(battle, userId, present = null) {
  const opponentId = battle.players.find((id) => id !== userId) ?? null
  const roundWinners = battle.roundWinners ?? {}
  const roundPoints = (id) =>
    ['pushup', 'squat'].reduce((sum, exercise) => {
      if (!Object.hasOwn(roundWinners, exercise)) return sum
      return sum + (roundWinners[exercise] === null ? 0.5 : roundWinners[exercise] === id ? 1 : 0)
    }, 0)
  const side = (id) => ({
    userId: id,
    reps: battle.reps?.[id] ?? 0,
    roundReps: {
      pushup: battle.roundReps?.pushup?.[id] ?? 0,
      squat: battle.roundReps?.squat?.[id] ?? 0,
    },
    roundPoints: roundPoints(id),
    ready: !!battle.ready?.[id],
    armed: !!battle.armed?.[id],
    here: present ? present.includes(id) : null,
    ...(battle.profiles?.[id] ?? { name: id, avatar: null, rating: null }),
  })
  return {
    roomId: battle._id,
    status: battle.status === 'settling' ? 'playing' : battle.status,
    hostId: battle.hostId ?? battle.players[0],
    youAreHost: (battle.hostId ?? battle.players[0]) === userId,
    battleType: normalizeBattleType(battle.battleType),
    exercise: battle.exercise === 'squat' ? 'squat' : 'pushup',
    currentRound: battle.currentRound ?? 1,
    startsAt: battle.startsAt,
    endsAt: battle.endsAt,
    intermissionEndsAt: battle.intermissionEndsAt ?? null,
    roundWinners,
    // Серверийн цаг. Утаснуудын цаг хоорондоо зөрдөг тул клиент зөрүүг нь
    // тооцоолж байж хоёр тал ижил секунд харна.
    now: new Date(),
    you: side(userId),
    opponent: opponentId ? side(opponentId) : null,
    winnerId: battle.winnerId ?? null,
    ratings: battle.ratings ?? null,
    cancelReason: battle.cancelReason ?? null,
  }
}
