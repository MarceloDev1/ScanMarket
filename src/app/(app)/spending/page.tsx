import { PageHeader } from "@/components/page-header";
import { formatBRL } from "@/lib/utils";
import { getSpendingSummary } from "@/lib/queries";

export const metadata = { title: "Gastos · PricePulse" };

const monthLabel = (key: string) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    timeZone: "UTC",
  });
};

const noteCount = (count: number) => `${count} ${count === 1 ? "nota" : "notas"}`;

export default async function SpendingPage() {
  const summary = await getSpendingSummary();

  return (
    <>
      <PageHeader title="Gastos" subtitle="Quanto você gastou nas suas notas, por ano e por mês" />

      {summary.receiptCount === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Nenhuma nota ainda. Escaneie uma nota para ver aqui quanto você gasta.
        </p>
      ) : (
        <>
          <section className="rounded-2xl bg-primary p-5 text-primary-foreground">
            <p className="text-sm opacity-80">Total gasto</p>
            <p className="mt-1 text-4xl font-bold tracking-tight">{formatBRL(summary.total)}</p>
            <p className="mt-2 text-sm opacity-80">em {noteCount(summary.receiptCount)}</p>
          </section>

          <section className="mt-6">
            <h2 className="mb-3 text-lg font-semibold">Por ano</h2>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {summary.byYear.map((y) => (
                <li key={y.label} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{y.label}</p>
                    <p className="text-xs text-muted">
                      {noteCount(y.receipts)} · média de {formatBRL(y.total / y.months)} por mês
                    </p>
                  </div>
                  <span className="font-semibold">{formatBRL(y.total)}</span>
                </li>
              ))}
            </ul>
          </section>

          {summary.byYear.map((y) => (
            <section key={y.label} className="mt-6">
              <h2 className="mb-3 text-lg font-semibold">{y.label}</h2>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                {summary.byMonth
                  .filter((m) => m.label.startsWith(`${y.label}-`))
                  .map((m) => (
                    <li key={m.label} className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium capitalize">{monthLabel(m.label)}</p>
                        <p className="text-xs text-muted">{noteCount(m.receipts)}</p>
                      </div>
                      <span className="font-semibold">{formatBRL(m.total)}</span>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </>
  );
}
