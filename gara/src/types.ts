export interface Player {
  id: string
  name: string
  rating: number
  createdAt: string
}

export interface Game {
  id: string
  playedAt: string
  participantIds: string[]
  loserId: string
  ratingDeltas: Record<string, number>
}

export interface Config {
  initialRating: number
  kFactor: number
}

export interface AppData {
  players: Player[]
  games: Game[]
  config: Config
}

export interface PlayerStats {
  games: number
  losses: number
  wins: number
  lossRate: number
  expectedLosses: number
  ratingPeak: number
  ratingLow: number
}
