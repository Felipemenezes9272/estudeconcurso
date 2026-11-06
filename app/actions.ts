"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hoje, somarDias } from "@/lib/datas";
import { normalizarEdital } from "@/lib/edital-ia";
import { agendar, type Nota } from "@/lib/flashcards";
import {
  INTERVALO_REVISAO_DIFICIL,
  calcularRevisoes,
  type ResultadoRevisao,
} from "@/lib/revisoes";

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

function inteiro(formData: FormData, campo: string): number {
  return Number.parseInt(texto(formData, campo), 10);
}

function falhar(mensagem: string): never {
  throw new Error(mensagem);
}

// ---------- Edital ----------

export async function criarConcurso(formData: FormData) {
  const nome = texto(formData, "nome");
  if (!nome) falhar("Informe o nome do concurso.");

  const supabase = await createClient();
  const { error } = await supabase.from("concursos").insert({
    nome,
    banca: texto(formData, "banca") || null,
    cargo: texto(formData, "cargo") || null,
    data_prova: texto(formData, "data_prova") || null,
  });
  if (error) falhar(error.message);

  revalidatePath("/edital");
}

/** Salva o edital revisado na tela de importação: concurso, matérias e tópicos. */
export async function importarEdital(formData: FormData) {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto(formData, "dados"));
  } catch {
    falhar("Dados do edital inválidos.");
  }
  const edital = normalizarEdital(bruto);
  if (!edital.nome) falhar("Informe o nome do concurso.");
  if (edital.materias.length === 0) falhar("Inclua ao menos uma matéria.");

  const supabase = await createClient();

  const { data: concurso, error: erroConcurso } = await supabase
    .from("concursos")
    .insert({
      nome: edital.nome,
      banca: edital.banca || null,
      cargo: edital.cargo || null,
      data_prova: edital.data_prova || null,
    })
    .select("id")
    .single();
  if (erroConcurso || !concurso) falhar(erroConcurso?.message ?? "Não consegui criar o concurso.");

  for (const materia of edital.materias) {
    const { data: criada, error: erroMateria } = await supabase
      .from("materias")
      .insert({ concurso_id: concurso.id, nome: materia.nome, peso: materia.peso, dificuldade: 3 })
      .select("id")
      .single();

    let mensagem = erroMateria?.message ?? (criada ? "" : "Não consegui criar a matéria.");
    if (!mensagem && materia.topicos.length > 0) {
      const { error: erroTopicos } = await supabase
        .from("topicos")
        .insert(materia.topicos.map((nome, i) => ({ materia_id: criada!.id, nome, ordem: i })));
      mensagem = erroTopicos?.message ?? "";
    }

    if (mensagem) {
      // Desfaz: esconde o concurso incompleto (exclusão lógica) para não ficar lixo na tela.
      await supabase
        .from("concursos")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", concurso.id);
      falhar(mensagem);
    }
  }

  revalidatePath("/edital");
  redirect("/edital");
}

export async function criarMateria(formData: FormData) {
  const nome = texto(formData, "nome");
  if (!nome) falhar("Informe o nome da matéria.");

  const peso = inteiro(formData, "peso");
  const dificuldade = inteiro(formData, "dificuldade");

  const supabase = await createClient();
  const { error } = await supabase.from("materias").insert({
    concurso_id: texto(formData, "concurso_id"),
    nome,
    peso: Number.isNaN(peso) ? 1 : peso,
    dificuldade: Number.isNaN(dificuldade) ? 3 : dificuldade,
  });
  if (error) falhar(error.message);

  revalidatePath("/edital");
}

