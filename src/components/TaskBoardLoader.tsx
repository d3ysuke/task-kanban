import { createTaskAction, deleteTaskAction, updateTaskAction } from "@/app/actions";
import { KanbanBoard } from "@/components/KanbanBoard";
import { createSupabaseClient } from "@/lib/supabase";
import type { Task, TaskActions } from "@/lib/task";
import { listTasks } from "@/lib/taskRepository";

const taskActions: TaskActions = {
  createTask: createTaskAction,
  updateTask: updateTaskAction,
  deleteTask: deleteTaskAction,
};

async function loadTasks(): Promise<Task[] | null> {
  try {
    return await listTasks(createSupabaseClient());
  } catch (error) {
    console.error("[tasks] タスクの取得に失敗しました", error);
    return null;
  }
}

/** サーバーでタスク一覧を取得し、カンバンボードを表示する */
export async function TaskBoardLoader() {
  const tasks = await loadTasks();
  if (tasks === null) {
    return (
      <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-red-700 dark:bg-red-950 dark:text-red-300">
        タスクの取得に失敗しました。時間をおいて再読み込みしてください。
      </p>
    );
  }
  return <KanbanBoard initialTasks={tasks} actions={taskActions} />;
}
