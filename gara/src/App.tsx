import { useState } from 'react'
import { useStore } from './store/useStore'
import { PlayerListPanel } from './components/PlayerListPanel'
import { GameInputPanel } from './components/GameInputPanel'
import { HistoryPanel } from './components/HistoryPanel'
import { SettingsPanel } from './components/SettingsPanel'

type TabId = 'players' | 'record' | 'history' | 'settings'

const TABS: { id: TabId; label: string }[] = [
  { id: 'players', label: 'プレイヤー' },
  { id: 'record', label: '記録' },
  { id: 'history', label: '履歴' },
  { id: 'settings', label: '設定' },
]

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState<TabId>('players')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3">
        <h1 className="text-lg font-bold text-slate-100 tracking-wide">
          gara
        </h1>
        <p className="text-[10px] text-slate-500 -mt-0.5">
          多人数Eloレーティング
        </p>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 pb-24">
        {tab === 'players' && <PlayerListPanel store={store} />}
        {tab === 'record' && <GameInputPanel store={store} />}
        {tab === 'history' && <HistoryPanel store={store} />}
        {tab === 'settings' && <SettingsPanel store={store} />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 z-40">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-3 text-xs font-medium transition ${
                tab === t.id
                  ? 'text-blue-400 border-t-2 border-blue-400 -mt-px'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
