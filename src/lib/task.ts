export const TASK_STATUSES = [
  { value: "todo", label: "未着手" },
  { value: "in_progress", label: "進行中" },
  { value: "done", label: "完了" },
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number]["value"];

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

export type TaskInput = {
  title: string;
  description: string;
  status: TaskStatus;
};

/** フォームやサーバーから受け取る未検証の入力 */
export type UnvalidatedTaskInput = {
  title: string;
  description: string;
  status: string;
};

export type TaskInputErrors = Partial<Record<keyof TaskInput, string>>;

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: TaskInputErrors };

/** カンバンボードが使うタスク操作（Server Actions を渡す） */
export type TaskActions = {
  createTask: (input: UnvalidatedTaskInput) => Promise<ActionResult<Task>>;
  updateTask: (id: string, input: UnvalidatedTaskInput) => Promise<ActionResult<Task>>;
  deleteTask: (id: string) => Promise<ActionResult<{ id: string }>>;
};

export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 1000;

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.some((status) => status.value === value);
}

/** DB の char_length と揃えるため、UTF-16 のコード単位ではなくコードポイント数で数える */
function countCharacters(value: string): number {
  return [...value].length;
}

export function validateTaskInput(
  input: UnvalidatedTaskInput,
): { ok: true; value: TaskInput } | { ok: false; errors: TaskInputErrors } {
  const title = input.title.trim();
  const description = input.description.trim();
  const errors: TaskInputErrors = {};

  if (title === "") {
    errors.title = "タイトルを入力してください";
  } else if (countCharacters(title) > TITLE_MAX_LENGTH) {
    errors.title = `タイトルは${TITLE_MAX_LENGTH}文字以内で入力してください`;
  }

  if (countCharacters(description) > DESCRIPTION_MAX_LENGTH) {
    errors.description = `説明は${DESCRIPTION_MAX_LENGTH}文字以内で入力してください`;
  }

  if (!isTaskStatus(input.status)) {
    errors.status = "ステータスが不正です";
  }

  if (Object.keys(errors).length > 0 || !isTaskStatus(input.status)) {
    return { ok: false, errors };
  }
  return { ok: true, value: { title, description, status: input.status } };
}
