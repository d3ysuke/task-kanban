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
- `src/components/ui/`: shadcn/ui の CLI が生成した UI 部品（alert / alert-dialog / badge / button / card / dialog / input / label / native-select / skeleton / textarea）。画面はすべてこれらの部品とテーマトークンで組んでいる
  - 追加・編集ダイアログは `Dialog`、削除確認は `AlertDialog`（確定ボタンは `AlertDialogAction` ではなく通常の `Button`。失敗時にダイアログを閉じずにエラーを出すため）。どちらも親が条件付きで描画し、常に `open` で使う
  - ステータス欄は `NativeSelect`（中身はネイティブ `<select>` なので、テストでは `user.selectOptions` が使える）
  - カードの編集・削除ボタンはアイコンのみ（名前は `aria-label`）。マウス操作の環境（`pointer-fine`）ではホバー／フォーカス時だけ表示する
- `src/lib/utils.ts`: `export { cn } from "cn"` のみ（shadcn/ui の CLI が生成）

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
- **Tailwind CSS 4**。PostCSS 設定ファイルはなく、`next.config.ts` の Turbopack ルール（`@tailwindcss/turbopack` ローダー）で `*.css` を処理している。テーマトークンは `src/app/globals.css` で定義する（下記の shadcn/ui の項を参照）。
- **shadcn/ui**（設定は `components.json`: style `base-nova`、ベースカラー `neutral`、アイコン `lucide`）。
  - 部品は `npx shadcn@latest add <name>` で `src/components/ui/` に追加する。生成されたファイルはプロジェクトのコードとして扱い、必要に応じて編集してよい。
  - 土台のライブラリは **Base UI**（`@base-ui/react`）。Radix UI ではないので、props の型（例: `ButtonPrimitive.Props`）や API は Base UI のドキュメントで確認する。バリアントは `class-variance-authority`。
  - `cn` は `cn` パッケージのもの（`clsx` + `tailwind-merge` ではない）。生成された部品は `"cn"` から直接 import するが、自前のコードは `@/lib/utils` から import する。
  - CLI の手順や API は変わりやすいので、context7 MCP などで最新のドキュメントを確認してから使う。
- **テーマ（`src/app/globals.css`）**: `tw-animate-css` と `shadcn/tailwind.css` を読み込む。色は `:root`（ライト）/ `.dark`（ダーク）の CSS 変数（oklch）で定義し、`@theme inline` で `bg-primary` / `text-muted-foreground` / `border-border` などのユーティリティにしている。新しい UI では `zinc-*` などの直接指定より、これらのトークンを使う。
- **ダークモードは `.dark` クラスで切り替える**（`@custom-variant dark (&:is(.dark *))`）。`prefers-color-scheme` ではない。いまは `.dark` を付ける仕組み（`next-themes` など）がないため、OS の設定にかかわらず常にライト表示になり、既存コードの `dark:` クラスも効かない。
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

- Base UI のモーダル（`Dialog` / `AlertDialog`）を開いている間は背景が `aria-hidden` になり、`getByRole` で背景の要素（列の region など）が見つからない。ダイアログ表示中に背景を調べるときは `{ hidden: true }` を渡す
- エラーの経路では本番コードが `console.error` を出すので、テストでは `vi.spyOn(console, "error").mockImplementation(() => {})` で出力を抑え、`afterEach` で `vi.restoreAllMocks()` する。
- 偽クライアントはクエリ1回分の結果しか返せない。1つの処理で複数回クエリを実行するようになったら、結果を順番に返せるよう拡張する。
- `src/lib/testing/` はテスト用のヘルパー置き場。ここには `*.test.ts` を置かない（置くとテストとして実行される）。

### 実機での確認

- 開発サーバーがすでに :3000 で起動していることが多い（2台目は起動できない）。起動中のサーバーを止めずに、そのサーバーで確認する。
- 画面操作で確認したら、Supabase MCP の `execute_sql` で `tasks` テーブルに反映されたかを確かめ、確認用に作ったデータは削除しておく。

## デザインルール

画面は shadcn/ui（base-nova）の部品とテーマトークンで組む。新しい UI を作るときも以下に合わせる。

### 部品の選び方

- **既存の shadcn 部品を先に探す**。素の `<button>` / `<input>` / 自作モーダルは作らない。足りない部品は `npx shadcn@latest add <name>` で追加してから使う。
- 用途ごとの部品:

