import { useMemo, useState } from 'react'
import type { Store } from '../store/useStore'
import { expectedLossProbabilities } from '../lib/elo'

interface Props {
  store: Store
}

export function GameInputPanel({ store }: Props) {
  const { data, recordGame } = store
  const [participantIds, setParticipantIds] = useState<string[]>([])
  const [loserId, setLoserId] = useState<string | null>(null)
  const [justSavedAt, setJustSavedAt] = useState<number | null>(null)

  const players = useMemo(
    () => [...data.players].sort((a, b) => b.rating - a.rating),
    [data.players],
  )

  const toggleParticipant = (id: string) => {
    setParticipantIds(prev => {
      if (prev.includes(id)) {
        if (loserId === id) setLoserId(null)
        return prev.filter(x => x !== id)
      }
      return [...prev, id]
    })
  }

  const canSubmit = participantIds.length >= 2 && loserId !== null

  const submit = () => {
    if (!canSubmit || !loserId) return
    recordGame(participantIds, loserId)
    setParticipantIds([])
    setLoserId(null)
    setJustSavedAt(Date.now())
    setTimeout(() => setJustSavedAt(prev => (prev && Date.now() - prev >= 1500 ? null : prev)), 1700)
  }

  const preview = useMemo(() => {
    if (participantIds.length < 2) return null
    const ratings = participantIds.map(id => {
      const p = data.players.find(x => x.id === id)
      return p?.rating ?? data.config.initialRating
    })
    const probs = expectedLossProbabilities(ratings)
    return participantIds.map((id, i) => {
      const p = data.players.find(x => x.id === id)!
      const prob = probs[i]
      const deltaLoss = data.config.kFactor * (prob - 1)
      const deltaWin = data.config.kFactor * prob
      return { player: p, prob, deltaLoss, deltaWin }
    })
  }, [participantIds, data.players, data.config])

  return (
    <div className="space-y-4">
      <section className="bg-slate-800 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-2">
          ① 参加者を選ぶ <span className="text-slate-500 font-normal">（{participantIds.length}人選択中）</span>
        </h2>
        {players.length < 2 ? (
          <p className="text-slate-500 text-sm py-4 text-center">
            プレイヤーを2人以上登録してください
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {players.map(p => {
              const selected = participantIds.includes(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => toggleParticipant(p.id)}
                  className={`px-3 py-2 rounded text-left transition ${
                    selected
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                      : 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className={`text-xs tabular-nums ${selected ? 'text-blue-100' : 'text-slate-500'}`}>
                    {Math.round(p.rating)}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {participantIds.length >= 2 && (
        <section className="bg-slate-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-2">② 負けた人を選ぶ</h2>
          <div className="space-y-1.5">
            {preview!.map(({ player, prob, deltaLoss, deltaWin }) => {
              const isLoser = loserId === player.id
              return (
                <button
                  key={player.id}
                  onClick={() => setLoserId(player.id)}
                  className={`w-full px-3 py-2.5 rounded flex items-center justify-between gap-2 transition ${
                    isLoser
                      ? 'bg-red-700 text-white ring-2 ring-red-400'
                      : 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium truncate">{player.name}</div>
                    <div className={`text-xs ${isLoser ? 'text-red-100' : 'text-slate-500'}`}>
                      負ける確率 {(prob * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono tabular-nums shrink-0">
                    <div className={isLoser ? 'text-red-100' : 'text-slate-400'}>
                      負: {deltaLoss > 0 ? '+' : ''}{deltaLoss.toFixed(1)}
                    </div>
                    <div className={isLoser ? 'text-red-100' : 'text-slate-500'}>
                      勝: +{deltaWin.toFixed(1)}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="w-full px-4 py-3 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold transition"
      >
        試合を記録する
      </button>

      {justSavedAt !== null && (
        <div className="text-center text-sm text-emerald-400">
          記録しました
        </div>
      )}
    </div>
  )
}
