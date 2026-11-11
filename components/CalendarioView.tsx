"use client";

import Link from "next/link";
import { useState } from "react";
import { criarEvento, editarEvento, excluirEvento } from "@/app/actions";
import BotaoConfirmar from "@/components/BotaoConfirmar";
import {
  DIAS_SEMANA,
  NOMES_MESES,
  ROTULO_EVENTO,
  TIPOS_EVENTO,
  chaveMes,
  distanciaTexto,
  gradeDoMes,
  mesVizinho,
  type TipoEvento,
} from "@/lib/calendario";

export type EventoCal = {
  id: string;
  titulo: string;
  data: string;
  tipo: TipoEvento;
  observacao: string | null;
  concurso_id: string | null;
  concurso_nome: string | null;
  /** Vem da data da prova do concurso (editada no Edital), não de um evento próprio. */
  virtual?: boolean;
};

export type ConcursoOpcao = { id: string; nome: string };

function dataLonga(data: string): string {
  return new Date(`${data}T12:00:00Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const dataCurta = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

function CamposEvento({
  evento,
  data,
  concursos,
}: {
  evento?: EventoCal;
  data: string;
  concursos: ConcursoOpcao[];
}) {
  return (
    <>
      <label>
        Título
        <input name="titulo" defaultValue={evento?.titulo ?? ""} required placeholder="Ex.: Fim das inscrições" />
      </label>
      <div className="row">
        <label style={{ flex: 1, minWidth: 140 }}>
          Data
          <input name="data" type="date" defaultValue={evento?.data ?? data} required />
        </label>
        <label style={{ flex: 1, minWidth: 140 }}>
          Tipo
          <select name="tipo" defaultValue={evento?.tipo ?? "outro"}>
            {TIPOS_EVENTO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Concurso (opcional)
        <select name="concurso_id" defaultValue={evento?.concurso_id ?? ""}>
          <option value="">Nenhum</option>
          {concursos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>
      <label>
        Observação (opcional)
        <input name="observacao" defaultValue={evento?.observacao ?? ""} />
      </label>
    </>
  );
}

export default function CalendarioView({
  ano,
  mes,
  hoje,
  eventos,
  revisoes,
  concursos,
  proximos,
}: {
  ano: number;
  mes: number;
  hoje: string;
  eventos: EventoCal[];
  revisoes: Record<string, number>;
  concursos: ConcursoOpcao[];
  proximos: EventoCal[];
}) {
  const prefixo = chaveMes(ano, mes);
  const [escolhido, setEscolhido] = useState<string>(hoje.startsWith(prefixo) ? hoje : `${prefixo}-01`);
  // Ao trocar de mês, o dia escolhido de outro mês deixa de valer.
  const selecionado = escolhido.startsWith(prefixo) ? escolhido : hoje.startsWith(prefixo) ? hoje : `${prefixo}-01`;

  const grade = gradeDoMes(ano, mes);
  const anterior = mesVizinho(ano, mes, -1);
  const seguinte = mesVizinho(ano, mes, 1);

  const porDia = new Map<string, EventoCal[]>();
  for (const e of eventos) porDia.set(e.data, [...(porDia.get(e.data) ?? []), e]);

  const doDia = porDia.get(selecionado) ?? [];
  const revisoesDoDia = revisoes[selecionado] ?? 0;

  return (
    <>
      <section className="card">
        <div className="cal-topo">
          <Link className="cal-nav" href={`/calendario?mes=${chaveMes(anterior.ano, anterior.mes)}`} aria-label="Mês anterior">
            ‹
          </Link>
          <h2 style={{ margin: 0, textTransform: "capitalize" }}>
            {NOMES_MESES[mes - 1]} de {ano}
          </h2>
          <Link className="cal-nav" href={`/calendario?mes=${chaveMes(seguinte.ano, seguinte.mes)}`} aria-label="Próximo mês">
            ›
          </Link>
          <Link className="cal-hoje" href="/calendario">
            Hoje
          </Link>
        </div>

        <div className="cal-grade" role="grid" aria-label={`${NOMES_MESES[mes - 1]} de ${ano}`}>
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="cal-semana">
              {d}
            </div>
          ))}
          {grade.flat().map((c) => {
            const evs = porDia.get(c.data) ?? [];
            const nRev = revisoes[c.data] ?? 0;
            const classes = [
              "cal-dia",
              c.doMes ? "" : "fora",
              c.data === hoje ? "hoje" : "",
              c.data === selecionado ? "sel" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={c.data}
                type="button"
                className={classes}
                onClick={() => {
                  if (c.doMes) setEscolhido(c.data);
                }}
                aria-pressed={c.data === selecionado}
                aria-label={`${dataLonga(c.data)}${evs.length ? `, ${evs.length} evento(s)` : ""}`}
                disabled={!c.doMes}
              >
                <span className="cal-num">{Number(c.data.slice(8, 10))}</span>
                <span className="cal-pontos">
                  {evs.slice(0, 4).map((e) => (
                    <span key={e.id} className={`ponto ev-${e.tipo}`} />
                  ))}
                  {nRev > 0 && <span className="ponto ev-revisao" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="cal-legenda">
          {TIPOS_EVENTO.map((t) => (
            <span key={t.valor}>
              <span className={`ponto ev-${t.valor}`} /> {t.rotulo}
            </span>
          ))}
          <span>
            <span className="ponto ev-revisao" /> Revisões
          </span>
        </div>
      </section>

      <section className="card">
        <h2 style={{ textTransform: "capitalize" }}>{dataLonga(selecionado)}</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {selecionado === hoje ? "Hoje" : distanciaTexto(hoje, selecionado)}
        </p>

        {doDia.length === 0 && revisoesDoDia === 0 && <p className="vazio">Nada marcado para este dia.</p>}

        {revisoesDoDia > 0 && (
          <p>
            <span className="ponto ev-revisao" /> {revisoesDoDia} {revisoesDoDia === 1 ? "revisão agendada" : "revisões agendadas"}{" "}
            · <Link href="/revisoes">ver revisões</Link>
          </p>
        )}

        {doDia.length > 0 && (
          <ul className="lista">
            {doDia.map((e) => (
              <li key={e.id}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <span className={`ponto ev-${e.tipo}`} /> <strong>{e.titulo}</strong>
                  <div className="muted" style={{ fontSize: "0.9rem" }}>
                    {ROTULO_EVENTO[e.tipo]}
                    {e.concurso_nome ? ` · ${e.concurso_nome}` : ""}
                    {e.observacao ? ` · ${e.observacao}` : ""}
                  </div>
                </div>
                {e.virtual ? (
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    Data da prova do concurso (altere no <Link href="/edital">Edital</Link>)
                  </span>
                ) : (
                  <details className="editar">
                    <summary>Editar ou excluir</summary>
                    <form action={editarEvento} className="stack">
                      <input type="hidden" name="evento_id" value={e.id} />
                      <CamposEvento evento={e} data={selecionado} concursos={concursos} />
                      <div className="acoes">
                        <button className="primario pequeno">Salvar alterações</button>
                        <BotaoConfirmar
                          className="perigo pequeno"
                          formAction={excluirEvento}
                          formNoValidate
                          mensagem={`Excluir o evento "${e.titulo}"?`}
                        >
                          Excluir evento
                        </BotaoConfirmar>
                      </div>
                    </form>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}

        <details className="editar" style={{ marginTop: 12 }}>
          <summary>+ Adicionar evento neste dia</summary>
          <form action={criarEvento} className="stack" key={selecionado}>
            <CamposEvento data={selecionado} concursos={concursos} />
            <div>
              <button className="primario pequeno">Adicionar ao calendário</button>
            </div>
          </form>
        </details>
      </section>

      <section className="card">
        <h2>Próximas datas</h2>
        {proximos.length === 0 ? (
          <p className="vazio">
            Nenhuma data futura. Importe um edital em PDF e as datas dele entram aqui sozinhas.
          </p>
        ) : (
          <ul className="lista">
            {proximos.map((e) => (
              <li key={`${e.id}-${e.data}`}>
                <span>
                  <span className={`ponto ev-${e.tipo}`} /> <strong>{e.titulo}</strong>
                  {e.concurso_nome && <span className="muted"> · {e.concurso_nome}</span>}
                </span>
                <span className="muted">
                  {dataCurta(e.data)} · {distanciaTexto(hoje, e.data)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
