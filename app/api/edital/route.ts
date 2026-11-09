import { NextResponse } from "next/server";
import { ESQUEMA_RESPOSTA, PROMPT_EDITAL, normalizarEdital } from "@/lib/edital-ia";
import { extrairJsonDoPdf, lerPdf } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

// Recebe o PDF do edital, pede ao Gemini para extrair os dados e devolve uma
// prévia. Nada é salvo aqui: quem confirma é a pessoa, na tela de revisão.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return erro("Faça login para importar o edital.", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return erro("Não consegui ler o arquivo enviado. Tente novamente.", 400);
  }

  const pdf = await lerPdf(form);
  if (!pdf.ok) return erro(pdf.erro, pdf.status);

  const resultado = await extrairJsonDoPdf(pdf.bytes, PROMPT_EDITAL, ESQUEMA_RESPOSTA);
  if (!resultado.ok) return erro(resultado.erro, resultado.status);

  const edital = normalizarEdital(resultado.dados);
  if (edital.materias.length === 0) {
    return erro("Não encontrei matérias nesse PDF. Confira se ele contém o conteúdo programático.", 422);
  }

  return NextResponse.json({ edital });
}
