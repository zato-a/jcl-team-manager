import { useState, useEffect } from 'react'
import type { Player } from '../types'

interface Props {
  player?: Player
  onSave: (p: Omit<Player, 'id'>) => void
  onClose: () => void
}

export function PlayerModal({ player, onSave, onClose }: Props) {
  const [name, setName] = useState(player?.name ?? '')
  const [fargo, setFargo] = useState(String(player?.fargoRate ?? ''))
  const [gender, setGender] = useState<'male' | 'female'>(player?.gender ?? 'male')
  const [isUnder25, setIsUnder25] = useState(player?.isUnder25 ?? false)
  const [notes, setNotes] = useState(player?.notes ?? '')

  const fargoNum = parseInt(fargo, 10)
  const fargoOver = !isNaN(fargoNum) && fargoNum > 720
  const valid = name.trim() !== '' && !isNaN(fargoNum) && fargoNum > 0 && fargoNum <= 720

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    onSave({ name: name.trim(), fargoRate: fargoNum, fargoId: player?.fargoId, gender, isUnder25, notes })
    onClose()
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-700">
        <h3 className="text-lg font-bold text-slate-100 mb-4">
          {player ? '選手を編集' : '選手を追加'}
        </h3>

        <form onSubmit={submit} className="space-y-4">

          {/* ===== 選手名 ===== */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">選手名</label>
            <input
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2
                         text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="名前を入力"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* ===== FargoRate ===== */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              FargoRate <span className="text-slate-500">（1〜720）</span>
            </label>
            <input
              type="number"
              className={`w-full bg-slate-900 border rounded-lg px-3 py-2
                         text-slate-100 placeholder-slate-500 focus:outline-none
                         ${fargoOver ? 'border-red-500 focus:border-red-400' : 'border-slate-600 focus:border-blue-500'}`}
              placeholder="例：480"
              min={1}
              max={720}
              value={fargo}
              onChange={e => setFargo(e.target.value)}
            />
            {fargoOver && (
              <p className="text-xs text-red-400 mt-1">720を超える選手はJCL出場不可です</p>
            )}
          </div>

          {/* ===== 性別 / U25 ===== */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">性別</label>
              <div className="flex rounded-lg overflow-hidden border border-slate-600">
                {(['male', 'female'] as const).map(g => (
                  <button
                    key={g}
                    type="button"
                    className={`flex-1 py-2 text-sm transition-colors
                      ${gender === g
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
                      }`}
                    onClick={() => setGender(g)}
                  >
                    {g === 'male' ? '男性' : '女性 (+5pt)'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">25歳以下</label>
              <button
                type="button"
                className={`w-full py-2 px-4 rounded-lg border transition-colors text-sm
                  ${isUnder25
                    ? 'bg-green-600 border-green-500 text-white'
                    : 'bg-slate-900 border-slate-600 text-slate-400 hover:bg-slate-700'
                  }`}
                onClick={() => setIsUnder25(!isUnder25)}
              >
                {isUnder25 ? '✓ 該当 (+5pt)' : '非該当'}
              </button>
            </div>
          </div>

          {gender === 'female' && isUnder25 && (
            <p className="text-xs text-green-400 bg-green-950/40 rounded-lg px-3 py-2">
              25歳以下女性ボーナス: <strong>+10pt</strong>
            </p>
          )}

          {/* ===== メモ ===== */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">メモ（任意）</label>
            <input
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2
                         text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="例：キャプテン、など"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* ===== ボタン ===== */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              onClick={onClose}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold
                         hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {player ? '保存' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
