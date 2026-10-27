import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PriceChart } from "@/components/price-chart";
import { formatBRL, formatDate } from "@/lib/utils";
import { getProductWithHistory } from "@/lib/queries";

export default async function ProductDetailPage(props: PageProps<"/products/[id]">) {
  const { id } = await props.params;
  const product = await getProductWithHistory(id);
  if (!product) notFound();

  const { history } = product;
  const prices = history.map((h) => h.unitPrice);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const cheapest = history.find((h) => h.unitPrice === min);

  return (
    <>
      <PageHeader
        title={product.name}
        subtitle={[product.brand, product.category].filter(Boolean).join(" · ")}
        backHref="/products"
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Atual" value={formatBRL(prices[prices.length - 1])} />
        <Stat label="Menor" value={formatBRL(min)} />
        <Stat label="Maior" value={formatBRL(max)} />
      </div>

      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">Preço unitário</h2>
        {history.length > 1 ? (
          <PriceChart data={history} />
        ) : (
          <p className="py-8 text-center text-sm text-muted">
            Escaneie mais uma nota com este produto para ver a evolução do preço.
          </p>
        )}
        {cheapest && (
          <p className="mt-3 text-sm text-muted">
            Menor preço: {formatBRL(cheapest.unitPrice)} em {cheapest.store},{" "}
            {formatDate(cheapest.date)}.
          </p>
        )}
      </section>

      <section className="mt-5">
        <h2 className="mb-3 text-lg font-semibold">Histórico de compras</h2>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {[...history].reverse().map((h, index) => (
            <li key={index} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{h.store}</p>
                <p className="text-xs text-muted">{formatDate(h.date)}</p>
              </div>
              <span className="font-semibold">{formatBRL(h.unitPrice)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
