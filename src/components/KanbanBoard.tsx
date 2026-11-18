"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TaskCard } from "@/components/TaskCard";
import { TaskFormDialog } from "@/components/TaskFormDialog";
import { TASK_STATUSES, type Task, type TaskActions, type UnvalidatedTaskInput } from "@/lib/task";

type KanbanBoardProps = {
  initialTasks: Task[];
  actions: TaskActions;
};

type DialogState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; task: Task }
  | { type: "delete"; task: Task };

const emptyInput: UnvalidatedTaskInput = { title: "", description: "", status: "todo" };

/**
 * タスクを3列のカンバンで表示し、追加・編集・削除を行う。
 * 操作が成功したら、サーバーから返ったタスクで手元の一覧をすぐ更新する。
 */
export function KanbanBoard({ initialTasks, actions }: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });
  const closeDialog = () => setDialog({ type: "closed" });

  async function handleCreate(input: UnvalidatedTaskInput) {
    const result = await actions.createTask(input);
    if (result.ok) {
      setTasks((current) => [...current, result.data]);
      closeDialog();
    }
    return result;
  }

  async function handleUpdate(id: string, input: UnvalidatedTaskInput) {
    const result = await actions.updateTask(id, input);
    if (result.ok) {
      setTasks((current) => current.map((task) => (task.id === id ? result.data : task)));
      closeDialog();
    }
    return result;
  }

  async function handleDelete(id: string) {
    const result = await actions.deleteTask(id);
    if (!result.ok) return result.error;
    setTasks((current) => current.filter((task) => task.id !== id));
    closeDialog();
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setDialog({ type: "create" })}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          タスクを追加
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TASK_STATUSES.map((status) => {
          const columnTasks = tasks.filter((task) => task.status === status.value);
          const headingId = `column-${status.value}`;
          return (
            <section
              key={status.value}
              aria-labelledby={headingId}
              className="flex flex-col gap-3 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <h2 id={headingId} className="font-semibold">
                  {status.label}
                </h2>
                <span className="text-sm text-zinc-500">{columnTasks.length}件</span>
              </div>
              {columnTasks.length === 0 ? (
                <p className="py-4 text-center text-sm text-zinc-500">タスクはありません</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {columnTasks.map((task) => (
                    <li key={task.id}>
                      <TaskCard
                        task={task}
                        onEdit={(target) => setDialog({ type: "edit", task: target })}
                        onDelete={(target) => setDialog({ type: "delete", task: target })}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {dialog.type === "create" && (
        <TaskFormDialog
          heading="タスクを追加"
          initialValue={emptyInput}
          onSubmit={handleCreate}
          onCancel={closeDialog}
        />
      )}
      {dialog.type === "edit" && (
        <TaskFormDialog
          heading="タスクを編集"
          initialValue={{
            title: dialog.task.title,
            description: dialog.task.description,
            status: dialog.task.status,
          }}
          onSubmit={(input) => handleUpdate(dialog.task.id, input)}
          onCancel={closeDialog}
        />
      )}
      {dialog.type === "delete" && (
        <ConfirmDialog
          heading="タスクの削除"
          message={`「${dialog.task.title}」を削除しますか？この操作は取り消せません。`}
          confirmLabel="削除する"
          onConfirm={() => handleDelete(dialog.task.id)}
          onCancel={closeDialog}
        />
      )}
    </div>
  );
}
