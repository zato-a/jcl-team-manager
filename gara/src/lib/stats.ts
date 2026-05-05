import type { Game, Player, PlayerStats } from '../types'
import { expectedLossProbabilities } from './elo'

export interface RatingPoint {
  playedAt: string
  rating: number
  gameId: string | null
}

// 全プレイヤーの統計を一括計算（過去ゲームを古い順に再生）
export function computeAllStats(
  players: Player[],
  games: Game[],
  initialRating: number,
): {
  stats: Map<string, PlayerStats>
  history: Map<string, RatingPoint[]>
} {
  const ratingMap = new Map<string, number>()
  const stats = new Map<string, PlayerStats>()
  const history = new Map<string, RatingPoint[]>()

  for (const p of players) {
    ratingMap.set(p.id, initialRating)
    stats.set(p.id, {
      games: 0,
      losses: 0,
      wins: 0,
      lossRate: 0,
      expectedLosses: 0,
      ratingPeak: initialRating,
      ratingLow: initialRating,
    })
    history.set(p.id, [{ playedAt: p.createdAt, rating: initialRating, gameId: null }])
  }

  const sorted = [...games].sort((a, b) => a.playedAt.localeCompare(b.playedAt))
  for (const g of sorted) {
    if (!g.participantIds.every(id => ratingMap.has(id))) continue
    if (!g.participantIds.includes(g.loserId)) continue

    const ratings = g.participantIds.map(id => ratingMap.get(id)!)
    const probs = expectedLossProbabilities(ratings)

    g.participantIds.forEach((id, i) => {
      const s = stats.get(id)!
      const isLoser = id === g.loserId
      const delta = g.ratingDeltas[id] ?? 0
      const newRating = ratingMap.get(id)! + delta
      ratingMap.set(id, newRating)

      s.games += 1
      s.expectedLosses += probs[i]
      if (isLoser) s.losses += 1
      else s.wins += 1
      s.lossRate = s.losses / s.games
      if (newRating > s.ratingPeak) s.ratingPeak = newRating
      if (newRating < s.ratingLow) s.ratingLow = newRating

      history.get(id)!.push({ playedAt: g.playedAt, rating: newRating, gameId: g.id })
    })
  }

  return { stats, history }
}

export function emptyStats(initialRating: number): PlayerStats {
  return {
    games: 0,
    losses: 0,
    wins: 0,
    lossRate: 0,
    expectedLosses: 0,
    ratingPeak: initialRating,
    ratingLow: initialRating,
  }
}
