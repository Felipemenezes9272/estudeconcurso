// Regras dos simulados gerados por IA: pedido ao Gemini, validação das questões
// devolvidas e correção das respostas.

export type TipoSimulado = "multipla" | "certo_errado";
export type Dificuldade = "facil" | "medio" | "dificil";

export type QuestaoGerada = {
  enunciado: string;
  alternativas: string[];
  correta: number; // índice (começa em 0) dentro de "alternativas"
  explicacao: string;
};

export const MIN_QUESTOES = 3;
export const MAX_QUESTOES = 20;
export const LETRAS = ["A", "B", "C", "D", "E"] as const;
export const ALTERNATIVAS_CERTO_ERRADO = ["Certo", "Errado"] as const;

export const ROTULO_TIPO: Record<TipoSimulado, string> = {
  multipla: "Múltipla escolha (A a E)",
  certo_errado: "Certo ou errado (estilo Cebraspe)",
};
export const ROTULO_DIFICULDADE: Record<Dificuldade, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

export function limitarQuantidade(valor: unknown): number {
  const n = Math.round(Number(valor));
  if (!Number.isFinite(n)) return 10;
  return Math.min(MAX_QUESTOES, Math.max(MIN_QUESTOES, n));
}

export function montarPrompt(tipo: TipoSimulado, quantidade: number, dificuldade: Dificuldade): string {
  const formato =
    tipo === "multipla"
      ? `Cada questão tem EXATAMENTE 5 alternativas (sem letras ou numeração no começo do texto), com uma única correta e quatro erradas plausíveis. "correta" é o índice da alternativa correta (0 a 4). Distribua o gabarito entre as posições, sem concentrar em uma só.`
      : `Cada questão é uma afirmação para julgar como certa ou errada, no estilo Cebraspe. Use "alternativas": ["Certo", "Errado"] e "correta" = 0 se a afirmação está certa ou 1 se está errada. Misture afirmações certas e erradas em proporção parecida.`;

  const nivel = {
    facil: "fácil: conceitos e definições diretas do texto",
    medio: "médio: exige entender e aplicar o conteúdo, como nas provas de nível médio",
    dificil: "difícil: pegadinhas de banca, exceções, comparações entre conceitos e detalhes do texto",
  }[dificuldade];

  return `Você é elaborador de questões de concursos públicos brasileiros. Com base SOMENTE no conteúdo do PDF anexo, crie um simulado.

- titulo: título curto do simulado, a partir do assunto do PDF.
- questoes: exatamente ${quantidade} questões, de nível ${nivel}.
- ${formato}
- Cada questão deve ser compreensível sozinha e cobrir pontos diferentes do material, sem repetir o mesmo assunto.
- Não use informação que não esteja no PDF e não invente fatos. Se o PDF tiver pouco conteúdo, faça menos questões em vez de inventar.
- explicacao: 1 a 3 frases dizendo por que a resposta correta está certa (e, se útil, o erro das demais), citando a ideia do material.
- Escreva em português do Brasil.`;
}

export const ESQUEMA_SIMULADO = {
  type: "OBJECT",
  properties: {
    titulo: { type: "STRING" },
    questoes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          enunciado: { type: "STRING" },
          alternativas: { type: "ARRAY", items: { type: "STRING" } },
          correta: { type: "INTEGER" },
          explicacao: { type: "STRING" },
        },
        required: ["enunciado", "alternativas", "correta", "explicacao"],
      },
    },
  },
  required: ["titulo", "questoes"],
} as const;

function str(valor: unknown, max: number): string {
  return typeof valor === "string" ? valor.replace(/[ \t]+/g, " ").trim().slice(0, max) : "";
}

/** Tira "A)", "b." ou "1 -" do começo, caso a IA numere as alternativas. */
function semMarcador(texto: string): string {
  return texto.replace(/^\(?[A-Ea-e1-5][).:-]\s+/, "").trim();
}

/**
 * Valida o que a IA devolveu. Descarta questões malformadas (alternativas
 * faltando ou repetidas, gabarito fora do intervalo) em vez de salvá-las erradas.
 */
export function normalizarSimulado(
  bruto: unknown,
  tipo: TipoSimulado,
  quantidade: number,
): { titulo: string; questoes: QuestaoGerada[] } {
  const o = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const lista = Array.isArray(o.questoes) ? o.questoes : [];

  const questoes: QuestaoGerada[] = [];
  const vistos = new Set<string>();

  for (const item of lista) {
    if (questoes.length >= quantidade) break;
    const q = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;

    const enunciado = str(q.enunciado, 2000);
    const explicacao = str(q.explicacao, 1500);
    const correta = Number(q.correta);
    if (!enunciado || !Number.isInteger(correta)) continue;

    const chave = enunciado.toLowerCase();
    if (vistos.has(chave)) continue;

    let alternativas: string[];
    if (tipo === "certo_errado") {
      alternativas = [...ALTERNATIVAS_CERTO_ERRADO];
      if (correta < 0 || correta > 1) continue;
    } else {
      const brutas = Array.isArray(q.alternativas) ? q.alternativas : [];
      alternativas = brutas.map((a) => semMarcador(str(a, 600)));
      if (alternativas.length !== 5) continue;
      if (alternativas.some((a) => !a)) continue;
      if (new Set(alternativas.map((a) => a.toLowerCase())).size !== 5) continue;
      if (correta < 0 || correta > 4) continue;
    }

    vistos.add(chave);
    questoes.push({ enunciado, alternativas, correta, explicacao });
  }

  return { titulo: str(o.titulo, 150), questoes };
}

/** Conta acertos: resposta ausente (null) conta como errada. */
export function contarAcertos(questoes: { correta: number }[], respostas: (number | null)[]): number {
  return questoes.reduce((soma, q, i) => soma + (respostas[i] === q.correta ? 1 : 0), 0);
}
