import type { SupabaseClient } from "@supabase/supabase-js";

export type TopicoOpcao = { id: string; rotulo: string };

export type RevisaoPendente = {
  id: string;
  data_prevista: string;
  intervalo_dias: number;
  topicos: { nome: string; materias: { nome: string } | null } | null;
};

/** Tópicos do edital como opções de seleção: "Matéria › Tópico". */
export async function listarTopicosParaSelecao(supabase: SupabaseClient): Promise<TopicoOpcao[]> {
  const { data } = await supabase
    .from("topicos")
    .select("id, nome, materias(nome)")
    .is("deleted_at", null)
    .order("created_at");

  return ((data ?? []) as unknown as { id: string; nome: string; materias: { nome: string } | null }[]).map(
    (t) => ({ id: t.id, rotulo: `${t.materias?.nome ?? "—"} › ${t.nome}` }),
  );
}

/** Revisões ainda não feitas, da mais antiga para a mais nova. */
export async function listarRevisoesPendentes(
  supabase: SupabaseClient,
  ate?: string,
): Promise<RevisaoPendente[]> {
  let consulta = supabase
    .from("revisoes")
    .select("id, data_prevista, intervalo_dias, topicos(nome, materias(nome))")
    .is("data_feita", null)
    .is("deleted_at", null)
    .order("data_prevista");

  if (ate) consulta = consulta.lte("data_prevista", ate);

  const { data } = await consulta;
  return (data ?? []) as unknown as RevisaoPendente[];
}
