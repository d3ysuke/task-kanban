import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** テスト用: Supabase クエリの結果 */
export type FakeQueryResult = {
  data: unknown;
  error: { message: string } | null;
};

export type RecordedCall = { method: string; args: unknown[] };

/**
 * テスト用の偽 Supabase クライアント。
 * `from()` 以降のメソッドチェーンを記録し、await されたら指定した結果を返す。
 */
export function createFakeSupabaseClient(result: FakeQueryResult) {
  const calls: RecordedCall[] = [];

  const builder = {
    then<T1 = FakeQueryResult, T2 = never>(
      onFulfilled?: ((value: FakeQueryResult) => T1 | PromiseLike<T1>) | null,
      onRejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
    ): Promise<T1 | T2> {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };
  const chainMethods = ["select", "insert", "update", "delete", "eq", "order", "single"];
  for (const method of chainMethods) {
    Object.assign(builder, {
      [method]: (...args: unknown[]) => {
        calls.push({ method, args });
        return builder;
      },
    });
  }

  const client = {
    from: (table: string) => {
      calls.push({ method: "from", args: [table] });
      return builder;
    },
  };

  return {
    client: client as unknown as SupabaseClient<Database>,
    calls,
  };
}
