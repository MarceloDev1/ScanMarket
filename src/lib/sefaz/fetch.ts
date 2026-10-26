import { assertSefazUrl, SefazError } from "./url";

const TIMEOUT_MS = 12_000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;

/** Fetches the public NFC-e page, re-validating the host on every redirect. */
export async function fetchSefazPage(rawUrl: string): Promise<string> {
  let url = assertSefazUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PricePulse/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      throw new SefazError(
        "A SEFAZ não respondeu a tempo. Tente novamente em instantes.",
        "FETCH_FAILED",
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) break;
      url = assertSefazUrl(new URL(location, url).toString());
      continue;
    }

    if (!response.ok) {
      throw new SefazError(`A SEFAZ retornou erro ${response.status}.`, "FETCH_FAILED");
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      throw new SefazError("A página da nota é grande demais.", "FETCH_FAILED");
    }
    const charset = response.headers.get("content-type")?.match(/charset=([\w-]+)/i)?.[1];
    return new TextDecoder(charset ?? "utf-8").decode(buffer);
  }

  throw new SefazError("Redirecionamentos demais ao consultar a SEFAZ.", "FETCH_FAILED");
}