| 用途 | 部品 | 備考 |
|---|---|---|
| ボタン | `Button` | 主操作は `default`、取消は `outline`、カード上の操作は `ghost` + `size="icon-sm"`、破壊的操作は `destructive` |
| 入力フォームのダイアログ | `Dialog` | `showCloseButton={false}`（×ボタンの名前「Close」がテストと衝突しうるため）。フッターは `DialogFooter` |
| 破壊的操作の確認 | `AlertDialog` | `AlertDialogMedia` でアイコンを出す。確定ボタンは通常の `Button`（`AlertDialogAction` は押すと閉じるため失敗時にエラーを出せない） |
| 選択肢（少数・固定） | `NativeSelect` | ネイティブ `<select>` なのでモバイルで OS 標準のピッカーが出て、テストも `selectOptions` で書ける |
| エラー表示 | `Alert variant="destructive"` | 先頭に `CircleAlertIcon`。`role="alert"` が付く |
| 項目のエラー | `<p className="text-sm text-destructive">` | 入力欄の `aria-invalid` / `aria-describedby` と組で使う |
| 件数などの小さなラベル | `Badge` | 列の件数は `variant="outline"` + `bg-background` |
| 一覧の要素 | `Card size="sm"` | `CardHeader` / `CardTitle` / `CardDescription` / `CardAction` |
| 読み込み中 | `Skeleton` | 実際のレイアウトに近い形で並べる。スクリーンリーダー向けに「読み込み中…」の文字も残す |

### 色

- **色はテーマトークンを使う**（`bg-background` / `bg-muted` / `text-muted-foreground` / `border` / `text-destructive` / `bg-primary` など）。`zinc-*` や `red-*` などの直接指定はしない。
- 例外は**ステータスの識別色**だけ（`KanbanBoard` の `statusDotClassName`: 未着手 `slate-400` / 進行中 `blue-500` / 完了 `emerald-500`）。色だけに頼らず、必ずラベルの文字と一緒に表示する。
- 白黒（neutral）を基調にし、色は「主操作（primary）」「破壊的操作・エラー（destructive）」「ステータス」に絞る。

### レイアウトと形

- ページは `max-w-6xl` で中央寄せ、余白は `px-4 sm:px-6` / `py-10`。セクション間は `gap-6`〜`gap-8`、列やカードの間は `gap-2`〜`gap-4`。
- 角丸は外側ほど大きくする: 列の枠 `rounded-2xl` → 空表示の枠 `rounded-xl` → カード（`Card` の既定）。
- 列の背景は `bg-muted/50` + `border`、その上のカードは白（`bg-card`）で浮かせる。影は控えめに（`shadow-xs`、ホバーで `shadow-md`）。
- 3列は `md:grid-cols-3`、モバイルでは縦に積む。列は `items-start` で高さを揃えない。
- 空の状態は「点線枠（`border-dashed`）+ アイコン + 短い文言」で表示する。

### アイコン

- `lucide-react` を使う（`PlusIcon` / `PencilIcon` / `Trash2Icon` / `InboxIcon` / `CircleAlertIcon` など）。
- ボタン内で文字と並べるときは `data-icon="inline-start"` を付ける（`Button` が余白を調整する）。
- 飾りのアイコンには `aria-hidden="true"`、アイコンだけのボタンには `aria-label` を必ず付ける。

### 操作と状態

- カードの操作ボタンは、マウス操作の環境（`pointer-fine:`）ではホバー／フォーカス時だけ表示し、タッチ端末では常に表示する。`md:` などの画面幅では切り替えない（タブレットで押せなくなるため）。
- ダイアログは Esc・背景クリックでも閉じられるようにし、送信中は閉じない（`onOpenChange` で `pending` を見る）。
- 送信中はボタンを `disabled` にして文言を変える（「保存中…」「削除中…」）。
- 文言は日本語で短く。入力欄には `placeholder` で例を示す（例: 「例: 企画書を作成する」）。

### デザイン変更後の確認

- `npm test` に加えて、Playwright MCP でデスクトップ幅（1280）とモバイル幅（390）のスクリーンショットを撮り、ダイアログを開いた状態も確認する。スクリーンショットは `.playwright-mcp/` に保存する（Playwright MCP はリポジトリ外に書き込めない）。
- ブラウザのコンソールにエラー・警告が出ていないことを確認する。

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