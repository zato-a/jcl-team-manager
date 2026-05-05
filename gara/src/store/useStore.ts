import { useCallback, useEffect, useState } from 'react'
import type { AppData, Config, Game, Player } from '../types'
import { computeRatingDeltas } from '../lib/elo'

const STORAGE_KEY = 'gara:data:v1'

const DEFAULT_CONFIG: Config = { initialRating: 1500, kFactor: 32 }
const DEFAULT_DATA: AppData = { players: [], games: [], config: DEFAULT_CONFIG }

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function loadFromStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DATA
    const parsed = JSON.parse(raw) as Partial<AppData>
    return {
      players: parsed.players ?? [],
      games: parsed.games ?? [],
      config: { ...DEFAULT_CONFIG, ...(parsed.config ?? {}) },
    }
  } catch {
    return DEFAULT_DATA
  }
}

function saveToStorage(d: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
  } catch {
    // localStorage が満杯/不可: 静かに失敗
  }
}

// 試合履歴から全プレイヤーのレートを再計算する。
// 削除や設定変更で過去のΔが変わるため、常に古い順に replay する。
function recomputeAll(players: Player[], games: Game[], config: Config): { players: Player[]; games: Game[] } {
  const ratingMap = new Map<string, number>()
  for (const p of players) ratingMap.set(p.id, config.initialRating)

  const sorted = [...games].sort((a, b) => a.playedAt.localeCompare(b.playedAt))
  const updatedGames: Game[] = []
  for (const g of sorted) {
    const validParticipants = g.participantIds.every(id => ratingMap.has(id))
    if (!validParticipants) {
      updatedGames.push(g)
      continue
    }
    const ratings = g.participantIds.map(id => ratingMap.get(id)!)
    const loserIdx = g.participantIds.indexOf(g.loserId)
    if (loserIdx < 0) {
      updatedGames.push(g)
      continue
    }
    const deltas = computeRatingDeltas(ratings, loserIdx, config.kFactor)
    const ratingDeltas: Record<string, number> = {}
    g.participantIds.forEach((id, i) => {
      ratingDeltas[id] = deltas[i]
      ratingMap.set(id, ratingMap.get(id)! + deltas[i])
    })
    updatedGames.push({ ...g, ratingDeltas })
  }

  const newPlayers = players.map(p => ({ ...p, rating: ratingMap.get(p.id) ?? config.initialRating }))
  updatedGames.sort((a, b) => b.playedAt.localeCompare(a.playedAt))
  return { players: newPlayers, games: updatedGames }
}

export function useStore() {
  const [data, setData] = useState<AppData>(() => loadFromStorage())

  useEffect(() => {
    saveToStorage(data)
  }, [data])

  const addPlayer = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setData(d => ({
      ...d,
      players: [
        ...d.players,
        {
          id: uid(),
          name: trimmed,
          rating: d.config.initialRating,
          createdAt: new Date().toISOString(),
        },
      ],
    }))
  }, [])

  const renamePlayer = useCallback((id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setData(d => ({
      ...d,
      players: d.players.map(p => (p.id === id ? { ...p, name: trimmed } : p)),
    }))
  }, [])

  const deletePlayer = useCallback((id: string) => {
    setData(d => {
      const remaining = d.players.filter(p => p.id !== id)
      const remainingGames = d.games.filter(g => !g.participantIds.includes(id))
      const recomputed = recomputeAll(remaining, remainingGames, d.config)
      return { ...d, ...recomputed }
    })
  }, [])

  const recordGame = useCallback((participantIds: string[], loserId: string, playedAt?: string) => {
    setData(d => {
      if (participantIds.length < 2) return d
      if (!participantIds.includes(loserId)) return d
      const ratings = participantIds.map(id => {
        const p = d.players.find(x => x.id === id)
        return p ? p.rating : d.config.initialRating
      })
      const loserIdx = participantIds.indexOf(loserId)
      const deltas = computeRatingDeltas(ratings, loserIdx, d.config.kFactor)
      const ratingDeltas: Record<string, number> = {}
      participantIds.forEach((id, i) => {
        ratingDeltas[id] = deltas[i]
      })
      const updatedPlayers = d.players.map(p => {
        const i = participantIds.indexOf(p.id)
        return i >= 0 ? { ...p, rating: p.rating + deltas[i] } : p
      })
      const game: Game = {
        id: uid(),
        playedAt: playedAt ?? new Date().toISOString(),
        participantIds,
        loserId,
        ratingDeltas,
      }
      return {
        ...d,
        players: updatedPlayers,
        games: [game, ...d.games],
      }
    })
  }, [])

  const deleteGame = useCallback((gameId: string) => {
    setData(d => {
      const remaining = d.games.filter(g => g.id !== gameId)
      const recomputed = recomputeAll(d.players, remaining, d.config)
      return { ...d, ...recomputed }
    })
  }, [])

  const updateConfig = useCallback((cfg: Partial<Config>) => {
    setData(d => {
      const nextConfig = { ...d.config, ...cfg }
      const recomputed = recomputeAll(d.players, d.games, nextConfig)
      return { ...d, config: nextConfig, ...recomputed }
    })
  }, [])

  const importData = useCallback((next: AppData) => {
    const config = { ...DEFAULT_CONFIG, ...next.config }
    const recomputed = recomputeAll(next.players, next.games, config)
    setData({ config, ...recomputed })
  }, [])

  const resetAll = useCallback(() => {
    setData(DEFAULT_DATA)
  }, [])

  return {
    data,
    addPlayer,
    renamePlayer,
    deletePlayer,
    recordGame,
    deleteGame,
    updateConfig,
    importData,
    resetAll,
  }
}

export type Store = ReturnType<typeof useStore>
