import { z } from "zod";
import { MAX_SAVED_PAGE_CHARS } from "./saved-page";

export const parsedItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1).default("UN"),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
});

export const parsedReceiptSchema = z.object({
  accessKey: z.string().regex(/^\d{44}$/, "Chave de acesso inválida"),
  storeName: z.string().min(1),
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ inválido"),
  issuedAt: z.date(),
  totalAmount: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().nullable(),
  items: z.array(parsedItemSchema).min(1, "Nenhum item encontrado na nota"),
});

export type ParsedItem = z.infer<typeof parsedItemSchema>;
export type ParsedReceipt = z.infer<typeof parsedReceiptSchema>;

export const scanRequestSchema = z.object({
  url: z.string().url().max(2048),
});

export const importRequestSchema = z.object({
  content: z.string().min(1).max(MAX_SAVED_PAGE_CHARS),
  // Original page address found in the saved file, if any.
  sourceUrl: z.string().max(2048).nullish(),
  // The saved link this page belongs to (Recibos → "Links salvos sem nota").
  linkId: z.string().max(64).nullish(),
});
