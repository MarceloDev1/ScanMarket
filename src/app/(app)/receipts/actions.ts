"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/queries";
import { importReceipt } from "@/lib/receipts";

/** Deletes one of the signed-in user's receipts; its items go with it (cascade). */
export async function deleteReceipt(id: string) {
  const userId = await requireUserId();
  await db.receipt.deleteMany({ where: { id, userId } });
  revalidatePath("/", "layout");
  redirect("/receipts");
}

/** Re-runs the SEFAZ import for a saved link; failures stay recorded on the link. */
export async function retryLink(id: string) {
  const userId = await requireUserId();
  const link = await db.scannedLink.findFirst({ where: { id, userId }, select: { url: true } });
  if (!link) return;

  let receiptId: string | null = null;
  try {
    receiptId = (await importReceipt(userId, link.url)).receipt.id;
  } catch {
    // importReceipt already stored the reason on the link.
  }
  revalidatePath("/", "layout");
  if (receiptId) redirect(`/receipts/${receiptId}`);
}

export async function deleteLink(id: string) {
  const userId = await requireUserId();
  await db.scannedLink.deleteMany({ where: { id, userId } });
  revalidatePath("/receipts");
}
