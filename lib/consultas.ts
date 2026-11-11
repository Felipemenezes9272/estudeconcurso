import type { SupabaseClient } from "@supabase/supabase-js";
import type { TopicoEntrada } from "@/lib/prioridades";

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

/** Tópicos com matéria, peso, incidência e desempenho em questões, prontos para ranquear. */
export async function carregarEntradasPrioridade(supabase: SupabaseClient): Promise<TopicoEntrada[]> {
  const [topicos, questoes] = await Promise.all([
    supabase
      .from("topicos")
      .select("id, nome, status, incidencia, materias(nome, peso, deleted_at)")
      .is("deleted_at", null)
      .limit(5000),
    supabase.from("registros_questoes").select("topico_id, total, acertos").is("deleted_at", null).limit(20000),
  ]);
  if (topicos.error) return [];

  const desempenho = new Map<string, { total: number; acertos: number }>();
  for (const q of (questoes.data ?? []) as { topico_id: string; total: number; acertos: number }[]) {
    const atual = desempenho.get(q.topico_id) ?? { total: 0, acertos: 0 };
    atual.total += q.total;
    atual.acertos += q.acertos;
    desempenho.set(q.topico_id, atual);
  }

  type Linha = {
    id: string;
    nome: string;
    status: string;
    incidencia: number;
    materias: { nome: string; peso: number; deleted_at: string | null } | null;
  };
  return ((topicos.data ?? []) as unknown as Linha[])
    .filter((t) => t.materias && !t.materias.deleted_at)
    .map((t) => ({
      id: t.id,
      nome: t.nome,
      materia: t.materias!.nome,
      peso: t.materias!.peso,
      incidencia: t.incidencia,
      status: t.status,
      total: desempenho.get(t.id)?.total ?? 0,
      acertos: desempenho.get(t.id)?.acertos ?? 0,
    }));
}
