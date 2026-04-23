import { useState, useCallback } from 'react'
import type { Player, Lineup, AppSettings, Team } from '../types'
import { JCL_RULES, loadTeam, saveTeam, clearTeam, getActiveSchedule } from '../data/schedule'

const KEYS = {
  players:  'jcl:players',
  lineups:  'jcl:lineups',
  settings: 'jcl:settings',
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

const DEFAULT_SETTINGS: AppSettings = {
  leagueName: '',
  minAppearances: JCL_RULES.defaultMinAppearances,
  maxAbsences: 2,
  fargoLimit: JCL_RULES.maxFargoTotal,
  bonusFemale: JCL_RULES.bonusFemale,
  bonusUnder25: JCL_RULES.bonusUnder25,
  bonusUnder25Female: JCL_RULES.bonusUnder25Female,
}

// =========================================
// Fargo 計算ユーティリティ
// =========================================
export function calcFargoTotal(players: Player[]): number {
  return players.reduce((s, p) => s + p.fargoRate, 0)
}

export function calcPenalty(total: number, limit: number): number {
  return Math.max(0, total - limit)
}

export function calcBonus(players: Player[], settings: AppSettings): number {
  return players.reduce((s, p) => {
    if (p.gender === 'female' && p.isUnder25) return s + settings.bonusUnder25Female
    if (p.gender === 'female') return s + settings.bonusFemale
    if (p.isUnder25) return s + settings.bonusUnder25
    return s
  }, 0)
}

// =========================================
// カスタムフック
// =========================================
export function useStore() {
  const [team, setTeamState] = useState<Team | null>(() => loadTeam())
  const [players, setPlayersState] = useState<Player[]>(() => load<Player[]>(KEYS.players, []))
  const [lineups, setLineupsState] = useState<Lineup[]>(() => load<Lineup[]>(KEYS.lineups, []))
  const [settings, setSettingsState] = useState<AppSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...load<Partial<AppSettings>>(KEYS.settings, {}),
  }))

  const setTeam = useCallback((t: Team | null) => {
    setTeamState(t)
    if (t) saveTeam(t); else clearTeam()
  }, [])

  const setPlayers = useCallback((next: Player[]) => {
    setPlayersState(next)
    save(KEYS.players, next)
  }, [])

  const setLineups = useCallback((next: Lineup[]) => {
    setLineupsState(next)
    save(KEYS.lineups, next)
  }, [])

  const setSettings = useCallback((next: AppSettings) => {
    setSettingsState(next)
    save(KEYS.settings, next)
  }, [])

  // ---- Player CRUD ----
  const addPlayer = useCallback((p: Omit<Player, 'id'>) => {
    setPlayers([...players, { ...p, id: crypto.randomUUID() }])
  }, [players, setPlayers])

  const updatePlayer = useCallback((p: Player) => {
    setPlayers(players.map(x => x.id === p.id ? p : x))
  }, [players, setPlayers])

  const deletePlayer = useCallback((id: string) => {
    setPlayers(players.filter(x => x.id !== id))
  }, [players, setPlayers])

  const bulkUpdatePlayers = useCallback((updates: Player[]) => {
    if (updates.length === 0) return
    const map = new Map(updates.map(p => [p.id, p]))
    setPlayers(players.map(p => map.get(p.id) ?? p))
  }, [players, setPlayers])

  // ---- Lineup CRUD ----
  const upsertLineup = useCallback((lineup: Omit<Lineup, 'id' | 'penalty' | 'bonus'> & { id?: string }) => {
    const selectedPlayers = players.filter(p => lineup.playerIds.includes(p.id))
    const total = calcFargoTotal(selectedPlayers)
    const complete: Lineup = {
      id: lineup.id ?? crypto.randomUUID(),
      matchId: lineup.matchId,
      playerIds: lineup.playerIds,
      result: lineup.result,
      doublePlayerId: lineup.doublePlayerId,
      penalty: calcPenalty(total, settings.fargoLimit),
      bonus: calcBonus(selectedPlayers, settings),
    }
    const exists = lineups.find(l => l.matchId === lineup.matchId)
    if (exists) {
      setLineups(lineups.map(l => l.matchId === lineup.matchId ? complete : l))
    } else {
      setLineups([...lineups, complete])
    }
  }, [players, lineups, settings, setLineups])

  const deleteLineup = useCallback((matchId: string) => {
    setLineups(lineups.filter(l => l.matchId !== matchId))
  }, [lineups, setLineups])

  // ---- Derived ----
  const getLineup = useCallback((matchId: string) =>
    lineups.find(l => l.matchId === matchId),
    [lineups]
  )

  const getAppearanceCount = useCallback((playerId: string) => {
    const schedule = getActiveSchedule()
    return lineups.reduce((sum, l) => {
      if (!l.playerIds.includes(playerId)) return sum
      // プレーオフはカウントしない
      const match = schedule.find(m => m.id === l.matchId)
      if (match?.isPlayoff) return sum
      // 重複出場カード（doublePlayerId）はカウントしない（同一週の別カードで1回分計上済み）
      if (l.doublePlayerId === playerId) return sum
      return sum + 1
    }, 0)
  }, [lineups])

  return {
    team,
    setTeam,
    players,
    lineups,
    settings,
    setSettings,
    addPlayer,
    updatePlayer,
    bulkUpdatePlayers,
    deletePlayer,
    upsertLineup,
    deleteLineup,
    getLineup,
    getAppearanceCount,
  }
}

export type Store = ReturnType<typeof useStore>
