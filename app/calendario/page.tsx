import CalendarioView, { type ConcursoOpcao, type EventoCal } from "@/components/CalendarioView";
import { gradeDoMes, lerMes } from "@/lib/calendario";
import { hoje, somarDias } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

type LinhaEvento = Omit<EventoCal, "concurso_nome"> & { concursos: { nome: string } | null };
type LinhaConcurso = { id: string; nome: string; data_prova: string | null };

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const dataHoje = hoje();
  const { ano, mes } = lerMes(mesParam, dataHoje);

  const celulas = gradeDoMes(ano, mes).flat();
  const inicio = celulas[0].data;
  const fim = celulas[celulas.length - 1].data;

  const supabase = await createClient();
  const [doMes, futuros, concursosRes, revisoesRes] = await Promise.all([
    supabase
      .from("eventos")
      .select("id, titulo, data, tipo, observacao, concurso_id, concursos(nome)")
      .is("deleted_at", null)
      .gte("data", inicio)
      .lte("data", fim)
      .order("data"),
    supabase
      .from("eventos")
      .select("id, titulo, data, tipo, observacao, concurso_id, concursos(nome)")
      .is("deleted_at", null)
      .gte("data", dataHoje)
      .lte("data", somarDias(dataHoje, 180))
      .order("data")
      .limit(30),
    supabase.from("concursos").select("id, nome, data_prova").is("deleted_at", null).order("created_at"),
    supabase
      .from("revisoes")
      .select("data_prevista")
      .is("data_feita", null)
      .is("deleted_at", null)
      .gte("data_prevista", inicio)
      .lte("data_prevista", fim)
      .limit(5000),
  ]);

  // Sem a tabela, o SQL da fase 5 ainda não foi executado.
  if (doMes.error) {
    return (
      <>
        <h1>Calendário</h1>
        <p className="aviso erro">
          Falta uma atualização no banco. No Supabase, abra o SQL Editor e execute o arquivo{" "}
          <code>supabase/fase5_calendario.sql</code> uma vez. Depois, recarregue esta página.
        </p>
      </>
    );
  }

  const concursos = (concursosRes.data ?? []) as LinhaConcurso[];
  const nomeDoConcurso = new Map(concursos.map((c) => [c.id, c.nome]));

  const paraEvento = (l: LinhaEvento): EventoCal => ({
    id: l.id,
    titulo: l.titulo,
    data: l.data,
    tipo: l.tipo,
    observacao: l.observacao,
    concurso_id: l.concurso_id,
    concurso_nome: l.concursos?.nome ?? null,
  });

  const eventosMes = ((doMes.data ?? []) as unknown as LinhaEvento[]).map(paraEvento);
  const eventosFuturos = ((futuros.data ?? []) as unknown as LinhaEvento[]).map(paraEvento);

  // A data da prova cadastrada no concurso também aparece, a menos que já exista um evento de prova igual.
  const provasVirtuais: EventoCal[] = [];
  for (const c of concursos) {
    if (!c.data_prova) continue;
    const jaExiste = [...eventosMes, ...eventosFuturos].some(
      (e) => e.concurso_id === c.id && e.tipo === "prova" && e.data === c.data_prova,
    );
    if (jaExiste) continue;
    provasVirtuais.push({
      id: `prova-${c.id}`,
      titulo: "Prova",
      data: c.data_prova,
      tipo: "prova",
      observacao: null,
      concurso_id: c.id,
      concurso_nome: nomeDoConcurso.get(c.id) ?? null,
      virtual: true,
    });
  }

  const eventos = [...eventosMes, ...provasVirtuais.filter((e) => e.data >= inicio && e.data <= fim)];
  const proximos = [...eventosFuturos, ...provasVirtuais.filter((e) => e.data >= dataHoje)]
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 12);

  const revisoes: Record<string, number> = {};
  for (const r of (revisoesRes.data ?? []) as { data_prevista: string }[]) {
    revisoes[r.data_prevista] = (revisoes[r.data_prevista] ?? 0) + 1;
  }

  const opcoes: ConcursoOpcao[] = concursos.map((c) => ({ id: c.id, nome: c.nome }));

  return (
    <>
      <h1>Calendário</h1>
      <p className="subtitulo">Datas do edital, provas e revisões em um só lugar.</p>
      <CalendarioView
        key={`${ano}-${mes}`}
        ano={ano}
        mes={mes}
        hoje={dataHoje}
        eventos={eventos}
        revisoes={revisoes}
        concursos={opcoes}
        proximos={proximos}
      />
    </>
  );
}
