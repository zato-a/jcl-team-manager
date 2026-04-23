// =========================================
// JCL チームマネージャー データモデル
// =========================================

export type Gender = 'male' | 'female'

export interface Player {
  id: string
  name: string
  fargoRate: number
  fargoId?: string     // FargoRate上のreadableId（同名解決後に保存、次回更新時はID直引き）
  gender: Gender
  isUnder25: boolean
  notes?: string
}

/** 1試合のラインナップ記録（4人） */
export interface Lineup {
  id: string
  matchId: string
  playerIds: string[]
  penalty: number
  bonus: number
  result?: 'win' | 'loss' | 'draw'
  doublePlayerId?: string   // 重複出場（2回出場）選手のID（1人まで）
}

export interface Team {
  id: string
  name: string
  colorIndex: number   // COLOR_PALETTE のインデックス
}

export interface AppSettings {
  leagueName: string
  minAppearances: number
  maxAbsences: number
  fargoLimit: number
  bonusFemale: number
  bonusUnder25: number
  bonusUnder25Female: number
}

// =========================================
// スケジュール
// =========================================

export interface ScheduleMatch {
  id: string
  date: string       // "4月16日"
  dateISO: string    // "2026-04-16"
  home: string
  visiting: string
  location: string
  isPlayoff?: boolean
}
