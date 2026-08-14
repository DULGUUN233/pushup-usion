import { Router } from 'express'
import { requireUser } from './auth.js'
import { findOrCreateUser, rankOf, sessions, users } from './db.js'

/**
 * Нэг сетэд хүлээн зөвшөөрөх дээд тоо. v1-д клиентийн тоонд итгэдэг тул
 * энэ нь хууран мэхлэлтээс хамгаалахгүй — зөвхөн утгагүй өгөгдөл DB рүү
 * орохоос сэргийлнэ. Жинхэнэ шалгалт landmark баталгаажуулалт орох үед.
 */
const MAX_REPS = 1000

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

router.get('/leaderboard', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
  const exercise = req.query.exercise === 'squat' ? 'squat' : 'pushup'
  const fields = exerciseFields(exercise)
  const top = await users()
    .find(
      { [fields.total]: { $gt: 0 } },
      { projection: { name: 1, avatar: 1, [fields.total]: 1, [fields.best]: 1, rating: 1 } },
    )
    .sort({ [fields.total]: -1 })
    .limit(limit)
    .toArray()

  res.json(
    top.map((u, i) => ({
      rank: i + 1,
      userId: u._id,
      name: u.name,
      avatar: u.avatar ?? null,
      totalReps: u[fields.total] ?? 0,
      bestSet: u[fields.best] ?? 0,
      rating: u.rating,
      exercise,
    })),
  )
})

export default router
