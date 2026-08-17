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
  await users().createIndex({ squatTotalReps: -1 })
  await users().createIndex({ rating: -1 })
  await leagues().createIndex({ code: 1 }, { unique: true })
  await leagues().createIndex({ memberIds: 1 })
  await sessions().createIndex({ userId: 1, finishedAt: -1 })
  await sessions().createIndex({ userId: 1, exercise: 1, finishedAt: -1 })
  // Өрөө бүрийн хамгийн сүүлийн тулааныг олоход
  await battles().createIndex({ roomKey: 1, seq: -1 })
  // Хүчингүй болсон урилгыг Mongo өөрөө устгана — цэвэрлэх код бичих шаардлагагүй
  await invites().createIndex({ createdAt: 1 }, { expireAfterSeconds: 600 })

  return db
}

export function users() {
  return db.collection('users')
}

/** Дуусгасан сет бүр — exercise талбар нь pushup эсвэл squat. */
export function sessions() {
  return db.collection('sessions')
}

export function battles() {
  return db.collection('battles')
}

/** Battle өрөөнөөс тусдаа, удаан хугацаанд хадгалагдах нийгмийн лигүүд. */
export function leagues() {
  return db.collection('leagues')
}

/**
 * «Эзэн ЯГ ОДОО энэ өрөөнд найзаа хүлээж байна» гэсэн богино настай тэмдэглэл.
 *
 * Чат дахь урилгын карт МӨНХ үлддэг — тулаан дуусаад ч «Дахин нэгдэх» товч
 * ажилласаар байна. Картан дээрх тоглогчдын жагсаалт нь тэр агшны байдал тул
 * түүнд итгэвэл аппаа огт нээгээгүй хүнтэй хосолно. Хүчинтэй урилгыг
 * ялгах цорын ганц найдвартай арга нь эзэн өөрөө мэдэгдэх явдал.
 */
export function invites() {
  return db.collection('invites')
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
        squatTotalReps: 0,
        squatBestSet: 0,
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
            squatTotalReps: 0,
            squatBestSet: 0,
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

/** Тухайн дасгалын нийт тоогоор хэдэн дүгээрт байгаа. */
export async function rankOf(totalReps, exercise = 'pushup') {
  const field = exercise === 'squat' ? 'squatTotalReps' : 'totalReps'
  return (await users().countDocuments({ [field]: { $gt: totalReps } })) + 1
}

export async function close() {
  await client?.close()
  db = undefined
}
