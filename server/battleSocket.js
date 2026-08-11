import { WebSocket, WebSocketServer } from 'ws'
import { addRep, settleIfDue, view } from './battle.js'
import { verifyToken } from './auth.js'
import { battles } from './db.js'

const DEV_AUTH = process.env.ALLOW_DEV_AUTH === '1' && !process.env.USION_SERVICE_ID

/** roomId → Set<socket> */
const rooms = new Map()

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
}

function broadcast(roomId, battle) {
  for (const socket of rooms.get(roomId) ?? []) {
    send(socket, { type: 'state', state: view(battle, socket.user.userId) })
  }
}

function leave(socket) {
  const set = rooms.get(socket.roomId)
  set?.delete(socket)
  if (set?.size === 0) rooms.delete(socket.roomId)
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
      const done = await settleIfDue(roomId)
      if (done) broadcast(roomId, done)
    } catch (err) {
      console.error('settle алдаа:', err.message)
    }
  }, wait + 250)
}

export function attachBattleSocket(server) {
  const wss = new WebSocketServer({ noServer: true })

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
        const battle = await battles().findOne({ _id: message.roomId })
        if (!battle || !battle.players.includes(user.userId)) {
          return socket.close(4004, 'not a participant')
        }
        clearTimeout(authTimer)
        socket.user = user
        socket.roomId = message.roomId
        const set = rooms.get(socket.roomId) ?? new Set()
        set.add(socket)
        rooms.set(socket.roomId, set)
        send(socket, { type: 'state', state: view(battle, user.userId) })
        if (battle.status === 'playing') scheduleSettle(socket.roomId, battle.endsAt)
        return
      }

      if (!socket.user) return

      if (message.type === 'rep') {
        const updated = await addRep(socket.roomId, socket.user.userId, message.n)
        // updated нь null бол цонхны гадуур ирсэн rep — чимээгүй хаяна
        if (updated) broadcast(socket.roomId, updated)
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
