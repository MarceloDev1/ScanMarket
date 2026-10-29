import { Clock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatBRL } from "@/lib/utils";
import { getTaxSummary } from "@/lib/queries";

export const metadata = { title: "Impostos · PricePulse" };

const percent = (tax: number, spent: number) =>
  spent > 0 ? `${((tax / spent) * 100).toFixed(1)}%` : "—";

/** 6.73 -> "6h 44min", 0.4 -> "24 min" */
const formatHours = (hours: number) => {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const min = total % 60;
  if (h === 0) return `${min} min`;
  return min === 0 ? `${h}h` : `${h}h ${min}min`;
};

const monthLabel = (key: string) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

export default async function TaxesPage() {
  const summary = await getTaxSummary();

  return (
    <>
      <PageHeader
        title="Impostos"
        subtitle="Tributos incluídos nos preços das suas notas (Lei 12.741)"
      />

      {summary.receiptCount === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Nenhuma nota com valor de impostos ainda. Escaneie uma nota para ver aqui quanto você
          paga em tributos.
        </p>
      ) : (
        <>
          <section className="rounded-2xl bg-primary p-5 text-primary-foreground">
            <p className="text-sm opacity-80">Total em impostos</p>
            <p className="mt-1 text-4xl font-bold tracking-tight">{formatBRL(summary.tax)}</p>
            <p className="mt-2 text-sm opacity-80">
              {percent(summary.tax, summary.spent)} de {formatBRL(summary.spent)} gastos em{" "}
              {summary.receiptCount} {summary.receiptCount === 1 ? "nota" : "notas"}
            </p>
          </section>

          <section className="mt-3 flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
              <Clock className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted">Em horas de salário mínimo</p>
              <p className="text-2xl font-bold tracking-tight">{formatHours(summary.hours)}</p>
              <p className="mt-1 text-xs text-muted">
                Tempo de trabalho de quem ganha o mínimo ({formatBRL(summary.currentHourlyWage)}/h)
                para pagar esses impostos
              </p>
            </div>
          </section>

          <section className="mt-6">
            <h2 className="mb-3 text-lg font-semibold">Por mês</h2>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {summary.byMonth.map((m) => (
                <li key={m.label} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium capitalize">{monthLabel(m.label)}</p>
                    <p className="text-xs text-muted">
                      {percent(m.tax, m.spent)} de {formatBRL(m.spent)} · {formatHours(m.hours)} de
                      trabalho
                    </p>
                  </div>
                  <span className="font-semibold">{formatBRL(m.tax)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="mb-3 text-lg font-semibold">Por mercado</h2>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {summary.byStore.map((s) => (
                <li key={s.label} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.label}</p>
                    <p className="text-xs text-muted">
                      {percent(s.tax, s.spent)} de {formatBRL(s.spent)} · {formatHours(s.hours)} de
                      trabalho
                    </p>
                  </div>
                  <span className="font-semibold">{formatBRL(s.tax)}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
