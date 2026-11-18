import { describe, expect, it } from "vitest";
import { createFakeSupabaseClient } from "@/lib/testing/fakeSupabaseClient";
import { createTask, deleteTask, listTasks, updateTask } from "./taskRepository";

const row = {
  id: "task-1",
  title: "資料作成",
  description: "会議用",
  status: "in_progress",
  created_at: "2026-11-18T00:00:00.000Z",
  updated_at: "2026-11-18T01:00:00.000Z",
};

const task = {
  id: "task-1",
  title: "資料作成",
  description: "会議用",
  status: "in_progress",
  createdAt: "2026-11-18T00:00:00.000Z",
  updatedAt: "2026-11-18T01:00:00.000Z",
};

const dbError = { message: "connection refused" };

describe("listTasks", () => {
  it("取得に成功した場合、作成日時の昇順でタスク一覧を返す", async () => {
    const { client, calls } = createFakeSupabaseClient({ data: [row], error: null });

    await expect(listTasks(client)).resolves.toEqual([task]);
    expect(calls).toContainEqual({ method: "from", args: ["tasks"] });
    expect(calls).toContainEqual({
      method: "order",
      args: ["created_at", { ascending: true }],
    });
  });

  it("タスクが0件の場合、空配列を返す", async () => {
    const { client } = createFakeSupabaseClient({ data: [], error: null });

    await expect(listTasks(client)).resolves.toEqual([]);
  });

  it("Supabase がエラーを返した場合、例外を投げる", async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: dbError });

    await expect(listTasks(client)).rejects.toThrow("connection refused");
  });

  it("定義外のステータスを持つ行がある場合、例外を投げる", async () => {
    const { client } = createFakeSupabaseClient({
      data: [{ ...row, status: "archived" }],
      error: null,
    });

    await expect(listTasks(client)).rejects.toThrow();
  });
});

describe("createTask", () => {
  it("登録に成功した場合、作成されたタスクを返す", async () => {
    const { client, calls } = createFakeSupabaseClient({ data: row, error: null });
    const input = { title: "資料作成", description: "会議用", status: "in_progress" as const };

    await expect(createTask(client, input)).resolves.toEqual(task);
    expect(calls).toContainEqual({ method: "insert", args: [input] });
  });

  it("Supabase がエラーを返した場合、例外を投げる", async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: dbError });

    await expect(
      createTask(client, { title: "a", description: "", status: "todo" }),
    ).rejects.toThrow("connection refused");
  });
});

describe("updateTask", () => {
  it("更新に成功した場合、指定IDのタスクを更新して返す", async () => {
    const { client, calls } = createFakeSupabaseClient({ data: row, error: null });
    const input = { title: "資料作成", description: "会議用", status: "in_progress" as const };

    await expect(updateTask(client, "task-1", input)).resolves.toEqual(task);
    expect(calls).toContainEqual({ method: "update", args: [input] });
    expect(calls).toContainEqual({ method: "eq", args: ["id", "task-1"] });
  });

  it("Supabase がエラーを返した場合、例外を投げる", async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: dbError });

    await expect(
      updateTask(client, "task-1", { title: "a", description: "", status: "todo" }),
    ).rejects.toThrow("connection refused");
  });
});

describe("deleteTask", () => {
  it("削除に成功した場合、指定IDのタスクを削除する", async () => {
    const { client, calls } = createFakeSupabaseClient({
      data: [{ id: "task-1" }],
      error: null,
    });

    await expect(deleteTask(client, "task-1")).resolves.toBeUndefined();
    expect(calls).toContainEqual({ method: "delete", args: [] });
    expect(calls).toContainEqual({ method: "eq", args: ["id", "task-1"] });
  });

  it("対象のタスクが存在しない場合、例外を投げる", async () => {
    const { client } = createFakeSupabaseClient({ data: [], error: null });

    await expect(deleteTask(client, "missing")).rejects.toThrow(
      "タスクが見つかりません",
    );
  });

  it("Supabase がエラーを返した場合、例外を投げる", async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: dbError });

    await expect(deleteTask(client, "task-1")).rejects.toThrow("connection refused");
  });
});
