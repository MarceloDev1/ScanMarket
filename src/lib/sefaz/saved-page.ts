// Reads an NFC-e page the user opened and saved in their own browser, for states whose SEFAZ
// refuses requests from our server. Runs in the browser, so only the page itself is uploaded
// (an MHTML archive with images can be far larger than the function body limit).

/** Same cap as fetchSefazPage; NFC-e pages are a few hundred KB at most. */
export const MAX_SAVED_PAGE_CHARS = 2 * 1024 * 1024;

/** File picker filter: extensions plus the MIME types mobile pickers match on. */
export const SAVED_PAGE_ACCEPT =
  ".html,.htm,.mhtml,.mht,.xml,text/html,text/xml,application/xml,multipart/related,application/x-mimearchive";

export type SavedReceipt = { content: string; sourceUrl: string | null };

/** Bytes -> one char per byte, so MIME parts can be sliced before their charset is known. */
function toBinary(bytes: Uint8Array) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return text;
}

const toBytes = (binary: string) => Uint8Array.from(binary, (c) => c.charCodeAt(0));

function decode(bytes: Uint8Array, charset: string | undefined) {
  try {
    return new TextDecoder(charset ?? "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/** Many SEFAZ pages are ISO-8859-1; honour the declared charset so accents survive. */
const declaredCharset = (start: string) =>
  start.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ??
  start.match(/<\?xml[^>]+encoding=["']([\w-]+)/i)?.[1];

const quotedPrintable =(body: string) =>
  toBytes(
    body
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-F]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))),
  );

/** Chrome's "Download page" on Android saves .mhtml: a MIME archive whose HTML part is the page. */
function readMhtml(binary: string): SavedReceipt | null {
  const headerEnd = binary.search(/\r?\n\r?\n/);
  const headers = binary.slice(0, headerEnd);
  const boundary = headers.match(/boundary="?([^";\r\n]+)"?/i)?.[1];
  if (!boundary) return null;
  const snapshotUrl = headers.match(/^Snapshot-Content-Location:\s*(\S+)/im)?.[1];

  for (const part of binary.split(`--${boundary}`)) {
    const separator = part.search(/\r?\n\r?\n/);
    if (separator < 0) continue;
    const head = part.slice(0, separator);
    if (!/^Content-Type:\s*text\/html/im.test(head)) continue;

    const body = part.slice(separator).trim();
    const encoding = head.match(/^Content-Transfer-Encoding:\s*(\S+)/im)?.[1].toLowerCase();
    const bytes =
      encoding === "base64"
        ? toBytes(atob(body.replace(/\s/g, "")))
        : encoding === "quoted-printable"
          ? quotedPrintable(body)
          : toBytes(body);
    // Blink often omits the charset on the part header and keeps the page's own <meta> instead.
    const charset = head.match(/charset="?([\w-]+)/i)?.[1] ?? declaredCharset(toBinary(bytes.subarray(0, 4096)));
    return {
      content: decode(bytes, charset),
      sourceUrl: snapshotUrl ?? head.match(/^Content-Location:\s*(\S+)/im)?.[1] ?? null,
    };
  }
  return null;
}

/** Accepts a saved .html/.htm page, an .mhtml archive, or the NF-e .xml some states offer. */
export async function readSavedReceipt(file: File): Promise<SavedReceipt | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const binary = toBinary(bytes);
  const start = binary.slice(0, 4096);

  if (/^\s*(MIME-Version|From|Snapshot-Content-Location):/im.test(start) && /multipart\/related/i.test(start)) {
    return readMhtml(binary);
  }

  return {
    content: decode(bytes, declaredCharset(start)),
    // Desktop Chrome/Edge "Save as" keeps the original address in a comment.
    sourceUrl: start.match(/<!-- saved from url=\(\d+\)(\S+?) -->/i)?.[1] ?? null,
  };
}

export type ImportResult =
  | { ok: true; receipt: { id: string; store: string; total: number; itemCount: number } }
  | { ok: false; error: string; existingId?: string };

/** Reads the file in the browser and sends only the page to the import endpoint. */
export async function uploadSavedReceipt(file: File, linkId?: string): Promise<ImportResult> {
  const saved = await readSavedReceipt(file).catch(() => null);
  if (!saved?.content.trim()) {
    return { ok: false, error: "Não consegui ler esse arquivo. Salve a página da nota como .html ou .mhtml." };
  }
  if (saved.content.length > MAX_SAVED_PAGE_CHARS) {
    return { ok: false, error: "Esse arquivo é grande demais para ser a página de uma nota." };
  }
  try {
    const response = await fetch("/api/receipts/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...saved, linkId }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) return { ok: true, receipt: data };
    return {
      ok: false,
      error: data.error ?? "Não foi possível importar a nota.",
      existingId: response.status === 409 ? data.id : undefined,
    };
  } catch {
    return { ok: false, error: "Sem conexão. Verifique a internet e tente de novo." };
  }
}
