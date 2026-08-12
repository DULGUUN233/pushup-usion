import { WebSocket, WebSocketServer } from 'ws'
import { MAX_REPS, cancelIfStale, endNow, settleIfDue, start, view } from './battle.js'
import { verifyToken } from './auth.js'
import { battles } from './db.js'

const DEV_AUTH = process.env.ALLOW_DEV_AUTH === '1' && !process.env.USION_SERVICE_ID

/** roomId → Set<socket> */
const rooms = new Map()
/**
 * roomId → тулааны баримт, санах ойд. Rep бүр дээр Mongo руу бичээд байвал
 * өрсөлдөгч оноог чинь 50–300 мс хоцроож харна — тэр нь тулаанд мэдрэгдэнэ.
 * Тиймээс тоог санах ойд барьж, шууд тараана; дискэнд үе үе буулгана.
 */
const live = new Map()

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
}

function broadcast(roomId, battle) {
  for (const socket of rooms.get(roomId) ?? []) {
    send(socket, { type: 'state', state: view(battle, socket.user.userId) })
  }
}

/** Түр тасалдалд тулааныг дуусгахгүйн тулд хоосон болсны дараа хүлээх хугацаа. */
const EMPTY_GRACE_MS = 6_000

function leave(socket) {
  const roomId = socket.roomId
  const set = rooms.get(roomId)
  set?.delete(socket)
  if (!set || set.size > 0) return

  rooms.delete(roomId)
  flush(roomId).catch(() => {})

  // ХОЁУЛАА гарсан үед л тулаан дуусна. Нэг нь үлдсэн бол өрөө хоосорохгүй
  // тул энд орохгүй — үлдсэн тоглогч цагаа бүтэн ашиглана.
  setTimeout(async () => {
    if (rooms.has(roomId)) return   // хэн нэг нь буцаж ирсэн
    try {
      if (!(await endNow(roomId))) return
      await flush(roomId)
      if (await settleIfDue(roomId)) live.delete(roomId)
    } catch (err) {
      console.error('хоосон өрөө хаахад алдаа:', err.message)
    }
  }, EMPTY_GRACE_MS)
}

async function load(roomId) {
  let doc = live.get(roomId)
  if (!doc) {
    doc = await battles().findOne({ _id: roomId })
    if (doc) live.set(roomId, doc)
  }
  return doc
}

async function flush(roomId) {
  const doc = live.get(roomId)
  if (!doc?._dirty) return
  doc._dirty = false
  await battles().updateOne({ _id: roomId, status: 'playing' }, { $set: { reps: doc.reps } })
}

/** Санах ой дээр rep нэмнэ. Цонхны гадуур ирсэн бол хүлээж авахгүй. */
function bumpRep(doc, userId, n) {
  if (doc.status !== 'playing' || !doc.startsAt || !doc.endsAt) return false
  const now = Date.now()
  if (now < new Date(doc.startsAt).getTime() || now >= new Date(doc.endsAt).getTime()) return false
  const current = doc.reps[userId] ?? 0
  if (current >= MAX_REPS) return false
  doc.reps[userId] = current + n
  doc._dirty = true
  return true
}

async function authenticate(message) {
  if (DEV_AUTH && message.devUser) {
    return { userId: message.devUser, name: message.devName ?? message.devUser }
  }
  if (!message.token) return null
  const user = await verifyToken(message.token)
  return user ? { userId: user.user_id, name: user.name } : null
}

/**
 * Хугацаа нь дуусмагц хаана. Клиентийн мессежийг хүлээвэл хожигдож байгаа
 * тал зүгээр л дуугүй болоод тулааныг дуусгахгүй байлгаж чадна.
 */
function scheduleSettle(roomId, endsAt) {
  const wait = Math.max(0, new Date(endsAt).getTime() - Date.now())
  setTimeout(async () => {
    try {
      await flush(roomId)
      const done = await settleIfDue(roomId)
      if (done) {
        live.delete(roomId)
        broadcast(roomId, done)
      }
    } catch (err) {
      console.error('settle алдаа:', err.message)
    }
  }, wait + 250)
}

