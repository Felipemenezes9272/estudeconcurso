import { NextResponse } from "next/server";
import { gerarJsonDeTexto } from "@/lib/gemini";
import { normalizarCartoes } from "@/lib/flashcards-ia";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 150;

const ESQUEMA = {
  type: "OBJECT",
  properties: {
    cartoes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { frente: { type: "STRING" }, verso: { type: "STRING" } },
        required: ["frente", "verso"],
      },
    },
  },
  required: ["cartoes"],
} as const;

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

// Monta cartões de revisão a partir de um conteúdo salvo. Nada é salvo aqui: a pessoa escolhe na tela.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return erro("Faça login para gerar os cartões.", 401);

  let corpo: { conteudo_id?: unknown; quantidade?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return erro("Pedido inválido.", 400);
  }
  const id = typeof corpo.conteudo_id === "string" ? corpo.conteudo_id : "";
  const quantidade = Math.min(20, Math.max(3, Math.round(Number(corpo.quantidade)) || 10));
  if (!id) return erro("Escolha um conteúdo.", 400);

  const { data } = await supabase
    .from("conteudos_estudo")
    .select("titulo, texto")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  const c = data as { titulo: string; texto: string } | null;
  if (!c) return erro("Conteúdo não encontrado.", 404);

  const prompt = `Você cria flashcards de revisão para estudantes de concursos públicos brasileiros, a partir do material abaixo.

Crie ${quantidade} cartões. Regras:
- Cada cartão testa uma única ideia: frente = pergunta curta e objetiva; verso = resposta direta (no máximo 3 frases).
- Priorize o que mais cai em prova, definições, requisitos, exceções e pegadinhas.
- Use somente informações presentes no material; não invente artigos de lei, números ou súmulas.
- Não repita cartões. Escreva em português.

Material (${c.titulo}):
"""
${c.texto.slice(0, 20000)}
"""`;

  const resultado = await gerarJsonDeTexto(prompt, ESQUEMA);
  if (!resultado.ok) return erro(resultado.erro, resultado.status);

  const cartoes = normalizarCartoes(resultado.dados, quantidade);
  if (cartoes.length === 0) return erro("A IA não devolveu cartões aproveitáveis. Tente de novo.", 502);
  return NextResponse.json({ cartoes });
}
