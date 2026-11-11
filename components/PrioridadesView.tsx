import Link from "next/link";
import { definirIncidencia } from "@/app/actions";
import type { ItemPrioridade } from "@/lib/prioridades";

export type ConcursoAba = { id: string; nome: string; pendentes: number };

export type MateriaGrupo = {
  id: string;
  nome: string;
  peso: number;
  total: number;
  concluidos: number;
  pendentes: number;
  maiorScore: number;
  itens: ItemPrioridade[];
};

const ROTULO_INCIDENCIA: Record<number, string> = {
  1: "raramente",
  2: "pouco",
  3: "às vezes",
  4: "muito",
  5: "sempre",
};

const pontos = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

function classeDoMotivo(i: ItemPrioridade) {
  if (i.taxa !== null && i.taxa < 70) return "atrasada";
  if (i.status === "concluido") return "concluido";
  if (i.status === "estudando") return "estudando";
  return "";
}

export default function PrioridadesView({
  concursos,
  selecionado,
  ranking,
  materias,
}: {
  concursos: ConcursoAba[];
  selecionado?: string;
  ranking: ItemPrioridade[];
  materias: MateriaGrupo[];
}) {
  if (concursos.length === 0) {
    return (
      <>
        <h1>O que estudar primeiro</h1>
        <section className="card">
          <p className="vazio">Cadastre um concurso e os tópicos para ver o que estudar primeiro.</p>
          <p style={{ marginBottom: 0 }}>
            <Link href="/edital" className="botao primario">
              Ir para o edital
            </Link>
          </p>
        </section>
      </>
    );
  }

  const maior = Math.max(...materias.flatMap((m) => m.itens.map((i) => i.score)), 1);
  const total = materias.reduce((soma, m) => soma + m.total, 0);
  const nomeDoEdital = concursos.find((c) => c.id === selecionado)?.nome ?? "";

  return (
    <>
      <h1>O que estudar primeiro</h1>
      <p className="subtitulo">Por edital e por matéria, segundo o que cai na prova e onde você erra.</p>

      <nav className="subabas" aria-label="Editais">
        {concursos.map((c) => (
          <Link
            key={c.id}
            href={`/prioridades?concurso=${c.id}`}
            className={c.id === selecionado ? "ativa" : undefined}
            aria-current={c.id === selecionado ? "page" : undefined}
          >
            {c.nome}
            {c.pendentes > 0 && <span className="contagem">{c.pendentes}</span>}
          </Link>
        ))}
      </nav>

      <section className="card">
        <h2>Estude primeiro em {nomeDoEdital}</h2>
        {total === 0 ? (
          <p className="vazio">
            Este edital ainda não tem tópicos. Cadastre-os em <Link href="/edital">Meu edital</Link>.
          </p>
        ) : ranking.length === 0 ? (
          <p className="vazio">Tudo concluído e com bom desempenho neste edital. Bom trabalho!</p>
        ) : (
          <ol className="ranking">
            {ranking.map((i, pos) => (
              <li key={i.id}>
                <span className="posicao">{pos + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{i.nome}</strong>
                  <div className="muted" style={{ fontSize: "0.9rem" }}>
                    {i.materia} · cai {ROTULO_INCIDENCIA[i.incidencia]} · peso {i.peso} ·{" "}
                    <span className={`tag ${classeDoMotivo(i)}`}>{i.motivo}</span>
                  </div>
                  <div className="barra" style={{ marginTop: 6 }}>
                    <span style={{ width: `${Math.round((i.score / maior) * 100)}%` }} />
                  </div>
                </div>
                <span className="pontos" title="incidência × peso × desempenho">
                  {pontos(i.score)}
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="muted" style={{ fontSize: "0.85rem", margin: "12px 0 0" }}>
          Pontuação = incidência × peso da matéria × desempenho. Tópicos com 5 questões ou mais passam a
          considerar o seu acerto; quanto menor, maior a prioridade.
        </p>
      </section>

      {total > 0 && (
        <section className="card">
          <h2>Por matéria</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            As matérias com os tópicos mais urgentes vêm primeiro. Em cada tópico, toque de 1 (raramente) a 5
            (sempre) para dizer quanto ele cai na prova.
          </p>
          {materias.map((m, idx) => (
            <details key={m.id} open={idx === 0}>
              <summary>
                {m.nome}{" "}
                <span className="muted">
                  · peso {m.peso} · {m.concluidos}/{m.total} concluídos
                  {m.pendentes > 0 ? ` · ${m.pendentes} para estudar` : " · em dia"}
                </span>
              </summary>
              <ul className="lista">
                {m.itens.map((i) => (
                  <li key={i.id} style={i.prioritario ? undefined : { opacity: 0.75 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <strong>{i.nome}</strong>
                      <div className="muted" style={{ fontSize: "0.9rem" }}>
                        <span className={`tag ${classeDoMotivo(i)}`}>{i.motivo}</span> · {pontos(i.score)} pontos
                      </div>
                      <div className="barra" style={{ marginTop: 6 }}>
                        <span style={{ width: `${Math.round((i.score / maior) * 100)}%` }} />
                      </div>
                    </div>
                    <form action={definirIncidencia} className="escala" aria-label={`Quanto ${i.nome} cai na prova`}>
                      <input type="hidden" name="topico_id" value={i.id} />
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          name="incidencia"
                          value={n}
                          className={`pequeno${n === i.incidencia ? " primario" : ""}`}
                          aria-pressed={n === i.incidencia}
                          title={`Cai ${ROTULO_INCIDENCIA[n]}`}
                        >
                          {n}
                        </button>
                      ))}
                    </form>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>
      )}
    </>
  );
}
