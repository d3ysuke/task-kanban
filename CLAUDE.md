# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

メッセージは日本語で

## プロジェクト概要

`task-kanban` はタスク管理用のカンバンボードアプリ。3列（未着手 / 進行中 / 完了）のボードで、タスクの一覧・追加・編集・削除ができる。列の移動は編集ダイアログでステータスを変更して行う（ドラッグ&ドロップは未実装）。認証は未実装。

### 構成

- `src/app/page.tsx`: 見出し + `<Suspense>` 内で `TaskBoardLoader` を表示（`cacheComponents` 下では未キャッシュのデータ取得を Suspense 内に置く）
- `src/components/TaskBoardLoader.tsx`: async Server Component。`listTasks` で取得し、Server Actions を props で `KanbanBoard` に渡す。取得失敗時はエラーメッセージを表示
- `src/components/KanbanBoard.tsx`（Client）: タスクを `useState` で保持し、Server Action の戻り値で手元の一覧をすぐ更新する（`refresh()` / `revalidatePath` は使っていない）。`TaskCard` / `TaskFormDialog`（追加・編集共用）/ `ConfirmDialog`（削除確認、`window.confirm` は使わない）
- `src/app/actions.ts`（`"use server"`）: 入力検証 → リポジトリ呼び出し → `ActionResult<T>`（`{ ok: true, data }` / `{ ok: false, error, fieldErrors? }`）を返す。例外は投げず、日本語メッセージに変換する
- `src/lib/task.ts`: `Task` 型、`TASK_STATUSES`（列定義とラベル）、`validateTaskInput`（クライアント・サーバー共通）。文字数はコードポイント数で数える（DB の `char_length` に合わせるため）
- `src/lib/taskRepository.ts`: Supabase の CRUD。第1引数でクライアントを受け取り、snake_case の行を camelCase の `Task` に変換する。DB の `status` は `text` 型なので、`isTaskStatus` で検証してから `TaskStatus` として扱う

### データの流れ

```
page.tsx → <Suspense> → TaskBoardLoader（Server）── listTasks ──→ Supabase
                              │ initialTasks + actions（Server Actions）
                              ▼
                        KanbanBoard（Client, useState）
                              │ actions.createTask / updateTask / deleteTask
                              ▼
                        actions.ts（validateTaskInput → taskRepository）── Supabase
                              │ ActionResult<Task>
                              ▼
                        成功: 手元の tasks を更新しダイアログを閉じる / 失敗: ダイアログ内にエラー表示
```

### 実装上の約束事

- **`"use server"` ファイル（`src/app/actions.ts`）は async 関数だけを export する**。共有する型（`ActionResult` / `TaskActions` など）は `src/lib/task.ts` に置き、クライアントからはそちらを import する。
- **Server Actions は例外を投げない**。失敗は `{ ok: false, error }` で返し、入力エラーは `fieldErrors`（項目名 → メッセージ）で返す。サーバー側のログは `console.error("[tasks] ...")` で出力する（`console.log` は禁止）。
- **入力検証はクライアントとサーバーの両方で `validateTaskInput` を使う**。文字数の上限は `TITLE_MAX_LENGTH` / `DESCRIPTION_MAX_LENGTH` 定数で管理し、DB の CHECK 制約と一致させる。
- **ユーザー向けの文言は日本語**。ステータスのラベルは `TASK_STATUSES` で一元管理する（列の見出しとセレクトボックスの両方で使用）。
- **アクセシビリティ属性はテストの検索条件を兼ねている**。変更するとテストが壊れるので、変えるときはテストも合わせて直す。
  - 列: `<section aria-labelledby>` → `getByRole("region", { name: "未着手" })`
  - カードのボタン: `aria-label="「<タイトル>」を編集"` / `"「<タイトル>」を削除"`
  - ダイアログ: 追加・編集は `role="dialog"`（名前は「タスクを追加」/「タスクを編集」）、削除確認は `role="alertdialog"`（「タスクの削除」）
  - エラー: 全体のエラーは `role="alert"`、項目のエラーは入力欄の `aria-invalid` と `aria-describedby` で関連付ける
- **送信中は確定ボタンを無効にし、表示を変える**（「保存中…」「削除中…」）ことで二重送信を防ぐ。

### タスクに項目を追加するときの手順

1. Supabase MCP の `apply_migration` でカラムと CHECK 制約を追加する → `get_advisors(security)` で確認
2. `generate_typescript_types` の結果で `src/lib/database.types.ts` を上書きする
3. `src/lib/task.ts` の `Task` / `TaskInput` / `UnvalidatedTaskInput` と `validateTaskInput` を更新する（先にテストを書く）
4. `src/lib/taskRepository.ts` の `toTask`（snake_case → camelCase）を更新する
5. `TaskFormDialog`（入力欄）と `TaskCard`（表示）を更新する。`KanbanBoard` の編集用 `initialValue` にも項目を追加する
6. テスト内のテストデータ（`buildTask` や偽の行データ）に新しい項目を追加する

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

