import { useMemo } from 'react'
import type { Store } from '../store/useStore'
import { computeAllStats, emptyStats, type RatingPoint } from '../lib/stats'

interface Props {
  playerId: string
  store: Store
  onClose: () => void
}

function RatingChart({ points }: { points: RatingPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-slate-500">
        試合データが2件以上あるとグラフを表示します
      </div>
    )
  }
  const ratings = points.map(p => p.rating)
  const min = Math.min(...ratings)
  const max = Math.max(...ratings)
  const range = Math.max(1, max - min)
  const w = 320
  const h = 100
  const pad = 8
  const stepX = (w - pad * 2) / (points.length - 1)
  const ys = ratings.map(r => h - pad - ((r - min) / range) * (h - pad * 2))
  const xs = points.map((_, i) => pad + i * stepX)
  const path = points.map((_, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${ys[i].toFixed(1)}`).join(' ')

  return (
    <div className="bg-slate-900 rounded p-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#334155" strokeWidth="1" />
        <path d={path} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round" />
        {points.map((_, i) => (
          <circle key={i} cx={xs[i]} cy={ys[i]} r="1.6" fill="#60a5fa" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1">
        <span>min {min.toFixed(0)}</span>
        <span>max {max.toFixed(0)}</span>
      </div>
    </div>
  )
}

export function PlayerDetailModal({ playerId, store, onClose }: Props) {
  const { data } = store
  const player = data.players.find(p => p.id === playerId)

  const { stats, history } = useMemo(
    () => computeAllStats(data.players, data.games, data.config.initialRating),
    [data.players, data.games, data.config.initialRating],
  )

  if (!player) {
    return null
  }

  const s = stats.get(playerId) ?? emptyStats(data.config.initialRating)
  const points = history.get(playerId) ?? []

  const opponentRecord = new Map<string, { games: number; lossesByMe: number; lossesByThem: number }>()
  for (const g of data.games) {
    if (!g.participantIds.includes(playerId)) continue
    for (const id of g.participantIds) {
      if (id === playerId) continue
      const r = opponentRecord.get(id) ?? { games: 0, lossesByMe: 0, lossesByThem: 0 }
      r.games += 1
      if (g.loserId === playerId) r.lossesByMe += 1
      if (g.loserId === id) r.lossesByThem += 1
      opponentRecord.set(id, r)
    }
  }
  const opponents = [...opponentRecord.entries()]
    .map(([id, r]) => ({
      player: data.players.find(p => p.id === id),
      ...r,
    }))
    .filter(x => x.player)
    .sort((a, b) => b.games - a.games)

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-100 truncate">{player.name}</h2>
          <button
            onClick={onClose}
            className="px-2 py-1 text-slate-400 hover:text-slate-200"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-900 rounded p-3">
              <div className="text-xs text-slate-500">現在レート</div>
              <div className="text-2xl font-mono font-semibold text-blue-400 tabular-nums">
                {Math.round(player.rating)}
              </div>
            </div>
            <div className="bg-slate-900 rounded p-3">
              <div className="text-xs text-slate-500">試合数</div>
              <div className="text-2xl font-mono font-semibold text-slate-100 tabular-nums">
                {s.games}
              </div>
            </div>
            <div className="bg-slate-900 rounded p-3">
              <div className="text-xs text-slate-500">勝率</div>
              <div className="text-2xl font-mono font-semibold text-emerald-400 tabular-nums">
                {s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0}%
              </div>
              <div className="text-[10px] text-slate-500">{s.wins}勝 / {s.losses}負</div>
            </div>
            <div className="bg-slate-900 rounded p-3">
              <div className="text-xs text-slate-500">期待負け数</div>
              <div className="text-2xl font-mono font-semibold text-amber-400 tabular-nums">
                {s.expectedLosses.toFixed(1)}
              </div>
              <div className="text-[10px] text-slate-500">
                実際 {s.losses} 回（{s.losses < s.expectedLosses ? '期待より少' : s.losses > s.expectedLosses ? '期待より多' : '期待通り'}）
              </div>
            </div>
            <div className="bg-slate-900 rounded p-3">
              <div className="text-xs text-slate-500">ピーク</div>
              <div className="text-lg font-mono font-semibold text-slate-200 tabular-nums">
                {Math.round(s.ratingPeak)}
              </div>
            </div>
            <div className="bg-slate-900 rounded p-3">
              <div className="text-xs text-slate-500">最低</div>
              <div className="text-lg font-mono font-semibold text-slate-200 tabular-nums">
                {Math.round(s.ratingLow)}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1.5 px-1">レート推移</div>
            <RatingChart points={points} />
          </div>

          {opponents.length > 0 && (
            <div>
              <div className="text-xs text-slate-400 mb-1.5 px-1">対戦相手別</div>
              <ul className="space-y-1">
                {opponents.map(({ player: op, games, lossesByMe, lossesByThem }) => (
                  <li
                    key={op!.id}
                    className="bg-slate-900 rounded px-3 py-2 flex items-center justify-between text-sm"
                  >
                    <span className="truncate text-slate-200">{op!.name}</span>
                    <span className="text-xs font-mono tabular-nums text-slate-400 shrink-0">
                      <span className="text-emerald-400">{games - lossesByMe}</span>
                      {' / '}
                      <span className="text-red-400">{lossesByMe}</span>
                      <span className="text-slate-600 ml-2">同卓{games}</span>
                      <span className="text-slate-600 ml-2">相手負{lossesByThem}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-slate-600 mt-1 px-1">
                緑/赤 = 自分が勝った/負けた回数（同卓した試合のうち）
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
