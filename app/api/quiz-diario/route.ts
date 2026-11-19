import { NextResponse } from "next/server";
import { gerarJsonDeTexto } from "@/lib/gemini";
import { carregarEntradasPrioridade } from "@/lib/consultas";
import { hoje, somarDias } from "@/lib/datas";
import { tituloDoQuiz } from "@/lib/quiz";
import { ESQUEMA_SIMULADO, normalizarSimulado } from "@/lib/simulados";
import { ranquear } from "@/lib/prioridades";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 150;

const QUESTOES = 5;

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

// Gera 5 questões misturando os tópicos estudados nos últimos dias (ou os mais urgentes) e salva como simulado.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return erro("Faça login para continuar.", 401);

  const dia = hoje();
  const titulo = tituloDoQuiz(dia);

  // Um quiz por dia: se já existe, devolve o mesmo (poupa a cota gratuita da IA).
  const { data: existente } = await supabase
    .from("simulados")
    .select("id")
    .eq("titulo", titulo)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (existente) return NextResponse.json({ id: (existente as { id: string }).id, repetido: true });

  const [sessoes, entradas] = await Promise.all([
    supabase
      .from("sessoes_estudo")
      .select("topico_id, data")
      .is("deleted_at", null)
      .gte("data", somarDias(dia, -14))
      .order("data", { ascending: false })
      .limit(200),
    carregarEntradasPrioridade(supabase),
  ]);

  const porId = new Map(entradas.map((t) => [t.id, t]));
  const escolhidos: string[] = [];
  for (const s of (sessoes.data ?? []) as { topico_id: string }[]) {
    if (porId.has(s.topico_id) && !escolhidos.includes(s.topico_id)) escolhidos.push(s.topico_id);
    if (escolhidos.length >= QUESTOES) break;
  }
  // Completa com os tópicos mais urgentes quando houve pouco estudo recente.
  for (const r of ranquear(entradas, QUESTOES)) {
    if (escolhidos.length >= QUESTOES) break;
    if (!escolhidos.includes(r.id)) escolhidos.push(r.id);
  }
  if (escolhidos.length === 0) {
    return erro("Cadastre tópicos no edital para montar o quiz do dia.", 422);
  }

  const lista = escolhidos
    .map((id, i) => `${i + 1}. ${porId.get(id)!.materia} › ${porId.get(id)!.nome}`)
    .join("\n");

  const prompt = `Você é elaborador de questões de concursos públicos brasileiros. Monte um quiz de aquecimento de ${QUESTOES} questões para o aluno começar o dia de estudos, misturando os tópicos abaixo (uma questão por tópico, em ordem; se houver menos tópicos que questões, repita tópicos com enfoques diferentes):

${lista}

Regras:
- titulo: "${titulo}".
- questoes: exatamente ${QUESTOES}. Cada questão tem EXATAMENTE 5 alternativas (sem letras ou numeração no começo), uma única correta e quatro erradas plausíveis. "correta" é o índice (0 a 4) e deve variar entre as questões.
- Nível médio, no estilo de prova de concurso. Questões compreensíveis sozinhas.
- Use somente conhecimento consolidado; não invente artigos de lei, súmulas ou números. Na dúvida, pergunte sobre o conceito.
- explicacao: 1 a 3 frases dizendo por que a correta está certa e, se útil, o erro das demais. Comece a explicação com o nome do tópico entre colchetes, como [Concordância verbal].
- Escreva em português do Brasil.`;

  const resultado = await gerarJsonDeTexto(prompt, ESQUEMA_SIMULADO);
  if (!resultado.ok) return erro(resultado.erro, resultado.status);

  const gerado = normalizarSimulado(resultado.dados, "multipla", QUESTOES);
  if (gerado.questoes.length === 0) return erro("A IA não devolveu questões válidas. Tente de novo.", 502);

  const { data: simulado, error: erroSimulado } = await supabase
    .from("simulados")
    .insert({ titulo, tipo: "multipla", total: gerado.questoes.length })
    .select("id")
    .single();
  if (erroSimulado || !simulado) return erro(erroSimulado?.message ?? "Não consegui salvar o quiz.", 500);

  const { error: erroQuestoes } = await supabase.from("simulado_questoes").insert(
    gerado.questoes.map((q, i) => ({
      simulado_id: simulado.id,
      ordem: i,
      enunciado: q.enunciado,
      alternativas: q.alternativas,
      correta: q.correta,
      explicacao: q.explicacao || null,
    })),
  );
  if (erroQuestoes) {
    await supabase.from("simulados").delete().eq("id", simulado.id);
    return erro(erroQuestoes.message, 500);
  }

  return NextResponse.json({ id: simulado.id });
}
