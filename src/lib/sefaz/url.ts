export class SefazError extends Error {
  constructor(
    message: string,
    readonly code: "INVALID_URL" | "FETCH_FAILED" | "PARSE_FAILED",
  ) {
    super(message);
    this.name = "SefazError";
  }
}

// NFC-e consultation pages are served from state treasury hosts, all under *.gov.br
// (e.g. www.fazenda.pr.gov.br). Anything else is rejected so the server can't be used to
// fetch arbitrary URLs.
const SEFAZ_HOST = /\.gov\.br$/i;
// URL.port is "" for the default port (443 on https).
const ALLOWED_PORTS = new Set(["", "444"]);

export function assertSefazUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SefazError("URL inválida.", "INVALID_URL");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new SefazError("A URL da nota precisa ser https e sem credenciais.", "INVALID_URL");
  }
  // Some states serve the consultation page on 444 (e.g. nfce.sefaz.pe.gov.br:444).
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new SefazError("A URL da nota usa uma porta não permitida.", "INVALID_URL");
  }
  if (!SEFAZ_HOST.test(url.hostname)) {
    throw new SefazError("Esse endereço não é de uma consulta de NFC-e da SEFAZ.", "INVALID_URL");
  }
  return url;
}

/** The QR Code URL carries the 44-digit access key, usually as the first segment of `p`. */
export function extractAccessKey(url: URL): string | null {
  const candidates = [url.searchParams.get("p"), url.searchParams.get("chNFe"), url.search];
  for (const value of candidates) {
    const match = value?.match(/\d{44}/);
    if (match) return match[0];
  }
  return null;
}
