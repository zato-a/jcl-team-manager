import type { ScheduleMatch } from '../types'

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
