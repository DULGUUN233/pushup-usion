// Usion-ы iframe token-ыг сервер талд шалгана.
// Client-ийн хэлсэн user id-д ХЭЗЭЭ Ч итгэхгүй — заавал платформоор баталгаажуулна.

const API_URL = process.env.USION_API_URL ?? 'https://mobile.mongolai.mn'
const SERVICE_ID = process.env.USION_SERVICE_ID
// Dev нэвтрэлт нь ТОДОРХОЙ тугтай үед л асна. NODE_ENV дээр найдвал
// тохиргоо мартагдсан нээлттэй хаяг дээр хэн ч дурын хэрэглэгч болно.
const DEV_AUTH = process.env.ALLOW_DEV_AUTH === '1' && !SERVICE_ID

/** Богино хугацааны кэш — token бүрд платформ руу дуудахгүйн тулд. */
const cache = new Map()
const TTL_MS = 60_000

export async function verifyToken(token) {
  const hit = cache.get(token)
  if (hit && hit.expires > Date.now()) return hit.user

  const res = await fetch(`${API_URL}/iframe/verify-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, expected_service_id: SERVICE_ID }),
  })
  if (!res.ok) return null

  const user = await res.json()
  if (!user?.user_id) return null

  cache.set(token, { user, expires: Date.now() + TTL_MS })
  return user
}

/**
 * req.user = { userId, name, avatar } тавина.
 * SERVICE_ID байхгүй бөгөөд ALLOW_DEV_AUTH=1 үед x-dev-user толгойгоор
 * орохыг зөвшөөрнө — зөвхөн локал хөгжүүлэлтэд.
 */
export async function requireUser(req, res, next) {
  if (DEV_AUTH) {
    const devUser = req.get('x-dev-user')
    if (devUser) {
      req.user = { userId: devUser, name: req.get('x-dev-name') ?? devUser, avatar: null }
      return next()
    }
  }

  const header = req.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'token алга' })

  if (!SERVICE_ID) {
    return res.status(503).json({ error: 'USION_SERVICE_ID тохируулаагүй байна' })
  }

  let user
  try {
    user = await verifyToken(token)
  } catch (err) {
    console.error('verify-token алдаа:', err.message)
    return res.status(502).json({ error: 'баталгаажуулах үйлчилгээ хүрэхгүй байна' })
  }
  if (!user) return res.status(401).json({ error: 'token хүчингүй' })

  // Нэр, зураг Usion-оос ирнэ — бид өөрсдөө бүртгэл үүсгэхгүй
  req.user = { userId: user.user_id, name: user.name, avatar: user.avatar ?? null }
  next()
}

export const authMode = DEV_AUTH ? 'dev' : SERVICE_ID ? 'usion' : 'disabled'
