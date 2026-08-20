import { Router } from 'express'
import { activityQueryWindow, dailyPushups, normalizeActivityDays, normalizeActivityEndDate, normalizeActivityExercise, normalizeTimeZone } from './activity.js'
import { requireUser } from './auth.js'
import { CHALLENGE_TEMPLATES, challengeSummary, createChallenge } from './challenge.js'
import { findOrCreateUser, leagues, rankOf, sessions, users } from './db.js'
import { gapToNext, makeLeagueCode, METRICS, normalizeMetric, rankUsers } from './league-rank.js'

/**
 * Нэг сетэд хүлээн зөвшөөрөх дээд тоо. v1-д клиентийн тоонд итгэдэг тул
 * энэ нь хууран мэхлэлтээс хамгаалахгүй — зөвхөн утгагүй өгөгдөл DB рүү
 * орохоос сэргийлнэ. Жинхэнэ шалгалт landmark баталгаажуулалт орох үед.
 */
const MAX_REPS = 1000
const MAX_LEAGUES_PER_USER = 20
const MAX_LEAGUE_MEMBERS = 100

const router = Router()

const exerciseFields = (exercise) =>
  exercise === 'squat'
    ? { total: 'squatTotalReps', best: 'squatBestSet' }
    : { total: 'totalReps', best: 'bestSet' }

function publicUser(u, rank, squatRank) {
  return {
    userId: u._id,
    name: u.name,
    avatar: u.avatar ?? null,
    totalReps: u.totalReps ?? 0,
    bestSet: u.bestSet ?? 0,
    squatTotalReps: u.squatTotalReps ?? 0,
    squatBestSet: u.squatBestSet ?? 0,
    rating: u.rating,
    battles: u.battles,
    wins: u.wins,
    losses: u.losses,
    rank,
    squatRank,
  }
}

router.get('/me', requireUser, async (req, res) => {
  const user = await findOrCreateUser(req.user)
  const [rank, squatRank] = await Promise.all([
    rankOf(user.totalReps ?? 0),
    rankOf(user.squatTotalReps ?? 0, 'squat'),
  ])
  res.json(publicUser(user, rank, squatRank))
})

router.get('/activity', requireUser, async (req, res) => {
  const days = normalizeActivityDays(req.query.days)
  const timeZone = normalizeTimeZone(req.query.timeZone)
  const exercise = normalizeActivityExercise(req.query.exercise)
  const now = new Date()
  const endDate = normalizeActivityEndDate(req.query.end, { timeZone, now })
  const window = activityQueryWindow(endDate, days)
  const rows = await sessions()
    .find({
      userId: req.user.userId,
      exercise,
      finishedAt: { $gte: window.start, $lt: window.end },
    })
    .project({ _id: 0, reps: 1, finishedAt: 1 })
    .toArray()
  res.json({ exercise, timeZone, endDate, days: dailyPushups(rows, { days, timeZone, now, endDate }) })
})

router.get('/challenges', requireUser, async (req, res) => {
  const user = await findOrCreateUser(req.user)
  const rows = user.challenge
    ? await sessions().find({ userId: req.user.userId, finishedAt: { $gte: new Date(user.challenge.startedAt) } }).project({ _id: 0, exercise: 1, reps: 1, finishedAt: 1 }).toArray()
    : []
  res.json({ templates: CHALLENGE_TEMPLATES, active: challengeSummary(user.challenge, rows) })
})

