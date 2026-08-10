import express from 'express'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { authMode } from './auth.js'
import { settleIfDue } from './battle.js'
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
function startSweeper() {
  setInterval(async () => {
    try {
      const due = await battles()
        .find({ status: 'playing', endsAt: { $lte: new Date() } }, { projection: { _id: 1 } })
        .limit(20)
        .toArray()
      for (const b of due) await settleIfDue(b._id)
    } catch (err) {
      console.error('sweeper алдаа:', err.message)
    }
  }, 5_000).unref()
}

const port = process.env.PORT || 8080
await connect()
const server = http.createServer(app)
attachBattleSocket(server)
startSweeper()
server.listen(port, '0.0.0.0', () => {
  console.log(`pushup :${port} — auth: ${authMode}`)
})
