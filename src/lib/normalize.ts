import type { Category } from "@/generated/prisma/client";

/** Uppercase, no accents or punctuation, single spaces: "Leite Int. Itambé 1L" -> "LEITE INT ITAMBE 1L". */
export function normalizeDescription(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CATEGORY_KEYWORDS: [Category, RegExp][] = [
  ["DAIRY", /\b(LEITE|QUEIJO|IOGURTE|MANTEIGA|REQUEIJAO|CREME DE LEITE)\b/],
  ["PRODUCE", /\b(BANANA|MACA|TOMATE|BATATA|CEBOLA|ALFACE|LARANJA|CENOURA|LIMAO)\b/],
  ["MEAT", /\b(CARNE|FRANGO|BIFE|LINGUICA|PRESUNTO|PEIXE|BOVINO|SUINO)\b/],
  ["BAKERY", /\b(PAO|BOLO|BISCOITO|TORRADA)\b/],
  ["BEVERAGES", /\b(REFRIGERANTE|SUCO|CERVEJA|AGUA|VINHO|CAFE)\b/],
  ["CLEANING", /\b(DETERG|SABAO|AMACIANTE|DESINFETANTE|AGUA SANITARIA|ESPONJA)\b/],
  ["HYGIENE", /\b(SHAMPOO|SABONETE|CREME DENTAL|PAPEL HIGIENICO|DESODORANTE)\b/],
  ["FROZEN", /\b(CONGELAD|SORVETE|PIZZA)\b/],
  ["GROCERIES", /\b(ARROZ|FEIJAO|MACARRAO|ACUCAR|OLEO|FARINHA|SAL|MOLHO)\b/],
];

export function guessCategory(normalized: string): Category {
  return CATEGORY_KEYWORDS.find(([, pattern]) => pattern.test(normalized))?.[0] ?? "OTHER";
}