router.post('/challenges/start', requireUser, async (req, res) => {
  const user = await findOrCreateUser(req.user)
  const rows = user.challenge
    ? await sessions().find({ userId: req.user.userId, finishedAt: { $gte: new Date(user.challenge.startedAt) } }).project({ _id: 0, exercise: 1, reps: 1, finishedAt: 1 }).toArray()
    : []
  const current = challengeSummary(user.challenge, rows)
  if (current?.status === 'active') {
    return res.status(409).json({ error: 'Эхлээд одоогийн challenge-аа дуусгах эсвэл зогсооно уу.' })
  }

  let challenge
  try {
    challenge = createChallenge(req.body)
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
  await users().updateOne({ _id: req.user.userId }, { $set: { challenge } })
  res.status(201).json(challengeSummary(challenge))
})

router.delete('/challenges/current', requireUser, async (req, res) => {
  await findOrCreateUser(req.user)
  await users().updateOne({ _id: req.user.userId }, { $unset: { challenge: '' } })
  res.status(204).end()
})

/** Дуусгасан сетийг бүртгэнэ. Нийт тоо болон хамгийн сайн сет шинэчлэгдэнэ. */
router.post('/session', requireUser, async (req, res) => {
  const reps = Number(req.body?.reps)
  const seconds = Number(req.body?.seconds)
  const exercise = req.body?.exercise === 'squat' ? 'squat' : 'pushup'
  if (!Number.isInteger(reps) || reps < 1 || reps > MAX_REPS) {
    return res.status(400).json({ error: `reps нь 1-${MAX_REPS} хооронд бүхэл тоо байх ёстой` })
  }

  await findOrCreateUser(req.user)
  const fields = exerciseFields(exercise)
  const user = await users().findOneAndUpdate(
    { _id: req.user.userId },
    { $inc: { [fields.total]: reps }, $max: { [fields.best]: reps } },
    { returnDocument: 'after' },
  )

  await sessions().insertOne({
    userId: req.user.userId,
    reps,
    exercise,
    seconds: Number.isFinite(seconds) ? Math.round(seconds) : null,
    mode: 'solo',
    finishedAt: new Date(),
  })

  const [rank, squatRank] = await Promise.all([
    rankOf(user.totalReps ?? 0),
    rankOf(user.squatTotalReps ?? 0, 'squat'),
  ])
  res.json(publicUser(user, rank, squatRank))
})

/**
 * WebRTC-д хэрэглэх ICE серверүүд.
 *
 * Cloudflare тогтмол хэрэглэгч/нууц үг өгдөггүй: сервер нь урт хугацааны
 * түлхүүрээрээ хандаж БОГИНО ХУГАЦААНЫ итгэмжлэл гаргуулж авдаг. Тиймээс
 * түлхүүр зөвхөн энд үлдэж, клиент рүү хэзээ ч очихгүй.
 *
 * Түлхүүр байхгүй эсвэл Cloudflare хүрэхгүй бол STUN-ээр үргэлжилнэ — ихэнх
 * холболт түүгээр бүтдэг, зөвхөн хатуу NAT-ын ард TURN хэрэгтэй болдог.
 */
router.get('/ice', requireUser, async (_req, res) => {
  const stun = [{ urls: process.env.STUN_URL || 'stun:stun.l.google.com:19302' }]
  const keyId = process.env.TURN_KEY_ID
  const token = process.env.TURN_KEY_API_TOKEN
  if (!keyId || !token) return res.json({ iceServers: stun })

  try {
    const r = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        // Тулаан 35 секунд ч гэсэн хайлт, бэлтгэл дээр нь нэмэгдэнэ
        body: JSON.stringify({ ttl: 600 }),
      },
    )
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const body = await r.json()
    const list = Array.isArray(body.iceServers) ? body.iceServers : [body.iceServers]
    res.json({ iceServers: [...list.filter(Boolean), ...stun] })
  } catch (err) {
    console.error('TURN итгэмжлэл авахад алдаа:', err.message)
    res.json({ iceServers: stun })
  }
})

function leagueSummary(league, rankedByMetric, userId) {
  const ranks = Object.fromEntries(
    Object.entries(rankedByMetric).map(([metric, rows]) => [
      metric,
      rows.find((row) => row.userId === userId)?.rank ?? null,
    ]),
  )
  return {
    id: String(league._id),
    name: league.name,
    code: league.code,
    memberCount: league.memberIds.length,
    owner: league.ownerId === userId,
    ranks,
  }
}

router.post('/leagues', requireUser, async (req, res) => {
  const name = String(req.body?.name ?? '').trim().replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 30) {
    return res.status(400).json({ error: 'Лигийн нэр 2–30 тэмдэгт байна.' })
  }
  await findOrCreateUser(req.user)
  const joined = await leagues().countDocuments({ memberIds: req.user.userId })
  if (joined >= MAX_LEAGUES_PER_USER) {
    return res.status(409).json({ error: `Нэг хэрэглэгч ${MAX_LEAGUES_PER_USER} хүртэл лигт оролцоно.` })
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = makeLeagueCode()
    try {
      const result = await leagues().insertOne({
        name,
        code,
        ownerId: req.user.userId,
        memberIds: [req.user.userId],
        createdAt: new Date(),
      })
      return res.status(201).json({ id: String(result.insertedId), name, code, memberCount: 1, owner: true })
    } catch (error) {
      if (error?.code !== 11000) throw error
    }
  }
  return res.status(503).json({ error: 'Лигийн код үүсгэж чадсангүй. Дахин оролдоно уу.' })
})

