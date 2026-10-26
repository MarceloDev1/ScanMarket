"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteReceipt } from "@/app/receipts/actions";

export function DeleteReceiptButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-danger"
      >
        <Trash2 className="size-4" />
        Excluir nota
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-label="Confirmar exclusão" className="space-y-3 rounded-xl border border-danger/40 bg-danger/10 p-4">
      <p className="text-sm">
        Excluir esta nota e todos os seus itens? Isso não pode ser desfeito.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-medium disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => deleteReceipt(id))}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-danger py-2.5 text-sm font-semibold text-background disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Excluir
        </button>
      </div>
    </div>
  );
}
