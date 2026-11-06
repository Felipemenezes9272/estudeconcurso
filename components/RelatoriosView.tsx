import Link from "next/link";
import { formatarData, formatarMinutos } from "@/lib/datas";
import { PERIODOS, type Relatorio } from "@/lib/relatorios";

/** Só destacamos "ponto fraco" quando o acerto realmente está baixo. */
const LIMITE_PONTO_FRACO = 70;

export default function RelatoriosView({ relatorio, dias }: { relatorio: Relatorio; dias: number }) {
  const { porDia, porMateria, pontoFraco } = relatorio;
  const maior = Math.max(...porDia.map((d) => d.minutos), 1);
  const primeiro = porDia[0]?.data;
  const ultimo = porDia[porDia.length - 1]?.data;
  const semDados = relatorio.minutos === 0 && relatorio.total === 0;

  return (
    <>
      <h1>Relatórios</h1>
      <div className="row" style={{ margin: "8px 0 20px" }}>
        {PERIODOS.map((p) => (
          <Link
            key={p}
            href={`/relatorios?dias=${p}`}
            className={`tag filtro${p === dias ? " ativo" : ""}`}
            aria-current={p === dias ? "true" : undefined}
          >
            Últimos {p} dias
          </Link>
        ))}
      </div>

      <div className="grid">
        <div className="stat">
          <div className="valor">{formatarMinutos(relatorio.minutos)}</div>
          <div className="rotulo">estudadas no período</div>
        </div>
        <div className="stat">
          <div className="valor">
            {relatorio.diasEstudados}
            <span className="muted" style={{ fontSize: "1rem", fontWeight: 500 }}>
              {" "}
              / {dias}
            </span>
          </div>
          <div className="rotulo">dias com estudo</div>
        </div>
        <div className="stat">
          <div className="valor">{relatorio.taxa === null ? "—" : `${relatorio.taxa}%`}</div>
          <div className="rotulo">
            de acerto ({relatorio.acertos}/{relatorio.total} questões)
          </div>
        </div>
      </div>

      {semDados && (
        <p className="vazio" style={{ marginBottom: 16 }}>
          Nada registrado neste período. Registre sessões de estudo e questões para ver a evolução.
        </p>
      )}

      {pontoFraco && pontoFraco.taxa !== null && pontoFraco.taxa < LIMITE_PONTO_FRACO && (
        <p className="aviso atencao">
          <strong>Ponto de atenção:</strong> {pontoFraco.nome} tem {pontoFraco.taxa}% de acerto em{" "}
          {pontoFraco.total} questões. Vale reforçar essa matéria e conferir o{" "}
          <Link href="/erros">caderno de erros</Link>.
        </p>
      )}

      {!semDados && (
      <section className="card">
        <h2>Tempo de estudo por dia</h2>
        <div
          className="grafico"
          role="img"
          aria-label={`Minutos estudados por dia, de ${primeiro && formatarData(primeiro)} a ${ultimo && formatarData(ultimo)}. Maior dia: ${formatarMinutos(maior)}.`}
        >
          {porDia.map((d) => (
            <div key={d.data} className="coluna" title={`${formatarData(d.data)}: ${formatarMinutos(d.minutos)}`}>
              <span
                className={d.minutos > 0 ? "barra-dia" : "barra-dia vazia"}
                style={{ height: `${d.minutos > 0 ? Math.max(4, (d.minutos / maior) * 100) : 2}%` }}
              />
            </div>
          ))}
        </div>
        <div className="eixo muted">
          <span>{primeiro && formatarData(primeiro)}</span>
          <span>Maior dia: {formatarMinutos(maior)}</span>
          <span>{ultimo && formatarData(ultimo)}</span>
        </div>
      </section>
      )}

      <section className="card">
        <h2>Por matéria</h2>
        {porMateria.length === 0 ? (
          <p className="vazio">Cadastre matérias e tópicos no edital.</p>
        ) : (
          <ul className="lista">
            {porMateria.map((m) => {
              const pct = m.topicos > 0 ? Math.round((m.concluidos / m.topicos) * 100) : 0;
              const fraca = m.taxa !== null && m.taxa < LIMITE_PONTO_FRACO && m.total >= 10;
              return (
                <li key={m.nome} style={{ display: "block" }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <strong>{m.nome}</strong>
                    <span className="muted">{formatarMinutos(m.minutos)}</span>
                  </div>
                  <div className="row" style={{ margin: "6px 0" }}>
                    <span className={`tag ${fraca ? "atrasada" : m.taxa !== null && m.taxa >= 80 ? "concluido" : ""}`}>
                      {m.taxa === null ? "sem questões" : `${m.taxa}% de acerto (${m.acertos}/${m.total})`}
                    </span>
                    <span className="muted" style={{ fontSize: "0.85rem" }}>
                      edital: {m.concluidos}/{m.topicos} tópicos
                    </span>
                  </div>
                  <div className="barra">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
