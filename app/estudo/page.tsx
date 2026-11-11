import Link from "next/link";
import { definirMeta, editarSessao, excluirSessao } from "@/app/actions";
import BotaoConfirmar from "@/components/BotaoConfirmar";
import FormEstudo from "@/components/FormEstudo";
import {
  carregarEntradasPrioridade,
  listarRevisoesPendentes,
  listarTopicosParaSelecao,
} from "@/lib/consultas";
import { formatarData, formatarMinutos, hoje, somarDias } from "@/lib/datas";
import { META_PADRAO, calcularSequencia, montarPlano } from "@/lib/estudo";
import { ranquear } from "@/lib/prioridades";
import { createClient } from "@/lib/supabase/server";

const ROTULO_TIPO: Record<string, string> = {
  teoria: "Teoria",
  questoes: "Questões",
  revisao: "Revisão",
};

export default async function EstudoPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; topico?: string }>;
}) {
  const { ok, topico: topicoParam } = await searchParams;
  const supabase = await createClient();

  const dia = hoje();
  const [topicos, entradas, revisoes, metaRes, diasRes, recentes] = await Promise.all([
    listarTopicosParaSelecao(supabase),
    carregarEntradasPrioridade(supabase),
    listarRevisoesPendentes(supabase, somarDias(dia, 6)),
    supabase.from("metas_estudo").select("minutos_dia").maybeSingle(),
    supabase
      .from("sessoes_estudo")
      .select("data, minutos")
      .is("deleted_at", null)
      .gte("data", somarDias(dia, -120))
      .limit(5000),
    supabase
      .from("sessoes_estudo")
      .select("id, data, minutos, tipo, topicos(nome)")
      .is("deleted_at", null)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const sessoes = (recentes.data ?? []) as unknown as {
    id: string;
    data: string;
    minutos: number;
    tipo: string;
    topicos: { nome: string } | null;
  }[];

  const metaMinutos = (metaRes.data as { minutos_dia: number } | null)?.minutos_dia ?? META_PADRAO;
  const diasEstudo = (diasRes.data ?? []) as { data: string; minutos: number }[];
  const minutosHoje = diasEstudo.filter((d) => d.data === dia).reduce((soma, d) => soma + d.minutos, 0);
  const sequencia = calcularSequencia(
    diasEstudo.map((d) => d.data),
    dia,
  );
  const pct = Math.min(100, Math.round((minutosHoje / metaMinutos) * 100));

  const plano = montarPlano({
    hoje: dia,
    metaMinutos,
    revisoes: revisoes.map((r) => ({
      id: r.id,
      data: r.data_prevista,
      nome: `${r.topicos?.materias?.nome ?? "—"} › ${r.topicos?.nome ?? "Tópico"} (${r.intervalo_dias}d)`,
    })),
    topicos: ranquear(entradas, 40).map((i) => ({ id: i.id, nome: i.nome, materia: i.materia })),
  });
  const diaSemana = (data: string) =>
    new Date(`${data}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });

  return (
    <>
      <h1>Estudo de hoje</h1>
      {ok === "meta" && <p className="aviso ok">Meta atualizada.</p>}
      {ok === "1" && <p className="aviso ok">Sessão registrada.</p>}

      <section className="card">
        <h2>Meta do dia</h2>
        <div className="barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="muted">
          {formatarMinutos(minutosHoje)} de {formatarMinutos(metaMinutos)} ({pct}%) ·{" "}
          <strong>{sequencia}</strong> {sequencia === 1 ? "dia seguido" : "dias seguidos"} estudando
        </p>
        <details className="editar">
          <summary>Mudar a meta diária</summary>
          <form action={definirMeta} className="row">
            <label style={{ flex: 1, minWidth: 140 }}>
              Minutos por dia
              <input name="minutos_dia" type="number" min={10} max={1440} step={5} defaultValue={metaMinutos} required />
            </label>
            <button className="primario pequeno">Salvar meta</button>
          </form>
        </details>
      </section>

      <section className="card">
        {topicos.length === 0 ? (
          <p className="muted">
            Cadastre os tópicos no <Link href="/edital">edital</Link> para poder registrar o estudo.
          </p>
        ) : (
          <>
            <h2>Registrar estudo</h2>
            <FormEstudo topicos={topicos} topicoInicial={topicos.some((t) => t.id === topicoParam) ? topicoParam : undefined} />
          </>
        )}
      </section>

      <section className="card">
        <h2>Plano da semana</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Montado com as revisões agendadas e os tópicos mais urgentes, respeitando a sua meta diária.
        </p>
        {plano.every((d) => d.itens.length === 0) ? (
          <p className="vazio">
            Nada a planejar. Cadastre tópicos no <Link href="/edital">edital</Link>.
          </p>
        ) : (
          <div className="plano">
            {plano.map((d, i) => (
              <div key={d.data} className={`plano-dia${i === 0 ? " hoje" : ""}`}>
                <strong>{i === 0 ? "Hoje" : diaSemana(d.data)}</strong>
                {d.itens.length === 0 ? (
                  <span className="muted">Livre</span>
                ) : (
                  <ul>
                    {d.itens.map((it) => (
                      <li key={`${it.tipo}-${it.id}`}>
                        {it.tipo === "revisao" ? (
                          <Link href="/revisoes">
                            <span className="tag">Revisão</span> {it.nome}
                          </Link>
                        ) : (
                          <Link href={`/estudo?topico=${it.id}`}>{it.nome}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {d.minutos > 0 && <span className="muted">{formatarMinutos(d.minutos)}</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Últimas sessões</h2>
        {sessoes.length === 0 ? (
          <p className="vazio">Nada registrado ainda.</p>
        ) : (
          <ul className="lista">
            {sessoes.map((s) => (
              <li key={s.id}>
                <span>
                  <strong>{s.topicos?.nome ?? "Tópico"}</strong>{" "}
                  <span className="tag">{ROTULO_TIPO[s.tipo] ?? s.tipo}</span>
                </span>
                <span className="muted">
                  {formatarData(s.data)} · {formatarMinutos(s.minutos)}
                </span>
                <details className="editar">
                  <summary>Editar ou excluir</summary>
                  <form action={editarSessao} className="stack">
                    <input type="hidden" name="sessao_id" value={s.id} />
                    <div className="row">
                      <label style={{ flex: 1, minWidth: 120 }}>
                        Minutos
                        <input name="minutos" type="number" min={1} defaultValue={s.minutos} required />
                      </label>
                      <label style={{ flex: 1, minWidth: 140 }}>
                        Tipo
                        <select name="tipo" defaultValue={s.tipo}>
                          {Object.entries(ROTULO_TIPO).map(([valor, rotulo]) => (
                            <option key={valor} value={valor}>
                              {rotulo}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={{ flex: 1, minWidth: 140 }}>
                        Data
                        <input name="data" type="date" defaultValue={s.data} required />
                      </label>
                    </div>
                    <div className="acoes">
                      <button className="primario pequeno">Salvar alterações</button>
                      <BotaoConfirmar
                        className="perigo pequeno"
                        formAction={excluirSessao}
                        formNoValidate
                        mensagem="Excluir esta sessão de estudo?"
                      >
                        Excluir sessão
                      </BotaoConfirmar>
                    </div>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
