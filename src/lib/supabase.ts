import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export type ConnectionResult =
  | { ok: true; url: string }
  | { ok: false; reason: string };

/** 環境変数から Supabase の接続設定を読み込む。未設定の場合は不足しているキー名を返す */
export function getSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
): SupabaseConfig | { missing: string[] } {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const missing = [
    ...(url ? [] : ["NEXT_PUBLIC_SUPABASE_URL"]),
    ...(anonKey ? [] : ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]),
  ];
  if (missing.length > 0 || !url || !anonKey) return { missing };
  return { url, anonKey };
}

/** Supabase クライアントを生成する */
export function createSupabaseClient(): SupabaseClient<Database> {
  const config = getSupabaseConfig();
  if ("missing" in config) {
    throw new Error(
      `Supabase の環境変数が設定されていません: ${config.missing.join(", ")}`,
    );
  }
  return createClient<Database>(config.url, config.anonKey);
}

/**
 * Supabase への疎通を確認する。
 * Auth のヘルスチェックエンドポイントに API キー付きでリクエストし、URL とキーの両方を検証する。
 */
export async function checkSupabaseConnection(
  env: Record<string, string | undefined> = process.env,
  fetchFn: typeof fetch = fetch,
): Promise<ConnectionResult> {
  const config = getSupabaseConfig(env);
  if ("missing" in config) {
    return {
      ok: false,
      reason: `環境変数が未設定です: ${config.missing.join(", ")}`,
    };
  }

  const healthUrl = `${config.url.replace(/\/+$/, "")}/auth/v1/health`;
  try {
    const response = await fetchFn(healthUrl, {
      headers: { apikey: config.anonKey },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return {
        ok: false,
        reason: `HTTP ${response.status} ${response.statusText}`.trim(),
      };
    }
    return { ok: true, url: config.url };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
