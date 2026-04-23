import { useState, useRef } from 'react'
import type { Team } from '../types'
import { loadCustomSchedule, saveCustomSchedule, clearCustomSchedule } from '../data/schedule'
import type { ScheduleMatch } from '../types'

// =========================================
// PDF テキスト抽出
// =========================================
async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map((item: unknown) => (item as { str: string }).str).join(' '))
  }
  return pages.join('\n')
}

// =========================================
// テキスト解析
// =========================================
const DATE_RE_SRC = '(\\d{1,2})\\s*月\\s*(\\d{1,2})\\s*日'

function getChunks(text: string) {
  const indices: Array<{ month: number; day: number; index: number }> = []
  const re = new RegExp(DATE_RE_SRC, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    indices.push({ month: parseInt(m[1]), day: parseInt(m[2]), index: m.index })
  }
  return indices
}

function discoverLeagueName(text: string): string {
  const firstDateRe = /\d{1,2}\s*月\s*\d{1,2}\s*日/
  const firstDateIdx = text.search(firstDateRe)
  const header = firstDateIdx > 0 ? text.slice(0, firstDateIdx) : text.slice(0, 300)
  const segments = header.split(/\s{3,}|\n/).map(s => s.trim()).filter(s => s.length > 3)
  for (const seg of segments) {
    if (/20\d{2}/.test(seg) || /[Dd]iv/i.test(seg)) {
      return seg.replace(/\s+/g, ' ').trim()
    }
  }
  return ''
}

