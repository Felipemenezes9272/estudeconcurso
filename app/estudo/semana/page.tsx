import Link from "next/link";
import { carregarEntradasPrioridade } from "@/lib/consultas";
import { formatarData, formatarMinutos, hoje, somarDias } from "@/lib/datas";
import { ranquear } from "@/lib/prioridades";
import { resumirSemana, variacao } from "@/lib/semana";
import { createClient } from "@/lib/supabase/server";

type Materia = { topicos: { materias: { nome: string } | null } | null };

function Delta({ atual, anterior, menorMelhor }: { atual: number; anterior: number; menorMelhor?: boolean }) {
  const v = variacao(atual, anterior);
  if (v === null) return <span className="muted">{atual > 0 ? "sem semana anterior para comparar" : ""}</span>;
  if (v === 0) return <span className="muted">= igual à semana anterior</span>;
  const subiu = v > 0;
  const bom = menorMelhor ? !subiu : subiu;
  return (
    <span className={bom ? "delta bom" : "delta ruim"}>
      {subiu ? "▲" : "▼"} {Math.abs(v)}% vs semana anterior
    </span>
  );
}

const diaCurto = (data: string) =>
  new Date(`${data}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" }).replace(".", "");

export default async function RetrospectivaPage() {
  const supabase = await createClient();
  const dia = hoje();
  const desde = somarDias(dia, -13);

  const [sessoes, questoes, revisoes, erros, cartoes, entradas] = await Promise.all([
    supabase
      .from("sessoes_estudo")
      .select("data, minutos, topicos(materias(nome))")
      .is("deleted_at", null)
      .gte("data", desde)
      .limit(2000),
    supabase
      .from("registros_questoes")
      .select("data, total, acertos, topicos(materias(nome))")
      .is("deleted_at", null)
      .gte("data", desde)
      .limit(2000),
    supabase.from("revisoes").select("data_feita").is("deleted_at", null).gte("data_feita", desde).limit(2000),
    supabase.from("erros").select("data").is("deleted_at", null).gte("data", desde).limit(2000),
    supabase.from("flashcards").select("ultima_revisao").is("deleted_at", null).gte("ultima_revisao", desde).limit(5000),
    carregarEntradasPrioridade(supabase),
  ]);

  const nome = (l: Materia) => l.topicos?.materias?.nome ?? "Sem matéria";
  const r = resumirSemana(dia, {
    sessoes: ((sessoes.data ?? []) as unknown as (Materia & { data: string; minutos: number })[]).map((s) => ({
      data: s.data,
      minutos: s.minutos,
      materia: nome(s),
    })),
    questoes: ((questoes.data ?? []) as unknown as (Materia & { data: string; total: number; acertos: number })[]).map(
      (q) => ({ data: q.data, total: q.total, acertos: q.acertos, materia: nome(q) }),
    ),
    revisoesFeitas: ((revisoes.data ?? []) as { data_feita: string }[]).map((x) => x.data_feita),
    errosRegistrados: ((erros.data ?? []) as { data: string }[]).map((x) => x.data),
    cartoesRevisados: ((cartoes.data ?? []) as { ultima_revisao: string }[]).map((x) => x.ultima_revisao),
  });

  const a = r.atual;
  const p = r.anterior;
  const maior = Math.max(...r.dias.map((d) => d.minutos), 1);
  const proximos = ranquear(entradas, 3);
  const semNada = a.sessoes === 0 && a.questoes === 0 && a.revisoes === 0 && a.cartoes === 0;

  return (
    <>
      <h1>Retrospectiva da semana</h1>
      <p className="subtitulo">
        De {formatarData(r.inicio)} a {formatarData(dia)}, comparado com os 7 dias anteriores.
      </p>

      {semNada ? (
        <section className="card">
          <p className="vazio">Nada registrado nos últimos 7 dias. Que tal começar com 25 minutos hoje?</p>
          <p style={{ marginBottom: 0 }}>
            <Link href="/estudo" className="botao primario">
              Ir para o estudo de hoje
            </Link>
          </p>
        </section>
      ) : (
        <>
          <div className="grid">
            <div className="stat">
              <div className="valor">{formatarMinutos(a.minutos)}</div>
              <div className="rotulo">
                estudados em {a.diasEstudados} {a.diasEstudados === 1 ? "dia" : "dias"}
                <br />
                <Delta atual={a.minutos} anterior={p.minutos} />
              </div>
            </div>
            <div className="stat">
              <div className="valor">{a.taxa === null ? "—" : `${a.taxa}%`}</div>
              <div className="rotulo">
                de acerto em {a.questoes} {a.questoes === 1 ? "questão" : "questões"}
                <br />
                {a.taxa !== null && p.taxa !== null ? (
                  <Delta atual={a.taxa} anterior={p.taxa} />
                ) : (
                  <span className="muted">{a.questoes === 0 ? "nenhuma questão feita" : ""}</span>
                )}
              </div>
            </div>
            <div className="stat">
              <div className="valor">{a.revisoes + a.cartoes}</div>
              <div className="rotulo">
                revisões e cartões feitos
                <br />
                <span className="muted">
                  {a.revisoes} revisões · {a.cartoes} cartões
                </span>
              </div>
            </div>
            <div className="stat">
              <div className="valor">{a.erros}</div>
              <div className="rotulo">
                erros no caderno
                <br />
                <Delta atual={a.erros} anterior={p.erros} menorMelhor />
              </div>
            </div>
          </div>

          <section className="card">
            <h2>Minutos por dia</h2>
            <div className="semana-barras" role="img" aria-label="Minutos estudados em cada um dos últimos 7 dias">
              {r.dias.map((d) => (
                <div key={d.data} className="semana-dia">
                  <span className="semana-min">{d.minutos > 0 ? d.minutos : ""}</span>
                  <div className="semana-coluna">
                    <span style={{ height: `${Math.round((d.minutos / maior) * 100)}%` }} />
                  </div>
                  <span className="semana-rotulo">{diaCurto(d.data)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Destaques</h2>
            <ul className="lista">
              {r.materiaMaisEstudada && (
                <li>
                  <span>
                    Matéria mais estudada: <strong>{r.materiaMaisEstudada.nome}</strong>
                  </span>
                  <span className="muted">{formatarMinutos(r.materiaMaisEstudada.minutos)}</span>
                </li>
              )}
              {r.melhorDia && (
                <li>
                  <span>
                    Dia mais produtivo: <strong>{formatarData(r.melhorDia.data)}</strong>
                  </span>
                  <span className="muted">{formatarMinutos(r.melhorDia.minutos)}</span>
                </li>
              )}
              {r.materiaPiorAcerto && (
                <li>
                  <span>
                    Matéria para reforçar: <strong>{r.materiaPiorAcerto.nome}</strong>
                  </span>
                  <span className="muted">
                    {r.materiaPiorAcerto.taxa}% em {r.materiaPiorAcerto.questoes} questões
                  </span>
                </li>
              )}
              {!r.materiaMaisEstudada && !r.melhorDia && !r.materiaPiorAcerto && (
                <li>
                  <span className="muted">Registre estudo e questões para ver destaques.</span>
                </li>
              )}
            </ul>
          </section>
        </>
      )}

      <section className="card">
        <h2>Para a próxima semana</h2>
        {proximos.length === 0 ? (
          <p className="vazio">Tudo em dia. Cadastre novos tópicos ou revise o que já concluiu.</p>
        ) : (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Os tópicos mais urgentes pela sua pontuação de prioridade:
            </p>
            <ol className="ranking">
              {proximos.map((i, pos) => (
                <li key={i.id}>
                  <span className="posicao">{pos + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/estudo?topico=${i.id}`}>
                      <strong>{i.nome}</strong>
                    </Link>
                    <div className="muted" style={{ fontSize: "0.9rem" }}>
                      {i.materia} · {i.motivo}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </>
  );
}
