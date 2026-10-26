import type { Category } from "@/generated/prisma/client";

export const CATEGORY_LABELS: Record<Category, string> = {
  DAIRY: "Laticínios",
  PRODUCE: "Hortifruti",
  MEAT: "Carnes",
  BAKERY: "Padaria",
  BEVERAGES: "Bebidas",
  CLEANING: "Limpeza",
  HYGIENE: "Higiene",
  GROCERIES: "Mercearia",
  FROZEN: "Congelados",
  OTHER: "Outros",
};
