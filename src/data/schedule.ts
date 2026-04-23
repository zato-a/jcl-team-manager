import type { ScheduleMatch, Team } from '../types'

// =========================================
// カスタムスケジュール（localStorage）
// =========================================
export const CUSTOM_SCHEDULE_KEY = 'jcl:custom_schedule'

export function loadCustomSchedule(): ScheduleMatch[] | null {
  try {
    const raw = localStorage.getItem(CUSTOM_SCHEDULE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveCustomSchedule(matches: ScheduleMatch[]) {
  localStorage.setItem(CUSTOM_SCHEDULE_KEY, JSON.stringify(matches))
}

export function clearCustomSchedule() {
  localStorage.removeItem(CUSTOM_SCHEDULE_KEY)
}

// =========================================
// カラーパレット
// =========================================
export const COLOR_PALETTE = [
  { bg: 'bg-blue-500',    text: 'text-blue-400',    active: 'text-blue-400 border-blue-500',    cardBg: 'bg-blue-950/50 border-blue-800/60'    },
  { bg: 'bg-purple-500',  text: 'text-purple-400',  active: 'text-purple-400 border-purple-500',  cardBg: 'bg-purple-950/50 border-purple-800/60'  },
  { bg: 'bg-emerald-500', text: 'text-emerald-400', active: 'text-emerald-400 border-emerald-500', cardBg: 'bg-emerald-950/50 border-emerald-800/60' },
  { bg: 'bg-orange-500',  text: 'text-orange-400',  active: 'text-orange-400 border-orange-500',  cardBg: 'bg-orange-950/50 border-orange-800/60'  },
  { bg: 'bg-red-500',     text: 'text-red-400',     active: 'text-red-400 border-red-500',     cardBg: 'bg-red-950/50 border-red-800/60'     },
  { bg: 'bg-yellow-500',  text: 'text-yellow-400',  active: 'text-yellow-400 border-yellow-500',  cardBg: 'bg-yellow-950/50 border-yellow-800/60'  },
  { bg: 'bg-pink-500',    text: 'text-pink-400',    active: 'text-pink-400 border-pink-500',    cardBg: 'bg-pink-950/50 border-pink-800/60'    },
  { bg: 'bg-cyan-500',    text: 'text-cyan-400',    active: 'text-cyan-400 border-cyan-500',    cardBg: 'bg-cyan-950/50 border-cyan-800/60'    },
  { bg: 'bg-violet-500',  text: 'text-violet-400',  active: 'text-violet-400 border-violet-500',  cardBg: 'bg-violet-950/50 border-violet-800/60'  },
  { bg: 'bg-teal-500',    text: 'text-teal-400',    active: 'text-teal-400 border-teal-500',    cardBg: 'bg-teal-950/50 border-teal-800/60'    },
]

// =========================================
// チーム管理（localStorage）— 単一チーム
// =========================================
const TEAM_KEY = 'jcl:team'

export function loadTeam(): Team | null {
  try {
    const raw = localStorage.getItem(TEAM_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveTeam(team: Team): void {
  localStorage.setItem(TEAM_KEY, JSON.stringify(team))
}

export function clearTeam(): void {
  localStorage.removeItem(TEAM_KEY)
}

// =========================================
// JCL デフォルトルール定数
// =========================================
export const JCL_RULES = {
  maxFargoTotal: 1900,
  playersPerMatch: 4,
  penaltyPerPoint: 1,
  bonusUnder25: 5,
  bonusFemale: 5,
  bonusUnder25Female: 10,
  defaultMinAppearances: 8,
}

// =========================================
// スケジュール
// =========================================
export const SCHEDULE: ScheduleMatch[] = []

export function getActiveSchedule(): ScheduleMatch[] {
  const custom = loadCustomSchedule()
  if (custom && custom.length > 0) return custom
  return SCHEDULE
}

/** チーム名に関係する試合のみ返す（プレーオフ除く）— 出場回数カウント・残り試合計算用 */
export function getMatchesForTeam(teamName: string): ScheduleMatch[] {
  return getActiveSchedule().filter(m =>
    !m.isPlayoff && (m.home === teamName || m.visiting === teamName)
  )
}

/** チーム名に関係する全試合（プレーオフ含む）— 表示用 */
export function getAllMatchesForTeam(teamName: string): ScheduleMatch[] {
  return getActiveSchedule().filter(m =>
    m.home === teamName || m.visiting === teamName
  )
}