/** Cria vários tópicos de uma vez: um por linha do campo de texto. */
export async function criarTopicos(formData: FormData) {
  const materiaId = texto(formData, "materia_id");
  const nomes = texto(formData, "nomes")
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);
  if (nomes.length === 0) falhar("Informe ao menos um tópico.");

  const supabase = await createClient();

  const { count } = await supabase
    .from("topicos")
    .select("id", { count: "exact", head: true })
    .eq("materia_id", materiaId);
  const inicio = count ?? 0;

  const { error } = await supabase
    .from("topicos")
    .insert(nomes.map((nome, i) => ({ materia_id: materiaId, nome, ordem: inicio + i })));
  if (error) falhar(error.message);

  revalidatePath("/edital");
}

export async function alterarStatusTopico(formData: FormData) {
  const topicoId = texto(formData, "topico_id");
  const status = texto(formData, "status");
  if (!["nao_iniciado", "estudando", "concluido"].includes(status)) {
    falhar("Status inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("topicos").update({ status }).eq("id", topicoId);
  if (error) falhar(error.message);

  // Ao concluir pela primeira vez, agenda as revisões (1, 7, 30 e 60 dias).
  if (status === "concluido") {
    const { count } = await supabase
      .from("revisoes")
      .select("id", { count: "exact", head: true })
      .eq("topico_id", topicoId)
      .is("deleted_at", null);

    if ((count ?? 0) === 0) {
      const { error: erroRevisoes } = await supabase
        .from("revisoes")
        .insert(calcularRevisoes(hoje()).map((r) => ({ topico_id: topicoId, ...r })));
      if (erroRevisoes) falhar(erroRevisoes.message);
    }
  }

  revalidatePath("/", "layout");
}

// ---------- Registros ----------

export async function registrarSessao(formData: FormData) {
  const topicoId = texto(formData, "topico_id");
  const minutos = inteiro(formData, "minutos");
  const tipo = texto(formData, "tipo");

  if (!topicoId) falhar("Escolha um tópico.");
  if (!(minutos > 0)) falhar("Informe o tempo estudado em minutos.");
  if (!["teoria", "questoes", "revisao"].includes(tipo)) falhar("Tipo inválido.");

  const supabase = await createClient();
  const { error } = await supabase.from("sessoes_estudo").insert({
    topico_id: topicoId,
    minutos,
    tipo,
    data: texto(formData, "data") || hoje(),
  });
  if (error) falhar(error.message);

  // Estudar um tópico novo o coloca "em andamento" no edital.
  await supabase
    .from("topicos")
    .update({ status: "estudando" })
    .eq("id", topicoId)
    .eq("status", "nao_iniciado");

  revalidatePath("/", "layout");
  redirect("/estudo?ok=1");
}

export async function registrarQuestoes(formData: FormData) {
  const topicoId = texto(formData, "topico_id");
  const total = inteiro(formData, "total");
  const acertos = inteiro(formData, "acertos");

  if (!topicoId) falhar("Escolha um tópico.");
  if (!(total > 0)) falhar("Informe quantas questões você fez.");
  if (!(acertos >= 0) || acertos > total) falhar("Acertos devem estar entre 0 e o total.");

  const supabase = await createClient();
  const { error } = await supabase.from("registros_questoes").insert({
    topico_id: topicoId,
    total,
    acertos,
    data: texto(formData, "data") || hoje(),
  });
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
  redirect("/questoes?ok=1");
}

// ---------- Revisões ----------

export async function concluirRevisao(formData: FormData) {
  const revisaoId = texto(formData, "revisao_id");
  const resultado = texto(formData, "resultado") as ResultadoRevisao;
  if (!["facil", "medio", "dificil"].includes(resultado)) falhar("Resultado inválido.");

  const supabase = await createClient();
  const dataFeita = hoje();

  const { data: revisao, error } = await supabase
    .from("revisoes")
    .update({ data_feita: dataFeita, resultado })
    .eq("id", revisaoId)
    .is("data_feita", null)
    .select("topico_id")
    .maybeSingle();
  if (error) falhar(error.message);

  // Revisão difícil: o tópico volta para a fila em 3 dias.
  if (revisao && resultado === "dificil") {
    const { error: erroExtra } = await supabase.from("revisoes").insert({
      topico_id: revisao.topico_id,
      intervalo_dias: INTERVALO_REVISAO_DIFICIL,
      data_prevista: somarDias(dataFeita, INTERVALO_REVISAO_DIFICIL),
    });
    if (erroExtra) falhar(erroExtra.message);
  }

  revalidatePath("/", "layout");
}

// ---------- Sessão ----------

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------- Caderno de erros ----------

export async function registrarErro(formData: FormData) {
  const topicoId = texto(formData, "topico_id");
  const enunciado = texto(formData, "enunciado");
  const motivo = texto(formData, "motivo");

  if (!topicoId) falhar("Escolha um tópico.");
  if (!enunciado) falhar("Descreva ou identifique a questão.");
  if (!["desatencao", "lacuna", "pegadinha"].includes(motivo)) falhar("Motivo inválido.");

  const supabase = await createClient();
  const { error } = await supabase.from("erros").insert({
    topico_id: topicoId,
    enunciado,
    motivo,
    anotacao: texto(formData, "anotacao") || null,
    data: texto(formData, "data") || hoje(),
  });
  if (error) falhar(error.message);

  revalidatePath("/erros");
  redirect("/erros?ok=1");
}

export async function alterarStatusErro(formData: FormData) {
  const erroId = texto(formData, "erro_id");
  const status = texto(formData, "status");
  if (!["pendente", "dominado"].includes(status)) falhar("Status inválido.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("erros")
    .update({ status, ultima_revisao: status === "dominado" ? hoje() : null })
    .eq("id", erroId);
  if (error) falhar(error.message);

  revalidatePath("/erros");
}

// ---------- Flashcards ----------

export async function criarFlashcard(formData: FormData) {
  const topicoId = texto(formData, "topico_id");
  const frente = texto(formData, "frente");
  const verso = texto(formData, "verso");

  if (!topicoId) falhar("Escolha um tópico.");
  if (!frente || !verso) falhar("Preencha a pergunta e a resposta.");

  const supabase = await createClient();
  const { error } = await supabase.from("flashcards").insert({ topico_id: topicoId, frente, verso });
  if (error) falhar(error.message);

  revalidatePath("/flashcards");
  redirect(`/flashcards?ok=1&topico=${encodeURIComponent(topicoId)}`);
}

export async function avaliarFlashcard(formData: FormData) {
  const id = texto(formData, "flashcard_id");
  const nota = texto(formData, "nota") as Nota;
  if (!["errei", "dificil", "bom", "facil"].includes(nota)) falhar("Nota inválida.");

  const supabase = await createClient();
  const { data: cartao, error: erroLeitura } = await supabase
    .from("flashcards")
    .select("intervalo_dias, repeticoes, facilidade")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (erroLeitura) falhar(erroLeitura.message);
  if (!cartao) return; // cartão removido em outra aba

  const novo = agendar(
    {
      intervalo_dias: cartao.intervalo_dias,
      repeticoes: cartao.repeticoes,
      facilidade: Number(cartao.facilidade),
    },
    nota,
    hoje(),
  );

  const { error } = await supabase.from("flashcards").update(novo).eq("id", id);
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

export async function excluirFlashcard(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("flashcards")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", texto(formData, "flashcard_id"));
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

// ---------- Prioridades ----------

export async function definirIncidencia(formData: FormData) {
  const topicoId = texto(formData, "topico_id");
  const incidencia = inteiro(formData, "incidencia");
  if (!topicoId) falhar("Tópico inválido.");
  if (!(incidencia >= 1 && incidencia <= 5)) falhar("A incidência vai de 1 a 5.");

  const supabase = await createClient();
  const { error } = await supabase.from("topicos").update({ incidencia }).eq("id", topicoId);
  if (error) falhar(error.message);

  revalidatePath("/prioridades");
}
