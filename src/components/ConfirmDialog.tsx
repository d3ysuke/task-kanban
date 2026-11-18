"use client";

import { useId, useState } from "react";

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
  const id = useId();
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
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-heading`}
        aria-describedby={`${id}-message`}
        className="w-full max-w-sm rounded-lg bg-background p-6 shadow-xl"
      >
        <h2 id={`${id}-heading`} className="mb-2 text-lg font-semibold">
          {heading}
        </h2>
        <p id={`${id}-message`} className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          {message}
        </p>
        {error && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "削除中…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
