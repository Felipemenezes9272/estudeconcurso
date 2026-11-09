import { NextResponse } from "next/server";
import { extrairJsonDoPdf, lerPdf } from "@/lib/gemini";
import {
  ESQUEMA_SIMULADO,
  limitarQuantidade,
  montarPrompt,
  normalizarSimulado,
  type Dificuldade,
  type TipoSimulado,
} from "@/lib/simulados";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

// Recebe um PDF (apostila, resumo, lei...), pede ao Gemini as questões e salva o simulado.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return erro("Faça login para gerar simulados.", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return erro("Não consegui ler o arquivo enviado. Tente novamente.", 400);
  }

  const tipo: TipoSimulado = form.get("tipo") === "certo_errado" ? "certo_errado" : "multipla";
  const dificuldadeForm = String(form.get("dificuldade") ?? "");
  const dificuldade: Dificuldade = (["facil", "medio", "dificil"] as const).includes(
    dificuldadeForm as Dificuldade,
  )
    ? (dificuldadeForm as Dificuldade)
    : "medio";
  const quantidade = limitarQuantidade(form.get("quantidade"));
  const tituloInformado = String(form.get("titulo") ?? "").trim().slice(0, 150);
  const topicoId = String(form.get("topico_id") ?? "").trim();

  const pdf = await lerPdf(form);
  if (!pdf.ok) return erro(pdf.erro, pdf.status);

  const resultado = await extrairJsonDoPdf(
    pdf.bytes,
    montarPrompt(tipo, quantidade, dificuldade),
    ESQUEMA_SIMULADO,
  );
  if (!resultado.ok) return erro(resultado.erro, resultado.status);

  const gerado = normalizarSimulado(resultado.dados, tipo, quantidade);
  if (gerado.questoes.length === 0) {
    return erro(
      "Não consegui gerar questões válidas com esse PDF. Confira se ele tem texto (PDF escaneado como imagem pode falhar) e tente de novo.",
      422,
    );
  }

  const { data: simulado, error: erroSimulado } = await supabase
    .from("simulados")
    .insert({
      titulo: tituloInformado || gerado.titulo || "Simulado",
      topico_id: topicoId || null,
      tipo,
      total: gerado.questoes.length,
    })
    .select("id")
    .single();
  if (erroSimulado || !simulado) {
    return erro(erroSimulado?.message ?? "Não consegui salvar o simulado.", 500);
  }

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

  return NextResponse.json({ id: simulado.id, total: gerado.questoes.length });
}
