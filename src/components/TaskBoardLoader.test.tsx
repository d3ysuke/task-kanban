import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseClient } from "@/lib/supabase";
import { createFakeSupabaseClient } from "@/lib/testing/fakeSupabaseClient";
import { TaskBoardLoader } from "./TaskBoardLoader";

vi.mock("@/lib/supabase", () => ({ createSupabaseClient: vi.fn() }));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TaskBoardLoader", () => {
  it("タスクの取得に成功した場合、カンバンボードにタスクを表示する", async () => {
    const { client } = createFakeSupabaseClient({
      data: [
        {
          id: "task-1",
          title: "資料作成",
          description: "",
          status: "done",
          created_at: "2026-11-18T00:00:00.000Z",
          updated_at: "2026-11-18T00:00:00.000Z",
        },
      ],
      error: null,
    });
    vi.mocked(createSupabaseClient).mockReturnValue(client);

    render(await TaskBoardLoader());

    const doneColumn = screen.getByRole("region", { name: "完了" });
    expect(within(doneColumn).getByText("資料作成")).toBeInTheDocument();
  });

  it("タスクの取得に失敗した場合、エラーメッセージを表示する", async () => {
    const { client } = createFakeSupabaseClient({
      data: null,
      error: { message: "boom" },
    });
    vi.mocked(createSupabaseClient).mockReturnValue(client);

    render(await TaskBoardLoader());

    expect(screen.getByRole("alert")).toHaveTextContent("タスクの取得に失敗しました");
    expect(screen.queryByRole("region", { name: "未着手" })).not.toBeInTheDocument();
  });

  it("Supabase の環境変数が未設定の場合、エラーメッセージを表示する", async () => {
    vi.mocked(createSupabaseClient).mockImplementation(() => {
      throw new Error("Supabase の環境変数が設定されていません");
    });

    render(await TaskBoardLoader());

    expect(screen.getByRole("alert")).toHaveTextContent("タスクの取得に失敗しました");
  });
});
