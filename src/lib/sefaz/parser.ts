import * as cheerio from "cheerio";
import { parsedReceiptSchema, type ParsedItem, type ParsedReceipt } from "./schema";
import { extractAccessKey, SefazError } from "./url";

/** "1.234,56" -> 1234.56 */
export function parseBrNumber(text: string | undefined): number | null {
  const match = text?.match(/-?\d[\d.]*,?\d*/);
  if (!match) return null;
  const value = Number(match[0].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/** "dd/mm/yyyy hh:mm:ss" (Brasília, UTC-3) -> Date */
export function parseBrDate(text: string): Date | null {
  const m = text.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh = "00", min = "00", ss = "00"] = m;
  const date = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Parses the public NFC-e consultation page. Most states share the same markup
 * (`#tabResult`, `.txtTit`, `.Rqtd`, `.RUN`, `.RvlUnit`, `.valor`); layouts that differ
 * fail with PARSE_FAILED instead of saving partial data.
 */
export function parseNfceHtml(html: string, sourceUrl: URL): ParsedReceipt {
  const $ = cheerio.load(html);
  const pageText = clean($("body").text());

  const storeName = clean($("#u20, .txtTopo").first().text());
  const cnpj = pageText.match(/CNPJ:?\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i)?.[1].replace(/\D/g, "");
  const issuedAt = parseBrDate(pageText.match(/Emiss[ãa]o:?\s*([\d/]+\s+[\d:]+)/i)?.[1] ?? "");

  const accessKey =
    extractAccessKey(sourceUrl) ?? pageText.replace(/\s/g, "").match(/\d{44}/)?.[0] ?? "";

  const items: ParsedItem[] = $("#tabResult tr")
    .toArray()
    .flatMap((row) => {
      const $row = $(row);
      const description = clean($row.find(".txtTit").first().text());
      if (!description) return [];
      const quantity = parseBrNumber($row.find(".Rqtd").text());
      const unitPrice = parseBrNumber($row.find(".RvlUnit").text());
      const totalPrice = parseBrNumber($row.find(".valor").text());
      if (quantity === null || unitPrice === null || totalPrice === null) return [];
      const unit = clean($row.find(".RUN").text()).replace(/^UN:\s*/i, "") || "UN";
      return [{ description, quantity, unit, unitPrice, totalPrice }];
    });

  const totalAmount =
    parseBrNumber($("#totalNota .totalNumb.txtMax, .totalNumb.txtMax").first().text()) ??
    parseBrNumber(pageText.match(/Valor a pagar R\$:?\s*([\d.,]+)/i)?.[1]) ??
    items.reduce((sum, item) => sum + item.totalPrice, 0);

  // "Informação dos Tributos Totais Incidentes (Lei Federal 12.741/2012): 12,34"
  const taxAmount =
    parseBrNumber($("label:contains('Tributos')").first().next(".totalNumb").text()) ??
    parseBrNumber(
      pageText.match(/Tributos Totais Incidentes\s*(?:\([^)]*\))?\s*:?\s*(?:R\$)?\s*([\d.,]+)/i)?.[1],
    );

  const result = parsedReceiptSchema.safeParse({
    accessKey,
    storeName,
    cnpj,
    issuedAt,
    totalAmount,
    taxAmount,
    items,
  });
  if (!result.success) {
    const problems = result.error.issues.map((i) => i.path.join(".") || i.message).join(", ");
    throw new SefazError(
      `Não consegui ler esta nota (campos com problema: ${problems}). O layout da SEFAZ do seu estado pode ser diferente.`,
      "PARSE_FAILED",
    );
  }
  return result.data;
}
