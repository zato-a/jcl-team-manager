import { useState } from 'react'
import { getActiveSchedule, COLOR_PALETTE } from '../data/schedule'
import type { Team } from '../types'
import { ScheduleHelpModal } from './HelpModal'

const TODAY = new Date().toISOString().slice(0, 10)

interface Props {
  team: Team | null
  leagueName: string
}

export function ScheduleView({ team, leagueName }: Props) {
  const [showHelp, setShowHelp] = useState(false)
  const schedule = getActiveSchedule()
  const teamColor = team ? COLOR_PALETTE[team.colorIndex % COLOR_PALETTE.length] : null

  const grouped = schedule.reduce<Record<string, typeof schedule>>((acc, m) => {
    if (!acc[m.date]) acc[m.date] = []
    acc[m.date].push(m)
    return acc
  }, {})

  function isMyTeam(val: string) {
    return team ? val === team.name : false
  }

  function cellClass(val: string) {
    if (isMyTeam(val) && teamColor) return teamColor.text
    return 'text-slate-300'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-200">{leagueName || 'スケジュール'}</h2>
        <button
          className="w-7 h-7 rounded-full bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200 text-sm transition-colors shrink-0"
          onClick={() => setShowHelp(true)}
          aria-label="ヘルプ"
        >
          ?
        </button>
      </div>
      {showHelp && <ScheduleHelpModal onClose={() => setShowHelp(false)} />}

      {schedule.length === 0 ? (
        <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
          <p>スケジュールが登録されていません</p>
          <p className="text-sm mt-1">設定からPDFをインポートしてください</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-slate-400 text-left">
                <th className="px-4 py-3 font-medium">日付</th>
                <th className="px-4 py-3 font-medium">ホーム</th>
                <th className="px-4 py-3 font-medium">ビジター</th>
                <th className="px-4 py-3 font-medium">会場</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([, matches]) =>
                matches.map((m, i) => {
                  const isPast = m.dateISO < TODAY
                  const isToday = m.dateISO === TODAY

                  return (
                    <tr
                      key={m.id}
                      className={[
                        'border-t border-slate-700 transition-colors',
                        i === 0 && !m.isPlayoff ? 'border-t-2 border-t-slate-600' : '',
                        isToday ? 'bg-blue-950/40' : isPast ? 'opacity-50' : 'hover:bg-slate-800/60',
                        m.isPlayoff ? 'bg-yellow-900/20' : '',
                      ].join(' ')}
                    >
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                        {i === 0 && (
                          <span className={isToday ? 'text-blue-400 font-bold' : 'text-slate-300'}>
                            {m.date}
                          </span>
                        )}
                        {isToday && i === 0 && (
                          <span className="ml-2 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">今日</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cellClass(m.home)}>{m.home}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cellClass(m.visiting)}>{m.visiting}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{m.location}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {team && teamColor && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className={`w-2 h-2 rounded-full ${teamColor.bg}`} />
          <span className={teamColor.text}>{team.name}</span>
        </div>
      )}
    </div>
  )
}
