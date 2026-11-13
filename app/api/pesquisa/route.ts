import { NextResponse } from "next/server";
import { pesquisarNaWeb } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

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

  let corpo: { topico_id?: unknown; foco?: unknown; semWeb?: unknown; modo?: unknown; nivel?: unknown; duracao?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return erro("Pedido inválido.", 400);
  }
  const topicoId = typeof corpo.topico_id === "string" ? corpo.topico_id : "";
  const foco = typeof corpo.foco === "string" ? corpo.foco.trim().slice(0, 200) : "";
  if (!topicoId) return erro("Escolha um tópico.", 400);
  const aula = corpo.modo === "aula";
  const nivel = ["basico", "intermediario", "avancado"].includes(String(corpo.nivel)) ? String(corpo.nivel) : "intermediario";
  const duracao = [30, 60, 90].includes(Number(corpo.duracao)) ? Number(corpo.duracao) : 60;
  const rotuloNivel = { basico: "básico (quem está começando)", intermediario: "intermediário", avancado: "avançado (revisão aprofundada)" }[nivel as "basico"];

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

  const promptAula = `Você é um professor de cursinho para concursos públicos brasileiros. Pesquise na web e MONTE UMA AULA completa, pronta para estudar, sobre o tópico abaixo.

${contexto}
Nível: ${rotuloNivel}
Duração prevista: ${duracao} minutos de estudo

Regras:
- Escreva em português, em markdown. Tamanho proporcional à duração: cerca de ${duracao === 30 ? "700" : duracao === 60 ? "1300" : "1900"} palavras.
- Estrutura, com títulos "##": "Objetivos da aula" (3 a 5 itens), "Aquecimento" (2 frases que contextualizam o assunto), "Desenvolvimento" (de 3 a ${duracao === 30 ? "4" : "6"} subtópicos em ordem lógica, cada um com "###", explicação clara e um exemplo), "Quadro-resumo" (lista com o essencial), "Como cai em prova" (pontos cobrados e pegadinhas), "Exercícios" (${duracao === 30 ? "4" : "6"} questões, mistas de certo/errado e múltipla escolha, com "Gabarito comentado" logo depois de todas) e "Roteiro de estudo" (divisão do tempo da aula em etapas, somando ${duracao} minutos).
- Quando houver lei, cite número da lei e dos artigos somente se tiver confirmado na pesquisa; nunca invente artigo, súmula ou jurisprudência.
- Se a banca for conhecida, adapte o estilo dos exercícios a ela, apenas se encontrar base para isso.
- Não faça introdução sobre o pedido; vá direto à aula.`;

  const prompt = `Você é um professor de cursinho para concursos públicos brasileiros. Pesquise na web e monte um material de estudo confiável sobre o tópico abaixo.

${contexto}

Regras:
- Escreva em português, em markdown, com no máximo 900 palavras.
- Use esta estrutura, com títulos "##": "Resumo", "O que mais cai em prova", "Pegadinhas e erros comuns", "Para fixar" (3 perguntas curtas com a resposta logo abaixo).
- Quando houver lei, cite o número da lei e dos artigos somente se tiver confirmado na pesquisa; nunca invente artigo, súmula ou jurisprudência.
- Se a banca for conhecida, destaque como ela costuma cobrar o assunto, apenas se encontrar base para isso.
- Não repita o enunciado do pedido nem faça introdução; vá direto ao conteúdo.`;

  const semWeb = corpo.semWeb === true;
  const resultado = await pesquisarNaWeb(aula ? promptAula : prompt, aula ? 16384 : 8192, !semWeb);
  if (!resultado.ok) {
    // Cota estourada: avisa a tela, que pode oferecer gerar sem a pesquisa na web.
    return NextResponse.json(
      { erro: resultado.erro, podeSemWeb: resultado.status === 429 && !semWeb },
      { status: resultado.status },
    );
  }

  return NextResponse.json({
    titulo: aula ? `Aula: ${t.nome}` : t.nome,
    texto: resultado.texto,
    fontes: resultado.fontes,
    semWeb,
  });
}
