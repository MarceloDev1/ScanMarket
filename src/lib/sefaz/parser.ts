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

const parseFailed = (error: { issues: { path: PropertyKey[]; message: string }[] }) => {
  const problems = error.issues.map((i) => i.path.join(".") || i.message).join(", ");
  return new SefazError(
    `Não consegui ler esta nota (campos com problema: ${problems}). O layout da SEFAZ do seu estado pode ser diferente.`,
    "PARSE_FAILED",
  );
};

/** XML decimals use a dot ("15.6900000000"), unlike the Brazilian-formatted HTML pages. */
const xmlNumber = (text: string | undefined) => {
  const value = Number(text);
  return text?.trim() && Number.isFinite(value) ? value : null;
};

/**
 * Some states (e.g. PE) answer the QR Code URL with the NF-e XML itself. The buyer's CPF
 * (`dest`) is present in that XML and is deliberately never read.
 */
function parseNfceXml(xml: string): ParsedReceipt {
  const $ = cheerio.load(xml, { xmlMode: true });
  const text = (selector: string) => $(selector).first().text().trim();

  const items = $("det")
    .toArray()
    .flatMap((det) => {
      const $prod = $(det).children("prod");
      const description = clean($prod.children("xProd").text());
      const quantity = xmlNumber($prod.children("qCom").text());
      const unitPrice = xmlNumber($prod.children("vUnCom").text());
      const gross = xmlNumber($prod.children("vProd").text());
      if (!description || quantity === null || unitPrice === null || gross === null) return [];
      const discount = xmlNumber($prod.children("vDesc").text()) ?? 0;
      return [
        {
          description,
          quantity,
          unit: $prod.children("uCom").text().trim() || "UN",
          unitPrice,
          totalPrice: Math.round((gross - discount) * 100) / 100,
        },
      ];
    });

  const result = parsedReceiptSchema.safeParse({
    accessKey: ($("infNFe").attr("Id") ?? "").replace(/^NFe/, ""),
    storeName: text("emit > xFant") || text("emit > xNome"),
    cnpj: text("emit > CNPJ"),
    issuedAt: new Date(text("ide > dhEmi")),
    totalAmount: xmlNumber(text("total > ICMSTot > vNF")),
    taxAmount: xmlNumber(text("total > ICMSTot > vTotTrib")),
    items,
  });
  if (!result.success) throw parseFailed(result.error);
  return result.data;
}

/**
 * Parses the public NFC-e consultation response. Accepts the NF-e XML some states return,
 * or the HTML page most states share (`#tabResult`, `.txtTit`, `.Rqtd`, `.RUN`, `.RvlUnit`,
 * `.valor`); layouts that differ fail with PARSE_FAILED instead of saving partial data.
 */
export function parseNfce(content: string, sourceUrl?: URL): ParsedReceipt {
  if (/^\s*<\?xml|<NFe[\s>]/.test(content.slice(0, 2000))) return parseNfceXml(content);
  return parseNfceHtml(content, sourceUrl);
}

function parseNfceHtml(html: string, sourceUrl?: URL): ParsedReceipt {
  const $ = cheerio.load(html);
  const pageText = clean($("body").text());

  const storeName = clean($("#u20, .txtTopo").first().text());
  const cnpj = pageText.match(/CNPJ:?\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i)?.[1].replace(/\D/g, "");
  const issuedAt = parseBrDate(pageText.match(/Emiss[ãa]o:?\s*([\d/]+\s+[\d:]+)/i)?.[1] ?? "");

  const accessKey =
    (sourceUrl ? extractAccessKey(sourceUrl) : null) ??
    pageText.replace(/\s/g, "").match(/\d{44}/)?.[0] ??
    "";

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
  if (!result.success) throw parseFailed(result.error);
  return result.data;
}
