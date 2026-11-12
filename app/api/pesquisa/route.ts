import { NextResponse } from "next/server";
import { pesquisarNaWeb } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

// Pesquisa o tópico na web com a IA e devolve uma prévia. Nada é salvo aqui.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return erro("Faça login para pesquisar.", 401);

  let corpo: { topico_id?: unknown; foco?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return erro("Pedido inválido.", 400);
  }
  const topicoId = typeof corpo.topico_id === "string" ? corpo.topico_id : "";
  const foco = typeof corpo.foco === "string" ? corpo.foco.trim().slice(0, 200) : "";
  if (!topicoId) return erro("Escolha um tópico.", 400);

  const { data } = await supabase
    .from("topicos")
    .select("nome, materias(nome, concursos(nome, banca, cargo))")
    .eq("id", topicoId)
    .is("deleted_at", null)
    .maybeSingle();
  const t = data as unknown as {
    nome: string;
    materias: { nome: string; concursos: { nome: string; banca: string | null; cargo: string | null } | null } | null;
  } | null;
  if (!t) return erro("Tópico não encontrado.", 404);

  const concurso = t.materias?.concursos;
  const contexto = [
    `Matéria: ${t.materias?.nome ?? "—"}`,
    `Tópico: ${t.nome}`,
    concurso?.nome && `Concurso: ${concurso.nome}`,
    concurso?.banca && `Banca: ${concurso.banca}`,
    concurso?.cargo && `Cargo: ${concurso.cargo}`,
    foco && `Foco pedido pelo aluno: ${foco}`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `Você é um professor de cursinho para concursos públicos brasileiros. Pesquise na web e monte um material de estudo confiável sobre o tópico abaixo.

${contexto}

Regras:
- Escreva em português, em markdown, com no máximo 900 palavras.
- Use esta estrutura, com títulos "##": "Resumo", "O que mais cai em prova", "Pegadinhas e erros comuns", "Para fixar" (3 perguntas curtas com a resposta logo abaixo).
- Quando houver lei, cite o número da lei e dos artigos somente se tiver confirmado na pesquisa; nunca invente artigo, súmula ou jurisprudência.
- Se a banca for conhecida, destaque como ela costuma cobrar o assunto, apenas se encontrar base para isso.
- Não repita o enunciado do pedido nem faça introdução; vá direto ao conteúdo.`;

  const resultado = await pesquisarNaWeb(prompt);
  if (!resultado.ok) return erro(resultado.erro, resultado.status);

  return NextResponse.json({
    titulo: t.nome,
    texto: resultado.texto,
    fontes: resultado.fontes,
  });
}
