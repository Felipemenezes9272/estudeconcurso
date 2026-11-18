/**
 * Limpa o endereço de um site digitado pela pessoa (ou lido pela IA).
 * Aceita "www.exemplo.com.br" (acrescenta https://), só deixa passar http/https
 * e devolve "" quando não for um endereço válido.
 */
export function normalizarSite(valor: unknown): string {
  if (typeof valor !== "string") return "";
  let texto = valor.trim().slice(0, 500);
  if (!texto || /\s/.test(texto)) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(texto)) texto = `https://${texto}`;
  try {
    const url = new URL(texto);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (!url.hostname.includes(".")) return "";
    return url.toString();
  } catch {
    return "";
  }
}

/** "https://www.cebraspe.org.br/concursos/x" -> "cebraspe.org.br" */
export function dominioDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
