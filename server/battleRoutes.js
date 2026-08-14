import { Router } from 'express'
import { requireUser } from './auth.js'
import {
  announceInvite,
  battleIsLive,
  claimRoom,
  createBattle,
  dropInvite,
  liveInvite,
  settleIfDue,
  view,
} from './battle.js'
import { battles } from './db.js'

const router = Router()

/**
 * Эзэн: «би энэ өрөөнд найзаа хүлээж байна».
 *
 * Урилгын карт чатад мөнхөд үлдэж, дуусчихсан тулааны өрөө рүү «Дахин нэгдэх»
 * товчоор оруулдаг. Платформ өрөөний төлөвийг асуух зам өгдөггүй тул амьд
 * урилгыг ялгах цорын ганц арга нь эзний энэ мэдэгдэл.
 */
router.post('/invite', requireUser, async (req, res) => {
  const { roomId } = req.body ?? {}
  if (typeof roomId !== 'string' || !roomId) {
    return res.status(400).json({ error: 'roomId шаардлагатай' })
  }
  await announceInvite(roomId, req.user.userId)
  res.json({ ok: true })
})

/** Зочин: энэ картны эзэн ОДОО ч хүлээж байна уу? */
router.get('/invite/:roomKey', requireUser, async (req, res) => {
  const inv = await liveInvite(req.params.roomKey)
  if (!inv) return res.status(404).json({ error: 'урилга хүчингүй' })
  // Өөрийнхөө урилгын карт руу буцаж орж болохгүй — ганцаараа тулалдана
  if (inv.hostId === req.user.userId) return res.status(404).json({ error: 'урилга хүчингүй' })
  res.json({ hostId: inv.hostId })
})

/**
 * Өрөө рүү нээгдсэн хүн үүргээ авна: эзэн үү, зочин уу.
 *
 * Чатнаас илгээсэн урилгын картыг хоёулаа дардаг тул хэн нь ч урьсан эзэн
 * биш байдаг. Эхэлж орсныг нь эзэн болгоно.
 */
router.post('/room/:roomKey/claim', requireUser, async (req, res) => {
  const roomKey = req.params.roomKey

  // Энэ өрөөнд аль хэдийн тулаан болсон бол карт нь хуучирсан: шинэ урилга
  // бүр ШИНЭ өрөө авдаг тул хуучин өрөө рүү дахин орох учиргүй.
  const me = req.user.userId
  const latest = await battles().find({ roomKey }).sort({ seq: -1 }).limit(1).next()

  if (latest) {
    // Тулаан аль хэдийн үүссэн ч ҮРГЭЛЖИЛЖ байвал оролцогчийг буцааж оруулна.
    // Апп дахин ачаалагдах, картаа дахин дарах нь энгийн үзэгдэл — тэднийг
    // «урилга хүчингүй» гээд гаргавал хүлээлгийн өрөө мөнхөд 1/2 үлдэнэ.
    if (battleIsLive(latest)) {
      if (!latest.players.includes(me)) {
        return res.status(403).json({ error: 'энэ өрөө дүүрэн' })
      }
      const hostId = latest.hostId ?? latest.players[0]
      return res.json({ role: hostId === me ? 'host' : 'guest', hostId })
    }

    // Дууссан бол карт нь хуучирсан: урилга бүр ШИНЭ өрөө авдаг тул хуучин
    // өрөө рүү дахин орох учиргүй.
    return res.status(404).json({ error: 'урилга хүчингүй' })
  }

  const claim = await claimRoom(roomKey, me)
  if (!claim) return res.status(404).json({ error: 'урилга хүчингүй' })
  res.json(claim)
})

/** Эзэн урилгаасаа буцлаа — картыг нь тэр дороо үхүүлнэ. */
router.delete('/invite/:roomKey', requireUser, async (req, res) => {
  const inv = await liveInvite(req.params.roomKey)
  if (inv && inv.hostId !== req.user.userId) {
    return res.status(403).json({ error: 'энэ урилга чинийх биш' })
  }
  await dropInvite(req.params.roomKey)
  res.json({ ok: true })
})

/**
 * Хос олдсоны дараа тулааныг үүсгэнэ. Хоёр тал зэрэг дуудна — үүсгэх нь
 * идемпотент тул хоёр дахь дуудлага байгааг нь буцаана.
 */
router.post('/', requireUser, async (req, res) => {
  const { roomId, players } = req.body ?? {}
  if (typeof roomId !== 'string' || !roomId) {
    return res.status(400).json({ error: 'roomId шаардлагатай' })
  }
  if (!Array.isArray(players) || !players.includes(req.user.userId)) {
    return res.status(400).json({ error: 'players нь өөрийг чинь агуулсан байх ёстой' })
  }

  try {
    // Өрөөг үүсгэсэн хүн эзэн болно. Урилга нь эзний мэдэгдэл тул хамгийн
    // найдвартай эх сурвалж — клиентийн хэлснийг хүлээж авахгүй.
    const inv = await liveInvite(roomId)
    const battle = await createBattle(roomId, players, inv?.hostId ?? null)
    if (!battle.players.includes(req.user.userId)) {
      return res.status(403).json({ error: 'энэ тулаанд оролцохгүй' })
    }
    res.json(view(battle, req.user.userId))
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

/**
 * Өрөөний хамгийн сүүлийн тулаан.
 *
 * Эзэн найзаа урихдаа платформын `onPlayerJoined` үйл явдлыг хүлээдэг ч тэр
 * үйл явдал ирэхгүй байх тохиолдол бий (өрөөний гишүүнчлэл тодорхойгүй
 * болох, SDK-ийн төлөв алдагдах). Зочин орж ирээд тулааныг ЭНД үүсгэдэг тул
 * эзэн үүнийг асууж мэдэж болно — платформоос хамаарахгүй нөөц зам.
 *
 * `/:roomId`-ээс ӨМНӨ бүртгэгдэх ёстой, эс тэгвээс тэр нь `/room`-ыг залгина.
 */
router.get('/room/:roomKey/latest', requireUser, async (req, res) => {
  const b = await battles().find({ roomKey: req.params.roomKey }).sort({ seq: -1 }).limit(1).next()
  if (!b) return res.status(404).json({ error: 'тулаан алга' })
  if (!b.players.includes(req.user.userId)) return res.status(403).json({ error: 'энэ тулаанд оролцохгүй' })
  res.json(view(b, req.user.userId))
})

/** Socket тасарсан үед төлвөө нөхөх зам. */
router.get('/:roomId', requireUser, async (req, res) => {
  await settleIfDue(req.params.roomId)
  const battle = await battles().findOne({ _id: req.params.roomId })
  if (!battle) return res.status(404).json({ error: 'тулаан олдсонгүй' })
  if (!battle.players.includes(req.user.userId)) {
    return res.status(403).json({ error: 'энэ тулаанд оролцохгүй' })
  }
  res.json(view(battle, req.user.userId))
})

export default router
