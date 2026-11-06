import { concluirRevisao } from "@/app/actions";
import { formatarData } from "@/lib/datas";
import type { RevisaoPendente } from "@/lib/consultas";

export default function ListaRevisoes({
  revisoes,
  hoje,
  vazio,
}: {
  revisoes: RevisaoPendente[];
  hoje: string;
  vazio: string;
}) {
  if (revisoes.length === 0) return <p className="vazio">{vazio}</p>;

  return (
    <ul className="lista">
      {revisoes.map((r) => {
        const atrasada = r.data_prevista < hoje;
        const podeFazer = r.data_prevista <= hoje;
        return (
          <li key={r.id}>
            <div>
              <strong>{r.topicos?.nome ?? "Tópico"}</strong>
              <div className="muted" style={{ fontSize: "0.9rem" }}>
                {r.topicos?.materias?.nome} · revisão de {r.intervalo_dias} dia(s){" "}
                {atrasada ? (
                  <span className="tag atrasada">atrasada desde {formatarData(r.data_prevista)}</span>
                ) : (
                  <span className="tag">{formatarData(r.data_prevista)}</span>
                )}
              </div>
            </div>
            {podeFazer && (
              <form action={concluirRevisao} className="row">
                <input type="hidden" name="revisao_id" value={r.id} />
                <button name="resultado" value="facil" className="pequeno facil">
                  Fácil
                </button>
                <button name="resultado" value="medio" className="pequeno medio">
                  Médio
                </button>
                <button name="resultado" value="dificil" className="pequeno dificil">
                  Difícil
                </button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
