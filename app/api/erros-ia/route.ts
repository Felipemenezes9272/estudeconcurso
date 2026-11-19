import { NextResponse } from "next/server";
import { gerarJsonDeTexto } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const ESQUEMA = {
  type: "OBJECT",
  properties: {
    explicacao: { type: "STRING" },
    cartao: {
      type: "OBJECT",
      properties: { frente: { type: "STRING" }, verso: { type: "STRING" } },
      required: ["frente", "verso"],
    },
  },
  required: ["explicacao", "cartao"],
} as const;

const MOTIVOS: Record<string, string> = {
  desatencao: "desatenção (sabia o conteúdo, errou por distração)",
  lacuna: "lacuna de conteúdo (faltou estudar ou entender o assunto)",
  pegadinha: "pegadinha da banca",
};

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

const limpar = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Explica um erro do caderno e sugere um flashcard. A explicação fica salva no erro.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return erro("Faça login para continuar.", 401);

  let corpo: { erro_id?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return erro("Pedido inválido.", 400);
  }
  const id = typeof corpo.erro_id === "string" ? corpo.erro_id : "";
  if (!id) return erro("Escolha um erro.", 400);

  const { data } = await supabase
    .from("erros")
    .select("enunciado, motivo, anotacao, topicos(nome, materias(nome))")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  const e = data as unknown as {
    enunciado: string;
    motivo: string;
    anotacao: string | null;
    topicos: { nome: string; materias: { nome: string } | null } | null;
  } | null;
  if (!e) return erro("Erro não encontrado.", 404);

  const prompt = `Você é um professor de concursos públicos brasileiros ajudando um aluno a entender um erro do caderno de erros.

Matéria: ${e.topicos?.materias?.nome ?? "—"}
Tópico: ${e.topicos?.nome ?? "—"}
Questão (como o aluno registrou): ${e.enunciado}
Motivo do erro, segundo o aluno: ${MOTIVOS[e.motivo] ?? e.motivo}
Anotação do aluno: ${e.anotacao || "(nenhuma)"}

Tarefa:
- explicacao: em português, curta (até 180 palavras), em 3 partes com os rótulos "Por que errei:", "Conceito certo:" e "Como não errar de novo:". Se o aluno registrou só a referência da questão e você não tem o texto dela, explique o conceito do tópico e as armadilhas mais comuns, sem inventar o conteúdo da questão.
- cartao: um flashcard de revisão que ajude a fixar o conceito certo: frente = pergunta curta e objetiva; verso = resposta direta em até 3 frases.
- Não invente artigos de lei, súmulas ou números; se não tiver certeza, diga o conceito sem citá-los.`;

  const resultado = await gerarJsonDeTexto(prompt, ESQUEMA);
  if (!resultado.ok) return erro(resultado.erro, resultado.status);

  const bruto = (resultado.dados && typeof resultado.dados === "object" ? resultado.dados : {}) as Record<string, unknown>;
  const cartaoBruto = (bruto.cartao && typeof bruto.cartao === "object" ? bruto.cartao : {}) as Record<string, unknown>;
  const explicacao = limpar(bruto.explicacao, 3000);
  const frente = limpar(cartaoBruto.frente, 500);
  const verso = limpar(cartaoBruto.verso, 1000);
  if (!explicacao) return erro("A IA não devolveu uma explicação. Tente de novo.", 502);

  await supabase.from("erros").update({ explicacao }).eq("id", id);

  return NextResponse.json({ explicacao, cartao: frente && verso ? { frente, verso } : null });
}
