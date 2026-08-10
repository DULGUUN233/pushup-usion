import { MongoClient } from 'mongodb'
import { START_RATING } from './elo.js'

let client
let db

export async function connect() {
  if (db) return db
  client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  db = client.db(process.env.MONGODB_DB)

  // Leaderboard нийт тоогоор эрэмбэлэгддэг тул тэр индекс заавал хэрэгтэй.
  await users().createIndex({ totalReps: -1 })
  await users().createIndex({ rating: -1 })
  await sessions().createIndex({ userId: 1, finishedAt: -1 })

  return db
}

export function users() {
  return db.collection('users')
}

/** Дуусгасан сет бүр — Push Up горим ба Battle хоёулаа энд бичигдэнэ. */
export function sessions() {
  return db.collection('sessions')
}

export function battles() {
  return db.collection('battles')
}

/**
 * Хэрэглэгчийг олно, байхгүй бол үүсгэнэ.
 * _id нь Usion-ы user_id — өөр ID зохиохгүй.
 */
export async function findOrCreateUser({ userId, name, avatar = null }) {
  const now = new Date()
  return users().findOneAndUpdate(
    { _id: userId },
    {
      $setOnInsert: {
        totalReps: 0,
        bestSet: 0,
        rating: START_RATING,
        battles: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        createdAt: now,
      },
      // Нэр, зураг Usion дээр өөрчлөгдвөл орж ирэх бүрд шинэчлэгдэнэ
      $set: { name, avatar, seenAt: now },
    },
    { upsert: true, returnDocument: 'after' },
  )
}

/**
 * Тулаанд орох хүмүүсийг заавал бүртгэлтэй болгоно.
 * Өрсөлдөгч апп руугаа орж амжаагүй байж болох тул нэрийг нь түр ID-гаар
 * тавина — тэр өөрөө орж ирэхэд Usion-ы жинхэнэ нэрээр солигдоно.
 */
export async function ensureUsers(userIds) {
  const now = new Date()
  await users().bulkWrite(
    userIds.map((id) => ({
      updateOne: {
        filter: { _id: id },
        update: {
          $setOnInsert: {
            name: id,
            avatar: null,
            totalReps: 0,
            bestSet: 0,
            rating: START_RATING,
            battles: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            createdAt: now,
          },
        },
        upsert: true,
      },
    })),
  )
}

/** Нийт тоогоор хэдэн дүгээрт байгаа — өөрөөс нь илүү тоотой хүний тоо + 1. */
export async function rankOf(totalReps) {
  return (await users().countDocuments({ totalReps: { $gt: totalReps } })) + 1
}

export async function close() {
  await client?.close()
  db = undefined
}
