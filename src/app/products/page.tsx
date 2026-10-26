import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatBRL } from "@/lib/utils";
import { getProducts } from "@/lib/queries";

export const metadata = { title: "Preços · PricePulse" };

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <>
      <PageHeader title="Preços" subtitle="Escolha um produto para ver a evolução" />
      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Os produtos aparecem aqui depois que você escanear sua primeira nota.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/products/${p.id}`} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted">
                    {p.brand ? `${p.brand} · ` : ""}
                    {p.category}
                  </p>
                </div>
                <span className="font-semibold">{formatBRL(p.lastPrice)}</span>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
