import { db } from "@/lib/db";
import { guessCategory, normalizeDescription } from "@/lib/normalize";
import { fetchSefazPage } from "@/lib/sefaz/fetch";
import { parseNfce } from "@/lib/sefaz/parser";
import type { ParsedReceipt } from "@/lib/sefaz/schema";
import { assertSefazUrl, SefazError } from "@/lib/sefaz/url";

export class DuplicateReceiptError extends Error {
  constructor(readonly receiptId: string) {
    super("Esta nota já foi escaneada.");
    this.name = "DuplicateReceiptError";
  }
}

/**
 * Full scan pipeline for a QR Code URL. The URL is stored first, so the user keeps access to it
 * even if SEFAZ is down or the page can't be parsed; the outcome is recorded on the link.
 */
export async function importReceipt(userId: string, rawUrl: string) {
  const url = assertSefazUrl(rawUrl).toString();
  const where = { userId_url: { userId, url } };
  await db.scannedLink.upsert({
    where,
    update: { status: "PENDING", error: null },
    create: { userId, url },
  });

  try {
    const parsed = parseNfce(await fetchSefazPage(url), new URL(url));
    const receipt = await saveReceipt(userId, url, parsed);
    await db.scannedLink.update({
      where,
      data: { status: "SAVED", error: null, receiptId: receipt.id },
    });
    return { receipt, itemCount: parsed.items.length };
  } catch (error) {
    const outcome =
      error instanceof DuplicateReceiptError
        ? { status: "SAVED" as const, error: null, receiptId: error.receiptId }
        : {
            status: "FAILED" as const,
            error: error instanceof SefazError ? error.message : "Erro inesperado ao salvar a nota.",
          };
    await db.scannedLink.update({ where, data: outcome }).catch(() => {});
    throw error;
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
