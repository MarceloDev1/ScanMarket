"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, RotateCw, Trash2 } from "lucide-react";
import { deleteLink, retryLink } from "@/app/(app)/receipts/actions";
import { SAVED_PAGE_ACCEPT, uploadSavedReceipt } from "@/lib/sefaz/saved-page";

export function UnimportedLinkActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = pending || importing;

  const importPage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setImporting(true);
    const result = await uploadSavedReceipt(file, id);
    if (result.ok || result.existingId) {
      router.push(`/receipts/${result.ok ? result.receipt.id : result.existingId}`);
      router.refresh();
    } else {
      setError(result.error);
      setImporting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <label
          aria-disabled={busy}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground aria-disabled:pointer-events-none aria-disabled:opacity-60"
        >
          {importing ? <Loader2 className="size-3.5 animate-spin" /> : <FileUp className="size-3.5" />}
          Importar página salva
          <input
            type="file"
            accept={SAVED_PAGE_ACCEPT}
            disabled={busy}
            onChange={importPage}
            className="sr-only"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => startTransition(() => retryLink(id))}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />}
          Tentar de novo
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => startTransition(() => deleteLink(id))}
          aria-label="Descartar link"
          className="flex items-center rounded-lg border border-border bg-card px-2.5 py-1.5 text-danger disabled:opacity-60"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
