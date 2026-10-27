import Link from "next/link";
import { ChevronRight, ScanLine, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SignOutButton } from "@/components/sign-out-button";
import { formatBRL, formatDate } from "@/lib/utils";
import { getMonthSummary, getProducts, getReceipts, getUsername } from "@/lib/queries";

export default async function DashboardPage() {
  const [summary, products, receipts, username] = await Promise.all([
    getMonthSummary(),
    getProducts(),
    getReceipts(),
    getUsername(),
  ]);

  const maxCategory = summary.byCategory[0]?.total ?? 1;

  const movers = products
    .filter((p) => p.purchases > 1 && p.firstPrice > 0)
    .map((p) => ({ product: p, change: ((p.lastPrice - p.firstPrice) / p.firstPrice) * 100 }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 4);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="PricePulse"
          subtitle={username ? `Olá, @${username}` : "Seus gastos e a evolução dos preços"}
        />
        <SignOutButton />
      </div>

      <section className="rounded-2xl bg-primary p-5 text-primary-foreground">
        <p className="text-sm opacity-80">Gasto no mês</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">{formatBRL(summary.total)}</p>
        <p className="mt-2 text-sm opacity-80">
          {summary.receiptCount} {summary.receiptCount === 1 ? "nota" : "notas"} escaneadas
        </p>
        <Link
          href="/scan"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-4 py-2 text-sm font-semibold text-primary"
        >
          <ScanLine className="size-4" />
          Escanear nota
        </Link>
      </section>

      {receipts.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Você ainda não escaneou nenhuma nota. Toque em &ldquo;Escanear nota&rdquo; para começar.
        </p>
      ) : (
        <>
          {summary.byCategory.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 text-lg font-semibold">Gasto por categoria</h2>
              <ul className="space-y-3 rounded-2xl border border-border bg-card p-4">
                {summary.byCategory.map(({ category, total }) => (
                  <li key={category}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{category}</span>
                      <span className="font-medium">{formatBRL(total)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-accent">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(total / maxCategory) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {movers.length > 0 && (
            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Maiores variações</h2>
                <Link href="/products" className="text-sm text-primary">
                  Ver todos
                </Link>
              </div>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                {movers.map(({ product, change }) => {
                  const up = change > 0;
                  const Icon = up ? TrendingUp : TrendingDown;
                  return (
                    <li key={product.id}>
                      <Link href={`/products/${product.id}`} className="flex items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{product.name}</p>
                          <p className="text-xs text-muted">
                            {product.brand ? `${product.brand} · ` : ""}
                            {formatBRL(product.lastPrice)}
                          </p>
                        </div>
                        <span
                          className={`flex items-center gap-1 text-sm font-semibold ${up ? "text-danger" : "text-primary"}`}
                        >
                          <Icon className="size-4" />
                          {up ? "+" : ""}
                          {change.toFixed(1)}%
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Últimas notas</h2>
              <Link href="/receipts" className="text-sm text-primary">
                Ver todas
              </Link>
            </div>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {receipts.slice(0, 3).map((r) => (
                <li key={r.id}>
                  <Link href={`/receipts/${r.id}`} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.store}</p>
                      <p className="text-xs text-muted">{formatDate(r.issuedAt)}</p>
                    </div>
                    <span className="font-semibold">{formatBRL(r.total)}</span>
                    <ChevronRight className="size-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