router.post('/leagues/join', requireUser, async (req, res) => {
  const code = String(req.body?.code ?? '').trim().toUpperCase()
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
    return res.status(400).json({ error: '6 тэмдэгт лигийн кодоо шалгана уу.' })
  }
  await findOrCreateUser(req.user)
  const league = await leagues().findOne({ code })
  if (!league) return res.status(404).json({ error: 'Ийм кодтой лиг олдсонгүй.' })
  if (league.memberIds.includes(req.user.userId)) {
    return res.json({ id: String(league._id), name: league.name, code, memberCount: league.memberIds.length, owner: league.ownerId === req.user.userId })
  }
  const joined = await leagues().countDocuments({ memberIds: req.user.userId })
  if (joined >= MAX_LEAGUES_PER_USER) {
    return res.status(409).json({ error: `Нэг хэрэглэгч ${MAX_LEAGUES_PER_USER} хүртэл лигт оролцоно.` })
  }
  if (league.memberIds.length >= MAX_LEAGUE_MEMBERS) {
    return res.status(409).json({ error: 'Энэ лигийн 100 гишүүний хязгаар дүүрсэн байна.' })
  }
  const result = await leagues().findOneAndUpdate(
    { _id: league._id, memberIds: { $ne: req.user.userId }, $expr: { $lt: [{ $size: '$memberIds' }, MAX_LEAGUE_MEMBERS] } },
    { $addToSet: { memberIds: req.user.userId } },
    { returnDocument: 'after' },
  )
  if (!result) return res.status(409).json({ error: 'Лигт нэгдэж чадсангүй. Дахин оролдоно уу.' })
  res.json({ id: String(result._id), name: result.name, code, memberCount: result.memberIds.length, owner: false })
})

router.get('/leagues', requireUser, async (req, res) => {
  const [me, mine] = await Promise.all([
    findOrCreateUser(req.user),
    leagues().find({ memberIds: req.user.userId }).sort({ createdAt: -1 }).toArray(),
  ])
  const memberIds = [...new Set(mine.flatMap((league) => league.memberIds))]
  const members = memberIds.length
    ? await users().find({ _id: { $in: memberIds } }).toArray()
    : []
  const byId = new Map(members.map((user) => [user._id, user]))
  const summaries = mine.map((league) => {
    const leagueUsers = league.memberIds.map((id) => byId.get(id)).filter(Boolean)
    const ranked = Object.fromEntries(Object.keys(METRICS).map((metric) => [metric, rankUsers(leagueUsers, metric)]))
    return leagueSummary(league, ranked, req.user.userId)
  })
  const [memberCount, pushupRank, squatRank, higherBattleCount] = await Promise.all([
    users().countDocuments({}),
    rankOf(me.totalReps ?? 0),
    rankOf(me.squatTotalReps ?? 0, 'squat'),
    me.battles > 0
      ? users().countDocuments({ battles: { $gt: 0 }, rating: { $gt: me.rating ?? 1000 } })
      : Promise.resolve(null),
  ])
  res.json({
    leagues: summaries,
    global: {
      memberCount,
      ranks: {
        pushup: pushupRank,
        squat: squatRank,
        battle: higherBattleCount === null ? null : higherBattleCount + 1,
      },
    },
  })
})

router.get('/leaderboard', requireUser, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
  const metric = normalizeMetric(req.query.metric ?? req.query.exercise)
  const field = METRICS[metric].score
  const me = await findOrCreateUser(req.user)
  const code = String(req.query.league ?? '').trim().toUpperCase()

  if (code) {
    const league = await leagues().findOne({ code })
    if (!league || !league.memberIds.includes(req.user.userId)) {
      return res.status(404).json({ error: 'Энэ лиг олдсонгүй эсвэл та гишүүн биш байна.' })
    }
    const leagueUsers = await users().find({ _id: { $in: league.memberIds } }).toArray()
    const rows = rankUsers(leagueUsers, metric)
    const mine = rows.find((row) => row.userId === req.user.userId) ?? null
    return res.json({
      metric,
      league: { name: league.name, code: league.code, memberCount: league.memberIds.length, owner: league.ownerId === req.user.userId },
      totalPlayers: rows.length,
      players: rows.slice(0, limit),
      me: mine ? { ...mine, gapToNext: gapToNext(rows, req.user.userId) } : null,
    })
  }

  const filter = metric === 'battle' ? { battles: { $gt: 0 } } : { [field]: { $gt: 0 } }
  const rawTop = await users().find(filter).sort({ [field]: -1, [METRICS[metric].best]: -1 }).limit(limit).toArray()
  const top = rankUsers(rawTop, metric)
  const ownScore = me[field] ?? 0
  const ownRank = (await users().countDocuments({ ...filter, [field]: { $gt: ownScore } })) + 1
  const ownRow = { ...rankUsers([me], metric)[0], rank: ownRank }
  const next = await users().find({ ...filter, [field]: { $gt: ownScore } }).sort({ [field]: 1 }).limit(1).next()
  res.json({
    metric,
    league: null,
    totalPlayers: await users().countDocuments(filter),
    players: top,
    me: metric === 'battle' && !me.battles
      ? null
      : { ...ownRow, gapToNext: next ? (next[field] ?? 0) - ownScore + 1 : null },
  })
})

export default router
