/** Com menos questões que isso, o desempenho no tópico é considerado desconhecido. */
export const MIN_QUESTOES_DESEMPENHO = 5;

/** Tópico concluído só volta à lista se o acerto estiver abaixo disso. */
export const ACERTO_ALVO = 70;

export type TopicoEntrada = {
  id: string;
  nome: string;
  materia: string;
  /** Peso da matéria na prova (1-5). */
  peso: number;
  /** Quanto o assunto cai na prova (1-5). */
  incidencia: number;
  status: string;
  /** Questões feitas e acertos neste tópico. */
  total: number;
  acertos: number;
};

export type ItemPrioridade = {
  id: string;
  nome: string;
  materia: string;
  incidencia: number;
  peso: number;
  score: number;
  /** Percentual de acerto (0-100), ou null se desconhecido. */
  taxa: number | null;
  motivo: string;
  status: string;
  /** Merece atenção agora (não está concluído com bom desempenho). */
  prioritario: boolean;
};

/**
 * Pontuação = incidência × peso da matéria × fator de desempenho.
 * O fator vai de 0,5 (acerta tudo) a 1,5 (erra tudo); sem dados suficientes vale 1.
 * Assim, assunto que cai muito, em matéria pesada e onde você erra mais sobe na lista.
 */
export function pontuar(t: TopicoEntrada): { score: number; taxa: number | null } {
  const conhecido = t.total >= MIN_QUESTOES_DESEMPENHO;
  const taxa = conhecido ? Math.round((t.acertos / t.total) * 100) : null;
  const fator = conhecido ? 0.5 + (1 - t.acertos / t.total) : 1;
  return { score: Math.round(t.incidencia * t.peso * fator * 100) / 100, taxa };
}

function motivoDe(status: string, taxa: number | null): string {
  if (taxa !== null && taxa < ACERTO_ALVO) {
    return status === "concluido" ? `Concluído, mas só ${taxa}% de acerto` : `Acerto baixo (${taxa}%)`;
  }
  if (status === "concluido") return "Concluído";
  if (status === "estudando") return "Em andamento";
  return "Ainda não iniciado";
}

/** Pontuação e situação de um tópico, com a informação de que ele merece atenção ou não. */
export function avaliar(t: TopicoEntrada): ItemPrioridade {
  const { score, taxa } = pontuar(t);
  return {
    id: t.id,
    nome: t.nome,
    materia: t.materia,
    incidencia: t.incidencia,
    peso: t.peso,
    score,
    taxa,
    motivo: motivoDe(t.status, taxa),
    status: t.status,
    prioritario: t.status !== "concluido" || (taxa !== null && taxa < ACERTO_ALVO),
  };
}

const porScore = (a: ItemPrioridade, b: ItemPrioridade) =>
  b.score - a.score || a.nome.localeCompare(b.nome, "pt-BR");

/** Todos os tópicos avaliados, os que merecem atenção primeiro (do mais ao menos prioritário). */
export function ordenarPorPrioridade(topicos: TopicoEntrada[]): ItemPrioridade[] {
  const itens = topicos.map(avaliar);
  return [...itens.filter((i) => i.prioritario).sort(porScore), ...itens.filter((i) => !i.prioritario).sort(porScore)];
}

/** Tópicos que merecem atenção, do mais prioritário ao menos. */
export function ranquear(topicos: TopicoEntrada[], limite = 10): ItemPrioridade[] {
  return topicos
    .map(avaliar)
    .filter((i) => i.prioritario)
    .sort(porScore)
    .slice(0, limite);
}
