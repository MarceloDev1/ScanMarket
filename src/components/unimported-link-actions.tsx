"use client";

import { useTransition } from "react";
import { Loader2, RotateCw, Trash2 } from "lucide-react";
import { deleteLink, retryLink } from "@/app/(app)/receipts/actions";

export function UnimportedLinkActions({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => retryLink(id))}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />}
        Tentar de novo
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => deleteLink(id))}
        aria-label="Descartar link"
        className="flex items-center rounded-lg border border-border bg-card px-2.5 py-1.5 text-danger disabled:opacity-60"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
