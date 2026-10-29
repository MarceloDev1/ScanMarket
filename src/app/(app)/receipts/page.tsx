import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { UnimportedLinkActions } from "@/components/unimported-link-actions";
import { formatBRL, formatDate } from "@/lib/utils";
import { getReceipts, getUnimportedLinks } from "@/lib/queries";

export const metadata = { title: "Recibos · PricePulse" };

export default async function ReceiptsPage() {
  const [receipts, links] = await Promise.all([getReceipts(), getUnimportedLinks()]);

  return (
    <>
      <PageHeader title="Recibos" subtitle={`${receipts.length} notas escaneadas`} />
      {links.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-1 text-sm font-semibold">Links salvos sem nota</h2>
          <p className="mb-2 text-xs text-muted">
            QR Codes lidos que não viraram nota (a SEFAZ falhou ou não respondeu). O link está guardado.
          </p>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {links.map((l) => (
              <li key={l.id} className="space-y-2 p-4">
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block break-all text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  {l.url}
                </a>
                <p className="text-xs text-muted">
                  {formatDate(l.scannedAt)}
                  {l.error && ` · ${l.error}`}
                </p>
                <UnimportedLinkActions id={l.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
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
