import { useState } from 'react'
import type { Player } from '../types'
import type { Store } from '../store/useStore'
import { getMatchesForTeam, getAllMatchesForTeam, COLOR_PALETTE } from '../data/schedule'
import { PlayerModal } from './PlayerModal'
import { LineupSelector } from './LineupSelector'
import { TeamHelpModal } from './HelpModal'
import { calcFargoTotal, calcPenalty } from '../store/useStore'

interface Props {
  store: Store
}

const TODAY = new Date().toISOString().slice(0, 10)

function getDisplayFrom(dateISO: string): string {
  const d = new Date(dateISO + 'T00:00:00')
  d.setDate(d.getDate() - 6)
  return d.toISOString().slice(0, 10)
}

export function TeamView({ store }: Props) {
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | undefined>()
  const [lineupMatchId, setLineupMatchId] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const { team, players, settings } = store
  const teamColor = team ? COLOR_PALETTE[team.colorIndex % COLOR_PALETTE.length] : null
  const playerCardBg = teamColor ? teamColor.cardBg : 'bg-slate-700/50 border-slate-600'
  // 通常試合（プレーオフ除く）：出場回数・残り試合計算用
  const regularMatches = team ? getMatchesForTeam(team.name) : []
  // 全試合（プレーオフ含む）：ラインナップ表示用
  const allMatches = team ? getAllMatchesForTeam(team.name) : []
  // 残り試合 = 通常試合のうちラインナップ未保存の試合数
  const remaining = regularMatches.filter(m => !store.getLineup(m.id)).length
  // 次の開催予定試合（その週の日曜日以降に強調表示）
  const nextUpcoming = allMatches.find(m => m.dateISO >= TODAY)
  const upcomingId = nextUpcoming && TODAY >= getDisplayFrom(nextUpcoming.dateISO)
    ? nextUpcoming.id
    : null

  return (
    <div className="space-y-6">

      {/* ====== タブ右上ヘルプボタン ====== */}
      <div className="flex justify-end">
        <button
          className="w-7 h-7 rounded-full bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200 text-sm transition-colors shrink-0"
          onClick={() => setShowHelp(true)}
          aria-label="ヘルプ"
        >
          ?
        </button>
      </div>

      {/* ====== 登録選手 ====== */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-300">
            登録選手 <span className="text-slate-500 font-normal">({players.length}名)</span>
            {allMatches.length > 0 && (
              <span className="ml-2 text-xs font-normal text-slate-500">
                残り<span className={remaining === 0 ? 'text-red-400' : 'text-slate-400'}>{remaining}</span>/{regularMatches.length}試合
              </span>
            )}
            {allMatches.length === 0 && team && (
              <span className="ml-2 text-xs font-normal text-red-400">スケジュール未登録</span>
            )}
          </h2>
          <button
            className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
            onClick={() => setShowAddPlayer(true)}
          >
            + 選手追加
          </button>
        </div>

        {players.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-xl">
            <p>選手が登録されていません</p>
            <p className="text-sm mt-1">「+ 選手追加」から登録してください</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...players].sort((a, b) => b.fargoRate - a.fargoRate).map(p => {
              const appearances = store.getAppearanceCount(p.id)

              return (
                <div
                  key={p.id}
                  className={`px-4 py-3 rounded-xl border transition-colors ${playerCardBg}`}
                >
                  {/* 上段：名前 + バッジ + 出場/Fargo + ボタン */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                      <span className="font-medium text-slate-100">{p.name}</span>
                      {p.gender === 'female' && (
                        <span className="text-xs bg-pink-900/60 text-pink-300 px-1.5 py-0.5 rounded">女性</span>
                      )}
                      {p.isUnder25 && (
                        <span className="text-xs bg-green-900/60 text-green-300 px-1.5 py-0.5 rounded">U25</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium tabular-nums text-slate-300">
                        {appearances}回
                      </span>
                      <span className="text-slate-600 text-xs">|</span>
                      <span className="font-bold text-slate-200 tabular-nums text-sm">{p.fargoRate}</span>
                      <div className="flex gap-1">
                        <button
                          className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1 hover:bg-slate-700 rounded-lg transition-colors"
                          onClick={() => setEditingPlayer(p)}
                        >
                          編集
                        </button>
                        <button
                          className="text-red-500 hover:text-red-400 text-xs px-2 py-1 hover:bg-red-950/30 rounded-lg transition-colors"
                          onClick={() => {
                            if (confirm(`${p.name}を削除しますか？`)) store.deletePlayer(p.id)
                          }}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* 下段：メモ */}
                  {p.notes && (
                    <div className="mt-1 text-xs text-slate-500">{p.notes}</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ====== 今シーズンの試合 ====== */}
      <section>
        <h2 className="text-base font-semibold text-slate-300 mb-3">今シーズンの試合</h2>
        {allMatches.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-xl">
            <p>スケジュールが登録されていません</p>
            <p className="text-sm mt-1">設定からPDFをインポートしてください</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allMatches.map(m => {
              const lineup = store.getLineup(m.id)
              const isHome = m.home === team?.name
              const opponent = isHome ? m.visiting : m.home
              const isPast = m.dateISO < TODAY
              const isToday = m.dateISO === TODAY
              const isUpcoming = m.id === upcomingId && !isToday

              const lineupPlayers = lineup
                ? players.filter(p => lineup.playerIds.includes(p.id))
                : []
              const fargoTotal = calcFargoTotal(lineupPlayers)
              const penalty = calcPenalty(fargoTotal, settings.fargoLimit)

              return (
                <div
                  key={m.id}
                  className={[
                    'px-4 py-3 rounded-xl border transition-all',
                    isToday    ? 'bg-blue-950/40 border-blue-700'
                    : isUpcoming ? 'bg-slate-800 border-blue-500/60 upcoming-glow'
                    : isPast   ? 'bg-slate-900/40 border-slate-600/60 opacity-60'
                               : 'bg-slate-800 border-slate-700',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-sm font-medium ${isToday ? 'text-blue-400' : 'text-slate-400'}`}>
                          {m.date}
                        </span>
                        {isToday && (
                          <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">今日</span>
                        )}
                        {isUpcoming && (
                          <span className="text-xs bg-blue-600/70 text-blue-200 px-1.5 py-0.5 rounded">開催予定</span>
                        )}
                        {m.isPlayoff && (
                          <span className="text-xs bg-purple-700 text-purple-200 px-1.5 py-0.5 rounded">PO</span>
                        )}
                        <span className="text-xs text-slate-600">{m.location}</span>
                        <span className="text-xs text-slate-600">{isHome ? 'ホーム' : 'ビジター'}</span>
                      </div>
                      <div className="text-sm text-slate-300 mb-2">
                        vs <span className="font-medium text-slate-100">{opponent || '—'}</span>
                      </div>

                      {lineup && lineupPlayers.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {lineupPlayers.map(p => {
                            const app = store.getAppearanceCount(p.id)
                            return (
                              <span key={p.id} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                                {p.name}
                                <span className="text-slate-500 ml-1">({p.fargoRate})</span>
                                <span className="text-slate-400 ml-1">{app}回/残{remaining}</span>
                                {lineup.doublePlayerId === p.id && (
                                  <span className="ml-1 text-orange-400">×2</span>
                                )}
                              </span>
                            )
                          })}
                          <span className={`text-xs font-bold ${penalty > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                            計{fargoTotal}{penalty > 0 ? ` (-${penalty}pt)` : ''}
                          </span>
                          {lineup.result && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              lineup.result === 'win'  ? 'bg-green-900/60 text-green-300' :
                              lineup.result === 'loss' ? 'bg-red-900/60 text-red-300' :
                                                         'bg-slate-700 text-slate-300'
                            }`}>
                              {lineup.result === 'win' ? '勝利' : lineup.result === 'loss' ? '敗北' : '引分'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">未登録</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                          lineup
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            : 'bg-blue-600/80 text-white hover:bg-blue-600'
                        }`}
                        onClick={() => setLineupMatchId(m.id)}
                      >
                        {lineup ? '編集' : '登録'}
                      </button>
                      {lineup && (
                        <button
                          className="text-xs px-3 py-1 rounded-lg bg-slate-900 text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                          onClick={() => {
                            if (confirm('このラインナップを初期化しますか？')) store.deleteLineup(m.id)
                          }}
                        >
                          初期化
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ====== モーダル ====== */}
      {(showAddPlayer || editingPlayer) && (
        <PlayerModal
          player={editingPlayer}
          onSave={editingPlayer
            ? p => store.updatePlayer({ ...editingPlayer, ...p })
            : p => store.addPlayer(p)
          }
          onClose={() => { setShowAddPlayer(false); setEditingPlayer(undefined) }}
        />
      )}

      {showHelp && <TeamHelpModal onClose={() => setShowHelp(false)} />}

      {lineupMatchId && (
        <LineupSelector
          matchId={lineupMatchId}
          store={store}
          remaining={remaining}
          onClose={() => setLineupMatchId(null)}
        />
      )}
    </div>
  )
}
