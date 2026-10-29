import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DuplicateReceiptError, importReceipt } from "@/lib/receipts";
import { scanRequestSchema } from "@/lib/sefaz/schema";
import { SefazError } from "@/lib/sefaz/url";

const fail = (status: number, error: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ error, ...extra }, { status });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return fail(401, "Faça login para salvar notas.");

  const body = scanRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(400, "Informe a URL da nota.");

  try {
    const { receipt, itemCount } = await importReceipt(userId, body.data.url);

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
      // INVALID_URL is rejected before anything is stored; every other failure keeps the link.
      if (error.code === "INVALID_URL") return fail(400, error.message);
      return fail(error.code === "FETCH_FAILED" ? 502 : 422, error.message, { linkSaved: true });
    }
    console.error("POST /api/receipts failed", error);
    return fail(500, "Erro inesperado ao salvar a nota.", { linkSaved: true });
  }
}
