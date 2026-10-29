import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { DuplicateReceiptError, importSavedReceipt } from "@/lib/receipts";
import { importRequestSchema } from "@/lib/sefaz/schema";
import { assertSefazUrl, SefazError } from "@/lib/sefaz/url";

const fail = (status: number, error: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ error, ...extra }, { status });

/** Imports a receipt page saved from the user's browser (HTML, MHTML part or XML). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return fail(401, "Faça login para salvar notas.");

  const body = importRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(400, "Arquivo inválido ou grande demais.");

  // A saved link is trusted over the address embedded in the file, which is only a hint.
  let sourceUrl: string | null = null;
  if (body.data.linkId) {
    const link = await db.scannedLink.findFirst({
      where: { id: body.data.linkId, userId },
      select: { url: true },
    });
    sourceUrl = link?.url ?? null;
  } else if (body.data.sourceUrl) {
    try {
      sourceUrl = assertSefazUrl(body.data.sourceUrl).toString();
    } catch {
      sourceUrl = null;
    }
  }

  try {
    const { receipt, itemCount } = await importSavedReceipt(userId, body.data.content, sourceUrl);
    return NextResponse.json(
      {
        id: receipt.id,
        store: receipt.store.name,
        total: Number(receipt.totalAmount),
        issuedAt: receipt.issuedAt,
        itemCount,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DuplicateReceiptError) {
      return fail(409, error.message, { id: error.receiptId });
    }
    if (error instanceof SefazError) {
      return fail(422, `${error.message} Confira se o arquivo é a página da nota com os itens.`);
    }
    console.error("POST /api/receipts/import failed", error);
    return fail(500, "Erro inesperado ao importar a nota.");
  }
}
