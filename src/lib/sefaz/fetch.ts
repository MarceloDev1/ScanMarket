import { assertSefazUrl, SefazError } from "./url";

const TIMEOUT_MS = 12_000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const BLOCKED_PAGE = /bloqueia acessos provenientes desses endere[çc]os IP/i;

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
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
        },
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      throw new SefazError(
        timedOut
          ? "A SEFAZ não respondeu a tempo. Pode ser instabilidade ou bloqueio do servidor; tente novamente em instantes."
          : "Não foi possível conectar à SEFAZ.",
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
    const html = new TextDecoder(charset ?? "utf-8").decode(buffer);
    // Some states (e.g. RJ) answer 200 with a notice when the caller's IP is on a block list.
    if (BLOCKED_PAGE.test(html)) {
      throw new SefazError(
        "A SEFAZ bloqueou o acesso do servidor a esta nota. Abra o link no navegador para ver a nota.",
        "FETCH_FAILED",
      );
    }
    return html;
  }

  throw new SefazError("Redirecionamentos demais ao consultar a SEFAZ.", "FETCH_FAILED");
}
