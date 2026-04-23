import { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import { useStore } from './store/useStore'
import { COLOR_PALETTE, loadCustomSchedule } from './data/schedule'
import type { Team, AppSettings } from './types'
import { TeamView } from './components/TeamView'
import { ScheduleView } from './components/ScheduleView'
import { ScheduleImport } from './components/ScheduleImport'
import {
  HelpSetupGuide, HelpTeamManage, HelpRules,
  HelpScheduleImport, HelpBackup,
} from './components/HelpModal'

type TabId = 'team' | 'schedule' | 'settings'
const ALL_TABS: TabId[] = ['team', 'schedule', 'settings']

export default function App() {
  const store = useStore()
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const saved = sessionStorage.getItem('jcl:activeTab') as TabId | null
    if (saved && ALL_TABS.includes(saved)) {
      sessionStorage.removeItem('jcl:activeTab')
      return saved
    }
    return 'team'
  })
  const installPromptRef = useRef<Event & { prompt: () => Promise<void> } | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      installPromptRef.current = e as Event & { prompt: () => Promise<void> }
      setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setShowInstall(false))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = touchStartY.current - e.changedTouches[0].clientY
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const idx = ALL_TABS.indexOf(activeTab)
      if (dx > 0 && idx < ALL_TABS.length - 1) setActiveTab(ALL_TABS[idx + 1])
      else if (dx < 0 && idx > 0) setActiveTab(ALL_TABS[idx - 1])
    }
  }

  const teamColor = store.team
    ? COLOR_PALETTE[store.team.colorIndex % COLOR_PALETTE.length]
    : null

  const TAB_LABELS: Record<TabId, string> = {
    team: store.team?.name ?? 'マイチーム',
    schedule: 'スケジュール',
    settings: '設定',
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* ====== ヘッダー ====== */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <span className="text-xl">🎱</span>
          <h1 className="text-base font-bold text-slate-100">JCL チームマネージャー</h1>
          {store.settings.leagueName && (
            <span className="text-xs text-slate-500 ml-1">{store.settings.leagueName}</span>
          )}
          {showInstall && (
            <button
              className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors shrink-0"
              onClick={async () => {
                if (!installPromptRef.current) return
                await installPromptRef.current.prompt()
                setShowInstall(false)
              }}
            >
              📲 インストール
            </button>
          )}
        </div>

        {/* タブ */}
        <div className="max-w-3xl mx-auto px-4 flex gap-0">
          {ALL_TABS.map(tab => {
            const isActive = activeTab === tab
            const isTeamTab = tab === 'team'
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-colors shrink-0
                  ${isActive
                    ? isTeamTab && teamColor
                      ? teamColor.active
                      : 'text-slate-100 border-slate-400'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                  }`}
              >
                {isTeamTab && teamColor && (
                  <span className={`w-2 h-2 rounded-full shrink-0 ${teamColor.bg} ${!isActive ? 'opacity-50' : ''}`} />
                )}
                {TAB_LABELS[tab]}
              </button>
            )
          })}
        </div>
      </header>

      {/* ====== メインコンテンツ ====== */}
      <main
        className="flex-1 max-w-3xl mx-auto w-full px-4 py-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {activeTab === 'team' && (
          store.team
            ? <TeamView store={store} />
            : (
              <div className="text-center py-16 text-slate-500">
                <p className="text-lg mb-2">チームが登録されていません</p>
                <button
                  className="text-blue-400 hover:text-blue-300 text-sm"
                  onClick={() => setActiveTab('settings')}
                >
                  設定からチームを登録してください
                </button>
              </div>
            )
        )}
        {activeTab === 'schedule' && (
          <ScheduleView team={store.team} leagueName={store.settings.leagueName} />
        )}
        {activeTab === 'settings' && (
          <SettingsView store={store} onNavigate={setActiveTab} />
        )}
      </main>
    </div>
  )
}

// =========================================
// チーム登録・編集モーダル
// =========================================
interface TeamEditorProps {
  team?: Team
  nameOptions?: string[]   // 編集時：スケジュールから抽出したチーム名一覧
  onSave: (data: Omit<Team, 'id'>) => void
  onClose: () => void
}

function TeamEditor({ team, nameOptions, onSave, onClose }: TeamEditorProps) {
  const [name, setName] = useState(team?.name ?? '')
  const [colorIndex, setColorIndex] = useState(team?.colorIndex ?? 0)

  const valid = name.trim() !== ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-700">
        <h3 className="text-lg font-bold text-slate-100 mb-4">
          {team ? 'チームを編集' : 'チームを登録'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">チーム名</label>
            {nameOptions && nameOptions.length > 0 ? (
              <select
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {nameOptions.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            ) : (
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                placeholder="例：ZEKE CHIBIMARU"
              />
            )}
            {nameOptions && nameOptions.length === 0 && (
              <p className="text-xs text-yellow-400 mt-1">スケジュールが未登録のため手動入力になります</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">チームカラー</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setColorIndex(i)}
                  className={`w-8 h-8 rounded-full ${c.bg} transition-all
                    ${colorIndex === i
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110'
                      : 'opacity-60 hover:opacity-100'
                    }`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
            >
              キャンセル
            </button>
            <button
              disabled={!valid}
              onClick={() => { onSave({ name: name.trim(), colorIndex }); onClose() }}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-40 transition-colors"
            >
              {team ? '保存' : '登録'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =========================================
// 設定画面
// =========================================
interface SettingsProps {
  store: ReturnType<typeof useStore>
  onNavigate: (tab: TabId) => void
}

function SettingsView({ store, onNavigate }: SettingsProps) {
  const s = store.settings
  const [leagueName, setLeagueName] = useState(s.leagueName)
  const [minApp] = useState(String(s.minAppearances))
  const [maxAbs] = useState(String(s.maxAbsences))
  const [fargoLimit, setFargoLimit] = useState(String(s.fargoLimit))
  const [bonusFemale, setBonusFemale] = useState(String(s.bonusFemale))
  const [bonusUnder25, setBonusUnder25] = useState(String(s.bonusUnder25))
  const [bonusU25F, setBonusU25F] = useState(String(s.bonusUnder25Female))
  const [teamEditorOpen, setTeamEditorOpen] = useState(false)
  const [helpSection, setHelpSection] = useState<'setup'|'team'|'rules'|'import'|'backup'|null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const exportedAt = localStorage.getItem('jcl:exported_at')

  const showQR = useCallback(async () => {
    const url = window.location.origin + window.location.pathname
    const dataUrl = await QRCode.toDataURL(url, { width: 240, margin: 2, color: { dark: '#e2e8f0', light: '#1e293b' } })
    setQrDataUrl(dataUrl)
  }, [])

  function HelpBtn({ section }: { section: typeof helpSection & {} }) {
    return (
      <button
        onClick={() => setHelpSection(section as typeof helpSection)}
        className="w-7 h-7 rounded-full bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200 text-sm transition-colors shrink-0 ml-2"
        aria-label="ヘルプ"
      >
        ?
      </button>
    )
  }

  // スケジュールから抽出したチーム名一覧（編集時のプルダウン用）
  const scheduleTeamNames = (() => {
    const schedule = loadCustomSchedule()
    if (!schedule) return []
    const names = new Set<string>()
    schedule.forEach(m => {
      if (m.home && m.home.length >= 2) names.add(m.home)
      if (m.visiting && m.visiting.length >= 2) names.add(m.visiting)
    })
    return Array.from(names).sort()
  })()

  function saveSettings() {
    const n = parseInt(minApp, 10)
    const m = parseInt(maxAbs, 10)
    const fl = parseInt(fargoLimit, 10)
    const bf = parseInt(bonusFemale, 10)
    const bu = parseInt(bonusUnder25, 10)
    const buf = parseInt(bonusU25F, 10)
    if ([n, m, fl, bf, bu, buf].some(v => isNaN(v) || v < 0)) return
    const next: AppSettings = {
      leagueName: leagueName.trim(),
      minAppearances: n,
      maxAbsences: m,
      fargoLimit: fl,
      bonusFemale: bf,
      bonusUnder25: bu,
      bonusUnder25Female: buf,
    }
    store.setSettings(next)
    alert('設定を保存しました')
  }

  function exportData() {
    const exportedAt = new Date().toISOString()
    localStorage.setItem('jcl:exported_at', exportedAt)
    const data = {
      team:     JSON.parse(localStorage.getItem('jcl:team')     ?? 'null'),
      players:  JSON.parse(localStorage.getItem('jcl:players')  ?? '[]'),
      lineups:  JSON.parse(localStorage.getItem('jcl:lineups')  ?? '[]'),
      settings: JSON.parse(localStorage.getItem('jcl:settings') ?? '{}'),
      schedule: JSON.parse(localStorage.getItem('jcl:custom_schedule') ?? 'null'),
      exportedAt,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jcl-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.team)       localStorage.setItem('jcl:team',            JSON.stringify(data.team))
        if (data.players)    localStorage.setItem('jcl:players',         JSON.stringify(data.players))
        if (data.lineups)    localStorage.setItem('jcl:lineups',         JSON.stringify(data.lineups))
        if (data.settings)   localStorage.setItem('jcl:settings',        JSON.stringify(data.settings))
        if (data.schedule)   localStorage.setItem('jcl:custom_schedule', JSON.stringify(data.schedule))
        if (data.exportedAt) localStorage.setItem('jcl:exported_at',     data.exportedAt)
        alert('インポートしました。ページを再読み込みしてください。')
        window.location.reload()
      } catch {
        alert('ファイルの読み込みに失敗しました')
      }
    }
    reader.readAsText(file)
  }

  const numInput = 'w-24 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500'

  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-base font-semibold text-slate-300">設定</h2>

      {/* ====== 使い方 ====== */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">使い方</h3>
          <HelpBtn section="setup" />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          はじめての方は ? を押してセットアップ手順をご確認ください。
        </p>
      </div>

      {/* ====== チーム管理 ====== */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center">
          チーム管理<HelpBtn section="team" />
        </h3>

        {store.team ? (
          <div className="flex items-center justify-between bg-slate-900 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-3 h-3 rounded-full shrink-0 ${COLOR_PALETTE[store.team.colorIndex % COLOR_PALETTE.length].bg}`} />
              <span className="text-slate-200 text-sm truncate">{store.team.name}</span>
            </div>
            <div className="flex gap-1 shrink-0 ml-2">
              <button
                onClick={() => setTeamEditorOpen(true)}
                className="text-xs px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
              >
                編集
              </button>
              <button
                onClick={() => {
                  if (confirm(`「${store.team!.name}」を削除しますか？\n選手・ラインナップデータも削除されます。`)) {
                    store.setTeam(null)
                    onNavigate('settings')
                  }
                }}
                className="text-xs px-2 py-1 text-red-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-slate-500 mb-2">チームが登録されていません</p>
            <button
              onClick={() => setTeamEditorOpen(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
            >
              + チームを登録
            </button>
          </div>
        )}
      </div>

      {/* ====== 表示・出場設定 ====== */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300">表示・出場設定</h3>
        <div>
          <label className="block text-sm text-slate-400 mb-1">シーズン名（ヘッダー表示）</label>
          <input
            value={leagueName}
            onChange={e => setLeagueName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
            placeholder="例：2026 Himawari"
          />
        </div>
      </div>

      {/* ====== JCLルール設定 ====== */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center">
          JCL ルール設定<HelpBtn section="rules" />
        </h3>
        <div>
          <label className="block text-sm text-slate-400 mb-1">合計Fargo上限</label>
          <div className="flex gap-2 items-center">
            <input type="number" min={1} className={numInput} value={fargoLimit} onChange={e => setFargoLimit(e.target.value)} />
            <span className="text-slate-400 text-sm">（デフォルト: 1900）</span>
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">ボーナスポイント</label>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <span className="text-slate-400 text-sm w-28">女性</span>
              <input type="number" min={0} className="w-20 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500" value={bonusFemale} onChange={e => setBonusFemale(e.target.value)} />
              <span className="text-slate-500 text-sm">pt（デフォルト：5pt）</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-slate-400 text-sm w-28">25歳以下</span>
              <input type="number" min={0} className="w-20 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500" value={bonusUnder25} onChange={e => setBonusUnder25(e.target.value)} />
              <span className="text-slate-500 text-sm">pt（デフォルト：5pt）</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-slate-400 text-sm w-28">25歳以下女性</span>
              <input type="number" min={0} className="w-20 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500" value={bonusU25F} onChange={e => setBonusU25F(e.target.value)} />
              <span className="text-slate-500 text-sm">pt（デフォルト：10pt）</span>
            </div>
          </div>
        </div>
        <button
          onClick={saveSettings}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
        >
          設定を保存
        </button>
      </div>

      {/* ====== スケジュールインポート ====== */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center">
          PDFからインポート<HelpBtn section="import" />
        </h3>
        <p className="text-xs text-slate-500">スケジュールPDFを読み込んで更新できます。</p>
        <ScheduleImport
          team={store.team}
          onTeamRegistered={t => store.setTeam(t)}
          onLeagueName={name => {
            setLeagueName(name)
            store.setSettings({ ...store.settings, leagueName: name.trim() })
          }}
          onSaved={() => {
            sessionStorage.setItem('jcl:activeTab', 'settings')
            window.location.reload()
          }}
        />
      </div>

      {/* ====== バックアップ・共有 ====== */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center">
          データのバックアップ・共有<HelpBtn section="backup" />
        </h3>
        <p className="text-xs text-slate-500">データをJSONファイルとしてエクスポートし、チームメンバーと共有できます。</p>
        {exportedAt && (
          <p className="text-xs text-slate-500">
            最終エクスポート: {new Date(exportedAt).toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportData}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm"
          >
            📥 エクスポート
          </button>
          <label className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm cursor-pointer">
            📤 インポート
            <input type="file" accept=".json" className="hidden" onChange={importData} />
          </label>
          <button
            onClick={showQR}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm"
          >
            📱 QRコード
          </button>
        </div>
      </div>

      {/* ====== QRコードモーダル ====== */}
      {qrDataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setQrDataUrl(null)}
        >
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl border border-slate-700 text-center"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-100 mb-1">アプリのQRコード</h3>
            <p className="text-xs text-slate-500 mb-4">スキャンしてアプリを開けます</p>
            <img src={qrDataUrl} alt="QR Code" className="w-60 h-60 mx-auto rounded-xl" />
            <p className="text-xs text-slate-600 mt-3 break-all">{window.location.origin + window.location.pathname}</p>
            <button
              onClick={() => setQrDataUrl(null)}
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* ====== ヘルプモーダル ====== */}
      {helpSection === 'setup'  && <HelpSetupGuide    onClose={() => setHelpSection(null)} />}
      {helpSection === 'team'   && <HelpTeamManage     onClose={() => setHelpSection(null)} />}
      {helpSection === 'rules'  && <HelpRules          onClose={() => setHelpSection(null)} />}
      {helpSection === 'import' && <HelpScheduleImport onClose={() => setHelpSection(null)} />}
      {helpSection === 'backup' && <HelpBackup         onClose={() => setHelpSection(null)} />}

      {/* ====== チームエディターモーダル ====== */}
      {teamEditorOpen && (
        <TeamEditor
          team={store.team ?? undefined}
          nameOptions={store.team ? scheduleTeamNames : undefined}
          onSave={data => {
            if (store.team) {
              store.setTeam({ ...store.team, ...data })
            } else {
              store.setTeam({ id: crypto.randomUUID(), ...data })
            }
          }}
          onClose={() => setTeamEditorOpen(false)}
        />
      )}
    </div>
  )
}
