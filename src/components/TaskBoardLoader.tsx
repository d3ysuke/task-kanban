import { createTaskAction, deleteTaskAction, updateTaskAction } from "@/app/actions";
import { CircleAlertIcon } from "lucide-react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Alert, AlertTitle } from "@/components/ui/alert";
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
      <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 px-4 py-3">
        <CircleAlertIcon />
        <AlertTitle>タスクの取得に失敗しました。時間をおいて再読み込みしてください。</AlertTitle>
      </Alert>
    );
  }
  return <KanbanBoard initialTasks={tasks} actions={taskActions} />;
}
