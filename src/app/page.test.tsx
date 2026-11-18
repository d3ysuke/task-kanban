import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

vi.mock("@/lib/supabase", () => ({
  // 読み込み中の表示を確認するため、取得が完了しないクライアントを返す
  createSupabaseClient: () => ({
    from: () => ({
      select: () => ({ order: () => new Promise(() => {}) }),
    }),
  }),
}));

describe("Home ページ", () => {
  it("見出しと、タスク取得中の読み込み表示を表示する", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "タスクカンバン" }),
    ).toBeInTheDocument();
    expect(screen.getByText("読み込み中…")).toBeInTheDocument();
  });
});
