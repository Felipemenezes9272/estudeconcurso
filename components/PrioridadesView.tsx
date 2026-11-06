import Link from "next/link";
import { definirIncidencia } from "@/app/actions";
import type { ItemPrioridade } from "@/lib/prioridades";

export type MateriaEdicao = {
  nome: string;
  peso: number;
  topicos: { id: string; nome: string; incidencia: number }[];
};

const ROTULO_INCIDENCIA: Record<number, string> = {
  1: "raramente",
  2: "pouco",
  3: "às vezes",
  4: "muito",
  5: "sempre",
};

export default function PrioridadesView({
  ranking,
  materias,
}: {
  ranking: ItemPrioridade[];
  materias: MateriaEdicao[];
}) {
  const maior = Math.max(...ranking.map((i) => i.score), 1);
  const total = materias.reduce((soma, m) => soma + m.topicos.length, 0);

  return (
    <>
      <h1>Prioridades</h1>
      <p className="subtitulo">O que estudar primeiro, segundo o que cai na prova e onde você erra</p>

      <section className="card">
        <h2>Estude primeiro</h2>
        {total === 0 ? (
          <p className="vazio">
            Cadastre os tópicos no <Link href="/edital">edital</Link> para ver as prioridades.
          </p>
        ) : ranking.length === 0 ? (
          <p className="vazio">Tudo concluído e com bom desempenho. Bom trabalho!</p>
        ) : (
          <ol className="ranking">
            {ranking.map((i, pos) => (
              <li key={i.id}>
                <span className="posicao">{pos + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{i.nome}</strong>
                  <div className="muted" style={{ fontSize: "0.9rem" }}>
                    {i.materia} · cai {ROTULO_INCIDENCIA[i.incidencia]} · peso {i.peso} ·{" "}
                    <span className={`tag ${i.taxa !== null && i.taxa < 70 ? "atrasada" : i.motivo === "Em andamento" ? "estudando" : ""}`}>
                      {i.motivo}
                    </span>
                  </div>
                  <div className="barra" style={{ marginTop: 6 }}>
                    <span style={{ width: `${Math.round((i.score / maior) * 100)}%` }} />
                  </div>
                </div>
                <span className="pontos" title="incidência × peso × desempenho">
                  {i.score.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
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
          <h2>Quanto cada tópico cai na prova</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Toque em 1 (raramente) a 5 (sempre). Se tiver acesso a provas anteriores da banca, use-as para
            calibrar.
          </p>
          {materias.map((m) => (
            <details key={m.nome}>
              <summary>
                {m.nome} <span className="muted">· {m.topicos.length} tópico(s) · peso {m.peso}</span>
              </summary>
              <ul className="lista">
                {m.topicos.map((t) => (
                  <li key={t.id}>
                    <span style={{ flex: 1, minWidth: 160 }}>{t.nome}</span>
                    <form action={definirIncidencia} className="escala" aria-label={`Incidência de ${t.nome}`}>
                      <input type="hidden" name="topico_id" value={t.id} />
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          name="incidencia"
                          value={n}
                          className={`pequeno${n === t.incidencia ? " primario" : ""}`}
                          aria-pressed={n === t.incidencia}
                          title={ROTULO_INCIDENCIA[n]}
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
