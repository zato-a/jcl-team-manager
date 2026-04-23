# JCL Team Manager — Claude Code ルール

## プロジェクト概要
React + TypeScript + Vite + Tailwind CSS v4 で構築したJCL（Japan CSI Pool League）8ボール向けチーム管理PWA。
データはlocalStorageに永続化し、JSONエクスポート/インポートでチームメンバーと共有する。
デプロイ先: GitHub Pages（`main` push → GitHub Actions で自動デプロイ）。

## 必須: push前ビルド確認

**`git push` の前に必ず `npm run build` を実行すること。**

- `npm run dev`（Vite開発サーバー）はesbuildでトランスパイルするだけで型チェックをしない
- TypeScriptエラーがあっても開発中は気づかず、CIで初めて失敗する
- 過去にこれで4回連続デプロイ失敗した実績がある

```bash
npm run build   # tsc -b && vite build — 型エラーがあればここで止まる
```

ビルドが通らない状態でpushしてはならない。型エラーを `// @ts-ignore` 等で握り潰すことも禁止。

## git フック

`.githooks/pre-push` に `npm run build` を実行するフックを設置済み。
新しい開発環境でクローンしたら以下を実行してフックを有効化する:

```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-push   # macOS/Linux のみ
```

## 開発サーバー

```bash
npm run dev   # http://localhost:5174
```

## 技術スタック補足
- FargoRate上限: 4人合計1900（JCLルール）、個人上限720
- ボーナス: 25歳以下 +5pt、女性 +5pt
- スケジュールはPDFインポートで登録
