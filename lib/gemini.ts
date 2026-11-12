// Chamada ao Gemini compartilhada pelas funções que leem PDF (edital e simulados).
// Só roda no servidor: usa a GEMINI_API_KEY.

export const LIMITE_PDF_BYTES = 4 * 1024 * 1024; // o corpo de uma função na Vercel aceita ~4,5 MB

export type Falha = { ok: false; erro: string; status: number };

const falha = (erro: string, status: number): Falha => ({ ok: false, erro, status });

/** Lê e valida o PDF enviado no formulário (campo "pdf"). */
export async function lerPdf(
  form: FormData,
): Promise<{ ok: true; bytes: Buffer } | Falha> {
  const campo = form.get("pdf");
  const arquivo = campo instanceof File ? campo : null;

  if (!arquivo || arquivo.size === 0) return falha("Escolha um arquivo PDF.", 400);
  if (arquivo.size > LIMITE_PDF_BYTES) {
    return falha(
      "O PDF passa de 4 MB. Envie só as páginas que interessam (ou comprima o arquivo) e tente de novo.",
      413,
    );
  }

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  if (bytes.subarray(0, 4).toString("latin1") !== "%PDF") {
    return falha("Esse arquivo não parece ser um PDF.", 400);
  }
  return { ok: true, bytes };
}

/** Envia o PDF + instruções ao Gemini e devolve o JSON da resposta (ainda sem validar). */
export async function extrairJsonDoPdf(
  bytes: Buffer,
  prompt: string,
  esquema: object,
): Promise<{ ok: true; dados: unknown } | Falha> {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) {
    return falha(
      "A chave do Gemini ainda não foi configurada. Cadastre GEMINI_API_KEY nas variáveis de ambiente da Vercel.",
      503,
    );
  }

  // Modelos em ordem de preferência. Se um não existir para esta chave (404), tenta o próximo.
  const modelos = [
    process.env.GEMINI_MODEL,
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
  ].filter((m, i, lista): m is string => Boolean(m) && lista.indexOf(m) === i);

  // Os modelos 3.x "pensam" por padrão (nível médio), o que estoura o tempo da função.
  // Pedimos pensamento baixo; se a API não aceitar o campo (400), repetimos sem ele.
  const montarCorpo = (comPensamento: boolean) =>
    JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: "application/pdf", data: bytes.toString("base64") } },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 32768,
        responseMimeType: "application/json",
        responseSchema: esquema,
        ...(comPensamento ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
      },
    });

  const prazo = Date.now() + 280_000; // a função da Vercel (maxDuration 300) é encerrada aos 300 s
  const chamar = (modelo: string, comPensamento: boolean) =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
        body: montarCorpo(comPensamento),
        signal: AbortSignal.timeout(Math.max(1_000, prazo - Date.now())),
      },
    );

  // 404 = modelo inexistente para esta chave; 429 = limite gratuito (que vale por modelo); 500/503 = sobrecarga.
  // Nos dois casos passamos para o próximo modelo e, se todos falharem, repetimos uma vez.
  const tentarOutro = (status: number) => [404, 429, 500, 503].includes(status);

  let resposta: Response | null = null;
  try {
    rodadas: for (let rodada = 0; rodada < 2; rodada++) {
      for (const modelo of modelos) {
        resposta = await chamar(modelo, true);
        if (resposta.status === 400) resposta = await chamar(modelo, false);
        if (!tentarOutro(resposta.status)) break rodadas;
      }
      if (prazo - Date.now() < 60_000) break;
      await new Promise((r) => setTimeout(r, 2_000));
    }
  } catch {
    return falha(
      "O Gemini demorou demais (mais de 4 minutos). Tente com um PDF menor (só as páginas do conteúdo programático) ou, nos simulados, com menos questões.",
      504,
    );
  }

  if (!resposta) return falha("Nenhum modelo do Gemini foi configurado.", 500);
  if (resposta.status === 500 || resposta.status === 503) {
    return falha(
      "O Gemini está sobrecarregado neste momento (erro do lado do Google). Aguarde alguns minutos e tente de novo.",
      503,
    );
  }
  if (resposta.status === 404) {
    return falha(
      "Nenhum dos modelos do Gemini está disponível para esta chave. Defina GEMINI_MODEL na Vercel com um modelo atual (veja ai.google.dev/gemini-api/docs/models).",
      502,
    );
  }

  if (!resposta.ok) {
    if (resposta.status === 429) {
      return falha("Limite gratuito do Gemini atingido por agora. Aguarde um pouco e tente de novo.", 429);
    }
    if (resposta.status === 400 || resposta.status === 403) {
      return falha("O Gemini recusou o pedido. Confira se a GEMINI_API_KEY está correta e ativa.", 502);
    }
    return falha(`O Gemini devolveu um erro (${resposta.status}). Tente novamente.`, 502);
  }

  let texto = "";
  try {
    const json = (await resposta.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    texto = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  } catch {
    return falha("Resposta inesperada do Gemini. Tente novamente.", 502);
  }

  try {
    return { ok: true, dados: JSON.parse(texto) };
  } catch {
    return falha(
      "A IA não conseguiu montar a resposta completa (o PDF pode ser muito grande). Envie menos páginas.",
      502,
    );
  }
}

