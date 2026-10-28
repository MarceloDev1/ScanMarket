import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { CATEGORY_LABELS } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";

export type PricePoint = { date: string; store: string; unitPrice: number };

export type ProductSummary = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  lastPrice: number;
  firstPrice: number;
  purchases: number;
};

const getUser = cache(async () => {
  // Session loading reads the clock, so this must run at request time, never during prerender.
  await connection();
  const supabase = await createClient();
  // Verifies the JWT locally when the project uses asymmetric signing keys (no Auth round trip).
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect("/login");
  return data.claims;
});

/** The signed-in user's id; every query below is scoped to it. */
export const requireUserId = async () => (await getUser()).sub;

export async function getUsername(): Promise<string | null> {
  const username = (await getUser()).user_metadata?.username;
  return typeof username === "string" ? username : null;
}

const itemSelect = {
  quantity: true,
  unitPrice: true,
  product: { select: { id: true, name: true, brand: true, category: true } },
  receipt: { select: { issuedAt: true, store: { select: { name: true } } } },
} as const;

export async function getReceipts() {
  const userId = await requireUserId();
  const rows = await db.receipt.findMany({
    where: { userId },
    orderBy: { issuedAt: "desc" },
    select: {
      id: true,
      issuedAt: true,
      totalAmount: true,
      store: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    store: r.store.name,
    issuedAt: r.issuedAt.toISOString(),
    total: Number(r.totalAmount),
    itemCount: r._count.items,
  }));
}

export async function getReceipt(id: string) {
  const userId = await requireUserId();
  const r = await db.receipt.findFirst({
    where: { id, userId },
    select: {
      id: true,
      issuedAt: true,
      totalAmount: true,
      taxAmount: true,
      store: { select: { name: true, cnpj: true } },
      items: {
        orderBy: { id: "asc" },
        select: {
          rawDescription: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          product: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!r) return null;
  return {
    id: r.id,
    store: r.store.name,
    cnpj: r.store.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"),
    issuedAt: r.issuedAt.toISOString(),
    total: Number(r.totalAmount),
    tax: r.taxAmount === null ? null : Number(r.taxAmount),
    items: r.items.map((i) => ({
      description: i.rawDescription,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      total: Number(i.totalPrice),
      product: i.product,
    })),
  };
}

/** Every product the user has bought, with first/last unit price. */
export async function getProducts(): Promise<ProductSummary[]> {
  const userId = await requireUserId();
  const items = await db.receiptItem.findMany({
    where: { receipt: { userId }, productId: { not: null } },
    orderBy: { receipt: { issuedAt: "asc" } },
    select: itemSelect,
  });

  const byProduct = new Map<string, ProductSummary>();
  for (const item of items) {
    if (!item.product) continue;
    const price = Number(item.unitPrice);
    const current = byProduct.get(item.product.id);
    if (current) {
      current.lastPrice = price;
      current.purchases += 1;
    } else {
      byProduct.set(item.product.id, {
        id: item.product.id,
        name: item.product.name,
        brand: item.product.brand,
        category: CATEGORY_LABELS[item.product.category],
        firstPrice: price,
        lastPrice: price,
        purchases: 1,
      });
    }
  }
  return [...byProduct.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function getProductWithHistory(productId: string) {
  const userId = await requireUserId();
  const items = await db.receiptItem.findMany({
    where: { productId, receipt: { userId } },
    orderBy: { receipt: { issuedAt: "asc" } },
    select: itemSelect,
  });
  if (items.length === 0 || !items[0].product) return null;

  const { product } = items[0];
  const history: PricePoint[] = items.map((i) => ({
    date: i.receipt.issuedAt.toISOString(),
    store: i.receipt.store.name,
    unitPrice: Number(i.unitPrice),
  }));
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: CATEGORY_LABELS[product.category],
    history,
  };
}

/** Spending for the current month plus a per-category breakdown. */
export async function getMonthSummary() {
  const userId = await requireUserId();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [receipts, items] = await Promise.all([
    db.receipt.aggregate({
      where: { userId, issuedAt: { gte: monthStart } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    db.receiptItem.findMany({
      where: { receipt: { userId, issuedAt: { gte: monthStart } } },
      select: { totalPrice: true, product: { select: { category: true } } },
    }),
  ]);

  const byCategory = new Map<string, number>();
  for (const item of items) {
    const label = CATEGORY_LABELS[item.product?.category ?? "OTHER"];
    byCategory.set(label, (byCategory.get(label) ?? 0) + Number(item.totalPrice));
  }

  return {
    total: Number(receipts._sum.totalAmount ?? 0),
    receiptCount: receipts._count,
    byCategory: [...byCategory.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total),
  };
}

/** Everything the user spent across all receipts, totalled by year and by month (newest first). */
export async function getSpendingSummary() {
  const userId = await requireUserId();
  const rows = await db.receipt.findMany({
    where: { userId },
    orderBy: { issuedAt: "desc" },
    select: { issuedAt: true, totalAmount: true },
  });

  const byMonth = new Map<string, { total: number; receipts: number }>();
  for (const r of rows) {
    // "YYYY-MM" in São Paulo time, so late-night purchases land in the right month.
    const key = r.issuedAt.toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
    });
    const entry = byMonth.get(key) ?? { total: 0, receipts: 0 };
    entry.total += Number(r.totalAmount);
    entry.receipts += 1;
    byMonth.set(key, entry);
  }

  const byYear = new Map<string, { total: number; receipts: number; months: number }>();
  for (const [key, month] of byMonth) {
    const year = key.slice(0, 4);
    const entry = byYear.get(year) ?? { total: 0, receipts: 0, months: 0 };
    entry.total += month.total;
    entry.receipts += month.receipts;
    entry.months += 1;
    byYear.set(year, entry);
  }

  return {
    total: rows.reduce((sum, r) => sum + Number(r.totalAmount), 0),
    receiptCount: rows.length,
    byYear: [...byYear.entries()].map(([label, v]) => ({ label, ...v })),
    byMonth: [...byMonth.entries()].map(([label, v]) => ({ label, ...v })),
  };
}

/** Taxes (Lei 12.741) printed on the user's receipts, overall and by store and month. */
export async function getTaxSummary() {
  const userId = await requireUserId();
  const rows = await db.receipt.findMany({
    where: { userId, taxAmount: { not: null } },
    orderBy: { issuedAt: "desc" },
    select: {
      issuedAt: true,
      totalAmount: true,
      taxAmount: true,
      store: { select: { name: true } },
    },
  });

  const group = (key: (r: (typeof rows)[number]) => string) => {
    const map = new Map<string, { tax: number; spent: number; receipts: number }>();
    for (const r of rows) {
      const entry = map.get(key(r)) ?? { tax: 0, spent: 0, receipts: 0 };
      entry.tax += Number(r.taxAmount);
      entry.spent += Number(r.totalAmount);
      entry.receipts += 1;
      map.set(key(r), entry);
    }
    return [...map.entries()].map(([label, v]) => ({ label, ...v }));
  };

  const tax = rows.reduce((sum, r) => sum + Number(r.taxAmount), 0);
  const spent = rows.reduce((sum, r) => sum + Number(r.totalAmount), 0);

  return {
    tax,
    spent,
    receiptCount: rows.length,
    byMonth: group((r) =>
      r.issuedAt.toLocaleDateString("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
      }),
    ),
    byStore: group((r) => r.store.name).sort((a, b) => b.tax - a.tax),
  };
}
