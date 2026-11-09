import Link from "next/link";
import { notFound } from "next/navigation";
import { excluirSimulado, finalizarSimulado, refazerSimulado } from "@/app/actions";
import BotaoConfirmar from "@/components/BotaoConfirmar";
import { LETRAS } from "@/lib/simulados";
import { createClient } from "@/lib/supabase/server";

type Questao = {
  id: string;
  ordem: number;
  enunciado: string;
  alternativas: string[];
  // Só vêm do banco depois que o simulado é corrigido (para não aparecerem no navegador antes).
  correta?: number;
  explicacao?: string | null;
  resposta?: number | null;
};

export default async function SimuladoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: simulado } = await supabase
    .from("simulados")
    .select("id, titulo, tipo, total, acertos, finalizado_em")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!simulado) notFound();

  const corrigido = Boolean(simulado.finalizado_em);
  const { data } = await supabase
    .from("simulado_questoes")
    .select(
      corrigido
        ? "id, ordem, enunciado, alternativas, correta, explicacao, resposta"
        : "id, ordem, enunciado, alternativas",
    )
    .eq("simulado_id", id)
    .order("ordem");
  const questoes = (data ?? []) as unknown as Questao[];

  const rotulo = (i: number) => (simulado.tipo === "certo_errado" ? "" : `${LETRAS[i]}) `);
  const pct = simulado.total > 0 ? Math.round(((simulado.acertos ?? 0) / simulado.total) * 100) : 0;

  return (
    <>
      <h1>{simulado.titulo}</h1>
      <p className="subtitulo">
        <Link href="/simulados">← Todos os simulados</Link>
      </p>

      {corrigido && (
        <section className="card">
          <div className="grid">
            <div className="stat destaque">
              <div className="valor">{pct}%</div>
              <div className="rotulo">
                de acerto ({simulado.acertos}/{simulado.total})
              </div>
            </div>
          </div>
          <div className="acoes" style={{ marginTop: 12 }}>
            <form action={refazerSimulado}>
              <input type="hidden" name="simulado_id" value={simulado.id} />
              <button className="primario">Refazer simulado</button>
            </form>
          </div>
        </section>
      )}

      {corrigido ? (
        questoes.map((q, n) => (
          <section key={q.id} className="card">
            <p style={{ margin: "0 0 10px", whiteSpace: "pre-wrap" }}>
              <strong>{n + 1}.</strong> {q.enunciado}
            </p>
            <ul className="lista">
              {q.alternativas.map((a, i) => {
                const certa = i === q.correta;
                const marcada = i === q.resposta;
                return (
                  <li key={i} className={`opcao${certa ? " certa" : marcada ? " errada" : ""}`}>
                    <span>
                      {rotulo(i)}
                      {a}
                    </span>
                    {certa && <span className="tag concluido">Correta</span>}
                    {marcada && !certa && <span className="tag atrasada">Sua resposta</span>}
                    {marcada && certa && <span className="tag">Sua resposta</span>}
                  </li>
                );
              })}
            </ul>
            {q.resposta === null || q.resposta === undefined ? (
              <p className="muted">Você não respondeu esta questão.</p>
            ) : null}
            {q.explicacao && (
              <p className="aviso info" style={{ marginBottom: 0 }}>
                {q.explicacao}
              </p>
            )}
          </section>
        ))
      ) : (
        <form action={finalizarSimulado} className="stack">
          <input type="hidden" name="simulado_id" value={simulado.id} />
          {questoes.map((q, n) => (
            <section key={q.id} className="card">
              <p style={{ margin: "0 0 10px", whiteSpace: "pre-wrap" }}>
                <strong>{n + 1}.</strong> {q.enunciado}
              </p>
              <div className="stack">
                {q.alternativas.map((a, i) => (
                  <label key={i} className="escolha">
                    <input type="radio" name={`r_${q.id}`} value={i} />
                    <span>
                      {rotulo(i)}
                      {a}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ))}
          <button className="primario">Finalizar e ver o resultado</button>
          <p className="muted">Questões em branco contam como erradas.</p>
        </form>
      )}

      <form action={excluirSimulado} style={{ marginTop: 16 }}>
        <input type="hidden" name="simulado_id" value={simulado.id} />
        <BotaoConfirmar className="perigo pequeno" mensagem="Excluir este simulado e o resultado dele?">
          Excluir simulado
        </BotaoConfirmar>
      </form>
    </>
  );
}
