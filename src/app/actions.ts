"use server";

import { createSupabaseClient } from "@/lib/supabase";
import {
  validateTaskInput,
  type ActionResult,
  type Task,
  type TaskInput,
  type UnvalidatedTaskInput,
} from "@/lib/task";
import { createTask, deleteTask, updateTask } from "@/lib/taskRepository";

const INVALID_INPUT_MESSAGE = "入力内容を確認してください";

async function runTaskMutation<T>(
  failureMessage: string,
  mutation: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await mutation() };
  } catch (error) {
    console.error(`[tasks] ${failureMessage}`, error);
    return { ok: false, error: failureMessage };
  }
}

async function withValidInput<T>(
  input: UnvalidatedTaskInput,
  handler: (value: TaskInput) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const validation = validateTaskInput(input);
  if (!validation.ok) {
    return { ok: false, error: INVALID_INPUT_MESSAGE, fieldErrors: validation.errors };
  }
  return handler(validation.value);
}

export async function createTaskAction(
  input: UnvalidatedTaskInput,
): Promise<ActionResult<Task>> {
  return withValidInput(input, (value) =>
    runTaskMutation("タスクの追加に失敗しました", () =>
      createTask(createSupabaseClient(), value),
    ),
  );
}

export async function updateTaskAction(
  id: string,
  input: UnvalidatedTaskInput,
): Promise<ActionResult<Task>> {
  return withValidInput(input, (value) =>
    runTaskMutation("タスクの更新に失敗しました", () =>
      updateTask(createSupabaseClient(), id, value),
    ),
  );
}

export async function deleteTaskAction(id: string): Promise<ActionResult<{ id: string }>> {
  return runTaskMutation("タスクの削除に失敗しました", async () => {
    await deleteTask(createSupabaseClient(), id);
    return { id };
  });
}
