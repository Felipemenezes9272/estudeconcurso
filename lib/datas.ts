const FUSO = "America/Sao_Paulo";

/** Data de hoje (AAAA-MM-DD) no fuso de Brasília, para não "virar o dia" às 21h. */
export function hoje(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: FUSO });
}

/** Soma dias a uma data AAAA-MM-DD. */
export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** 25/12/2026 */
export function formatarData(data: string): string {
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}

/** 135 -> "2h15" */
export function formatarMinutos(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
}

/** "quarta-feira, 4 de novembro" */
export function dataPorExtenso(): string {
  return new Date().toLocaleDateString("pt-BR", {
    timeZone: FUSO,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
