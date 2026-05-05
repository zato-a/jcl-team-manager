import { useMemo, useState } from 'react'
import type { Store } from '../store/useStore'
import { computeAllStats, emptyStats } from '../lib/stats'
import { PlayerDetailModal } from './PlayerDetailModal'

interface Props {
  store: Store
}

export function PlayerListPanel({ store }: Props) {
  const { data, addPlayer, renamePlayer, deletePlayer } = store
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)

  const { stats } = useMemo(
    () => computeAllStats(data.players, data.games, data.config.initialRating),
    [data.players, data.games, data.config.initialRating],
  )

  const sorted = useMemo(
    () => [...data.players].sort((a, b) => b.rating - a.rating),
    [data.players],
  )

  const submit = () => {
    if (!name.trim()) return
    addPlayer(name)
    setName('')
  }

  const startEdit = (id: string, current: string) => {
    setEditingId(id)
    setEditingName(current)
  }

  const commitEdit = () => {
    if (editingId) renamePlayer(editingId, editingName)
    setEditingId(null)
    setEditingName('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`「${name}」を削除しますか？\nこのプレイヤーが参加した試合履歴も削除されます。`)) {
      deletePlayer(id)
    }
  }

  return (
    <div className="space-y-4">
      <section className="bg-slate-800 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-2">プレイヤーを追加</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="名前"
            className="flex-1 px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition"
          >
            追加
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-2 px-1">
          <h2 className="text-sm font-semibold text-slate-300">プレイヤー一覧（{sorted.length}人）</h2>
          <span className="text-xs text-slate-500">レート順</span>
        </div>
        {sorted.length === 0 ? (
          <p className="text-slate-500 text-center py-8">まだプレイヤーがいません</p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((p, idx) => {
              const s = stats.get(p.id) ?? emptyStats(data.config.initialRating)
              const isEditing = editingId === p.id
              return (
                <li
                  key={p.id}
                  className="bg-slate-800 rounded-lg p-3 flex items-center gap-3"
                >
                  <div className="w-8 text-center text-slate-500 font-mono text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit()
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-sm"
                        />
                        <button onClick={commitEdit} className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs">OK</button>
                        <button onClick={cancelEdit} className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs">×</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDetailId(p.id)}
                        className="text-left w-full"
                      >
                        <div className="font-medium text-slate-100 truncate">{p.name}</div>
                        <div className="text-xs text-slate-400">
                          {s.games}試合 · 負け{s.losses} · 勝率 {s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0}%
                        </div>
                      </button>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-lg font-semibold text-blue-400 tabular-nums">
                      {Math.round(p.rating)}
                    </div>
                  </div>
                  {!isEditing && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(p.id, p.name)}
                        className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs"
                        aria-label="編集"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="px-2 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-200 text-xs"
                        aria-label="削除"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {detailId && (
        <PlayerDetailModal
          playerId={detailId}
          store={store}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  )
}
