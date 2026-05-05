import { useMemo } from 'react'
import type { Store } from '../store/useStore'

interface Props {
  store: Store
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return iso
  }
}

export function HistoryPanel({ store }: Props) {
  const { data, deleteGame } = store
  const playerMap = useMemo(() => new Map(data.players.map(p => [p.id, p])), [data.players])

  const handleDelete = (id: string) => {
    if (confirm('この試合記録を削除しますか？\n以降のレートが再計算されます。')) {
      deleteGame(id)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-sm font-semibold text-slate-300">試合履歴（{data.games.length}件）</h2>
        <span className="text-xs text-slate-500">新しい順</span>
      </div>

      {data.games.length === 0 ? (
        <p className="text-slate-500 text-center py-8">まだ試合記録がありません</p>
      ) : (
        <ul className="space-y-2">
          {data.games.map(g => {
            const loser = playerMap.get(g.loserId)
            return (
              <li key={g.id} className="bg-slate-800 rounded-lg p-3">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs text-slate-500">{formatDate(g.playedAt)}</span>
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    削除
                  </button>
                </div>
                <div className="text-sm mb-2">
                  <span className="text-slate-400">負け: </span>
                  <span className="text-red-400 font-medium">
                    {loser?.name ?? '（削除済み）'}
                  </span>
                  <span className="text-slate-500 text-xs ml-2">
                    （{g.participantIds.length}人）
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                  {g.participantIds.map(id => {
                    const p = playerMap.get(id)
                    const delta = g.ratingDeltas[id] ?? 0
                    const isLoser = id === g.loserId
                    return (
                      <div key={id} className="flex items-baseline justify-between text-xs">
                        <span className={`truncate ${isLoser ? 'text-red-300' : 'text-slate-300'}`}>
                          {p?.name ?? '（削除済み）'}
                        </span>
                        <span className={`font-mono tabular-nums ${delta < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
