// One-off: re-applies guessCategory() to products already in the database.
// Usage: npx tsx scripts/recategorize.ts          (preview only)
//        npx tsx scripts/recategorize.ts --apply  (write changes)
import "dotenv/config";
import { db } from "@/lib/db";
import { guessCategory } from "@/lib/normalize";

const apply = process.argv.includes("--apply");

async function main() {
  const products = await db.product.findMany({
    select: { id: true, name: true, normalizedName: true, category: true },
  });

  const changes = products
    .map((p) => ({ ...p, next: guessCategory(p.normalizedName) }))
    .filter((p) => p.next !== p.category);

  for (const p of changes) console.log(`${p.name}: ${p.category} -> ${p.next}`);
  console.log(`${changes.length} of ${products.length} products would change.`);

  if (!apply) {
    console.log("Preview only. Run with --apply to save.");
    return;
  }
  for (const p of changes) {
    await db.product.update({ where: { id: p.id }, data: { category: p.next } });
  }
  console.log("Done.");
}

main().finally(() => db.$disconnect());
