import { PDFDocument } from "pdf-lib";

/** "1-3, 5, 8-9" -> [0, 1, 2, 4, 7, 8] (índices a partir de 0, sem repetir, em ordem). */
export function parsearPaginas(texto: string, total: number): { ok: true; indices: number[] } | { ok: false; erro: string } {
  const limpo = texto.trim();
  if (!limpo) return { ok: false, erro: "Informe as páginas, por exemplo: 1-5, 8." };
  const vistas = new Set<number>();

  for (const parte of limpo.split(/[,;]/)) {
    const p = parte.trim();
    if (!p) continue;
    const m = /^(\d{1,5})(?:\s*[-–a]\s*(\d{1,5}))?$/.exec(p);
    if (!m) return { ok: false, erro: `Não entendi "${p}". Use o formato 1-5, 8, 10-12.` };
    const de = Number(m[1]);
    const ate = m[2] ? Number(m[2]) : de;
    if (de < 1 || ate < de) return { ok: false, erro: `O intervalo "${p}" é inválido.` };
    if (ate > total) return { ok: false, erro: `O PDF tem ${total} páginas, e você pediu até a ${ate}.` };
    for (let n = de; n <= ate; n++) vistas.add(n - 1);
  }

  if (vistas.size === 0) return { ok: false, erro: "Informe as páginas, por exemplo: 1-5, 8." };
  return { ok: true, indices: [...vistas].sort((a, b) => a - b) };
}

/** Devolve um PDF só com as páginas pedidas (menos páginas enviadas à IA = menos tokens). */
export async function recortarPaginas(
  bytes: Buffer,
  intervalo: string,
): Promise<{ ok: true; bytes: Buffer; usadas: number; total: number } | { ok: false; erro: string }> {
  let origem: PDFDocument;
  try {
    origem = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch {
    return { ok: false, erro: "Não consegui abrir o PDF para escolher as páginas. Deixe o campo de páginas vazio ou envie outro arquivo." };
  }
  const total = origem.getPageCount();
  const escolha = parsearPaginas(intervalo, total);
  if (!escolha.ok) return escolha;

  try {
    const novo = await PDFDocument.create();
    const copiadas = await novo.copyPages(origem, escolha.indices);
    copiadas.forEach((pagina) => novo.addPage(pagina));
    const saida = Buffer.from(await novo.save());
    return { ok: true, bytes: saida, usadas: escolha.indices.length, total };
  } catch {
    return { ok: false, erro: "Não consegui recortar as páginas desse PDF. Deixe o campo de páginas vazio." };
  }
}
