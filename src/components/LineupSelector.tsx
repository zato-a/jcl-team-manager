import { useState } from 'react'
import type { Player, AppSettings } from '../types'
import type { Store } from '../store/useStore'
import { calcFargoTotal, calcPenalty, calcBonus } from '../store/useStore'

interface Props {
  matchId: string
  store: Store
  remaining: number
  onClose: () => void
}

export function LineupSelector({ matchId, store, remaining, onClose }: Props) {
  const { settings, players, team } = store
  const existing = store.getLineup(matchId)

  const [selected, setSelected] = useState<string[]>(existing?.playerIds ?? [])
  const [result, setResult] = useState<'win' | 'loss' | 'draw' | undefined>(existing?.result)
  const [doublePlayerId, setDoublePlayerId] = useState<string | undefined>(existing?.doublePlayerId)

  function reset() {
    setSelected(existing?.playerIds ?? [])
    setResult(existing?.result)
    setDoublePlayerId(existing?.doublePlayerId)
  }

  const selectedPlayers = players.filter(p => selected.includes(p.id))
  const fargoTotal = calcFargoTotal(selectedPlayers)
  const penalty = calcPenalty(fargoTotal, settings.fargoLimit)
  const bonus = calcBonus(selectedPlayers, settings)
  const fargoBudget = settings.fargoLimit - fargoTotal

  function toggle(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) {
        // 選択解除したら重複フラグも解除
        if (doublePlayerId === id) setDoublePlayerId(undefined)
        return prev.filter(x => x !== id)
      }
      return prev.length < 4 ? [...prev, id] : prev
    })
  }

  function toggleDouble(id: string) {
    if (doublePlayerId === id) {
      setDoublePlayerId(undefined)
    } else if (doublePlayerId !== undefined) {
      alert('2人以上の重複プレイヤーは認められていません')
    } else {
      setDoublePlayerId(id)
    }
  }

  function save() {
    store.upsertLineup({ matchId, playerIds: selected, result, doublePlayerId })
    onClose()
  }

  const fargoColor = penalty > 0
    ? 'text-red-400'
    : fargoTotal >= settings.fargoLimit - 100
      ? 'text-yellow-400'
      : 'text-green-400'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-100 mb-1">
          出場ラインナップ{team ? ` — ${team.name}` : ''}
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          4人を選択してください（{selected.length}/4人）
        </p>

        {/* Fargo サマリー */}
        <div className={`rounded-xl p-4 mb-4 border ${
          penalty > 0 ? 'bg-red-950/40 border-red-800' : 'bg-slate-900 border-slate-700'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">合計 FargoRate</span>
            <span className={`text-2xl font-bold tabular-nums ${fargoColor}`}>
              {fargoTotal}
              <span className="text-sm font-normal text-slate-400"> / {settings.fargoLimit}</span>
            </span>
          </div>
          {penalty > 0 && (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-red-400">⚠ ペナルティ</span>
              <span className="text-red-400 font-bold">−{penalty} pt</span>
            </div>
          )}
          {bonus > 0 && (
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-green-400">ボーナス</span>
              <span className="text-green-400 font-bold">+{bonus} pt</span>
            </div>
          )}
          {penalty === 0 && selected.length === 4 && (
            <div className="mt-2 text-xs text-slate-500">余裕: {fargoBudget} pt</div>
          )}
        </div>

        {/* 選手リスト */}
        {players.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">
            選手が登録されていません。先に選手を登録してください。
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {[...players].sort((a, b) => b.fargoRate - a.fargoRate).map(p => {
              const isSelected = selected.includes(p.id)
              const bonusLabel = getBonusLabel(p, settings)
              const potentialTotal = (!isSelected && selected.length < 4)
                ? calcFargoTotal([...selectedPlayers, p])
                : 0
              const wouldExceed = potentialTotal > settings.fargoLimit
              const wouldExceedPenalty = wouldExceed ? calcPenalty(potentialTotal, settings.fargoLimit) : 0

              // 出場回数アラート（保存後の remaining を基に計算）
              const appearances = store.getAppearanceCount(p.id)
              const needed = Math.max(0, settings.minAppearances - appearances)
              const slack = remaining - needed
              const alreadyMet = needed === 0
              const impossible = slack < 0
              const criticalRisk = !alreadyMet && slack === 0
              const atRisk = !alreadyMet && slack > 0 && slack <= settings.maxAbsences

              return (
                <div key={p.id} className="space-y-1">
                  <button
                    type="button"
                    disabled={!isSelected && selected.length >= 4}
                    onClick={() => toggle(p.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border
                      transition-all text-left
                      ${isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-slate-100'
                        : selected.length >= 4
                          ? 'bg-slate-900/50 border-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                          : wouldExceed
                            ? 'bg-red-950/20 border-red-800/50 text-slate-300 hover:bg-red-950/40'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                        ${isSelected ? 'border-blue-400 bg-blue-500' : 'border-slate-500'}`}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div>
                        <div className="font-medium">{p.name}</div>
                        {bonusLabel && <div className="text-xs text-green-400">{bonusLabel}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); toggleDouble(p.id) }}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                            doublePlayerId === p.id
                              ? 'bg-orange-500 border-orange-400 text-white'
                              : 'bg-slate-800 border-slate-500 text-slate-400 hover:border-orange-400 hover:text-orange-300'
                          }`}
                        >
                          2回
                        </button>
                      )}
                      <div className="text-right">
                        <div className={`text-xs tabular-nums mb-0.5 ${
                          alreadyMet ? 'text-green-400' :
                          impossible ? 'text-red-400' :
                          criticalRisk ? 'text-orange-400' :
                          atRisk ? 'text-yellow-400' : 'text-slate-500'
                        }`}>
                          {appearances}回/残{remaining}
                        </div>
                        <div className={`font-bold tabular-nums ${wouldExceed && !isSelected ? 'text-red-400' : 'text-slate-300'}`}>
                          {p.fargoRate}
                        </div>
                        {wouldExceed && !isSelected && (
                          <div className="text-xs text-red-400">（-{wouldExceedPenalty}pt）超過</div>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* 試合結果 */}
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">試合結果（任意）</label>
          <div className="flex gap-2">
            {(['win', 'loss', 'draw'] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setResult(result === r ? undefined : r)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border
                  ${result === r
                    ? r === 'win'  ? 'bg-green-600  border-green-500  text-white'
                    : r === 'loss' ? 'bg-red-600    border-red-500    text-white'
                                   : 'bg-slate-600  border-slate-500  text-white'
                    : 'bg-slate-900 border-slate-600 text-slate-400 hover:bg-slate-700'
                  }`}
              >
                {r === 'win' ? '勝利 🏆' : r === 'loss' ? '敗北' : '引分'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" className="py-2.5 px-4 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors" onClick={onClose}>
            閉じる
          </button>
          {existing && (
            <button type="button" className="py-2.5 px-4 rounded-xl bg-slate-700 text-slate-400 hover:bg-slate-600 transition-colors text-sm" onClick={reset}>
              初期化
            </button>
          )}
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={save}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

function getBonusLabel(p: Player, s: AppSettings): string {
  if (p.gender === 'female' && p.isUnder25) return `女性 25歳以下 (+${s.bonusUnder25Female}pt)`
  if (p.gender === 'female') return `女性 (+${s.bonusFemale}pt)`
  if (p.isUnder25) return `25歳以下 (+${s.bonusUnder25}pt)`
  return ''
}