/** Өрсөлдөгч ирэхгүй бол тулааныг цуцалж, хүнийг мөнхөд хүлээлгэхгүй. */
function scheduleWaitTimeout(roomId, createdAt, waitMs) {
  const wait = Math.max(0, new Date(createdAt).getTime() + waitMs - Date.now())
  setTimeout(async () => {
    try {
      const dead = await cancelIfStale(roomId)
      if (dead) {
        live.delete(roomId)
        broadcast(roomId, dead)
      }
    } catch (err) {
      console.error('cancel алдаа:', err.message)
    }
  }, wait + 250)
}

export function attachBattleSocket(server) {
  const wss = new WebSocketServer({ noServer: true })

  // Санах ой дээрх тоог үе үе дискэнд буулгана — сервер унасан ч бүх
  // явц алдагдахгүй.
  setInterval(() => {
    for (const roomId of live.keys()) flush(roomId).catch(() => {})
  }, 2_000).unref()

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, 'http://localhost')
    if (url.pathname !== '/api/battle/socket') return socket.destroy()
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws))
  })

  wss.on('connection', (socket) => {
    const authTimer = setTimeout(() => socket.close(4001, 'authentication timeout'), 8000)

    socket.on('message', async (raw) => {
      let message
      try {
        message = JSON.parse(raw)
      } catch {
        return
      }

      if (message.type === 'auth') {
        const user = await authenticate(message)
        if (!user) return socket.close(4003, 'unauthorized')
        const doc = await load(message.roomId)
        if (!doc || !doc.players.includes(user.userId)) {
          return socket.close(4004, 'not a participant')
        }
        clearTimeout(authTimer)
        socket.user = user
        socket.roomId = message.roomId
        const set = rooms.get(socket.roomId) ?? new Set()
        set.add(socket)
        rooms.set(socket.roomId, set)

        // Цагийг ХОЁУЛАА ОРСНЫ ДАРАА тавина. Үүсгэх агшнаас тоолж эхэлбэл
        // камераа удаан ачаалсан хүн секунд алдана.
        const here = new Set([...set].map((s) => s.user.userId))
        if (doc.status === 'waiting' && doc.players.every((id) => here.has(id))) {
          const started = await start(socket.roomId)
          if (started) {
            live.set(socket.roomId, started)
            broadcast(socket.roomId, started)
            scheduleSettle(socket.roomId, started.endsAt)
            return
          }
        }

        send(socket, { type: 'state', state: view(doc, user.userId) })
        if (doc.status === 'playing') scheduleSettle(socket.roomId, doc.endsAt)
        if (doc.status === 'waiting') scheduleWaitTimeout(socket.roomId, doc.createdAt, 45_000)
        return
      }

      if (!socket.user) return

      if (message.type === 'rep') {
        const doc = live.get(socket.roomId)
        const n = Math.max(1, Math.min(Math.round(message.n) || 1, 5))
        if (doc && bumpRep(doc, socket.user.userId, n)) broadcast(socket.roomId, doc)
        return
      }

      // WebRTC-ийн offer/answer/ICE-ийг нөгөө тал руу дамжуулна. Агуулгыг нь
      // сервер уншихгүй — зөвхөн ижил өрөөний нөгөө оролцогч руу хүргэнэ.
      if (message.type === 'signal') {
        for (const peer of rooms.get(socket.roomId) ?? []) {
          if (peer !== socket) send(peer, { type: 'signal', from: socket.user.userId, data: message.data })
        }
        return
      }

      if (message.type === 'ping') send(socket, { type: 'pong' })
    })

    socket.on('close', () => {
      clearTimeout(authTimer)
      leave(socket)
    })
    socket.on('error', () => leave(socket))
  })
}
