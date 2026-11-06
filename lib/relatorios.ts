import { somarDias } from "./datas";

/** Abaixo disso, a taxa de acerto de uma matéria é amostra pequena demais para apontar ponto fraco. */
export const MIN_QUESTOES_PONTO_FRACO = 10;

export const PERIODOS = [7, 30, 90] as const;

type Materia = { nome: string } | null;

export type LinhaSessao = { data: string; minutos: number; topicos: { materias: Materia } | null };
export type LinhaQuestoes = {
  data: string;
  total: number;
  acertos: number;
  topicos: { materias: Materia } | null;
};
export type LinhaTopico = { status: string; materias: Materia };

export type ResumoMateria = {
  nome: string;
  minutos: number;
  total: number;
  acertos: number;
  /** Percentual de acerto (0-100), ou null se não há questões no período. */
  taxa: number | null;
  topicos: number;
  concluidos: number;
};

export type Relatorio = {
  porDia: { data: string; minutos: number }[];
  porMateria: ResumoMateria[];
  minutos: number;
  diasEstudados: number;
  total: number;
  acertos: number;
  taxa: number | null;
  /** Matéria com a pior taxa de acerto (com amostra mínima), ou null. */
  pontoFraco: ResumoMateria | null;
};

const SEM_MATERIA = "Sem matéria";

function percentual(acertos: number, total: number): number | null {
  return total > 0 ? Math.round((acertos / total) * 100) : null;
}

/**
 * Consolida sessões e questões dos últimos `dias` dias (incluindo hoje).
 * Linhas fora do período são ignoradas; os tópicos contam o edital inteiro.
 */
export function agregar(entrada: {
  sessoes: LinhaSessao[];
  questoes: LinhaQuestoes[];
  topicos: LinhaTopico[];
  hoje: string;
  dias: number;
}): Relatorio {
  const { hoje, dias } = entrada;
  const inicio = somarDias(hoje, -(dias - 1));
  const noPeriodo = (data: string) => data >= inicio && data <= hoje;

  const materias = new Map<string, ResumoMateria>();
  const materia = (nome: string | undefined) => {
    const chave = nome ?? SEM_MATERIA;
    let m = materias.get(chave);
    if (!m) {
      m = { nome: chave, minutos: 0, total: 0, acertos: 0, taxa: null, topicos: 0, concluidos: 0 };
      materias.set(chave, m);
    }
    return m;
  };

  const minutosPorDia = new Map<string, number>();
  let minutos = 0;
  for (const s of entrada.sessoes) {
    if (!noPeriodo(s.data)) continue;
    minutos += s.minutos;
    minutosPorDia.set(s.data, (minutosPorDia.get(s.data) ?? 0) + s.minutos);
    materia(s.topicos?.materias?.nome).minutos += s.minutos;
  }

  let total = 0;
  let acertos = 0;
  for (const q of entrada.questoes) {
    if (!noPeriodo(q.data)) continue;
    total += q.total;
    acertos += q.acertos;
    const m = materia(q.topicos?.materias?.nome);
    m.total += q.total;
    m.acertos += q.acertos;
  }

  for (const t of entrada.topicos) {
    const m = materia(t.materias?.nome);
    m.topicos += 1;
    if (t.status === "concluido") m.concluidos += 1;
  }

  const porMateria = [...materias.values()]
    .map((m) => ({ ...m, taxa: percentual(m.acertos, m.total) }))
    .sort((a, b) => b.minutos - a.minutos || a.nome.localeCompare(b.nome, "pt-BR"));

  const candidatas = porMateria.filter(
    (m) => m.taxa !== null && m.total >= MIN_QUESTOES_PONTO_FRACO,
  );
  const pontoFraco = candidatas.length
    ? candidatas.reduce((pior, m) => (m.taxa! < pior.taxa! ? m : pior))
    : null;

  const porDia = Array.from({ length: dias }, (_, i) => {
    const data = somarDias(inicio, i);
    return { data, minutos: minutosPorDia.get(data) ?? 0 };
  });

  return {
    porDia,
    porMateria,
    minutos,
    diasEstudados: porDia.filter((d) => d.minutos > 0).length,
    total,
    acertos,
    taxa: percentual(acertos, total),
    pontoFraco,
  };
}
