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

function publicUser(u, rank) {
  return {
    userId: u._id,
    name: u.name,
    avatar: u.avatar ?? null,
    totalReps: u.totalReps,
    bestSet: u.bestSet,
    rating: u.rating,
    battles: u.battles,
    wins: u.wins,
    losses: u.losses,
    rank,
  }
}

router.get('/me', requireUser, async (req, res) => {
  const user = await findOrCreateUser(req.user)
  res.json(publicUser(user, await rankOf(user.totalReps)))
})

/** Дуусгасан сетийг бүртгэнэ. Нийт тоо болон хамгийн сайн сет шинэчлэгдэнэ. */
router.post('/session', requireUser, async (req, res) => {
  const reps = Number(req.body?.reps)
  const seconds = Number(req.body?.seconds)
  if (!Number.isInteger(reps) || reps < 1 || reps > MAX_REPS) {
    return res.status(400).json({ error: `reps нь 1-${MAX_REPS} хооронд бүхэл тоо байх ёстой` })
  }

  await findOrCreateUser(req.user)
  const user = await users().findOneAndUpdate(
    { _id: req.user.userId },
    { $inc: { totalReps: reps }, $max: { bestSet: reps } },
    { returnDocument: 'after' },
  )

  await sessions().insertOne({
    userId: req.user.userId,
    reps,
    seconds: Number.isFinite(seconds) ? Math.round(seconds) : null,
    mode: 'solo',
    finishedAt: new Date(),
  })

  res.json(publicUser(user, await rankOf(user.totalReps)))
})

/**
 * WebRTC-д хэрэглэх ICE серверүүд. TURN-ыг орчны хувьсагчаар өгнө — итгэмжлэл
 * кодонд байхгүй, нэмэхэд клиентээ дахин байршуулах шаардлагагүй.
 * TURN байхгүй бол хоёр утас өөр сүлжээнд байхад видео заримдаа холбогдохгүй.
 */
router.get('/ice', requireUser, (_req, res) => {
  const iceServers = [{ urls: process.env.STUN_URL || 'stun:stun.l.google.com:19302' }]
  if (process.env.TURN_URL) {
    iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    })
  }
  res.json({ iceServers })
})

router.get('/leaderboard', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
  const top = await users()
    .find({ totalReps: { $gt: 0 } }, { projection: { name: 1, avatar: 1, totalReps: 1, bestSet: 1, rating: 1 } })
    .sort({ totalReps: -1 })
    .limit(limit)
    .toArray()

  res.json(
    top.map((u, i) => ({
      rank: i + 1,
      userId: u._id,
      name: u.name,
      avatar: u.avatar ?? null,
      totalReps: u.totalReps,
      bestSet: u.bestSet,
      rating: u.rating,
    })),
  )
})

export default router
