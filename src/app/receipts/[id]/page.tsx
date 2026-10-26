import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { formatBRL, formatDate } from "@/lib/utils";
import { getReceipt } from "@/lib/queries";

export default async function ReceiptDetailPage(props: PageProps<"/receipts/[id]">) {
  const { id } = await props.params;
  const receipt = await getReceipt(id);
  if (!receipt) notFound();

  return (
    <>
      <PageHeader
        title={receipt.store}
        subtitle={`${formatDate(receipt.issuedAt)} · CNPJ ${receipt.cnpj}`}
        backHref="/receipts"
      />

      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {receipt.items.map((item, index) => (
          <li key={index} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.product?.name ?? item.description}</p>
              <p className="truncate text-xs text-muted">{item.description}</p>
              <p className="mt-1 text-xs text-muted">
                {item.quantity} × {formatBRL(item.unitPrice)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatBRL(item.total)}</p>
              {item.product && (
                <Link href={`/products/${item.product.id}`} className="text-xs text-primary">
                  Ver preços
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-2xl bg-accent p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total</span>
          <span className="text-xl font-bold">{formatBRL(receipt.total)}</span>
        </div>
        {receipt.tax !== null && (
          <div className="mt-2 flex items-center justify-between text-sm text-muted">
            <span>Tributos incluídos</span>
            <span>
              {formatBRL(receipt.tax)}
              {receipt.total > 0 && ` (${((receipt.tax / receipt.total) * 100).toFixed(1)}%)`}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
