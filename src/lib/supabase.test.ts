import { describe, it, expect, vi } from "vitest";
import { checkSupabaseConnection, getSupabaseConfig } from "./supabase";

const validEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
};

describe("getSupabaseConfig", () => {
  it("URL とキーが両方設定されている場合、設定値を返す", () => {
    expect(getSupabaseConfig(validEnv)).toEqual({
      url: "https://example.supabase.co",
      anonKey: "test-anon-key",
    });
  });

  it("両方とも未設定の場合、両方のキー名を不足として返す", () => {
    expect(getSupabaseConfig({})).toEqual({
      missing: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    });
  });

  it("値が空白のみの場合、未設定として扱う", () => {
    expect(
      getSupabaseConfig({ ...validEnv, NEXT_PUBLIC_SUPABASE_ANON_KEY: "  " }),
    ).toEqual({ missing: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"] });
  });
});

describe("checkSupabaseConnection", () => {
  it("ヘルスチェックが 200 を返す場合、接続成功となる", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    const result = await checkSupabaseConnection(validEnv, fetchFn);

    expect(result).toEqual({ ok: true, url: "https://example.supabase.co" });
    expect(fetchFn).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/health",
      expect.objectContaining({ headers: { apikey: "test-anon-key" } }),
    );
  });

  it("URL 末尾にスラッシュがある場合も、正しいヘルスチェック URL にアクセスする", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    await checkSupabaseConnection(
      { ...validEnv, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co/" },
      fetchFn,
    );

    expect(fetchFn.mock.calls[0][0]).toBe(
      "https://example.supabase.co/auth/v1/health",
    );
  });

  it("API キーが不正で 401 が返る場合、接続失敗としてステータスを返す", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 401, statusText: "Unauthorized" }));

    const result = await checkSupabaseConnection(validEnv, fetchFn);

    expect(result).toEqual({ ok: false, reason: "HTTP 401 Unauthorized" });
  });

  it("ネットワークエラーの場合、接続失敗としてエラーメッセージを返す", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("fetch failed"));

    const result = await checkSupabaseConnection(validEnv, fetchFn);

    expect(result).toEqual({ ok: false, reason: "fetch failed" });
  });

  it("環境変数が未設定の場合、通信せずに接続失敗を返す", async () => {
    const fetchFn = vi.fn();

    const result = await checkSupabaseConnection({}, fetchFn);

    expect(result.ok).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
