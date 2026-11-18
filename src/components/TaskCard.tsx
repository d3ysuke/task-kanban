import type { Task } from "@/lib/task";

type TaskCardProps = {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  return (
    <article className="rounded-md border border-zinc-200 bg-background p-3 shadow-sm dark:border-zinc-800">
      <h3 className="break-words font-medium">{task.title}</h3>
      {task.description && (
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-600 dark:text-zinc-400">
          {task.description}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2 text-sm">
        <button
          type="button"
          onClick={() => onEdit(task)}
          aria-label={`「${task.title}」を編集`}
          className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          編集
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          aria-label={`「${task.title}」を削除`}
          className="rounded px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        >
          削除
        </button>
      </div>
    </article>
  );
}
