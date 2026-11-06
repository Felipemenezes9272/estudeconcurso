import { somarDias } from "./datas";

export type Nota = "errei" | "dificil" | "bom" | "facil";

export const NOTAS: { valor: Nota; rotulo: string; dica: string }[] = [
  { valor: "errei", rotulo: "Errei", dica: "volta amanhã" },
  { valor: "dificil", rotulo: "Difícil", dica: "intervalo curto" },
  { valor: "bom", rotulo: "Bom", dica: "intervalo normal" },
  { valor: "facil", rotulo: "Fácil", dica: "intervalo maior" },
];

export type EstadoCartao = {
  intervalo_dias: number;
  repeticoes: number;
  facilidade: number;
};

export const ESTADO_INICIAL: EstadoCartao = { intervalo_dias: 0, repeticoes: 0, facilidade: 2.5 };

const FACILIDADE_MIN = 1.3;
const FACILIDADE_MAX = 3.5; // a coluna do banco aceita até 9,99; o teto evita estourar e intervalos absurdos
const INTERVALO_MAX = 365;

const limitar = (n: number) => Math.min(INTERVALO_MAX, Math.max(1, Math.round(n)));
const arredondar2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Repetição espaçada simplificada (inspirada no SM-2).
 * Errou: recomeça e volta amanhã. Acertou: 1º acerto = 1 dia, 2º = 3 dias, depois
 * multiplica o intervalo pela "facilidade" do cartão, que sobe com "Fácil" e desce com "Difícil".
 */
export function agendar(
  estado: EstadoCartao,
  nota: Nota,
  hoje: string,
): EstadoCartao & { proxima_revisao: string; ultima_revisao: string } {
  let { intervalo_dias, repeticoes, facilidade } = estado;

  if (nota === "errei") {
    repeticoes = 0;
    intervalo_dias = 1;
    facilidade = Math.max(FACILIDADE_MIN, facilidade - 0.2);
  } else if (nota === "dificil") {
    repeticoes += 1;
    intervalo_dias = limitar(Math.max(1, intervalo_dias) * 1.2);
    facilidade = Math.max(FACILIDADE_MIN, facilidade - 0.15);
  } else {
    const fator = nota === "facil" ? 1.3 : 1;
    if (repeticoes === 0) intervalo_dias = nota === "facil" ? 3 : 1;
    else if (repeticoes === 1) intervalo_dias = nota === "facil" ? 6 : 3;
    else intervalo_dias = limitar(intervalo_dias * facilidade * fator);
    repeticoes += 1;
    if (nota === "facil") facilidade = Math.min(FACILIDADE_MAX, facilidade + 0.15);
  }

  return {
    intervalo_dias,
    repeticoes,
    facilidade: arredondar2(facilidade),
    proxima_revisao: somarDias(hoje, intervalo_dias),
    ultima_revisao: hoje,
  };
}
