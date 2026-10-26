"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/queries";

/** Deletes one of the signed-in user's receipts; its items go with it (cascade). */
export async function deleteReceipt(id: string) {
  const userId = await requireUserId();
  await db.receipt.deleteMany({ where: { id, userId } });
  revalidatePath("/", "layout");
  redirect("/receipts");
}
