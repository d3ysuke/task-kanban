"use client";

import { useId, useState, type FormEvent } from "react";
import { CircleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
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

function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

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
    <Dialog
      open
      onOpenChange={(open) => {
        // Esc や背景クリックで閉じる。保存中は閉じない
        if (!open && !pending) onCancel();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{heading}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {formError && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-title`}>タイトル</Label>
            <Input
              id={`${id}-title`}
              type="text"
              value={value.title}
              onChange={(event) => setValue({ ...value, title: event.target.value })}
              placeholder="例: 企画書を作成する"
              aria-invalid={fieldErrors.title ? true : undefined}
              aria-describedby={fieldErrors.title ? `${id}-title-error` : undefined}
            />
            {fieldErrors.title && <FieldError id={`${id}-title-error`} message={fieldErrors.title} />}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-description`}>説明</Label>
            <Textarea
              id={`${id}-description`}
              rows={4}
              value={value.description}
              onChange={(event) => setValue({ ...value, description: event.target.value })}
              placeholder="詳細やメモ（任意）"
              aria-invalid={fieldErrors.description ? true : undefined}
              aria-describedby={fieldErrors.description ? `${id}-description-error` : undefined}
              className="min-h-24 resize-y"
            />
            {fieldErrors.description && (
              <FieldError id={`${id}-description-error`} message={fieldErrors.description} />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-status`}>ステータス</Label>
            <NativeSelect
              id={`${id}-status`}
              value={value.status}
              onChange={(event) => setValue({ ...value, status: event.target.value })}
              aria-invalid={fieldErrors.status ? true : undefined}
              aria-describedby={fieldErrors.status ? `${id}-status-error` : undefined}
              className="w-full"
            >
              {TASK_STATUSES.map((status) => (
                <NativeSelectOption key={status.value} value={status.value}>
                  {status.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {fieldErrors.status && <FieldError id={`${id}-status-error`} message={fieldErrors.status} />}
          </div>
          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={onCancel}>
              キャンセル
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
