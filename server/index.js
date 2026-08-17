import express from 'express'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { authMode } from './auth.js'
import { ARM_MS, WAIT_MS, cancelIfStale, stuckSettling } from './battle.js'
import battleRoutes from './battleRoutes.js'
import { attachBattleSocket } from './battleSocket.js'
import { battles, connect } from './db.js'
import api from './routes.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const app = express()

app.use(express.json({ limit: '64kb' }))
app.use('/api/battle', battleRoutes)
app.use('/api', api)
app.get('/healthz', (_req, res) => res.json({ ok: true, authMode }))
app.use('/assets', express.static(path.join(root, 'assets'), {
  immutable: true,
  maxAge: '1y',
}))

// Express 5-д '*' маршрут хүчингүй тул catch-all-ыг use()-ээр хийнэ.
app.use((_req, res) => {
  res.set('Cache-Control', 'no-cache')
  res.sendFile(path.join(root, 'index.html'))
})

/**
 * Хоёр тал хоёулаа таслагдвал socket дээрх таймер нь тулааныг хаахгүй
 * үлдэнэ. Тогтмол шүүрдэлт нь рейтинг бичигдэлгүй өлгөөтэй үлдэхээс
 * сэргийлнэ.
 */
function startSweeper(realtime) {
  setInterval(async () => {
    try {
      // `settling`-д гацсаныг ч хамруулна — дүгнэлт дунд нь унавал тулаан
      // тэр төлөвт үлдэж, ELO хэзээ ч бичигдэхгүй болдог
      const due = await battles()
        .find(
          {
            $or: [
              { status: 'playing', endsAt: { $lte: new Date() } },
              { status: 'settling', endsAt: { $lte: new Date() }, ...stuckSettling() },
              { status: 'intermission', intermissionEndsAt: { $lte: new Date() } },
            ],
          },
          { projection: { _id: 1 } },
        )
        .limit(20)
        .toArray()
      for (const b of due) await realtime.advanceDue(b._id)

      // Эхэлж чадаагүй тулаанууд: өрсөлдөгч огт ирээгүй, эсвэл Start дарсан
      // ч камераа асааж чадаагүй
      const stale = await battles()
        .find(
          {
            $or: [
              { status: 'waiting', createdAt: { $lte: new Date(Date.now() - WAIT_MS) } },
              { status: 'arming', armingAt: { $lte: new Date(Date.now() - ARM_MS) } },
            ],
          },
          { projection: { _id: 1 } },
        )
        .limit(20)
        .toArray()
      for (const b of stale) await cancelIfStale(b._id)
    } catch (err) {
      console.error('sweeper алдаа:', err.message)
    }
  }, 5_000).unref()
}

const port = process.env.PORT || 8080
await connect()
const server = http.createServer(app)
const realtime = attachBattleSocket(server)
startSweeper(realtime)
server.listen(port, '0.0.0.0', () => {
  console.log(`pushup :${port} — auth: ${authMode}`)
})