function toISODate(month: number, day: number): string {
  const now = new Date()
  const currentMonth = now.getMonth() + 1  // 1〜12
  const currentYear = now.getFullYear()
  // JCLシーズンは4月始まり翌3月終わり。
  // 月が4以上なら今年度の開幕月→同年、1〜3月なら翌年扱い。
  // 基準年: 4月以上なら今年、1〜3月なら前年をシーズン開始年とする。
  const seasonStartYear = currentMonth >= 4 ? currentYear : currentYear - 1
  const year = month >= 4 ? seasonStartYear : seasonStartYear + 1
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isoToDisplay(dateISO: string): string {
  if (!dateISO) return ''
  const d = new Date(dateISO + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

// =========================================
// 型定義
// =========================================
interface RowState {
  dateISO: string
  home: string
  visiting: string
  location: string
  isPlayoff: boolean
  isManual: boolean
  myTeamIsHome: boolean
  opponentName: string
}

function emptyManualRow(teamName: string): RowState {
  return {
    dateISO: '', home: teamName, visiting: '', location: '',
    isPlayoff: false, isManual: true, myTeamIsHome: true, opponentName: '',
  }
}

function parseScheduleText(text: string): RowState[] {
  const results: RowState[] = []
  const indices = getChunks(text)
  for (let i = 0; i < indices.length; i++) {
    const { month, day, index } = indices[i]
    const end = i + 1 < indices.length ? indices[i + 1].index : text.length
    const chunk = text.slice(index, end)
    const dateISO = toISODate(month, day)
    const stripped = chunk.replace(/^\d{1,2}\s*月\s*\d{1,2}\s*日\s*/, '')
    let fields = stripped.split(/\s{2,}/).map(s => s.trim()).filter(Boolean)
    if (fields.length < 2) {
      fields = stripped.split(/\s+/).map(s => s.trim()).filter(Boolean)
    }
    const home = fields[0] ?? ''
    const visiting = fields[1] ?? ''
    const location = fields.slice(2).join(' ')
    const isPlayoff = /プレーオフ|playoff/i.test(chunk)
    results.push({
      dateISO, home, visiting,
      location: isPlayoff && !location ? 'プレーオフ' : location,
      isPlayoff, isManual: false, myTeamIsHome: true, opponentName: '',
    })
  }
  return results
}

const UNKNOWN_PATTERN = /？{2,}|[?]{2,}|未定|TBD/i

function collectTeamNames(rows: RowState[]): string[] {
  const nameSet = new Set<string>()
  rows.forEach(r => {
    if (r.home.length >= 2 && r.home.length <= 40 && !UNKNOWN_PATTERN.test(r.home)) nameSet.add(r.home)
    if (r.visiting.length >= 2 && r.visiting.length <= 40 && !UNKNOWN_PATTERN.test(r.visiting)) nameSet.add(r.visiting)
  })
  return Array.from(nameSet).sort()
}

// =========================================
// コンポーネント
// =========================================
interface Props {
  team: Team | null
  onTeamRegistered: (team: Team) => void
  onSaved: () => void
  onLeagueName?: (name: string) => void
}

export function ScheduleImport({ team, onTeamRegistered, onSaved, onLeagueName }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<RowState[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'idle' | 'team-select' | 'preview' | 'error'>('idle')
  const [detectedNames, setDetectedNames] = useState<string[]>([])
  const [selectedTeamName, setSelectedTeamName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  // Keep track of effective team name across team-select flow
  const [pendingTeamName, setPendingTeamName] = useState('')

  const effectiveTeamName = team?.name ?? pendingTeamName

  const existing = loadCustomSchedule()

  function saveRows(rowsToSave: RowState[]) {
    const valid = rowsToSave.filter(r => r.dateISO)
    if (valid.length === 0) return
    const matches: ScheduleMatch[] = valid.map((r, i) => ({
      id: `custom-${i}`,
      date: isoToDisplay(r.dateISO),
      dateISO: r.dateISO,
      home: r.home,
      visiting: r.visiting,
      location: r.location,
      isPlayoff: r.isPlayoff,
    }))
    localStorage.removeItem('jcl:lineups')
    saveCustomSchedule(matches)
    onSaved()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const text = await extractTextFromPDF(file)
      const leagueName = discoverLeagueName(text)
      if (leagueName && onLeagueName) onLeagueName(leagueName)

      const parsed = parseScheduleText(text)
      const names = collectTeamNames(parsed)

      if (!team) {
        // チーム未登録 → チーム選択後に即保存
        setRows(parsed)
        setDetectedNames(names)
        setSelectedTeamName(names[0] ?? '')
        setStep('team-select')
      } else {
        // チーム登録済み → 名前確認して即保存
        if (names.includes(team.name)) {
          saveRows(parsed)
        } else {
          setErrorMsg(
            `所属チームが見つかりません。チーム名「${team.name}」がPDFに含まれていません。` +
            `チーム名またはスケジュールPDFを確認してください。`
          )
          setStep('error')
        }
      }
    } catch (err) {
      alert('PDFの読み込みに失敗しました')
      console.error(err)
    } finally {
      setLoading(false)
      if (e.target) e.target.value = ''
    }
  }

  function handleTeamSelectConfirm() {
    if (!selectedTeamName) return
    const newTeam: Team = {
      id: crypto.randomUUID(),
      name: selectedTeamName,
      colorIndex: 0,
    }
    onTeamRegistered(newTeam)
    // チーム登録後、即保存
    saveRows(rows)
  }

  function handleManualCreate() {
    setRows([emptyManualRow(effectiveTeamName)])
    setIsEditing(false)
    setStep('preview')
  }

  function handleEditExisting() {
    const current = loadCustomSchedule()
    if (!current) return
    const tName = effectiveTeamName
    setRows(current.map(m => ({
      dateISO: m.dateISO,
      home: m.home,
      visiting: m.visiting,
      location: m.location,
      isPlayoff: m.isPlayoff ?? false,
      isManual: true,
      myTeamIsHome: m.home === tName,
      opponentName: m.home === tName ? m.visiting : m.home,
    })))
    setIsEditing(true)
    setStep('preview')
  }

  function updateRow(i: number, field: keyof RowState, value: string | boolean) {
    setRows(prev => prev.map((r, idx) => {
      if (idx !== i) return r
      const updated = { ...r, [field]: value }
      if (field === 'myTeamIsHome' && updated.isManual) {
        updated.home = updated.myTeamIsHome ? effectiveTeamName : updated.opponentName
        updated.visiting = updated.myTeamIsHome ? updated.opponentName : effectiveTeamName
      }
      if (field === 'opponentName' && updated.isManual) {
        const opp = value as string
        updated.home = updated.myTeamIsHome ? effectiveTeamName : opp
        updated.visiting = updated.myTeamIsHome ? opp : effectiveTeamName
      }
      return updated
    }))
  }

  function handleSave() {
    if (rows.filter(r => r.dateISO).length === 0) { alert('有効な試合データがありません'); return }
    saveRows(rows)
  }

  function handleClear() {
    if (confirm('カスタムスケジュールを削除しますか？\nチーム・出場ラインナップも一緒にリセットされます。')) {
      localStorage.removeItem('jcl:lineups')
      localStorage.removeItem('jcl:team')
      clearCustomSchedule()
      onSaved()
    }
  }

  function reset() {
    setStep('idle')
    setRows([])
    setDetectedNames([])
    setErrorMsg('')
    setIsEditing(false)
    setPendingTeamName('')
  }

  return (
    <div className="space-y-4">
      {/* 既存スケジュールバナー */}
      {existing && (
        <div className="flex items-center justify-between bg-blue-950/40 border border-blue-700 rounded-xl px-4 py-2">
          <span className="text-sm text-blue-300">カスタムスケジュール適用中（{existing.length}試合）</span>
          <div className="flex gap-2">
            <button
              className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 hover:bg-blue-900/30 rounded"
              onClick={handleEditExisting}
            >
              編集
            </button>
            <button
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 hover:bg-red-950/30 rounded"
              onClick={handleClear}
            >
              削除
            </button>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {step === 'error' && (
        <div
          className="bg-red-950/40 border border-red-700 rounded-xl px-4 py-3 cursor-pointer"
          onClick={() => setStep('idle')}
        >
          <p className="text-sm text-red-300">{errorMsg}</p>
          <p className="text-xs text-red-500 mt-1">タップして閉じる</p>
        </div>
      )}

      {/* Idle ステップ */}
      {step === 'idle' && (
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <div className="text-4xl mb-3">📄</div>
            <p className="text-slate-300 text-sm font-medium mb-1">PDFからインポート</p>
            <p className="text-slate-500 text-xs">試合日程を自動検出して登録</p>
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
          </div>
          <button
            className="w-full py-4 border border-dashed border-slate-600 rounded-xl text-slate-400 text-sm hover:border-slate-500 hover:text-slate-300 transition-colors"
            onClick={handleManualCreate}
          >
            ＋ 手動で作成
          </button>
          {!existing && (
            <p className="text-xs text-slate-500 text-center">現在はデフォルトスケジュールを使用中です。</p>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center py-6 text-slate-400 text-sm">PDF解析中...</div>
      )}

      {/* チーム選択ステップ */}
      {step === 'team-select' && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-200">所属チームはどれですか？</h4>
          <p className="text-xs text-slate-500">PDFから検出されたチーム名の中から選択してください。</p>
          {detectedNames.length > 0 ? (
            <select
              value={selectedTeamName}
              onChange={e => setSelectedTeamName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            >
              {detectedNames.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-red-400">チーム名を検出できませんでした。</p>
          )}
          <div className="flex gap-2">
            <button
              className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm transition-colors"
              onClick={reset}
            >
              キャンセル
            </button>
            <button
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm font-medium transition-colors disabled:opacity-40"
              onClick={handleTeamSelectConfirm}
              disabled={!selectedTeamName}
            >
              登録してスケジュールへ
            </button>
          </div>
        </div>
      )}

      {/* プレビューステップ */}
      {step === 'preview' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-slate-300">
              <span className="text-green-400 font-medium">{rows.length}試合</span>
              {isEditing ? ' — 編集中' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded hover:bg-slate-700"
                onClick={reset}
              >
                キャンセル
              </button>
              <button
                className="text-sm px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-medium"
                onClick={handleSave}
              >
                保存
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {rows.map((row, realIdx) => (
              <div key={realIdx} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
                {/* 日付 + 削除 */}
                <div className="flex items-center justify-between mb-2 gap-2">
                  {row.isManual ? (
                    <input
                      type="date"
                      value={row.dateISO}
                      onChange={e => updateRow(realIdx, 'dateISO', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-slate-200 text-sm"
                    />
                  ) : (
                    <span className="text-slate-300 font-medium text-sm">{isoToDisplay(row.dateISO)}</span>
                  )}
                  <button
                    onClick={() => setRows(prev => prev.filter((_, idx) => idx !== realIdx))}
                    className="text-slate-500 hover:text-red-400 px-2 py-1 rounded hover:bg-red-950/30 text-sm shrink-0"
                  >
                    ✕
                  </button>
                </div>

                {row.isManual ? (
                  /* 手動行：自チームサイド切替 + 対戦相手入力 */
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">自チームのサイド</div>
                      <div className="flex rounded-lg overflow-hidden border border-slate-600 text-sm">
                        {(['home', 'visiting'] as const).map(side => (
                          <button
                            key={side}
                            type="button"
                            className={`flex-1 py-2 transition-colors ${
                              (side === 'home') === row.myTeamIsHome
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
                            }`}
                            onClick={() => updateRow(realIdx, 'myTeamIsHome', side === 'home')}
                          >
                            {side === 'home' ? 'ホーム' : 'ビジター'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">対戦相手</div>
                      <input
                        type="text"
                        value={row.opponentName}
                        onChange={e => updateRow(realIdx, 'opponentName', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-slate-200 text-sm"
                        placeholder="相手チーム名（省略可）"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">場所</div>
                      <input
                        type="text"
                        value={row.location}
                        onChange={e => updateRow(realIdx, 'location', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-slate-200 text-sm"
                        placeholder="場所を入力（省略可）"
                      />
                    </div>
                  </div>
                ) : (
                  /* PDFから読み込み行：テキスト表示 */
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">ホーム</div>
                      <span className={row.home ? 'text-slate-200' : 'text-slate-600'}>{row.home || '—'}</span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">ビジター</div>
                      <span className={row.visiting ? 'text-slate-200' : 'text-slate-600'}>{row.visiting || '—'}</span>
                    </div>
                    {row.location && (
                      <div className="col-span-2">
                        <div className="text-xs text-slate-500 mb-1">場所</div>
                        <span className="text-slate-400">{row.location}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-between">
            <button
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
              onClick={() => setRows(prev => [...prev, emptyManualRow(effectiveTeamName)])}
            >
              ＋ 手動で追加
            </button>
            <button
              className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-medium"
              onClick={handleSave}
            >
              保存してスケジュールを更新
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
