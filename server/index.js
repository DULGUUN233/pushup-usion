import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { authMode } from './auth.js'
import { connect } from './db.js'
import api from './routes.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const app = express()

app.use(express.json({ limit: '64kb' }))
app.use('/api', api)
app.get('/healthz', (_req, res) => res.json({ ok: true, authMode }))

// Хуудсыг диск дээрээс хүсэлт бүрт уншина — эс тэгвээс засвар хийсний дараа
// сервер хуучин хувилбараа өгсөөр байдаг.
// Express 5-д '*' маршрут хүчингүй тул catch-all-ыг use()-ээр хийнэ.
app.use((_req, res) => {
  res.set('Cache-Control', 'no-cache')
  res.sendFile(path.join(root, 'index.html'))
})

const port = process.env.PORT || 8080
await connect()
app.listen(port, '0.0.0.0', () => {
  console.log(`pushup :${port} — auth: ${authMode}`)
})
