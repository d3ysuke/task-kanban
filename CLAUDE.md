# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

メッセージは日本語で

## プロジェクト概要

`task-kanban` はタスク管理用のカンバンボードアプリ。現状は create-next-app の雛形にテスト環境を追加した段階で、カンバン機能はまだ実装されていない（`src/app/page.tsx` は初期ページのまま）。

## コマンド

パッケージマネージャは npm（`package-lock.json` あり）。

```bash
npm run dev          # 開発サーバー (http://localhost:3000)
npm run build        # 本番ビルド
npm run start        # ビルド成果物の起動
npm run lint         # ESLint (flat config: eslint.config.mjs)
npx tsc --noEmit     # 型チェック（専用スクリプトなし）

npm test                              # Vitest を1回実行
npm run test:watch                    # ウォッチモード
npx vitest run src/app/page.test.tsx  # 単一ファイルを実行
npx vitest run -t "見出し"            # テスト名で絞り込み
```

## 技術スタックと注意点

- **Next.js 16 / React 19 / TypeScript 5（strict）**。学習データと API が異なる可能性があるため、Next.js の機能を使う前に `node_modules/next/dist/docs/` の該当ガイドを確認する（AGENTS.md 参照）。
- **App Router**、ソースは `src/` 配下。インポートエイリアス `@/*` → `src/*`。
- `next.config.ts` で `cacheComponents` と `partialPrefetching` が有効。データ取得やキャッシュの挙動はこれらの前提で考えること。
- レイアウトの props は Next.js が生成するグローバル型 `LayoutProps<"/">` を使っている（型は `next build` / `next dev` 時に `.next/types` に生成される）。
- **Tailwind CSS 4**。PostCSS 設定ファイルはなく、`next.config.ts` の Turbopack ルール（`@tailwindcss/turbopack` ローダー）で `*.css` を処理している。テーマトークンは `src/app/globals.css` の `@theme inline` で定義（`--color-background` / `--color-foreground`、ダークモードは `prefers-color-scheme`）。
- Supabase（データベース）
- Vitest + Test Library（テスト）
- Vercel（デプロイ）

## Supabase

- **プロジェクト**: `task-kanban`（project ref: `ftifruzjvjcgsqmjylzs`、リージョン ap-southeast-1）。テーブル構成やキーなどのプロジェクト情報は Supabase MCP で確認する。現時点でテーブルは未作成。
- **環境変数**: `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`。キー一覧は `.env.example`、実際の値は `.env.local`（`.gitignore` 済み、コミットしない）。Vercel にデプロイする際は同じキーを環境変数に設定する。新しいキーを追加したら `.env.example` にもキー名を追記する。
- **クライアント**: `src/lib/supabase.ts`（`@supabase/supabase-js`）。
  - `createSupabaseClient()` でクライアントを生成する。環境変数が不足していると例外を投げる。
  - `getSupabaseConfig(env)` は環境変数の読み込みと不足キーの検出を行う。`env` を引数で受け取るので、テストでは `process.env` を書き換えずに値を渡す。
  - `@supabase/ssr` は未導入。Cookie ベースの認証（Server Component / Proxy でのセッション管理）が必要になったら導入を検討する。
- **起動時の接続チェック**: `src/instrumentation.ts` の `register()` がサーバー起動時に一度だけ `checkSupabaseConnection()` を実行する（Node.js ランタイムのみ）。
  - Auth のヘルスチェック（`/auth/v1/health`）に API キー付きでリクエストし、URL とキーの両方を検証する（タイムアウト 5 秒）。
  - 失敗時のみ `console.error` で `[Supabase] 接続失敗: <理由>` を出力する。成功時は何も出力しない。
  - `instrumentation.ts` の変更は、起動中の開発サーバーを再起動しないと反映されない。
- **テスト**: `checkSupabaseConnection(env, fetchFn)` は `fetch` を引数で差し替えられる。テストでは実際の Supabase に接続せず、モックした `fetchFn` を渡す（`src/lib/supabase.test.ts` 参照）。

## テスト

- **Vitest 5 + React Testing Library + jsdom**。設定は `vitest.config.mts`、セットアップは `vitest.setup.ts`（jest-dom マッチャーの読み込みと各テスト後の `cleanup`）。
- テストファイルは `src/**/*.test.{ts,tsx}` に置く（対象コードの隣に配置）。これ以外の場所は収集されない。
- `globals: true` だが、既存テストは `vitest` から `describe`/`it`/`expect` を明示的に import している。
- Vitest は Next.js のビルドを経由しないため、`@` エイリアスは `vitest.config.mts` 側で別途定義している。`tsconfig.json` の `paths` を変更したら両方を揃えること。
- 非同期の Server Component は Vitest で直接レンダリングできない点に注意。
- `@types/node` は Vitest 5 の peer 依存の都合で `^24` に固定している（`^20` だと ERESOLVE でインストールに失敗する）。

## コーディングルール

- 変更後は必ず、'npm test' でテストが通る事を確認する
- 変更は１つの関心事に絞り、小さい範囲で行う
- 指示された範囲以外のコードは変更しない

## コーディング規約

- コンポーネントは関数コンポーネントで記述する
- 変数名、関数名はキャメルケースで書く
- コミットメッセージは日本語で書く

## テストルール

- 網羅性：正常系・異常系・境界値を検討する
- 可読性：テスト名に条件と期待する結果を明記する
- 保守性：実装の内部構造ではなくユーザーから見た振る舞いをテストする
- 独立性：テスト間で状態を共有しない
- 状態遷移：画面遷移の順方向・逆方向を検証する
- モック方針：外部依存のみモック化する

## 禁止事項

- console.logを本番コードに残さない
- 既存のテストを削除しない
- any型を使用しない