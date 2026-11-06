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
