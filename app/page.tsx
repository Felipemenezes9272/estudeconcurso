import Link from "next/link";
import ListaRevisoes from "@/components/ListaRevisoes";
import { listarRevisoesPendentes } from "@/lib/consultas";
import { distanciaTexto, ROTULO_EVENTO, type TipoEvento } from "@/lib/calendario";
import { dataPorExtenso, formatarData, formatarMinutos, hoje, somarDias } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

export default async function PainelPage() {
  const supabase = await createClient();
  const dataHoje = hoje();

  const [revisoes, sessoes, totalTopicos, concluidos, questoes, cartoes, agenda] = await Promise.all([
    listarRevisoesPendentes(supabase, dataHoje),
    supabase
      .from("sessoes_estudo")
      .select("minutos")
      .is("deleted_at", null)
      .gte("data", somarDias(dataHoje, -6)),
    supabase
      .from("topicos")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("topicos")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "concluido"),
    supabase.from("registros_questoes").select("total, acertos").is("deleted_at", null),
    supabase
      .from("flashcards")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .lte("proxima_revisao", dataHoje),
    supabase
      .from("eventos")
      .select("id, titulo, data, tipo")
      .is("deleted_at", null)
      .gte("data", dataHoje)
      .lte("data", somarDias(dataHoje, 30))
      .order("data")
      .limit(4),
  ]);
  // Se a tabela ainda não existir (SQL da fase 5 não rodado), a consulta devolve erro e não mostramos o aviso.
  const proximasDatas = agenda.error
    ? []
    : ((agenda.data ?? []) as { id: string; titulo: string; data: string; tipo: TipoEvento }[]);
  // Se a tabela ainda não existir (SQL da fase 2 não rodado), a consulta devolve erro e contamos 0.
  const cartoesHoje = cartoes.error ? 0 : (cartoes.count ?? 0);

  const minutosSemana = ((sessoes.data ?? []) as { minutos: number }[]).reduce(
    (soma, s) => soma + s.minutos,
    0,
  );

  const qs = (questoes.data ?? []) as { total: number; acertos: number }[];
  const totalQuestoes = qs.reduce((soma, q) => soma + q.total, 0);
  const totalAcertos = qs.reduce((soma, q) => soma + q.acertos, 0);
  const taxa = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : null;

  const topicos = totalTopicos.count ?? 0;
  const feitos = concluidos.count ?? 0;
  const progresso = topicos > 0 ? Math.round((feitos / topicos) * 100) : 0;

  return (
    <>
      <h1>Painel</h1>
      <p className="subtitulo">{dataPorExtenso()}</p>

      <div className="grid">
        <div className={`stat${revisoes.length > 0 ? " destaque" : ""}`}>
          <div className="valor">{revisoes.length}</div>
          <div className="rotulo">revisões para hoje</div>
        </div>
        <div className="stat">
          <div className="valor">{formatarMinutos(minutosSemana)}</div>
          <div className="rotulo">estudadas nos últimos 7 dias</div>
        </div>
        <div className="stat">
          <div className="valor">{taxa === null ? "—" : `${taxa}%`}</div>
          <div className="rotulo">
            de acerto ({totalAcertos}/{totalQuestoes} questões)
          </div>
        </div>
        <div className="stat">
          <div className="valor">{progresso}%</div>
          <div className="rotulo">
            do edital concluído ({feitos}/{topicos})
          </div>
          <div className="barra" style={{ marginTop: 8 }}>
            <span style={{ width: `${progresso}%` }} />
          </div>
        </div>
      </div>

      <section className="card">
        <h2>Revisar hoje</h2>
        <ListaRevisoes
          revisoes={revisoes}
          hoje={dataHoje}
          vazio="Tudo em dia por aqui. Ao concluir um tópico no edital, as revisões passam a aparecer nesta lista."
        />
      </section>

      {cartoesHoje > 0 && (
        <section className="card">
          <h2>Flashcards</h2>
          <p style={{ margin: "0 0 12px" }}>
            Você tem <strong>{cartoesHoje}</strong> {cartoesHoje === 1 ? "cartão" : "cartões"} para estudar hoje.
          </p>
          <Link href="/flashcards">Estudar agora →</Link>
        </section>
      )}

      {proximasDatas.length > 0 && (
        <section className="card">
          <h2>Próximas datas</h2>
          <ul className="lista">
            {proximasDatas.map((e) => (
              <li key={e.id}>
                <span>
                  <span className={`ponto ev-${e.tipo}`} /> <strong>{e.titulo}</strong>{" "}
                  <span className="muted">· {ROTULO_EVENTO[e.tipo]}</span>
                </span>
                <span className="muted">
                  {formatarData(e.data)} · {distanciaTexto(dataHoje, e.data)}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/calendario">Abrir o calendário →</Link>
        </section>
      )}

      <p className="row" style={{ justifyContent: "center", gap: 20 }}>
        <Link href="/simulados">Simulados com IA →</Link>
        <Link href="/prioridades">O que estudar primeiro →</Link>
        <Link href="/relatorios">Relatórios de evolução →</Link>
      </p>

      {topicos === 0 && (
        <section className="card">
          <h2>Comece pelo edital</h2>
          <p className="muted">
            Cadastre o concurso, as matérias e os tópicos para liberar o registro de estudo e as
            revisões.
          </p>
          <Link href="/edital">Ir para o edital →</Link>
        </section>
      )}
    </>
  );
}
