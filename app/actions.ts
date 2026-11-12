"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hoje, somarDias } from "@/lib/datas";
import { normalizarEdital } from "@/lib/edital-ia";
import { tipoValido } from "@/lib/calendario";
import { contarAcertos } from "@/lib/simulados";
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

  // Datas importantes do edital vão para o calendário. A data da prova também entra,
  // se a IA não a tiver listado entre as datas.
  const datas = [...edital.datas];
  if (edital.data_prova && !datas.some((d) => d.tipo === "prova" && d.data === edital.data_prova)) {
    datas.push({ titulo: "Prova objetiva", data: edital.data_prova, tipo: "prova" });
  }
  if (datas.length > 0) {
    const { error: erroEventos } = await supabase.from("eventos").insert(
      datas.map((d) => ({
        concurso_id: concurso.id,
        titulo: d.titulo,
        data: d.data,
        tipo: d.tipo,
        origem: "edital",
      })),
    );
    // Falha aqui (ex.: SQL do calendário não rodado) não derruba a importação: o edital já está salvo.
    if (erroEventos) console.error("Não foi possível salvar as datas do edital:", erroEventos.message);
  }

  revalidatePath("/", "layout");
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

// ---------- Editar e excluir ----------
// Excluir é "lógico": a linha ganha deleted_at e some das telas, mas não é apagada do banco.
// Ao excluir um tópico (ou uma matéria/concurso inteiros), tudo que depende dele também é ocultado
// (revisões, cartões, erros, sessões e questões), para as telas e os relatórios continuarem coerentes.

type Cliente = Awaited<ReturnType<typeof createClient>>;

const agora = () => new Date().toISOString();

function dataOuHoje(formData: FormData): string {
  const d = texto(formData, "data");
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : hoje();
}

function notaDe1a5(formData: FormData, campo: string, rotulo: string): number {
  const n = inteiro(formData, campo);
  if (!(n >= 1 && n <= 5)) falhar(`${rotulo} deve ir de 1 a 5.`);
  return n;
}

async function ocultarDependentes(supabase: Cliente, topicoIds: string[]) {
  const tabelas = ["revisoes", "flashcards", "erros", "sessoes_estudo", "registros_questoes"] as const;
  for (let i = 0; i < topicoIds.length; i += 50) {
    const lote = topicoIds.slice(i, i + 50);
    for (const tabela of tabelas) {
      const { error } = await supabase
        .from(tabela)
        .update({ deleted_at: agora() })
        .in("topico_id", lote)
        .is("deleted_at", null);
      if (error) falhar(error.message);
    }
  }
}

async function idsDosTopicos(supabase: Cliente, materiaIds: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < materiaIds.length; i += 50) {
    const { data, error } = await supabase
      .from("topicos")
      .select("id")
      .in("materia_id", materiaIds.slice(i, i + 50))
      .is("deleted_at", null);
    if (error) falhar(error.message);
    ids.push(...((data ?? []) as { id: string }[]).map((t) => t.id));
  }
  return ids;
}

async function ocultarMaterias(supabase: Cliente, materiaIds: string[]) {
  if (materiaIds.length === 0) return;
  await ocultarDependentes(supabase, await idsDosTopicos(supabase, materiaIds));
  for (let i = 0; i < materiaIds.length; i += 50) {
    const lote = materiaIds.slice(i, i + 50);
    const { error: e1 } = await supabase
      .from("topicos")
      .update({ deleted_at: agora() })
      .in("materia_id", lote)
      .is("deleted_at", null);
    if (e1) falhar(e1.message);
    const { error: e2 } = await supabase
      .from("materias")
      .update({ deleted_at: agora() })
      .in("id", lote)
      .is("deleted_at", null);
    if (e2) falhar(e2.message);
  }
}

