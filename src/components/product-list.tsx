"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, X } from "lucide-react";
import { normalizeDescription } from "@/lib/normalize";
import { formatBRL } from "@/lib/utils";
import type { ProductSummary } from "@/lib/queries";

export function ProductList({ products }: { products: ProductSummary[] }) {
  const [query, setQuery] = useState("");

  // Accent- and case-insensitive match on name, brand and category.
  const indexed = useMemo(
    () =>
      products.map((p) => ({
        product: p,
        haystack: normalizeDescription(`${p.name} ${p.brand ?? ""} ${p.category}`),
      })),
    [products],
  );

  const terms = normalizeDescription(query).split(" ").filter(Boolean);
  const visible = terms.length
    ? indexed.filter(({ haystack }) => terms.every((t) => haystack.includes(t)))
    : indexed;

  return (
    <>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar produto, marca ou categoria"
          aria-label="Pesquisar produtos"
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpar pesquisa"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {terms.length > 0 && (
        <p className="mb-2 text-xs text-muted" aria-live="polite">
          {visible.length} {visible.length === 1 ? "produto encontrado" : "produtos encontrados"}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Nenhum produto encontrado para &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {visible.map(({ product: p }) => (
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
