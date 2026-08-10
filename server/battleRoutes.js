import { Router } from 'express'
import { requireUser } from './auth.js'
import { createBattle, settleIfDue, view } from './battle.js'
import { battles } from './db.js'

const router = Router()

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
    const battle = await createBattle(roomId, players)
    if (!battle.players.includes(req.user.userId)) {
      return res.status(403).json({ error: 'энэ тулаанд оролцохгүй' })
    }
    res.json(view(battle, req.user.userId))
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
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
