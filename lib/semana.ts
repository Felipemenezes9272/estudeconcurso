import { somarDias } from "@/lib/datas";

export type SessaoSemana = { data: string; minutos: number; materia: string };
export type QuestoesSemana = { data: string; total: number; acertos: number; materia: string };

export type Periodo = {
  minutos: number;
  sessoes: number;
  diasEstudados: number;
  questoes: number;
  acertos: number;
  /** Percentual de acerto (0-100) ou null se não houve questões. */
  taxa: number | null;
  revisoes: number;
  erros: number;
  cartoes: number;
};

export type Retrospectiva = {
  inicio: string;
  atual: Periodo;
  anterior: Periodo;
  /** Os 7 dias da semana atual, do mais antigo (hoje-6) até hoje. */
  dias: { data: string; minutos: number }[];
  materiaMaisEstudada: { nome: string; minutos: number } | null;
  /** Matéria com pior acerto na semana (só considera 5 questões ou mais). */
  materiaPiorAcerto: { nome: string; taxa: number; questoes: number } | null;
  melhorDia: { data: string; minutos: number } | null;
};

const MIN_QUESTOES_MATERIA = 5;

function periodo(
  de: string,
  ate: string,
  dados: {
    sessoes: SessaoSemana[];
    questoes: QuestoesSemana[];
    revisoesFeitas: string[];
    errosRegistrados: string[];
    cartoesRevisados: string[];
  },
): Periodo {
  const dentro = (d: string) => d >= de && d <= ate;
  const sessoes = dados.sessoes.filter((s) => dentro(s.data));
  const questoes = dados.questoes.filter((q) => dentro(q.data));
  const total = questoes.reduce((s, q) => s + q.total, 0);
  const acertos = questoes.reduce((s, q) => s + q.acertos, 0);
  return {
    minutos: sessoes.reduce((s, x) => s + x.minutos, 0),
    sessoes: sessoes.length,
    diasEstudados: new Set(sessoes.map((s) => s.data)).size,
    questoes: total,
    acertos,
    taxa: total > 0 ? Math.round((acertos / total) * 100) : null,
    revisoes: dados.revisoesFeitas.filter(dentro).length,
    erros: dados.errosRegistrados.filter(dentro).length,
    cartoes: dados.cartoesRevisados.filter(dentro).length,
  };
}

/** Compara os últimos 7 dias (incluindo hoje) com os 7 anteriores. */
export function resumirSemana(
  hoje: string,
  dados: {
    sessoes: SessaoSemana[];
    questoes: QuestoesSemana[];
    revisoesFeitas: string[];
    errosRegistrados: string[];
    cartoesRevisados: string[];
  },
): Retrospectiva {
  const inicio = somarDias(hoje, -6);
  const atual = periodo(inicio, hoje, dados);
  const anterior = periodo(somarDias(hoje, -13), somarDias(hoje, -7), dados);

  const dias = Array.from({ length: 7 }, (_, i) => {
    const data = somarDias(inicio, i);
    return { data, minutos: dados.sessoes.filter((s) => s.data === data).reduce((s, x) => s + x.minutos, 0) };
  });

  const porMateria = new Map<string, number>();
  for (const s of dados.sessoes.filter((x) => x.data >= inicio && x.data <= hoje)) {
    porMateria.set(s.materia, (porMateria.get(s.materia) ?? 0) + s.minutos);
  }
  const topo = [...porMateria.entries()].sort((a, b) => b[1] - a[1])[0];

  const acerto = new Map<string, { total: number; acertos: number }>();
  for (const q of dados.questoes.filter((x) => x.data >= inicio && x.data <= hoje)) {
    const atualM = acerto.get(q.materia) ?? { total: 0, acertos: 0 };
    atualM.total += q.total;
    atualM.acertos += q.acertos;
    acerto.set(q.materia, atualM);
  }
  const pior = [...acerto.entries()]
    .filter(([, v]) => v.total >= MIN_QUESTOES_MATERIA)
    .map(([nome, v]) => ({ nome, taxa: Math.round((v.acertos / v.total) * 100), questoes: v.total }))
    .sort((a, b) => a.taxa - b.taxa || b.questoes - a.questoes)[0];

  const melhor = [...dias].sort((a, b) => b.minutos - a.minutos)[0];

  return {
    inicio,
    atual,
    anterior,
    dias,
    materiaMaisEstudada: topo ? { nome: topo[0], minutos: topo[1] } : null,
    materiaPiorAcerto: pior ?? null,
    melhorDia: melhor && melhor.minutos > 0 ? melhor : null,
  };
}

/** Diferença percentual entre dois valores; null quando não dá para comparar. */
export function variacao(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}
