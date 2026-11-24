"use client";

import { useState } from "react";
import { InboxIcon, PlusIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TaskCard } from "@/components/TaskCard";
import { TaskFormDialog } from "@/components/TaskFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TASK_STATUSES, type Task, type TaskActions, type TaskStatus, type UnvalidatedTaskInput } from "@/lib/task";

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

/** 列見出しの横に表示する色付きドット（ステータスを色でも見分けられるようにする） */
const statusDotClassName: Record<TaskStatus, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  done: "bg-emerald-500",
};

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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">全 {tasks.length} 件のタスク</p>
        <Button size="lg" onClick={() => setDialog({ type: "create" })} className="px-3.5">
          <PlusIcon data-icon="inline-start" />
          タスクを追加
        </Button>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-3">
        {TASK_STATUSES.map((status) => {
          const columnTasks = tasks.filter((task) => task.status === status.value);
          const headingId = `column-${status.value}`;
          return (
            <section
              key={status.value}
              aria-labelledby={headingId}
              className="flex flex-col gap-3 rounded-2xl border bg-muted/50 p-3"
            >
              <div className="flex items-center justify-between px-1 pt-1">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className={cn("size-2 rounded-full", statusDotClassName[status.value])} />
                  <h2 id={headingId} className="text-sm font-semibold">
                    {status.label}
                  </h2>
                </div>
                <Badge variant="outline" className="bg-background text-muted-foreground tabular-nums">
                  {columnTasks.length}件
                </Badge>
              </div>
              {columnTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-background/60 px-4 py-8 text-muted-foreground">
                  <InboxIcon aria-hidden="true" className="size-5" />
                  <p className="text-sm">タスクはありません</p>
                </div>
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
