import { z } from "zod";

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
  items: z.array(parsedItemSchema).min(1, "Nenhum item encontrado na nota"),
});

export type ParsedItem = z.infer<typeof parsedItemSchema>;
export type ParsedReceipt = z.infer<typeof parsedReceiptSchema>;

export const scanRequestSchema = z.object({
  url: z.string().url().max(2048),
});
