"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL, formatDate } from "@/lib/utils";
import type { PricePoint } from "@/lib/queries";

export function PriceChart({ data }: { data: PricePoint[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Gráfico da evolução do preço unitário">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => formatDate(d, false)}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            stroke="var(--border)"
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => v.toFixed(2)}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            stroke="var(--border)"
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--foreground)",
            }}
            labelFormatter={(d) => formatDate(String(d))}
            formatter={(value, _name, item) => [
              formatBRL(Number(value)),
              (item.payload as PricePoint).store,
            ]}
          />
          <Line
            type="linear"
            dataKey="unitPrice"
            stroke="var(--primary)"
            strokeWidth={3}
            dot={{ r: 4, fill: "var(--primary)" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
