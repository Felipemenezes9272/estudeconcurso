import Link from "next/link";
import ListaRevisoes from "@/components/ListaRevisoes";
import { listarRevisoesPendentes } from "@/lib/consultas";
import { distanciaTexto, ROTULO_EVENTO, type TipoEvento } from "@/lib/calendario";
import Atalhos from "@/components/Atalhos";
import { ApostilaArte } from "@/components/Ilustracoes";
import {
  dataPorExtenso,
  diaDaSemanaCurto,
  formatarData,
  formatarMinutos,
  hoje,
  saudacao,
  somarDias,
} from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

export default async function PainelPage() {
  const supabase = await createClient();
  const dataHoje = hoje();

  const [revisoes, sessoes, totalTopicos, concluidos, questoes, cartoes, agenda] = await Promise.all([
    listarRevisoesPendentes(supabase, dataHoje),
    supabase
      .from("sessoes_estudo")
      .select("data, minutos")
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

  const sessoesSemana = (sessoes.data ?? []) as { data: string; minutos: number }[];
  const minutosSemana = sessoesSemana.reduce((soma, s) => soma + s.minutos, 0);

  // Os últimos 7 dias, do mais antigo para hoje: alimenta o "gabarito da semana".
  const semana = Array.from({ length: 7 }, (_, i) => {
    const data = somarDias(dataHoje, i - 6);
    const minutos = sessoesSemana.filter((s) => s.data === data).reduce((soma, s) => soma + s.minutos, 0);
    return { data, minutos, rotulo: diaDaSemanaCurto(data) };
  });
  const diasEstudados = semana.filter((d) => d.minutos > 0).length;

  const qs = (questoes.data ?? []) as { total: number; acertos: number }[];
  const totalQuestoes = qs.reduce((soma, q) => soma + q.total, 0);
  const totalAcertos = qs.reduce((soma, q) => soma + q.acertos, 0);
  const taxa = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : null;

  const topicos = totalTopicos.count ?? 0;
  const feitos = concluidos.count ?? 0;
  const progresso = topicos > 0 ? Math.round((feitos / topicos) * 100) : 0;

  return (
    <>
      <section className="hero" aria-label="Resumo do dia">
        <div>
          <h1>{saudacao()}!</h1>
          <p className="subtitulo">{dataPorExtenso()}</p>
          <p className="hero-resumo">
            {revisoes.length + cartoesHoje === 0
              ? "Nada vencendo hoje. Boa hora para avançar em um tópico novo."
              : `Hoje você tem ${revisoes.length} ${revisoes.length === 1 ? "revisão" : "revisões"} e ${cartoesHoje} ${cartoesHoje === 1 ? "cartão" : "cartões"} para fazer.`}
          </p>
          <div className="hero-acoes">
            {revisoes.length > 0 && (
              <Link href="/revisoes" className="destaque">
                Fazer revisões
              </Link>
            )}
            {cartoesHoje > 0 && (
              <Link href="/flashcards" className={revisoes.length > 0 ? undefined : "destaque"}>
                Estudar cartões
              </Link>
            )}
            <Link href="/estudo" className={revisoes.length + cartoesHoje === 0 ? "destaque" : undefined}>
              Registrar estudo
            </Link>
          </div>
        </div>
        <ApostilaArte className="hero-arte" />

        <ol className="gabarito" aria-label="Estudo nos últimos 7 dias">
          <li className="gabarito-titulo" style={{ display: "block", flexBasis: "100%" }}>
            {diasEstudados === 0
              ? "Nenhum dia de estudo registrado nesta semana"
              : `Você estudou em ${diasEstudados} dos últimos 7 dias`}
          </li>
          {semana.map((d, i) => (
            <li
              key={d.data}
              className={`${d.minutos > 0 ? "feito-dia" : ""}${d.data === dataHoje ? " hoje" : ""}`}
              style={{ ["--i" as string]: i }}
              title={`${d.rotulo} ${formatarData(d.data).slice(0, 5)}: ${d.minutos > 0 ? formatarMinutos(d.minutos) : "sem estudo"}`}
            >
              <span className="bolha" />
              <span className="dia">{d.rotulo}</span>
              <span className="sr">{d.minutos > 0 ? `estudou ${formatarMinutos(d.minutos)}` : "sem estudo"}</span>
            </li>
          ))}
        </ol>
      </section>

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
          <Link href="/flashcards" className="botao primario">
            Estudar agora
          </Link>
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
          <Link href="/calendario" className="botao">
            Abrir o calendário
          </Link>
        </section>
      )}

      <Atalhos />

      {topicos === 0 && (
        <section className="card">
          <h2>Comece pelo edital</h2>
          <p className="muted">
            Cadastre o concurso, as matérias e os tópicos para liberar o registro de estudo e as
            revisões.
          </p>
          <Link href="/edital" className="botao primario">
            Ir para o edital
          </Link>
        </section>
      )}
    </>
  );
}
