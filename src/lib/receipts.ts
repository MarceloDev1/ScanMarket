import { db } from "@/lib/db";
import { guessCategory, normalizeDescription } from "@/lib/normalize";
import type { ParsedReceipt } from "@/lib/sefaz/schema";

export class DuplicateReceiptError extends Error {
  constructor(readonly receiptId: string) {
    super("Esta nota já foi escaneada.");
    this.name = "DuplicateReceiptError";
  }
}

/** Saves a parsed receipt for a user, matching each item to the master catalog. */
export async function saveReceipt(userId: string, sourceUrl: string, parsed: ParsedReceipt) {
  const existing = await db.receipt.findUnique({
    where: { userId_accessKey: { userId, accessKey: parsed.accessKey } },
    select: { id: true },
  });
  if (existing) throw new DuplicateReceiptError(existing.id);

  return db.$transaction(async (tx) => {
    const store = await tx.store.upsert({
      where: { cnpj: parsed.cnpj },
      update: { name: parsed.storeName },
      create: { cnpj: parsed.cnpj, name: parsed.storeName },
    });

    const items = [];
    for (const item of parsed.items) {
      const normalized = normalizeDescription(item.description);

      const alias = await tx.productAlias.findFirst({
        where: { normalizedRaw: normalized, OR: [{ storeId: store.id }, { storeId: null }] },
        select: { productId: true },
      });

      const productId =
        alias?.productId ??
        (
          await tx.product.upsert({
            where: { normalizedName: normalized },
            update: {},
            create: {
              name: item.description,
              normalizedName: normalized,
              category: guessCategory(normalized),
              aliases: { create: { normalizedRaw: normalized, storeId: store.id } },
            },
            select: { id: true },
          })
        ).id;

      items.push({
        productId,
        rawDescription: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      });
    }

    return tx.receipt.create({
      data: {
        userId,
        storeId: store.id,
        accessKey: parsed.accessKey,
        sefazUrl: sourceUrl,
        issuedAt: parsed.issuedAt,
        totalAmount: parsed.totalAmount,
        taxAmount: parsed.taxAmount,
        items: { create: items },
      },
      select: { id: true, totalAmount: true, issuedAt: true, store: { select: { name: true } } },
    });
  });
}
