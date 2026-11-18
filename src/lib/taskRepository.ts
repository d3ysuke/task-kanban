import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/database.types";
import { isTaskStatus, type Task, type TaskInput } from "@/lib/task";

type TaskClient = SupabaseClient<Database>;

function toTask(row: Tables<"tasks">): Task {
  if (!isTaskStatus(row.status)) {
    throw new Error(`不正なステータスです: ${row.status}`);
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** タスク一覧を作成日時の昇順で取得する */
export async function listTasks(client: TaskClient): Promise<Task[]> {
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data.map(toTask);
}

export async function createTask(client: TaskClient, input: TaskInput): Promise<Task> {
  const { data, error } = await client.from("tasks").insert(input).select().single();
  if (error) throw new Error(error.message);
  return toTask(data);
}

export async function updateTask(
  client: TaskClient,
  id: string,
  input: TaskInput,
): Promise<Task> {
  const { data, error } = await client
    .from("tasks")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toTask(data);
}

export async function deleteTask(client: TaskClient, id: string): Promise<void> {
  const { data, error } = await client.from("tasks").delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (data.length === 0) throw new Error("タスクが見つかりません");
}
