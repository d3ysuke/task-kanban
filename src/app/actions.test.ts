import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseClient } from "@/lib/supabase";
import {
  createFakeSupabaseClient,
  type FakeQueryResult,
} from "@/lib/testing/fakeSupabaseClient";
import { createTaskAction, deleteTaskAction, updateTaskAction } from "./actions";

vi.mock("@/lib/supabase", () => ({ createSupabaseClient: vi.fn() }));

function useFakeDb(result: FakeQueryResult) {
  const fake = createFakeSupabaseClient(result);
  vi.mocked(createSupabaseClient).mockReturnValue(fake.client);
  return fake;
}

const row = {
  id: "task-1",
  title: "資料作成",
  description: "",
  status: "todo",
  created_at: "2026-11-18T00:00:00.000Z",
  updated_at: "2026-11-18T00:00:00.000Z",
};

const task = {
  id: "task-1",
  title: "資料作成",
  description: "",
  status: "todo",
  createdAt: "2026-11-18T00:00:00.000Z",
  updatedAt: "2026-11-18T00:00:00.000Z",
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(createSupabaseClient).mockReset();
});

describe("createTaskAction", () => {
  it("入力が正しい場合、前後の空白を除いて登録し、作成したタスクを返す", async () => {
    const { calls } = useFakeDb({ data: row, error: null });

    const result = await createTaskAction({
      title: " 資料作成 ",
      description: "",
      status: "todo",
    });

    expect(result).toEqual({ ok: true, data: task });
    expect(calls).toContainEqual({
      method: "insert",
      args: [{ title: "資料作成", description: "", status: "todo" }],
    });
  });

  it("タイトルが空の場合、DB にアクセスせず入力エラーを返す", async () => {
    useFakeDb({ data: row, error: null });

    const result = await createTaskAction({ title: "", description: "", status: "todo" });

    expect(result).toEqual({
      ok: false,
      error: "入力内容を確認してください",
      fieldErrors: { title: "タイトルを入力してください" },
    });
    expect(createSupabaseClient).not.toHaveBeenCalled();
  });

  it("DB エラーの場合、失敗メッセージを返す", async () => {
    useFakeDb({ data: null, error: { message: "boom" } });

    const result = await createTaskAction({ title: "a", description: "", status: "todo" });

    expect(result).toEqual({ ok: false, error: "タスクの追加に失敗しました" });
  });
});

describe("updateTaskAction", () => {
  it("入力が正しい場合、更新したタスクを返す", async () => {
    useFakeDb({ data: row, error: null });

    const result = await updateTaskAction("task-1", {
      title: "資料作成",
      description: "",
      status: "todo",
    });

    expect(result).toEqual({ ok: true, data: task });
  });

  it("ステータスが不正な場合、DB にアクセスせず入力エラーを返す", async () => {
    useFakeDb({ data: row, error: null });

    const result = await updateTaskAction("task-1", {
      title: "a",
      description: "",
      status: "archived",
    });

    expect(result).toEqual({
      ok: false,
      error: "入力内容を確認してください",
      fieldErrors: { status: "ステータスが不正です" },
    });
    expect(createSupabaseClient).not.toHaveBeenCalled();
  });

  it("DB エラーの場合、失敗メッセージを返す", async () => {
    useFakeDb({ data: null, error: { message: "boom" } });

    const result = await updateTaskAction("task-1", {
      title: "a",
      description: "",
      status: "todo",
    });

    expect(result).toEqual({ ok: false, error: "タスクの更新に失敗しました" });
  });
});

describe("deleteTaskAction", () => {
  it("削除に成功した場合、削除したタスクの ID を返す", async () => {
    useFakeDb({ data: [{ id: "task-1" }], error: null });

    await expect(deleteTaskAction("task-1")).resolves.toEqual({
      ok: true,
      data: { id: "task-1" },
    });
  });

  it("DB エラーの場合、失敗メッセージを返す", async () => {
    useFakeDb({ data: null, error: { message: "boom" } });

    await expect(deleteTaskAction("task-1")).resolves.toEqual({
      ok: false,
      error: "タスクの削除に失敗しました",
    });
  });
});