export async function editarConcurso(formData: FormData) {
  const nome = texto(formData, "nome");
  if (!nome) falhar("Informe o nome do concurso.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("concursos")
    .update({
      nome,
      banca: texto(formData, "banca") || null,
      cargo: texto(formData, "cargo") || null,
      data_prova: texto(formData, "data_prova") || null,
    })
    .eq("id", texto(formData, "concurso_id"));
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

export async function excluirConcurso(formData: FormData) {
  const id = texto(formData, "concurso_id");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("materias")
    .select("id")
    .eq("concurso_id", id)
    .is("deleted_at", null);
  if (error) falhar(error.message);
  await ocultarMaterias(supabase, ((data ?? []) as { id: string }[]).map((m) => m.id));

  await supabase
    .from("eventos")
    .update({ deleted_at: agora() })
    .eq("concurso_id", id)
    .is("deleted_at", null);

  const { error: erroConcurso } = await supabase
    .from("concursos")
    .update({ deleted_at: agora() })
    .eq("id", id);
  if (erroConcurso) falhar(erroConcurso.message);

  revalidatePath("/", "layout");
}

export async function editarMateria(formData: FormData) {
  const nome = texto(formData, "nome");
  if (!nome) falhar("Informe o nome da matéria.");
  const peso = notaDe1a5(formData, "peso", "O peso");
  const dificuldade = notaDe1a5(formData, "dificuldade", "A dificuldade");

  const supabase = await createClient();
  const { error } = await supabase
    .from("materias")
    .update({ nome, peso, dificuldade })
    .eq("id", texto(formData, "materia_id"));
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

export async function excluirMateria(formData: FormData) {
  const supabase = await createClient();
  await ocultarMaterias(supabase, [texto(formData, "materia_id")]);
  revalidatePath("/", "layout");
}

export async function editarTopico(formData: FormData) {
  const nome = texto(formData, "nome");
  if (!nome) falhar("Informe o nome do tópico.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("topicos")
    .update({ nome })
    .eq("id", texto(formData, "topico_id"));
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

export async function excluirTopico(formData: FormData) {
  const id = texto(formData, "topico_id");
  const supabase = await createClient();

  await ocultarDependentes(supabase, [id]);
  const { error } = await supabase.from("topicos").update({ deleted_at: agora() }).eq("id", id);
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

export async function editarSessao(formData: FormData) {
  const minutos = inteiro(formData, "minutos");
  const tipo = texto(formData, "tipo");
  if (!(minutos > 0)) falhar("Informe o tempo estudado em minutos.");
  if (!["teoria", "questoes", "revisao"].includes(tipo)) falhar("Tipo inválido.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessoes_estudo")
    .update({ minutos, tipo, data: dataOuHoje(formData) })
    .eq("id", texto(formData, "sessao_id"));
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

export async function excluirSessao(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sessoes_estudo")
    .update({ deleted_at: agora() })
    .eq("id", texto(formData, "sessao_id"));
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

export async function editarRegistroQuestoes(formData: FormData) {
  const total = inteiro(formData, "total");
  const acertos = inteiro(formData, "acertos");
  if (!(total > 0)) falhar("Informe quantas questões você fez.");
  if (!(acertos >= 0) || acertos > total) falhar("Acertos devem estar entre 0 e o total.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("registros_questoes")
    .update({ total, acertos, data: dataOuHoje(formData) })
    .eq("id", texto(formData, "registro_id"));
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

export async function excluirRegistroQuestoes(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("registros_questoes")
    .update({ deleted_at: agora() })
    .eq("id", texto(formData, "registro_id"));
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

export async function excluirRevisao(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("revisoes")
    .update({ deleted_at: agora() })
    .eq("id", texto(formData, "revisao_id"));
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

export async function editarErro(formData: FormData) {
  const enunciado = texto(formData, "enunciado");
  const motivo = texto(formData, "motivo");
  if (!enunciado) falhar("Descreva a questão.");
  if (!["desatencao", "lacuna", "pegadinha"].includes(motivo)) falhar("Motivo inválido.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("erros")
    .update({ enunciado, motivo, anotacao: texto(formData, "anotacao") || null })
    .eq("id", texto(formData, "erro_id"));
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

export async function excluirErro(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("erros")
    .update({ deleted_at: agora() })
    .eq("id", texto(formData, "erro_id"));
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

export async function editarFlashcard(formData: FormData) {
  const frente = texto(formData, "frente");
  const verso = texto(formData, "verso");
  if (!frente || !verso) falhar("Preencha a pergunta e a resposta.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("flashcards")
    .update({ frente, verso })
    .eq("id", texto(formData, "flashcard_id"));
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

// ---------- Simulados ----------

export async function finalizarSimulado(formData: FormData) {
  const id = texto(formData, "simulado_id");
  const supabase = await createClient();

  const { data: simulado, error } = await supabase
    .from("simulados")
    .select("id, topico_id, finalizado_em")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) falhar(error.message);
  if (!simulado) falhar("Simulado não encontrado.");
  if (simulado.finalizado_em) redirect(`/simulados/${id}`); // já corrigido (ex.: duplo clique)

  const { data: lista, error: erroQuestoes } = await supabase
    .from("simulado_questoes")
    .select("id, correta, alternativas")
    .eq("simulado_id", id)
    .order("ordem");
  if (erroQuestoes) falhar(erroQuestoes.message);
  const questoes = (lista ?? []) as { id: string; correta: number; alternativas: unknown[] }[];

  // Respostas vêm como r_<id da questão> = índice da alternativa; em branco = sem resposta.
  const respostas = questoes.map((q) => {
    const bruto = formData.get(`r_${q.id}`);
    if (bruto === null || bruto === "") return null;
    const n = Number.parseInt(String(bruto), 10);
    return Number.isInteger(n) && n >= 0 && n < q.alternativas.length ? n : null;
  });

  for (let i = 0; i < questoes.length; i++) {
    const { error: erroResposta } = await supabase
      .from("simulado_questoes")
      .update({ resposta: respostas[i] })
      .eq("id", questoes[i].id);
    if (erroResposta) falhar(erroResposta.message);
  }

  const acertos = contarAcertos(questoes, respostas);
  const { error: erroFinal } = await supabase
    .from("simulados")
    .update({ acertos, finalizado_em: agora() })
    .eq("id", id);
  if (erroFinal) falhar(erroFinal.message);

  // Com tópico vinculado, o resultado também entra nos registros de questões (relatórios e prioridades).
  if (simulado.topico_id && questoes.length > 0) {
    await supabase.from("registros_questoes").insert({
      topico_id: simulado.topico_id,
      total: questoes.length,
      acertos,
      data: hoje(),
    });
  }

  revalidatePath("/", "layout");
  redirect(`/simulados/${id}`);
}

export async function refazerSimulado(formData: FormData) {
  const id = texto(formData, "simulado_id");
  const supabase = await createClient();

  const { error: e1 } = await supabase
    .from("simulado_questoes")
    .update({ resposta: null })
    .eq("simulado_id", id);
  if (e1) falhar(e1.message);
  const { error: e2 } = await supabase
    .from("simulados")
    .update({ acertos: null, finalizado_em: null })
    .eq("id", id);
  if (e2) falhar(e2.message);

  revalidatePath("/", "layout");
  redirect(`/simulados/${id}`);
}

export async function excluirSimulado(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("simulados")
    .update({ deleted_at: agora() })
    .eq("id", texto(formData, "simulado_id"));
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
  redirect("/simulados");
}

// ---------- Calendário ----------

function dadosDoEvento(formData: FormData) {
  const titulo = texto(formData, "titulo");
  const data = texto(formData, "data");
  if (!titulo) falhar("Informe o título do evento.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) falhar("Informe uma data válida.");

  return {
    titulo,
    data,
    tipo: tipoValido(texto(formData, "tipo")),
    observacao: texto(formData, "observacao") || null,
  };
}

export async function criarEvento(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("eventos")
    .insert({ ...dadosDoEvento(formData), concurso_id: texto(formData, "concurso_id") || null });
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

export async function editarEvento(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("eventos")
    .update({ ...dadosDoEvento(formData), concurso_id: texto(formData, "concurso_id") || null })
    .eq("id", texto(formData, "evento_id"));
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

export async function excluirEvento(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("eventos")
    .update({ deleted_at: agora() })
    .eq("id", texto(formData, "evento_id"));
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

// ---------- Avisos ----------

export async function marcarAvisoLido(formData: FormData) {
  const chave = texto(formData, "chave");
  if (!chave || chave.length > 200) falhar("Aviso inválido.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("avisos_lidos")
    .upsert({ chave }, { onConflict: "user_id,chave", ignoreDuplicates: true });
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

export async function marcarTodosAvisosLidos(formData: FormData) {
  let chaves: unknown;
  try {
    chaves = JSON.parse(texto(formData, "chaves"));
  } catch {
    falhar("Avisos inválidos.");
  }
  const lista = (Array.isArray(chaves) ? chaves : [])
    .filter((c): c is string => typeof c === "string" && c.length > 0 && c.length <= 200)
    .slice(0, 100);
  if (lista.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("avisos_lidos")
    .upsert(lista.map((chave) => ({ chave })), { onConflict: "user_id,chave", ignoreDuplicates: true });
  if (error) falhar(error.message);

  revalidatePath("/", "layout");
}

// ---------- Central de estudo ----------

export async function definirMeta(formData: FormData) {
  const minutos = inteiro(formData, "minutos_dia");
  if (!(minutos >= 10 && minutos <= 1440)) falhar("A meta deve ficar entre 10 e 1440 minutos.");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) falhar("Faça login para continuar.");

  const { error } = await supabase
    .from("metas_estudo")
    .upsert({ user_id: auth.user.id, minutos_dia: minutos, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) falhar(error.message);

  revalidatePath("/estudo");
  redirect("/estudo?ok=meta");
}

export async function salvarAnotacao(formData: FormData) {
  const topicoId = texto(formData, "topico_id");
  if (!topicoId) falhar("Tópico não informado.");
  const conteudo = String(formData.get("texto") ?? "").slice(0, 10000);

  const supabase = await createClient();
  const { error } = await supabase
    .from("anotacoes_topico")
    .upsert({ topico_id: topicoId, texto: conteudo, updated_at: new Date().toISOString() }, { onConflict: "topico_id" });
  if (error) falhar(error.message);

  revalidatePath("/estudo/topico");
  redirect(`/estudo/topico?topico=${encodeURIComponent(topicoId)}&ok=1`);
}

// ---------- Conteúdos pesquisados pela IA ----------

export async function salvarConteudo(formData: FormData) {
  const topicoId = texto(formData, "topico_id");
  const titulo = texto(formData, "titulo").slice(0, 200);
  const conteudo = String(formData.get("texto") ?? "").trim().slice(0, 20000);
  if (!topicoId || !conteudo) falhar("Não há conteúdo para salvar.");

  let fontes: { titulo: string; url: string }[] = [];
  try {
    const bruto: unknown = JSON.parse(texto(formData, "fontes") || "[]");
    if (Array.isArray(bruto)) {
      fontes = bruto
        .filter(
          (f): f is { titulo: string; url: string } =>
            !!f && typeof f.titulo === "string" && typeof f.url === "string" && /^https?:\/\//.test(f.url),
        )
        .slice(0, 8)
        .map((f) => ({ titulo: f.titulo.slice(0, 150), url: f.url.slice(0, 2000) }));
    }
  } catch {
    // fontes inválidas: salva só o texto
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("conteudos_estudo")
    .insert({ topico_id: topicoId, titulo: titulo || "Conteúdo", texto: conteudo, fontes });
  if (error) falhar(error.message);

  revalidatePath("/estudo/topico");
  redirect(`/estudo/topico?topico=${encodeURIComponent(topicoId)}&ok=conteudo`);
}

export async function excluirConteudo(formData: FormData) {
  const id = texto(formData, "conteudo_id");
  const topicoId = texto(formData, "topico_id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("conteudos_estudo")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) falhar(error.message);

  revalidatePath("/estudo/topico");
  redirect(`/estudo/topico?topico=${encodeURIComponent(topicoId)}`);
}
