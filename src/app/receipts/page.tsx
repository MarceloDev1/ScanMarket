import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatBRL, formatDate } from "@/lib/utils";
import { getReceipts } from "@/lib/queries";

export const metadata = { title: "Recibos · PricePulse" };

export default async function ReceiptsPage() {
  const receipts = await getReceipts();

  return (
    <>
      <PageHeader title="Recibos" subtitle={`${receipts.length} notas escaneadas`} />
      {receipts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Nenhuma nota ainda. Escaneie o QR Code de uma nota fiscal para começar.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {receipts.map((r) => (
            <li key={r.id}>
              <Link href={`/receipts/${r.id}`} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.store}</p>
                  <p className="text-xs text-muted">
                    {formatDate(r.issuedAt)} · {r.itemCount} itens
                  </p>
                </div>
                <span className="font-semibold">{formatBRL(r.total)}</span>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
