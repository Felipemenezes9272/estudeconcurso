import { tipoValido, type TipoEvento } from "@/lib/calendario";

// Regras compartilhadas da importação de edital por IA: formato esperado,
// pedido enviado ao Gemini e limpeza do que ele devolve.

export type MateriaExtraida = { nome: string; peso: number; topicos: string[] };
export type EventoExtraido = { titulo: string; data: string; tipo: TipoEvento };
export type EditalExtraido = {
  nome: string;
  banca: string;
  cargo: string;
  data_prova: string; // AAAA-MM-DD ou vazio
  materias: MateriaExtraida[];
  datas: EventoExtraido[];
};

const MAX_MATERIAS = 40;
const MAX_TOPICOS = 400;

export const PROMPT_EDITAL = `Você lê editais de concursos públicos brasileiros e extrai os dados para um sistema de estudos.

Do PDF, extraia:
- nome: nome do concurso (ex.: "INSS 2026", "Prefeitura de X - Concurso 01/2026").
- banca: banca organizadora, se constar.
- cargo: o cargo principal. Se houver vários, junte os nomes separados por " / ".
- data_prova: data da prova objetiva no formato AAAA-MM-DD, somente se estiver explícita; senão deixe vazio.
- datas: as datas importantes do cronograma do edital (início e fim das inscrições, prazo de isenção da taxa, data da prova objetiva e das demais etapas, divulgação de gabarito e de resultados, prazos de recurso). Cada uma com titulo curto (ex.: "Fim das inscrições"), data no formato AAAA-MM-DD e tipo: "inscricao", "isencao", "prova", "resultado", "recurso" ou "outro". Para um período (ex.: inscrições de 10 a 30 de março), crie duas datas: o início e o fim. Inclua somente datas explícitas no documento; se a data for "a definir" ou não tiver dia certo, não inclua.
- materias: as disciplinas do CONTEÚDO PROGRAMÁTICO (programa das provas). Para cada uma:
  - nome da disciplina;
  - peso: de 1 a 5, estimado pelo número de questões ou pelo peso da disciplina no edital (mais questões ou peso maior = nota maior). Se o edital não informar, use 3;
  - topicos: os tópicos de estudo, um item por assunto, em ordem. Quebre itens numerados e subitens em tópicos curtos e claros, sem repetir o nome da matéria e sem a numeração do edital.

Regras: use somente o que está no documento, sem inventar matérias nem tópicos. Se houver conteúdos diferentes por cargo, use o do cargo principal. Ignore cronograma de inscrição, taxas, vagas e regras gerais. Escreva em português.`;

/** Esquema de resposta do Gemini (subconjunto OpenAPI). */
export const ESQUEMA_RESPOSTA = {
  type: "OBJECT",
  properties: {
    nome: { type: "STRING" },
    banca: { type: "STRING" },
    cargo: { type: "STRING" },
    data_prova: { type: "STRING" },
    datas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          titulo: { type: "STRING" },
          data: { type: "STRING" },
          tipo: { type: "STRING" },
        },
        required: ["titulo", "data", "tipo"],
      },
    },
    materias: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          nome: { type: "STRING" },
          peso: { type: "INTEGER" },
          topicos: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["nome", "peso", "topicos"],
      },
    },
  },
  required: ["nome", "banca", "cargo", "data_prova", "datas", "materias"],
} as const;

function str(valor: unknown, max: number): string {
  return typeof valor === "string" ? valor.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function dataValida(valor: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const ok =
    d.getUTCFullYear() === Number(m[1]) &&
    d.getUTCMonth() === Number(m[2]) - 1 &&
    d.getUTCDate() === Number(m[3]);
  return ok ? valor : "";
}

const MAX_DATAS = 40;

/** Valida a lista de datas importantes: descarta datas inválidas e repetidas. */
export function normalizarDatas(bruto: unknown): EventoExtraido[] {
  const lista = Array.isArray(bruto) ? bruto : [];
  const vistos = new Set<string>();
  const datas: EventoExtraido[] = [];

  for (const item of lista) {
    if (datas.length >= MAX_DATAS) break;
    const e = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const titulo = str(e.titulo, 150);
    const data = dataValida(str(e.data, 10));
    if (!titulo || !data) continue;

    const chave = `${titulo.toLowerCase()}|${data}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    datas.push({ titulo, data, tipo: tipoValido(e.tipo) });
  }

  return datas.sort((a, b) => a.data.localeCompare(b.data));
}

/**
 * Valida e limpa dados vindos da IA (ou do formulário de revisão).
 * Nunca lança erro: devolve o que for aproveitável.
 */
export function normalizarEdital(bruto: unknown): EditalExtraido {
  const o = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const listaMaterias = Array.isArray(o.materias) ? o.materias : [];

  const materias: MateriaExtraida[] = [];
  let totalTopicos = 0;

  for (const item of listaMaterias) {
    if (materias.length >= MAX_MATERIAS) break;
    const m = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const nome = str(m.nome, 200);
    if (!nome) continue;

    const pesoNum = Math.round(Number(m.peso));
    const peso = Number.isFinite(pesoNum) ? Math.min(5, Math.max(1, pesoNum)) : 3;

    const vistos = new Set<string>();
    const topicos: string[] = [];
    for (const t of Array.isArray(m.topicos) ? m.topicos : []) {
      if (totalTopicos >= MAX_TOPICOS) break;
      const nomeTopico = str(t, 300);
      const chave = nomeTopico.toLowerCase();
      if (!nomeTopico || vistos.has(chave)) continue;
      vistos.add(chave);
      topicos.push(nomeTopico);
      totalTopicos += 1;
    }

    materias.push({ nome, peso, topicos });
  }

  return {
    datas: normalizarDatas(o.datas),
    nome: str(o.nome, 200),
    banca: str(o.banca, 120),
    cargo: str(o.cargo, 200),
    data_prova: dataValida(str(o.data_prova, 10)),
    materias,
  };
}
