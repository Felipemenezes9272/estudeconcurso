// Regras do calendário: tipos de evento e montagem da grade do mês.
// Tudo com datas em texto (AAAA-MM-DD) para não depender de fuso horário.

export type TipoEvento = "inscricao" | "isencao" | "prova" | "resultado" | "recurso" | "outro";

export const TIPOS_EVENTO: { valor: TipoEvento; rotulo: string }[] = [
  { valor: "inscricao", rotulo: "Inscrição" },
  { valor: "isencao", rotulo: "Isenção de taxa" },
  { valor: "prova", rotulo: "Prova" },
  { valor: "resultado", rotulo: "Resultado / gabarito" },
  { valor: "recurso", rotulo: "Recurso" },
  { valor: "outro", rotulo: "Outro" },
];

export const ROTULO_EVENTO: Record<TipoEvento, string> = Object.fromEntries(
  TIPOS_EVENTO.map((t) => [t.valor, t.rotulo]),
) as Record<TipoEvento, string>;

export function tipoValido(valor: unknown): TipoEvento {
  return TIPOS_EVENTO.some((t) => t.valor === valor) ? (valor as TipoEvento) : "outro";
}

export const NOMES_MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const;
export const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;

/** Lê "2026-11" (ou qualquer lixo) e devolve um mês válido; sem valor, usa o mês de `padrao`. */
export function lerMes(valor: string | undefined, padrao: string): { ano: number; mes: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(valor ?? "");
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12 && Number(m[1]) >= 2000 && Number(m[1]) <= 2100) {
    return { ano: Number(m[1]), mes: Number(m[2]) };
  }
  return { ano: Number(padrao.slice(0, 4)), mes: Number(padrao.slice(5, 7)) };
}

export const chaveMes = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, "0")}`;

export function mesVizinho(ano: number, mes: number, delta: number): { ano: number; mes: number } {
  const total = ano * 12 + (mes - 1) + delta;
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 };
}

export type Celula = { data: string; doMes: boolean };

/** Semanas (domingo a sábado) que cobrem o mês, completando com dias vizinhos. */
export function gradeDoMes(ano: number, mes: number): Celula[][] {
  const primeiro = new Date(Date.UTC(ano, mes - 1, 1));
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const recuo = primeiro.getUTCDay(); // dias do mês anterior na primeira semana
  const semanas = Math.ceil((recuo + diasNoMes) / 7);

  const grade: Celula[][] = [];
  for (let s = 0; s < semanas; s++) {
    const linha: Celula[] = [];
    for (let d = 0; d < 7; d++) {
      const dia = new Date(Date.UTC(ano, mes - 1, 1 - recuo + s * 7 + d));
      linha.push({ data: dia.toISOString().slice(0, 10), doMes: dia.getUTCMonth() === mes - 1 });
    }
    grade.push(linha);
  }
  return grade;
}

/** Dias entre duas datas AAAA-MM-DD (b - a). */
export function diasEntre(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86_400_000,
  );
}

/** "hoje", "amanhã", "em 12 dias", "há 3 dias" */
export function distanciaTexto(hoje: string, data: string): string {
  const d = diasEntre(hoje, data);
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  if (d === -1) return "ontem";
  return d > 0 ? `em ${d} dias` : `há ${-d} dias`;
}