export type Fonte = { titulo: string; url: string };

/**
 * Pede ao Gemini um texto de estudo usando a Pesquisa Google (grounding).
 * Devolve o texto em markdown e as páginas consultadas.
 */
export async function pesquisarNaWeb(
  prompt: string,
  maxTokens = 8192,
): Promise<{ ok: true; texto: string; fontes: Fonte[] } | Falha> {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) {
    return falha(
      "A chave do Gemini ainda não foi configurada. Cadastre GEMINI_API_KEY nas variáveis de ambiente da Vercel.",
      503,
    );
  }

  const modelos = [
    process.env.GEMINI_MODEL,
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
  ].filter((m, i, lista): m is string => Boolean(m) && lista.indexOf(m) === i);

  const prazo = Date.now() + 240_000;
  const chamar = (modelo: string, comPensamento: boolean) =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            ...(comPensamento ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
          },
        }),
        signal: AbortSignal.timeout(Math.max(1_000, prazo - Date.now())),
      },
    );

  let resposta: Response | null = null;
  try {
    for (const modelo of modelos) {
      resposta = await chamar(modelo, true);
      if (resposta.status === 400) resposta = await chamar(modelo, false);
      if (![404, 429, 500, 503].includes(resposta.status)) break;
    }
  } catch {
    return falha("A pesquisa demorou demais. Tente de novo em instantes.", 504);
  }

  if (!resposta) return falha("Nenhum modelo do Gemini foi configurado.", 500);
  if (!resposta.ok) {
    if (resposta.status === 429) {
      return falha("Limite gratuito do Gemini atingido por agora. Aguarde um pouco e tente de novo.", 429);
    }
    if (resposta.status === 500 || resposta.status === 503) {
      return falha("O Gemini está sobrecarregado neste momento. Aguarde alguns minutos e tente de novo.", 503);
    }
    if (resposta.status === 404) {
      return falha("Nenhum dos modelos do Gemini está disponível para esta chave. Defina GEMINI_MODEL na Vercel.", 502);
    }
    return falha(`O Gemini devolveu um erro (${resposta.status}). Tente novamente.`, 502);
  }

  try {
    const json = (await resposta.json()) as {
      candidates?: {
        content?: { parts?: { text?: string }[] }
        groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
      }[];
    };
    const candidato = json.candidates?.[0];
    const texto = (candidato?.content?.parts?.map((p) => p.text ?? "").join("") ?? "").trim();
    if (!texto) return falha("A IA não devolveu conteúdo. Tente de novo.", 502);

    const vistas = new Set<string>();
    const fontes: Fonte[] = [];
    for (const c of candidato?.groundingMetadata?.groundingChunks ?? []) {
      const url = c.web?.uri ?? "";
      if (!/^https?:\/\//.test(url) || vistas.has(url)) continue;
      vistas.add(url);
      fontes.push({ titulo: (c.web?.title ?? url).slice(0, 150), url });
      if (fontes.length >= 8) break;
    }
    return { ok: true, texto, fontes };
  } catch {
    return falha("Resposta inesperada do Gemini. Tente novamente.", 502);
  }
}
