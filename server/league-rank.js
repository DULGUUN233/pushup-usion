export const LEAGUE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const METRICS = {
  pushup: { score: 'totalReps', best: 'bestSet' },
  squat: { score: 'squatTotalReps', best: 'squatBestSet' },
  battle: { score: 'rating', best: 'wins' },
}

export function normalizeMetric(value) {
  return Object.hasOwn(METRICS, value) ? value : 'pushup'
}

export function makeLeagueCode(random = Math.random) {
  return Array.from({ length: 6 }, () => {
    const index = Math.floor(random() * LEAGUE_CODE_ALPHABET.length)
    return LEAGUE_CODE_ALPHABET[Math.min(index, LEAGUE_CODE_ALPHABET.length - 1)]
  }).join('')
}

export function rankUsers(list, metricValue) {
  const metric = normalizeMetric(metricValue)
  const fields = METRICS[metric]
  const sorted = [...list].sort((a, b) => {
    const score = (b[fields.score] ?? 0) - (a[fields.score] ?? 0)
    if (score) return score
    const best = (b[fields.best] ?? 0) - (a[fields.best] ?? 0)
    if (best) return best
    return String(a.name ?? a._id).localeCompare(String(b.name ?? b._id))
  })

  let lastScore
  let lastRank = 0
  return sorted.map((user, index) => {
    const score = user[fields.score] ?? 0
    if (score !== lastScore) lastRank = index + 1
    lastScore = score
    return {
      rank: lastRank,
      userId: user._id,
      name: user.name,
      avatar: user.avatar ?? null,
      score,
      bestSet: metric === 'pushup' ? user.bestSet ?? 0 : user.squatBestSet ?? 0,
      rating: user.rating ?? 1000,
      battles: user.battles ?? 0,
      wins: user.wins ?? 0,
      losses: user.losses ?? 0,
      draws: user.draws ?? 0,
    }
  })
}

export function gapToNext(rows, userId) {
  const index = rows.findIndex((row) => row.userId === userId)
  if (index <= 0) return null
  const own = rows[index]
  const next = rows.slice(0, index).reverse().find((row) => row.rank < own.rank)
  return next ? Math.max(1, next.score - own.score + 1) : 1
}