- **プロジェクト**: `task-kanban`（project ref: `ftifruzjvjcgsqmjylzs`、リージョン ap-southeast-1）。テーブル構成やキーなどのプロジェクト情報は Supabase MCP で確認する。スキーマ変更は MCP の `apply_migration` で行い、変更後は `get_advisors` でセキュリティ警告を確認する。
- **マイグレーション**: リポジトリ内に `supabase/migrations` はなく、履歴はリモートにだけある（MCP の `list_migrations` で確認する）。適用済みのマイグレーション: `create_tasks_table`（テーブル、`set_updated_at` 関数とトリガー、RLS ポリシー）。関数を作るときは `set search_path = ''` を指定する（advisor の警告対策）。
- **`tasks` テーブル**: `id`（uuid）/ `title`（必須、前後空白を除き1〜100文字）/ `description`（既定 `''`、1000文字以内）/ `status`（`todo` / `in_progress` / `done`、既定 `todo`）/ `created_at` / `updated_at`（トリガー `tasks_set_updated_at` で自動更新）。文字数とステータスは DB の CHECK 制約でも検証している。アプリ側の上限（`src/lib/task.ts`）を変える場合は制約も合わせて変更する。
- **RLS**: 有効。認証がないため、`anon` ロールに select / insert / update / delete をすべて許可するポリシーにしている（公開キーを知っていれば誰でも読み書きできる）。認証を導入するときはポリシーを見直すこと。
- **型**: `src/lib/database.types.ts` は MCP の `generate_typescript_types` で生成したもの（手で編集しない）。スキーマを変更したら再生成して上書きする。`createSupabaseClient()` は `SupabaseClient<Database>` を返す。
- **環境変数**: `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`。キー一覧は `.env.example`、実際の値は `.env.local`（`.gitignore` 済み、コミットしない）。Vercel にデプロイする際は同じキーを環境変数に設定する。新しいキーを追加したら `.env.example` にもキー名を追記する。
- **クライアント**: `src/lib/supabase.ts`（`@supabase/supabase-js`）。
  - `createSupabaseClient()` でクライアントを生成する。環境変数が不足していると例外を投げる。
  - `getSupabaseConfig(env)` は環境変数の読み込みと不足キーの検出を行う。`env` を引数で受け取るので、テストでは `process.env` を書き換えずに値を渡す。
  - `@supabase/ssr` は未導入。Cookie ベースの認証（Server Component / Proxy でのセッション管理）が必要になったら導入を検討する。
- **起動時の接続チェック**: `src/instrumentation.ts` の `register()` がサーバー起動時に一度だけ `checkSupabaseConnection()` を実行する（Node.js ランタイムのみ）。
  - Auth のヘルスチェック（`/auth/v1/health`）に API キー付きでリクエストし、URL とキーの両方を検証する（タイムアウト 5 秒）。
  - 失敗時のみ `console.error` で `[Supabase] 接続失敗: <理由>` を出力する。成功時は何も出力しない。
  - `instrumentation.ts` の変更は、起動中の開発サーバーを再起動しないと反映されない。

## テスト

- **Vitest 5 + React Testing Library + jsdom**。設定は `vitest.config.mts`、セットアップは `vitest.setup.ts`（jest-dom マッチャーの読み込みと各テスト後の `cleanup`）。
- テストファイルは `src/**/*.test.{ts,tsx}` に置く（対象コードの隣に配置）。これ以外の場所は収集されない。
- `globals: true` だが、既存テストは `vitest` から `describe`/`it`/`expect` を明示的に import している。
- Vitest は Next.js のビルドを経由しないため、`@` エイリアスは `vitest.config.mts` 側で別途定義している。`tsconfig.json` の `paths` を変更したら両方を揃えること。
- 非同期の Server Component は Vitest で直接レンダリングできない。`render(await TaskBoardLoader())` のように、関数として await した結果を描画してテストする。
- `@types/node` は Vitest 5 の peer 依存の都合で `^24` に固定している（`^20` だと ERESOLVE でインストールに失敗する）。

### Supabase を使うコードのテスト

テストでは実際の Supabase に接続しない。外部依存である Supabase だけをモックし、自前のモジュール（`taskRepository` など）はモックしない。

| 対象 | 方法 |
|---|---|
| `taskRepository` | `src/lib/testing/fakeSupabaseClient.ts` の `createFakeSupabaseClient({ data, error })` を引数で渡す。メソッドチェーンの呼び出しは `calls` に記録され、await すると指定した結果を返す |
| Server Actions / `TaskBoardLoader` | `vi.mock("@/lib/supabase", () => ({ createSupabaseClient: vi.fn() }))` でモックし、`mockReturnValue(fake.client)` で偽クライアントを返す |
| `KanbanBoard` | `TaskActions` を `vi.fn<TaskActions["createTask"]>()` などで作り、props で渡す（Server Actions を import しない） |
| `checkSupabaseConnection` | 引数 `fetchFn` にモックを渡す |

- エラーの経路では本番コードが `console.error` を出すので、テストでは `vi.spyOn(console, "error").mockImplementation(() => {})` で出力を抑え、`afterEach` で `vi.restoreAllMocks()` する。
- 偽クライアントはクエリ1回分の結果しか返せない。1つの処理で複数回クエリを実行するようになったら、結果を順番に返せるよう拡張する。
- `src/lib/testing/` はテスト用のヘルパー置き場。ここには `*.test.ts` を置かない（置くとテストとして実行される）。

### 実機での確認

- 開発サーバーがすでに :3000 で起動していることが多い（2台目は起動できない）。起動中のサーバーを止めずに、そのサーバーで確認する。
- 画面操作で確認したら、Supabase MCP の `execute_sql` で `tasks` テーブルに反映されたかを確かめ、確認用に作ったデータは削除しておく。

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