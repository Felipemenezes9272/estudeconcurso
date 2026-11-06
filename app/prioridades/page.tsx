import PrioridadesView, { type MateriaEdicao } from "@/components/PrioridadesView";
import { ranquear, type TopicoEntrada } from "@/lib/prioridades";
import { createClient } from "@/lib/supabase/server";

type LinhaTopico = {
  id: string;
  nome: string;
  status: string;
  incidencia: number;
  ordem: number;
  materias: { nome: string; peso: number } | null;
};

export default async function PrioridadesPage() {
  const supabase = await createClient();

  const [topicos, questoes] = await Promise.all([
    supabase
      .from("topicos")
      .select("id, nome, status, incidencia, ordem, materias(nome, peso)")
      .is("deleted_at", null)
      .order("ordem")
      .limit(5000),
    supabase.from("registros_questoes").select("topico_id, total, acertos").is("deleted_at", null).limit(20000),
  ]);

  // Sem a coluna "incidencia", o SQL da fase 3 ainda não foi executado.
  if (topicos.error) {
    return (
      <>
        <h1>Prioridades</h1>
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

  const linhas = (topicos.data ?? []) as unknown as LinhaTopico[];

  const entrada: TopicoEntrada[] = linhas.map((t) => ({
    id: t.id,
    nome: t.nome,
    materia: t.materias?.nome ?? "—",
    peso: t.materias?.peso ?? 1,
    incidencia: t.incidencia,
    status: t.status,
    total: desempenho.get(t.id)?.total ?? 0,
    acertos: desempenho.get(t.id)?.acertos ?? 0,
  }));

  const porMateria = new Map<string, MateriaEdicao>();
  for (const t of linhas) {
    const nome = t.materias?.nome ?? "—";
    const m = porMateria.get(nome) ?? { nome, peso: t.materias?.peso ?? 1, topicos: [] };
    m.topicos.push({ id: t.id, nome: t.nome, incidencia: t.incidencia });
    porMateria.set(nome, m);
  }

  return <PrioridadesView ranking={ranquear(entrada, 10)} materias={[...porMateria.values()]} />;
}
