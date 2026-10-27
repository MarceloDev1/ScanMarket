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

// Order matters: the first match wins, so specific products (chocolate, snacks, cereal) must
// come before generic words that appear inside their names ("AO LEITE", "BATATA PRINGLES").
// Words ending in \w* match by prefix so abbreviations count (DESINF -> desinfetante).
const CATEGORY_KEYWORDS: [Category, RegExp][] = [
  [
    "GROCERIES",
    /\b(CHOC\w*|BOMBOM|BISC\w*|BOLACHA|PRINGLES|SALGADINHO|AMENDOIM|CEREAL|ACHOCOLATADO|DOCE DE LEITE|LEITE CONDENSADO|SNACK|PIPOCA|BALA|PIRULITO|CHICLETE|CAFE|ARROZ|FEIJAO|MACARRAO|ACUCAR|OLEO|FARINHA|SAL|MOLHO|EXTRATO)\b/,
  ],
  [
    "CLEANING",
    /\b(DETERG\w*|DESINF\w*|SABAO|AMACIANTE|AGUA SANITARIA|ESPONJA|MULTIUSO|ALVEJANTE|LIMPA\w*|LAVA ROUPA|PINHO)\b/,
  ],
  ["HYGIENE", /\b(SHAMPOO|CONDICIONADOR|SABONETE|CREME DENTAL|PAPEL HIGIENICO|DESODORANTE)\b/],
  ["DAIRY", /\b(LEITE|QUEIJO|IOGURTE|MANTEIGA|REQUEIJAO|CREME DE LEITE|MARGARINA)\b/],
  ["MEAT", /\b(CARNE|FRANGO|PEITO|BIFE|LINGUICA|PRESUNTO|PEIXE|BOVINO|SUINO|SALSICHA)\b/],
  ["FROZEN", /\b(CONGELAD\w*|SORVETE|PIZZA)\b/],
  ["BAKERY", /\b(PAO|BOLO|TORRADA)\b/],
  ["BEVERAGES", /\b(REFRIGERANTE|SUCO|CERVEJA|AGUA|VINHO|REFRESCO)\b/],
  ["PRODUCE", /\b(BANANA|MACA|TOMATE|BATATA|CEBOLA|ALFACE|LARANJA|CENOURA|LIMAO|ABACAXI|MAMAO)\b/],
];

export function guessCategory(normalized: string): Category {
  return CATEGORY_KEYWORDS.find(([, pattern]) => pattern.test(normalized))?.[0] ?? "OTHER";
}
