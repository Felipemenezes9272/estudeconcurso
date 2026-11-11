import PrioridadesView, { type ConcursoAba, type MateriaGrupo } from "@/components/PrioridadesView";
import { ordenarPorPrioridade, ranquear, type TopicoEntrada } from "@/lib/prioridades";
import { createClient } from "@/lib/supabase/server";

type LinhaTopico = {
  id: string;
  nome: string;
  status: string;
  incidencia: number;
  ordem: number;
  materias: {
    id: string;
    nome: string;
    peso: number;
    deleted_at: string | null;
    concurso_id: string;
  } | null;
};

export default async function PrioridadesPage({
  searchParams,
}: {
  searchParams: Promise<{ concurso?: string }>;
}) {
  const { concurso: concursoParam } = await searchParams;
  const supabase = await createClient();

  const [topicos, questoes, concursosRes] = await Promise.all([
    supabase
      .from("topicos")
      .select("id, nome, status, incidencia, ordem, materias(id, nome, peso, deleted_at, concurso_id)")
      .is("deleted_at", null)
      .order("ordem")
      .limit(5000),
    supabase.from("registros_questoes").select("topico_id, total, acertos").is("deleted_at", null).limit(20000),
    supabase.from("concursos").select("id, nome").is("deleted_at", null).order("created_at"),
  ]);

  // Sem a coluna "incidencia", o SQL da fase 3 ainda não foi executado.
  if (topicos.error) {
    return (
      <>
        <h1>O que estudar primeiro</h1>
        <p className="aviso erro">
          Falta uma atualização no banco. No Supabase, abra o SQL Editor e execute o arquivo{" "}
          <code>supabase/fase3_prioridades.sql</code> uma vez. Depois, recarregue esta página.
        </p>
      </>
    );
  }

  const desempenho = new Map<string, { total: number; acertos: number }>();
  for (const q of (questoes.data ?? []) as { topico_id: string; total: number; acertos: number }[]) {
    const atual = desempenho.get(q.topico_id) ?? { total: 0, acertos: 0 };
    atual.total += q.total;
    atual.acertos += q.acertos;
    desempenho.set(q.topico_id, atual);
  }

  // Cada tópico pertence a uma matéria e cada matéria a um edital: agrupamos nessa ordem.
  const linhas = ((topicos.data ?? []) as unknown as LinhaTopico[]).filter((t) => t.materias && !t.materias.deleted_at);
  const entradaDe = (t: LinhaTopico): TopicoEntrada => ({
    id: t.id,
    nome: t.nome,
    materia: t.materias!.nome,
    peso: t.materias!.peso,
    incidencia: t.incidencia,
    status: t.status,
    total: desempenho.get(t.id)?.total ?? 0,
    acertos: desempenho.get(t.id)?.acertos ?? 0,
  });

  const concursos = (concursosRes.data ?? []) as { id: string; nome: string }[];
  const abas: ConcursoAba[] = concursos.map((c) => ({
    id: c.id,
    nome: c.nome,
    pendentes: ranquear(
      linhas.filter((t) => t.materias!.concurso_id === c.id).map(entradaDe),
      Number.MAX_SAFE_INTEGER,
    ).length,
  }));

  const selecionado = concursos.find((c) => c.id === concursoParam)?.id ?? concursos[0]?.id;
  const doEdital = linhas.filter((t) => t.materias!.concurso_id === selecionado);

  const porMateria = new Map<string, { nome: string; peso: number; topicos: LinhaTopico[] }>();
  for (const t of doEdital) {
    const m = t.materias!;
    const atual = porMateria.get(m.id) ?? { nome: m.nome, peso: m.peso, topicos: [] };
    atual.topicos.push(t);
    porMateria.set(m.id, atual);
  }

  const materias: MateriaGrupo[] = [...porMateria.entries()]
    .map(([id, m]) => {
      const itens = ordenarPorPrioridade(m.topicos.map(entradaDe)).map((i) => ({
        ...i,
        incidencia: i.incidencia,
      }));
      return {
        id,
        nome: m.nome,
        peso: m.peso,
        total: itens.length,
        concluidos: itens.filter((i) => i.status === "concluido").length,
        pendentes: itens.filter((i) => i.prioritario).length,
        maiorScore: itens.find((i) => i.prioritario)?.score ?? 0,
        itens,
      };
    })
    // A matéria com o tópico mais urgente vem primeiro.
    .sort((a, b) => b.maiorScore - a.maiorScore || a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <PrioridadesView
      concursos={abas}
      selecionado={selecionado}
      ranking={ranquear(doEdital.map(entradaDe), 10)}
      materias={materias}
    />
  );
}
