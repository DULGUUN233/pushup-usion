// Elo тооцоо. Цэвэр функцууд — өгөгдлийн сан, сүлжээ хамаарахгүй тул шууд тестлэнэ.
// chess-puzzle/server/elo.js-тэй ижил бүтэц, зөвхөн эхлэх рейтинг өөр.

export const START_RATING = 1000
export const RATING_FLOOR = 100
/** Эхний 20 тулаанд хурдан байрлахын тулд K том байна. */
export const PROVISIONAL_BATTLES = 20
const K_PROVISIONAL = 40
const K_STABLE = 20

export function kFactor(battles) {
  return battles < PROVISIONAL_BATTLES ? K_PROVISIONAL : K_STABLE
}

/** Хожих магадлал: 0-1 хооронд. */
export function expectedScore(rating, opponentRating) {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400))
}

/**
 * Нэг тулааны дараах шинэ рейтинг.
 * score: хожвол 1, тэнцвэл 0.5, хожигдвол 0.
 */
export function nextRating({ rating, opponentRating, score, battles }) {
  const k = kFactor(battles)
  const delta = Math.round(k * (score - expectedScore(rating, opponentRating)))
  return Math.max(RATING_FLOOR, rating + delta)
}

/**
 * Тулааны үр дүнгээр хоёр талын шинэ рейтингийг гаргана.
 * winnerId нь null бол тэнцсэн гэж үзнэ.
 */
export function settleBattle({ a, b, winnerId }) {
  if (winnerId !== null && winnerId !== a.userId && winnerId !== b.userId) {
    throw new Error(`winnerId нь тоглогчдын аль нь ч биш: ${winnerId}`)
  }
  const scoreA = winnerId === null ? 0.5 : winnerId === a.userId ? 1 : 0

  return {
    [a.userId]: {
      before: a.rating,
      after: nextRating({
        rating: a.rating,
        opponentRating: b.rating,
        score: scoreA,
        battles: a.battles,
      }),
    },
    [b.userId]: {
      before: b.rating,
      after: nextRating({
        rating: b.rating,
        opponentRating: a.rating,
        score: 1 - scoreA,
        battles: b.battles,
      }),
    },
  }
}
