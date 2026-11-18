/** Next.js サーバー起動時に一度だけ呼ばれ、Supabase への接続に失敗した場合はエラーログを出力する */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { checkSupabaseConnection } = await import("@/lib/supabase");
  const result = await checkSupabaseConnection();

  if (!result.ok) {
    console.error(`[Supabase] 接続失敗: ${result.reason}`);
  }
}
