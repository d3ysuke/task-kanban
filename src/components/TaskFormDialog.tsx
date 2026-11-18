"use client";

import { useId, useState, type FormEvent } from "react";
import {
  TASK_STATUSES,
  validateTaskInput,
  type ActionResult,
  type Task,
  type TaskInputErrors,
  type UnvalidatedTaskInput,
} from "@/lib/task";

type TaskFormDialogProps = {
  heading: string;
  initialValue: UnvalidatedTaskInput;
  onSubmit: (input: UnvalidatedTaskInput) => Promise<ActionResult<Task>>;
  onCancel: () => void;
};

const fieldClassName =
  "w-full rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm aria-[invalid=true]:border-red-500 dark:border-zinc-700";

/** タスクの追加・編集に使う入力ダイアログ。保存に成功したら親が閉じる */
export function TaskFormDialog({ heading, initialValue, onSubmit, onCancel }: TaskFormDialogProps) {
  const id = useId();
  const [value, setValue] = useState(initialValue);
  const [fieldErrors, setFieldErrors] = useState<TaskInputErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const validation = validateTaskInput(value);
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      setFormError(null);
      return;
    }

    setPending(true);
    setFieldErrors({});
    setFormError(null);
    const result = await onSubmit(value);
    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setFormError(result.error);
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-heading`}
        className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl"
      >
        <h2 id={`${id}-heading`} className="mb-4 text-lg font-semibold">
          {heading}
        </h2>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {formError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {formError}
            </p>
          )}
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-title`} className="text-sm font-medium">
              タイトル
            </label>
            <input
              id={`${id}-title`}
              type="text"
              value={value.title}
              onChange={(event) => setValue({ ...value, title: event.target.value })}
              aria-invalid={fieldErrors.title ? true : undefined}
              aria-describedby={fieldErrors.title ? `${id}-title-error` : undefined}
              className={fieldClassName}
            />
            {fieldErrors.title && (
              <p id={`${id}-title-error`} className="text-sm text-red-600">
                {fieldErrors.title}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-description`} className="text-sm font-medium">
              説明
            </label>
            <textarea
              id={`${id}-description`}
              rows={4}
              value={value.description}
              onChange={(event) => setValue({ ...value, description: event.target.value })}
              aria-invalid={fieldErrors.description ? true : undefined}
              aria-describedby={fieldErrors.description ? `${id}-description-error` : undefined}
              className={fieldClassName}
            />
            {fieldErrors.description && (
              <p id={`${id}-description-error`} className="text-sm text-red-600">
                {fieldErrors.description}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-status`} className="text-sm font-medium">
              ステータス
            </label>
            <select
              id={`${id}-status`}
              value={value.status}
              onChange={(event) => setValue({ ...value, status: event.target.value })}
              aria-invalid={fieldErrors.status ? true : undefined}
              className={fieldClassName}
            >
              {TASK_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            {fieldErrors.status && <p className="text-sm text-red-600">{fieldErrors.status}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {pending ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
