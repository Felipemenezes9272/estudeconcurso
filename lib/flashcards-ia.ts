export type CartaoIA = { frente: string; verso: string };

/** Limpa os cartões devolvidos pela IA: tira vazios, repetidos e limita o tamanho. */
export function normalizarCartoes(bruto: unknown, max = 20): CartaoIA[] {
  const o = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const lista = Array.isArray(o.cartoes) ? o.cartoes : [];
  const vistos = new Set<string>();
  const cartoes: CartaoIA[] = [];

  for (const item of lista) {
    if (cartoes.length >= max) break;
    const c = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const frente = typeof c.frente === "string" ? c.frente.replace(/\s+/g, " ").trim().slice(0, 500) : "";
    const verso = typeof c.verso === "string" ? c.verso.trim().slice(0, 1000) : "";
    const chave = frente.toLowerCase();
    if (!frente || !verso || vistos.has(chave)) continue;
    vistos.add(chave);
    cartoes.push({ frente, verso });
  }
  return cartoes;
}
