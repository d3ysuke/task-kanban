import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Task, TaskActions } from "@/lib/task";
import { KanbanBoard } from "./KanbanBoard";

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "資料作成",
    description: "会議用の資料",
    status: "todo",
    createdAt: "2026-11-18T00:00:00.000Z",
    updatedAt: "2026-11-18T00:00:00.000Z",
    ...overrides,
  };
}

function setup(initialTasks: Task[] = [], overrides: Partial<TaskActions> = {}) {
  const actions: TaskActions = {
    createTask: vi.fn<TaskActions["createTask"]>(),
    updateTask: vi.fn<TaskActions["updateTask"]>(),
    deleteTask: vi.fn<TaskActions["deleteTask"]>(),
    ...overrides,
  };
  const user = userEvent.setup();
  render(<KanbanBoard initialTasks={initialTasks} actions={actions} />);
  return { user, actions };
}

// モーダル表示中は背景がアクセシビリティツリーから隠れるため、その間に列を調べるときは hidden: true を渡す
const column = (name: string, options: { hidden?: boolean } = {}) =>
  screen.getByRole("region", { name, ...options });

describe("KanbanBoard", () => {
  describe("一覧表示", () => {
    it("未着手・進行中・完了の3列を表示する", () => {
      setup();

      expect(column("未着手")).toBeInTheDocument();
      expect(column("進行中")).toBeInTheDocument();
      expect(column("完了")).toBeInTheDocument();
    });

    it("各タスクをステータスに対応する列に表示する", () => {
      setup([
        buildTask({ id: "1", title: "企画", status: "todo" }),
        buildTask({ id: "2", title: "実装", status: "in_progress" }),
        buildTask({ id: "3", title: "リリース", status: "done" }),
      ]);

      expect(within(column("未着手")).getByText("企画")).toBeInTheDocument();
      expect(within(column("進行中")).getByText("実装")).toBeInTheDocument();
      expect(within(column("完了")).getByText("リリース")).toBeInTheDocument();
      expect(within(column("未着手")).queryByText("実装")).not.toBeInTheDocument();
    });

    it("タスクの説明を表示する", () => {
      setup([buildTask({ description: "会議用の資料" })]);

      expect(screen.getByText("会議用の資料")).toBeInTheDocument();
    });

    it("列ごとのタスク件数を表示する", () => {
      setup([
        buildTask({ id: "1", status: "todo" }),
        buildTask({ id: "2", status: "todo" }),
        buildTask({ id: "3", status: "done" }),
      ]);

      expect(within(column("未着手")).getByText("2件")).toBeInTheDocument();
      expect(within(column("進行中")).getByText("0件")).toBeInTheDocument();
      expect(within(column("完了")).getByText("1件")).toBeInTheDocument();
    });

    it("タスクが0件の場合、すべての列に空であることを表示する", () => {
      setup([]);

      for (const name of ["未着手", "進行中", "完了"]) {
        expect(within(column(name)).getByText("タスクはありません")).toBeInTheDocument();
      }
    });

    it("列内のタスクは渡された順序（作成日時の昇順）で表示する", () => {
      setup([
        buildTask({ id: "1", title: "1番目" }),
        buildTask({ id: "2", title: "2番目" }),
      ]);

      const items = within(column("未着手")).getAllByRole("listitem");
      expect(items[0]).toHaveTextContent("1番目");
      expect(items[1]).toHaveTextContent("2番目");
    });
  });

  describe("追加", () => {
    it("追加ボタンを押すと、空の入力欄を持つ追加ダイアログを開く", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: "タスクを追加" }));

      const dialog = screen.getByRole("dialog", { name: "タスクを追加" });
      expect(within(dialog).getByLabelText("タイトル")).toHaveValue("");
      expect(within(dialog).getByLabelText("説明")).toHaveValue("");
      expect(within(dialog).getByLabelText("ステータス")).toHaveValue("todo");
    });

    it("入力して保存すると、ダイアログを閉じて該当する列にすぐ表示する", async () => {
      const created = buildTask({ id: "new", title: "テスト作成", description: "単体テスト", status: "in_progress" });
      const { user, actions } = setup([], {
        createTask: vi.fn<TaskActions["createTask"]>().mockResolvedValue({ ok: true, data: created }),
      });

      await user.click(screen.getByRole("button", { name: "タスクを追加" }));
      const dialog = screen.getByRole("dialog", { name: "タスクを追加" });
      await user.type(within(dialog).getByLabelText("タイトル"), "テスト作成");
      await user.type(within(dialog).getByLabelText("説明"), "単体テスト");
      await user.selectOptions(within(dialog).getByLabelText("ステータス"), "in_progress");
      await user.click(within(dialog).getByRole("button", { name: "保存" }));

      expect(actions.createTask).toHaveBeenCalledWith({
        title: "テスト作成",
        description: "単体テスト",
        status: "in_progress",
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(within(column("進行中")).getByText("テスト作成")).toBeInTheDocument();
      expect(within(column("進行中")).getByText("1件")).toBeInTheDocument();
    });

    it("追加したタスクは既存タスクの後ろに表示する", async () => {
      const created = buildTask({ id: "new", title: "新規" });
      const { user } = setup([buildTask({ id: "old", title: "既存" })], {
        createTask: vi.fn<TaskActions["createTask"]>().mockResolvedValue({ ok: true, data: created }),
      });

      await user.click(screen.getByRole("button", { name: "タスクを追加" }));
      await user.type(screen.getByLabelText("タイトル"), "新規");
      await user.click(screen.getByRole("button", { name: "保存" }));

      const items = within(column("未着手")).getAllByRole("listitem");
      expect(items.map((item) => item.textContent)).toEqual([
        expect.stringContaining("既存"),
        expect.stringContaining("新規"),
      ]);
    });

    it("タイトルが空のまま保存すると、エラーを表示して追加しない", async () => {
      const { user, actions } = setup();

      await user.click(screen.getByRole("button", { name: "タスクを追加" }));
      await user.click(screen.getByRole("button", { name: "保存" }));

      expect(screen.getByText("タイトルを入力してください")).toBeInTheDocument();
      expect(screen.getByLabelText("タイトル")).toHaveAttribute("aria-invalid", "true");
      expect(actions.createTask).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog", { name: "タスクを追加" })).toBeInTheDocument();
    });

    it("タイトルが空白のみの場合、エラーを表示して追加しない", async () => {
      const { user, actions } = setup();

      await user.click(screen.getByRole("button", { name: "タスクを追加" }));
      await user.type(screen.getByLabelText("タイトル"), "   ");
      await user.click(screen.getByRole("button", { name: "保存" }));

      expect(screen.getByText("タイトルを入力してください")).toBeInTheDocument();
      expect(actions.createTask).not.toHaveBeenCalled();
    });

    it("タイトルが101文字の場合、エラーを表示して追加しない", async () => {
      const { user, actions } = setup();

      await user.click(screen.getByRole("button", { name: "タスクを追加" }));
      await user.click(screen.getByLabelText("タイトル"));
      await user.paste("あ".repeat(101));
      await user.click(screen.getByRole("button", { name: "保存" }));

      expect(screen.getByText("タイトルは100文字以内で入力してください")).toBeInTheDocument();
      expect(actions.createTask).not.toHaveBeenCalled();
    });

    it("タイトルが100文字の場合、追加できる", async () => {
      const title = "あ".repeat(100);
      const { user, actions } = setup([], {
        createTask: vi.fn<TaskActions["createTask"]>().mockResolvedValue({ ok: true, data: buildTask({ title }) }),
      });

      await user.click(screen.getByRole("button", { name: "タスクを追加" }));
      await user.click(screen.getByLabelText("タイトル"));
      await user.paste(title);
      await user.click(screen.getByRole("button", { name: "保存" }));

      expect(actions.createTask).toHaveBeenCalledWith({ title, description: "", status: "todo" });
      expect(within(column("未着手")).getByText(title)).toBeInTheDocument();
    });

    it("保存に失敗した場合、ダイアログにエラーを表示し、一覧は変わらない", async () => {
      const { user } = setup([], {
        createTask: vi
          .fn<TaskActions["createTask"]>()
          .mockResolvedValue({ ok: false, error: "タスクの追加に失敗しました" }),
      });

      await user.click(screen.getByRole("button", { name: "タスクを追加" }));
      await user.type(screen.getByLabelText("タイトル"), "失敗するタスク");
      await user.click(screen.getByRole("button", { name: "保存" }));

      const dialog = screen.getByRole("dialog", { name: "タスクを追加" });
      expect(within(dialog).getByRole("alert")).toHaveTextContent("タスクの追加に失敗しました");
      expect(within(dialog).getByLabelText("タイトル")).toHaveValue("失敗するタスク");
      expect(within(column("未着手", { hidden: true })).getByText("タスクはありません")).toBeInTheDocument();
    });

    it("サーバーが項目ごとのエラーを返した場合、該当項目にエラーを表示する", async () => {
      const { user } = setup([], {
        createTask: vi.fn<TaskActions["createTask"]>().mockResolvedValue({
          ok: false,
          error: "入力内容を確認してください",
          fieldErrors: { title: "タイトルは100文字以内で入力してください" },
        }),
      });

      await user.click(screen.getByRole("button", { name: "タスクを追加" }));
      await user.type(screen.getByLabelText("タイトル"), "a");
      await user.click(screen.getByRole("button", { name: "保存" }));

      expect(screen.getByText("タイトルは100文字以内で入力してください")).toBeInTheDocument();
    });

    it("保存中は保存ボタンを無効にし、二重送信を防ぐ", async () => {
      let resolve: (value: Awaited<ReturnType<TaskActions["createTask"]>>) => void = () => {};
      const createTask = vi.fn<TaskActions["createTask"]>().mockReturnValue(
        new Promise((r) => {
          resolve = r;
        }),
      );
      const { user } = setup([], { createTask });

      await user.click(screen.getByRole("button", { name: "タスクを追加" }));
      await user.type(screen.getByLabelText("タイトル"), "a");
      await user.click(screen.getByRole("button", { name: "保存" }));

      expect(screen.getByRole("button", { name: "保存中…" })).toBeDisabled();
      await user.click(screen.getByRole("button", { name: "保存中…" }));
      expect(createTask).toHaveBeenCalledTimes(1);

      resolve({ ok: true, data: buildTask({ title: "a" }) });
      await waitFor(() => expect(within(column("未着手")).getByText("a")).toBeInTheDocument());
    });

    it("キャンセルすると、追加せずにダイアログを閉じる", async () => {
      const { user, actions } = setup();

      await user.click(screen.getByRole("button", { name: "タスクを追加" }));
      await user.type(screen.getByLabelText("タイトル"), "やめる");
      await user.click(screen.getByRole("button", { name: "キャンセル" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(actions.createTask).not.toHaveBeenCalled();
      expect(screen.queryByText("やめる")).not.toBeInTheDocument();
    });

    it("キャンセル後に再度開くと、前回の入力内容とエラーは残っていない", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: "タスクを追加" }));
      await user.click(screen.getByRole("button", { name: "保存" }));
      await user.type(screen.getByLabelText("タイトル"), "途中");
      await user.click(screen.getByRole("button", { name: "キャンセル" }));
      await user.click(screen.getByRole("button", { name: "タスクを追加" }));

      expect(screen.getByLabelText("タイトル")).toHaveValue("");
      expect(screen.queryByText("タイトルを入力してください")).not.toBeInTheDocument();
    });
  });

  describe("編集", () => {
    it("編集ボタンを押すと、現在の値が入った編集ダイアログを開く", async () => {
      const { user } = setup([buildTask({ title: "資料作成", description: "会議用の資料", status: "in_progress" })]);

      await user.click(screen.getByRole("button", { name: "「資料作成」を編集" }));

      const dialog = screen.getByRole("dialog", { name: "タスクを編集" });
      expect(within(dialog).getByLabelText("タイトル")).toHaveValue("資料作成");
      expect(within(dialog).getByLabelText("説明")).toHaveValue("会議用の資料");
      expect(within(dialog).getByLabelText("ステータス")).toHaveValue("in_progress");
    });

    it("タイトルを変更して保存すると、一覧にすぐ反映する", async () => {
      const { user, actions } = setup([buildTask({ id: "task-1", title: "資料作成" })], {
        updateTask: vi
          .fn<TaskActions["updateTask"]>()
          .mockResolvedValue({ ok: true, data: buildTask({ id: "task-1", title: "資料レビュー" }) }),
      });

      await user.click(screen.getByRole("button", { name: "「資料作成」を編集" }));
      const titleInput = screen.getByLabelText("タイトル");
      await user.clear(titleInput);
      await user.type(titleInput, "資料レビュー");
      await user.click(screen.getByRole("button", { name: "保存" }));

      expect(actions.updateTask).toHaveBeenCalledWith("task-1", {
        title: "資料レビュー",
        description: "会議用の資料",
        status: "todo",
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("資料レビュー")).toBeInTheDocument();
      expect(screen.queryByText("資料作成")).not.toBeInTheDocument();
    });

    it("ステータスを未着手から進行中に変更すると、進行中の列へ移動する", async () => {
      const { user } = setup([buildTask({ status: "todo" })], {
        updateTask: vi
          .fn<TaskActions["updateTask"]>()
          .mockResolvedValue({ ok: true, data: buildTask({ status: "in_progress" }) }),
      });

      await user.click(screen.getByRole("button", { name: "「資料作成」を編集" }));
      await user.selectOptions(screen.getByLabelText("ステータス"), "in_progress");
      await user.click(screen.getByRole("button", { name: "保存" }));

      expect(within(column("進行中")).getByText("資料作成")).toBeInTheDocument();
      expect(within(column("未着手")).queryByText("資料作成")).not.toBeInTheDocument();
    });

    it("ステータスを完了から未着手に戻すと、未着手の列へ移動する", async () => {
      const { user } = setup([buildTask({ status: "done" })], {
        updateTask: vi
          .fn<TaskActions["updateTask"]>()
          .mockResolvedValue({ ok: true, data: buildTask({ status: "todo" }) }),
      });

      await user.click(screen.getByRole("button", { name: "「資料作成」を編集" }));
      await user.selectOptions(screen.getByLabelText("ステータス"), "todo");
      await user.click(screen.getByRole("button", { name: "保存" }));

      expect(within(column("未着手")).getByText("資料作成")).toBeInTheDocument();
      expect(within(column("完了")).queryByText("資料作成")).not.toBeInTheDocument();
    });

    it("タイトルを空にして保存すると、エラーを表示して更新しない", async () => {
      const { user, actions } = setup([buildTask()]);

      await user.click(screen.getByRole("button", { name: "「資料作成」を編集" }));
      await user.clear(screen.getByLabelText("タイトル"));
      await user.click(screen.getByRole("button", { name: "保存" }));

      expect(screen.getByText("タイトルを入力してください")).toBeInTheDocument();
      expect(actions.updateTask).not.toHaveBeenCalled();
    });

    it("保存に失敗した場合、エラーを表示し、一覧は変更前のままにする", async () => {
      const { user } = setup([buildTask({ title: "資料作成" })], {
        updateTask: vi
          .fn<TaskActions["updateTask"]>()
          .mockResolvedValue({ ok: false, error: "タスクの更新に失敗しました" }),
      });

      await user.click(screen.getByRole("button", { name: "「資料作成」を編集" }));
      await user.clear(screen.getByLabelText("タイトル"));
      await user.type(screen.getByLabelText("タイトル"), "変更後");
      await user.click(screen.getByRole("button", { name: "保存" }));

      expect(screen.getByRole("alert")).toHaveTextContent("タスクの更新に失敗しました");
      await user.click(screen.getByRole("button", { name: "キャンセル" }));
      expect(within(column("未着手")).getByText("資料作成")).toBeInTheDocument();
      expect(screen.queryByText("変更後")).not.toBeInTheDocument();
    });

    it("キャンセルすると、変更を破棄してダイアログを閉じる", async () => {
      const { user, actions } = setup([buildTask({ title: "資料作成" })]);

      await user.click(screen.getByRole("button", { name: "「資料作成」を編集" }));
      await user.type(screen.getByLabelText("タイトル"), "追記");
      await user.click(screen.getByRole("button", { name: "キャンセル" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(actions.updateTask).not.toHaveBeenCalled();
      expect(screen.getByText("資料作成")).toBeInTheDocument();
    });
  });

  describe("削除", () => {
    it("削除ボタンを押すと、タスク名を含む確認ダイアログを表示し、まだ削除しない", async () => {
      const { user, actions } = setup([buildTask({ title: "資料作成" })]);

      await user.click(screen.getByRole("button", { name: "「資料作成」を削除" }));

      const dialog = screen.getByRole("alertdialog", { name: "タスクの削除" });
      expect(dialog).toHaveTextContent("「資料作成」を削除しますか？");
      expect(actions.deleteTask).not.toHaveBeenCalled();
    });

    it("確認ダイアログでキャンセルすると、削除せずにタスクを残す", async () => {
      const { user, actions } = setup([buildTask({ title: "資料作成" })]);

      await user.click(screen.getByRole("button", { name: "「資料作成」を削除" }));
      await user.click(screen.getByRole("button", { name: "キャンセル" }));

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(actions.deleteTask).not.toHaveBeenCalled();
      expect(screen.getByText("資料作成")).toBeInTheDocument();
    });

    it("確認ダイアログで削除すると、一覧からすぐに消える", async () => {
      const { user, actions } = setup(
        [buildTask({ id: "task-1", title: "資料作成" }), buildTask({ id: "task-2", title: "残すタスク" })],
        {
          deleteTask: vi
            .fn<TaskActions["deleteTask"]>()
            .mockResolvedValue({ ok: true, data: { id: "task-1" } }),
        },
      );

      await user.click(screen.getByRole("button", { name: "「資料作成」を削除" }));
      await user.click(screen.getByRole("button", { name: "削除する" }));

      expect(actions.deleteTask).toHaveBeenCalledWith("task-1");
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(screen.queryByText("資料作成")).not.toBeInTheDocument();
      expect(screen.getByText("残すタスク")).toBeInTheDocument();
      expect(within(column("未着手")).getByText("1件")).toBeInTheDocument();
    });

    it("最後の1件を削除すると、空であることを表示する", async () => {
      const { user } = setup([buildTask()], {
        deleteTask: vi
          .fn<TaskActions["deleteTask"]>()
          .mockResolvedValue({ ok: true, data: { id: "task-1" } }),
      });

      await user.click(screen.getByRole("button", { name: "「資料作成」を削除" }));
      await user.click(screen.getByRole("button", { name: "削除する" }));

      expect(within(column("未着手")).getByText("タスクはありません")).toBeInTheDocument();
    });

    it("削除に失敗した場合、エラーを表示し、タスクを残す", async () => {
      const { user } = setup([buildTask({ title: "資料作成" })], {
        deleteTask: vi
          .fn<TaskActions["deleteTask"]>()
          .mockResolvedValue({ ok: false, error: "タスクの削除に失敗しました" }),
      });

      await user.click(screen.getByRole("button", { name: "「資料作成」を削除" }));
      await user.click(screen.getByRole("button", { name: "削除する" }));

      const dialog = screen.getByRole("alertdialog", { name: "タスクの削除" });
      expect(within(dialog).getByRole("alert")).toHaveTextContent("タスクの削除に失敗しました");
      await user.click(within(dialog).getByRole("button", { name: "キャンセル" }));
      expect(within(column("未着手")).getByText("資料作成")).toBeInTheDocument();
    });
  });
});
