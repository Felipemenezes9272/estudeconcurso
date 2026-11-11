import type { SupabaseClient } from "@supabase/supabase-js";
import { somarDias } from "@/lib/datas";
import { montarAvisos, type Aviso, type EventoAviso } from "@/lib/avisos";

type LinhaEvento = Omit<EventoAviso, "concurso_nome"> & { concursos: { nome: string } | null };

/** Busca os dados e devolve os avisos separados em não lidos e lidos. */
export async function carregarAvisos(
  supabase: SupabaseClient,
  hoje: string,
): Promise<{ naoLidos: Aviso[]; lidos: Aviso[] }> {
  const [revisoes, cartoes, erros, topicos, sessao, eventos, concursos, lidasRes] = await Promise.all([
    supabase
      .from("revisoes")
      .select("data_prevista")
      .is("data_feita", null)
      .is("deleted_at", null)
      .lte("data_prevista", hoje)
      .limit(5000),
    supabase
      .from("flashcards")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .lte("proxima_revisao", hoje),
    supabase
      .from("erros")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "pendente"),
    supabase.from("topicos").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase
      .from("sessoes_estudo")
      .select("data")
      .is("deleted_at", null)
      .order("data", { ascending: false })
      .limit(1),
    supabase
      .from("eventos")
      .select("id, titulo, data, tipo, concursos(nome)")
      .is("deleted_at", null)
      .gte("data", hoje)
      .lte("data", somarDias(hoje, 30))
      .order("data")
      .limit(60),
    supabase.from("concursos").select("id, nome, data_prova").is("deleted_at", null),
    supabase.from("avisos_lidos").select("chave").limit(5000),
  ]);

  // Tabelas das fases 2 e 5 podem não existir ainda: nesse caso a consulta traz erro e contamos zero.
  const pendentes = (revisoes.data ?? []) as { data_prevista: string }[];
  const eventosBanco = ((eventos.error ? [] : eventos.data ?? []) as unknown as LinhaEvento[]).map((e) => ({
    id: e.id,
    titulo: e.titulo,
    data: e.data,
    tipo: e.tipo,
    concurso_nome: e.concursos?.nome ?? null,
  }));

  // A data da prova cadastrada no concurso também gera aviso, se não houver evento de prova igual.
  const provas: EventoAviso[] = [];
  for (const c of (concursos.data ?? []) as { id: string; nome: string; data_prova: string | null }[]) {
    if (!c.data_prova || c.data_prova < hoje || c.data_prova > somarDias(hoje, 30)) continue;
    if (eventosBanco.some((e) => e.tipo === "prova" && e.data === c.data_prova && e.concurso_nome === c.nome)) continue;
    provas.push({ id: `prova-${c.id}`, titulo: "Prova", data: c.data_prova, tipo: "prova", concurso_nome: c.nome });
  }

  const avisos = montarAvisos({
    hoje,
    revisoesAtrasadas: pendentes.filter((r) => r.data_prevista < hoje).length,
    revisoesHoje: pendentes.filter((r) => r.data_prevista === hoje).length,
    cartoesHoje: cartoes.error ? 0 : (cartoes.count ?? 0),
    errosPendentes: erros.error ? 0 : (erros.count ?? 0),
    temTopicos: (topicos.count ?? 0) > 0,
    ultimoEstudo: ((sessao.data ?? []) as { data: string }[])[0]?.data ?? null,
    eventos: [...eventosBanco, ...provas],
  });

  const lidas = new Set(((lidasRes.error ? [] : lidasRes.data ?? []) as { chave: string }[]).map((l) => l.chave));
  return {
    naoLidos: avisos.filter((a) => !lidas.has(a.chave)),
    lidos: avisos.filter((a) => lidas.has(a.chave)),
  };
}
