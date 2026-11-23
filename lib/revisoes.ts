import { somarDias } from "./datas";

/** Revisões geradas ao concluir um tópico: 1, 7, 30 e 60 dias depois. */
export const INTERVALOS_REVISAO = [1, 7, 30, 60] as const;

/** Se a revisão foi difícil, o tópico volta a ser revisado em 3 dias. */
export const INTERVALO_REVISAO_DIFICIL = 3;

export type ResultadoRevisao = "facil" | "medio" | "dificil";

export function calcularRevisoes(dataConclusao: string) {
  return INTERVALOS_REVISAO.map((dias) => ({
    intervalo_dias: dias,
    data_prevista: somarDias(dataConclusao, dias),
  }));
}

export type RevisaoFutura = { id: string; data_prevista: string };

/** Acima deste acerto (%), uma revisão fácil pode adiar a próxima. */
export const ACERTO_PARA_ADIAR = 70;
const LIMITE_DIAS = 180;
const MIN_DIAS_ANTECIPADA = 4;

function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
}

/**
 * Ajusta as revisões que ainda faltam conforme o resultado da que acabou de ser feita:
 * - fácil (e acerto bom ou desconhecido): a próxima fica 50% mais distante;
 * - difícil: a próxima vem 30% mais cedo (mínimo de 4 dias);
 * - médio: nada muda.
 * As revisões seguintes acompanham o deslocamento, mantendo a ordem. Nenhuma passa de 180 dias.
 */
export function ajustarRevisoes(
  resultado: ResultadoRevisao,
  dataFeita: string,
  futuras: RevisaoFutura[],
  taxaAcerto: number | null,
): { id: string; data_prevista: string }[] {
  const ordenadas = futuras.filter((r) => r.data_prevista > dataFeita).sort((a, b) => a.data_prevista.localeCompare(b.data_prevista));
  const proxima = ordenadas[0];
  if (!proxima || resultado === "medio") return [];

  const intervalo = diasEntre(dataFeita, proxima.data_prevista);
  let novoIntervalo = intervalo;
  if (resultado === "facil" && (taxaAcerto === null || taxaAcerto >= ACERTO_PARA_ADIAR)) {
    novoIntervalo = Math.round(intervalo * 1.5);
  } else if (resultado === "dificil") {
    novoIntervalo = Math.max(MIN_DIAS_ANTECIPADA, Math.round(intervalo * 0.7));
  }
  novoIntervalo = Math.min(novoIntervalo, LIMITE_DIAS);
  const deslocamento = novoIntervalo - intervalo;
  if (deslocamento === 0) return [];

  const limite = somarDias(dataFeita, LIMITE_DIAS);
  return ordenadas.map((r) => {
    let nova = somarDias(r.data_prevista, deslocamento);
    if (nova > limite) nova = limite;
    if (nova <= dataFeita) nova = somarDias(dataFeita, 1);
    return { id: r.id, data_prevista: nova };
  });
}
