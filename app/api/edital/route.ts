import { NextResponse } from "next/server";
import {
  ESQUEMA_RESPOSTA,
  LIMITE_PDF_BYTES,
  PROMPT_EDITAL,
  normalizarEdital,
} from "@/lib/edital-ia";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const chave = process.env.GEMINI_API_KEY;
  if (!chave) {
    return erro(
      "A chave do Gemini ainda não foi configurada. Cadastre GEMINI_API_KEY nas variáveis de ambiente da Vercel.",
      503,
    );
  }

  let arquivo: File | null = null;
  try {
    const form = await request.formData();
    const campo = form.get("pdf");
    arquivo = campo instanceof File ? campo : null;
  } catch {
    return erro("Não consegui ler o arquivo enviado. Tente novamente.", 400);
  }

  if (!arquivo || arquivo.size === 0) return erro("Escolha um arquivo PDF.", 400);
  if (arquivo.size > LIMITE_PDF_BYTES) {
    return erro(
      "O PDF passa de 4 MB. Envie só as páginas do conteúdo programático (ou comprima o arquivo) e tente de novo.",
      413,
    );
  }

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  if (bytes.subarray(0, 4).toString("latin1") !== "%PDF") {
    return erro("Esse arquivo não parece ser um PDF.", 400);
  }

  const modelo = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  let resposta: Response;
  try {
    resposta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: "application/pdf", data: bytes.toString("base64") } },
                { text: PROMPT_EDITAL },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 32768,
            responseMimeType: "application/json",
            responseSchema: ESQUEMA_RESPOSTA,
          },
        }),
        signal: AbortSignal.timeout(55_000),
      },
    );
  } catch {
    return erro("O Gemini demorou demais ou não respondeu. Tente de novo em instantes.", 504);
  }

  if (!resposta.ok) {
    if (resposta.status === 429) {
      return erro("Limite gratuito do Gemini atingido por agora. Aguarde um pouco e tente de novo.", 429);
    }
    if (resposta.status === 400 || resposta.status === 403) {
      return erro("O Gemini recusou o pedido. Confira se a GEMINI_API_KEY está correta e ativa.", 502);
    }
    return erro(`O Gemini devolveu um erro (${resposta.status}). Tente novamente.`, 502);
  }

  let texto = "";
  try {
    const json = (await resposta.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    texto = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  } catch {
    return erro("Resposta inesperada do Gemini. Tente novamente.", 502);
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return erro(
      "A IA não conseguiu montar a lista completa (o edital pode ser muito grande). Envie só as páginas do conteúdo programático.",
      502,
    );
  }

  const edital = normalizarEdital(bruto);
  if (edital.materias.length === 0) {
    return erro("Não encontrei matérias nesse PDF. Confira se ele contém o conteúdo programático.", 422);
  }

  return NextResponse.json({ edital });
}
