import { PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Task } from "@/lib/task";

type TaskCardProps = {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  return (
    <Card
      size="sm"
      className="group/task shadow-xs transition-shadow hover:shadow-md hover:ring-foreground/15"
    >
      <CardHeader>
        <CardTitle className="break-words">
          <h3>{task.title}</h3>
        </CardTitle>
        {task.description && (
          <CardDescription className="line-clamp-4 whitespace-pre-wrap break-words">
            {task.description}
          </CardDescription>
        )}
        <CardAction className="-mt-1 -mr-1 flex gap-0.5 transition-opacity pointer-fine:opacity-0 pointer-fine:group-hover/task:opacity-100 pointer-fine:group-focus-within/task:opacity-100">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(task)}
            aria-label={`「${task.title}」を編集`}
            className="text-muted-foreground"
          >
            <PencilIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(task)}
            aria-label={`「${task.title}」を削除`}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2Icon />
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
