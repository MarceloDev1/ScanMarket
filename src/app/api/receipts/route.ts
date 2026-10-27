import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DuplicateReceiptError, saveReceipt } from "@/lib/receipts";
import { fetchSefazPage } from "@/lib/sefaz/fetch";
import { parseNfce } from "@/lib/sefaz/parser";
import { scanRequestSchema } from "@/lib/sefaz/schema";
import { assertSefazUrl, SefazError } from "@/lib/sefaz/url";

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
    const url = assertSefazUrl(body.data.url);
    const html = await fetchSefazPage(url.toString());
    const parsed = parseNfce(html, url);
    const receipt = await saveReceipt(userId, url.toString(), parsed);

    return NextResponse.json(
      {
        id: receipt.id,
        store: receipt.store.name,
        total: Number(receipt.totalAmount),
        issuedAt: receipt.issuedAt,
        itemCount: parsed.items.length,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DuplicateReceiptError) {
      return fail(409, error.message, { id: error.receiptId });
    }
    if (error instanceof SefazError) {
      const status = error.code === "INVALID_URL" ? 400 : error.code === "FETCH_FAILED" ? 502 : 422;
      return fail(status, error.message);
    }
    console.error("POST /api/receipts failed", error);
    return fail(500, "Erro inesperado ao salvar a nota.");
  }
}
