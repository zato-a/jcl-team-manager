import { useEffect } from 'react'

// =========================================
// 汎用ヘルプモーダルラッパー
// =========================================
function HelpModal({ title, onClose, children }: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
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
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-700 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>
        <div className="space-y-5 text-sm text-slate-300">
          {children}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors text-sm"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}

// ヘルプ内の見出し・箇条書きスタイル
function Section({ title, items }: { title: string; items: React.ReactNode[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-slate-300">
            <span className="text-slate-600 shrink-0">・</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// =========================================
// チームタブ
// =========================================
export function TeamHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <HelpModal title="チームタブの使い方" onClose={onClose}>
      <p className="text-slate-400 text-xs">このアプリは出場選手を検討する際に使用するアプリです。</p>

      <Section title="登録選手" items={[
        '一覧はFargoRateが高い順に並びます',
        '選手カードの表示: 選手名 / 今シーズン出場回数 / FargoRate',
        'ヘッダーの「残りN/M試合」はプレーオフを除く通常試合の残り数です',
        '選手カードはチームカラーで色付けされます',
      ]} />

      <Section title="選手の追加・編集" items={[
        '「+ 選手追加」から選手名とFargoRateを入力して登録します',
        'FargoRateはFargoRate公式アプリ等で確認して手動入力してください',
      ]} />

      <Section title="今シーズンの試合" items={[
        '「登録」ボタンでその試合の出場4人を選びます',
        '合計FargoRateが1900を超えるとペナルティが発生します。「余裕」は1900との差です',
        '勝敗を登録するとカードに反映されます',
        '×2（2回出場）は別試合でも出場した週のマークで、出場回数カウントは1回です',
        '「初期化」ボタンで未登録状態に戻せます',
        '次の試合には「開催予定」バッジが付きます（試合6日前から当日まで表示）',
        '過去の試合は薄く表示されます',
      ]} />
    </HelpModal>
  )
}

// =========================================
// スケジュールタブ
// =========================================
export function ScheduleHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <HelpModal title="スケジュールタブの使い方" onClose={onClose}>
      <Section title="表示内容" items={[
        'JCL今シーズンの全チーム対戦カードを表示します',
        '今日の試合行は青背景でハイライトされます',
        '自チーム名はチームカラーで色付けされます',
        '「PO」バッジはプレーオフです（出場回数カウントの対象外）',
        'スケジュールの更新は設定タブの「PDFからインポート」から行えます',
      ]} />
    </HelpModal>
  )
}

// =========================================
// 設定タブ: セクション別ヘルプ
// =========================================
export function HelpSetupGuide({ onClose }: { onClose: () => void }) {
  return (
    <HelpModal title="使い方ガイド" onClose={onClose}>
      <Section title="はじめての方へ" items={[
        <>① JCL公式サイト（csi-pool.jp/leagues）から今期スケジュールPDFをダウンロード</>,
        <>② 設定タブ「PDFからインポート」でPDFを読み込み、所属チームを選択</>,
        <>③ チームタブの「+ 選手追加」で所属チームの選手を登録（名前はアルファベット推奨、FargoRateは手動入力）</>,
        <>④ 各試合カードで出場選手を選び、合計FargoRateと出場回数を確認しながら運用</>,
      ]} />

      <Section title="ホーム画面へのインストール" items={[
        <>
          <span className="font-medium text-slate-200">iPhone（Safari）</span><br />
          <span className="text-slate-400">Safariで開く → 画面下の共有ボタン（□↑）→「ホーム画面に追加」→「追加」</span>
        </>,
        <>
          <span className="font-medium text-slate-200">Android（Chrome）</span><br />
          <span className="text-slate-400">Chromeで開く → アドレスバー右端の⊕アイコン、またはメニュー→「ホーム画面に追加」</span>
        </>,
        'インストールするとアプリとして起動でき、オフラインでも閲覧できます',
        '※ LINEのブラウザからはインストールできません。Safari / Chromeで開いてください',
      ]} />
    </HelpModal>
  )
}

export function HelpTeamManage({ onClose }: { onClose: () => void }) {
  return (
    <HelpModal title="チーム管理" onClose={onClose}>
      <Section title="チーム管理" items={[
        'チーム名はスケジュールPDFのチーム名と一致させると自動で試合が紐づきます',
        'チームを削除すると選手・ラインナップデータもすべて削除されます',
      ]} />
    </HelpModal>
  )
}

export function HelpRules({ onClose }: { onClose: () => void }) {
  return (
    <HelpModal title="JCLルール設定" onClose={onClose}>
      <Section title="JCLルール設定" items={[
        '合計Fargo上限（デフォルト1900）やボーナス値はJCLのルール変更時に修正してください',
        'ボーナスポイントは選手登録時の「女性」「U25」フラグに基づき自動加算されます',
        '設定を変更したら「設定を保存」を押してください',
      ]} />
    </HelpModal>
  )
}

export function HelpScheduleImport({ onClose }: { onClose: () => void }) {
  return (
    <HelpModal title="PDFからインポート" onClose={onClose}>
      <Section title="スケジュールインポート" items={[
        'JCL公式サイトのスケジュールPDFを読み込みます',
        'インポートするとラインナップ登録済みのデータはリセットされます',
        '※ PDFのフォーマットが変わると読み込みに失敗することがあります',
      ]} />
    </HelpModal>
  )
}

export function HelpBackup({ onClose }: { onClose: () => void }) {
  return (
    <HelpModal title="バックアップ・共有" onClose={onClose}>
      <Section title="データの保存場所" items={[
        'データはこの端末のブラウザ（localStorage）にのみ保存されます',
        'ブラウザのデータを消去するとアプリのデータも消えます。定期的にエクスポートしてください',
      ]} />
      <Section title="エクスポート / インポート" items={[
        'エクスポート: 全データをJSONファイルとして端末に保存します',
        'インポート: 他の端末やチームメンバーから受け取ったJSONを読み込みます',
        'インポートすると現在のデータはすべて上書きされます',
        'チームメンバーへの共有にも利用できます',
      ]} />
    </HelpModal>
  )
}
