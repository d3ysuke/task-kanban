import { Suspense } from "react";
import { KanbanSquareIcon } from "lucide-react";
import { TaskBoardLoader } from "@/components/TaskBoardLoader";
import { Skeleton } from "@/components/ui/skeleton";

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">読み込み中…</p>
      <div aria-hidden="true" className="grid items-start gap-4 md:grid-cols-3">
        {[3, 2, 1].map((count, column) => (
          <div key={column} className="flex flex-col gap-3 rounded-2xl border bg-muted/50 p-3">
            <Skeleton className="mx-1 mt-1 h-5 w-20" />
            {Array.from({ length: count }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl bg-background" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <KanbanSquareIcon aria-hidden="true" className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">タスクカンバン</h1>
          <p className="text-sm text-muted-foreground">タスクを「未着手・進行中・完了」で管理します</p>
        </div>
      </header>
      <Suspense fallback={<BoardSkeleton />}>
        <TaskBoardLoader />
      </Suspense>
    </main>
  );
}
