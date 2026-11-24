"use client";

import { useState } from "react";
import { CircleAlertIcon, Trash2Icon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  heading: string;
  message: string;
  confirmLabel: string;
  /** 失敗した場合はエラーメッセージを返す。成功時は親がダイアログを閉じる */
  onConfirm: () => Promise<string | null>;
  onCancel: () => void;
};

/** 破壊的な操作の前に表示する確認ダイアログ */
export function ConfirmDialog({ heading, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    setError(null);
    const failure = await onConfirm();
    if (failure) {
      setError(failure);
      setPending(false);
    }
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        // Esc で閉じる。削除中は閉じない
        if (!open && !pending) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-lg font-semibold">{heading}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          {/* AlertDialogAction は押すと閉じてしまうため、失敗時にエラーを出せるよう通常のボタンを使う */}
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={pending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {pending ? "削除中…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
