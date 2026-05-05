import { useRef, useState } from 'react'
import type { Store } from '../store/useStore'
import type { AppData } from '../types'

interface Props {
  store: Store
}

export function SettingsPanel({ store }: Props) {
  const { data, updateConfig, importData, resetAll } = store
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [k, setK] = useState(String(data.config.kFactor))
  const [initial, setInitial] = useState(String(data.config.initialRating))
  const [message, setMessage] = useState<string | null>(null)

  const applyConfig = () => {
    const kn = Number(k)
    const rn = Number(initial)
    if (!Number.isFinite(kn) || kn <= 0) {
      setMessage('K値は正の数値を入力してください')
      return
    }
    if (!Number.isFinite(rn) || rn < 0) {
      setMessage('初期レートは0以上の数値を入力してください')
      return
    }
    updateConfig({ kFactor: kn, initialRating: rn })
    setMessage('設定を更新し、過去のレートを再計算しました')
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    a.href = url
    a.download = `gara-${ts}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const triggerImport = () => fileInputRef.current?.click()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result)
        const parsed = JSON.parse(text) as Partial<AppData>
        if (!Array.isArray(parsed.players) || !Array.isArray(parsed.games)) {
          setMessage('インポートに失敗: 形式が正しくありません')
          return
        }
        if (!confirm('現在のデータを上書きしてインポートしますか？')) return
        importData({
          players: parsed.players,
          games: parsed.games,
          config: { kFactor: 32, initialRating: 1500, ...(parsed.config ?? {}) },
        })
        setMessage('インポートしました')
      } catch {
        setMessage('インポートに失敗: JSONを読めませんでした')
      }
    }
    reader.readAsText(file)
  }

  const handleReset = () => {
    if (!confirm('全データを削除します。本当によろしいですか？')) return
    if (!confirm('本当に削除しますか？この操作は取り消せません。')) return
    resetAll()
    setK('1500')
    setInitial('1500')
    setMessage('全データを削除しました')
  }

  return (
    <div className="space-y-4">
      <section className="bg-slate-800 rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">レーティング設定</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-slate-400">K値</span>
            <input
              type="number"
              value={k}
              onChange={e => setK(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">初期レート</span>
            <input
              type="number"
              value={initial}
              onChange={e => setInitial(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </label>
        </div>
        <p className="text-[11px] text-slate-500">
          K値: 1試合あたりの変動の大きさ（標準32）。<br />
          設定変更時、過去の試合を全て古い順に replay してレートを再計算します。
        </p>
        <button
          onClick={applyConfig}
          className="w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
        >
          設定を適用
        </button>
      </section>

      <section className="bg-slate-800 rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">データ入出力</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={exportJson}
            className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm"
          >
            JSONエクスポート
          </button>
          <button
            onClick={triggerImport}
            className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm"
          >
            JSONインポート
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          className="hidden"
        />
        <p className="text-[11px] text-slate-500">
          全プレイヤー・試合履歴・設定を1ファイルにまとめます。
        </p>
      </section>

      <section className="bg-slate-800 rounded-lg p-4 space-y-2">
        <h2 className="text-sm font-semibold text-red-400">危険ゾーン</h2>
        <button
          onClick={handleReset}
          className="w-full px-3 py-2 rounded bg-red-900/60 hover:bg-red-800 text-red-200 text-sm"
        >
          全データを削除
        </button>
      </section>

      {message && (
        <div className="bg-slate-800 border border-blue-500/30 rounded p-3 text-sm text-slate-200">
          {message}
        </div>
      )}

      <div className="text-center text-[10px] text-slate-600 pt-4">
        gara · 多人数Eloレーティング
      </div>
    </div>
  )
}
