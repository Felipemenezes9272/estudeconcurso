import Link from "next/link";
import { criarFlashcard, editarFlashcard, excluirFlashcard } from "@/app/actions";
import BotaoConfirmar from "@/components/BotaoConfirmar";
import EstudoFlashcard from "@/components/EstudoFlashcard";
import type { TopicoOpcao } from "@/lib/consultas";
import { formatarData } from "@/lib/datas";

export type LinhaCartao = {
  id: string;
  frente: string;
  verso: string;
  proxima_revisao: string;
  intervalo_dias: number;
  topicos: { nome: string; materias: { nome: string } | null } | null;
};

export default function FlashcardsView({
  cartoes,
  topicos,
  hoje,
  ok,
  topicoSelecionado,
  reveladoInicial,
}: {
  cartoes: LinhaCartao[];
  topicos: TopicoOpcao[];
  hoje: string;
  ok?: boolean;
  topicoSelecionado?: string;
  reveladoInicial?: boolean;
}) {
  const vencidos = cartoes
    .filter((c) => c.proxima_revisao <= hoje)
    .sort((a, b) => a.proxima_revisao.localeCompare(b.proxima_revisao));
  const atual = vencidos[0];

  return (
    <>
      <h1>Flashcards</h1>
      <p className="subtitulo">
        {vencidos.length} para hoje · {cartoes.length} no total
      </p>

      {ok && <p className="aviso ok">Cartão criado. Ele já aparece nos cartões de hoje.</p>}

      <section className="card">
        <h2>Estudar</h2>
        {atual ? (
          <EstudoFlashcard
            key={atual.id}
            reveladoInicial={reveladoInicial}
            restantes={vencidos.length}
            cartao={{
              id: atual.id,
              frente: atual.frente,
              verso: atual.verso,
              contexto: `${atual.topicos?.materias?.nome ?? "—"} › ${atual.topicos?.nome ?? "Tópico"}`,
            }}
          />
        ) : (
          <p className="vazio">
            {cartoes.length === 0
              ? "Você ainda não tem cartões. Crie o primeiro logo abaixo."
              : "Nenhum cartão para hoje. Volte amanhã ou crie novos cartões."}
          </p>
        )}
      </section>

      <section className="card">
        <h2>Novo cartão</h2>
        {topicos.length === 0 ? (
          <p className="muted">
            Cadastre os tópicos no <Link href="/edital">edital</Link> para criar cartões.
          </p>
        ) : (
          <form action={criarFlashcard} className="stack">
            <label>
              Tópico
              <select name="topico_id" required defaultValue={topicoSelecionado ?? ""}>
                <option value="" disabled>
                  Escolha o tópico…
                </option>
                {topicos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Pergunta
              <textarea name="frente" rows={2} required placeholder="Ex.: Para que serve o habeas data?" />
            </label>
            <label>
              Resposta
              <textarea name="verso" rows={3} required />
            </label>
            <button className="primario">Criar cartão</button>
          </form>
        )}
      </section>

      {cartoes.length > 0 && (
        <section className="card">
          <details>
            <summary>Todos os cartões ({cartoes.length})</summary>
            <ul className="lista">
              {cartoes.map((c) => (
                <li key={c.id}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <strong>{c.frente}</strong>
                    <div className="muted" style={{ fontSize: "0.9rem" }}>
                      {c.topicos?.materias?.nome} › {c.topicos?.nome} ·{" "}
                      <span className={`tag${c.proxima_revisao <= hoje ? " atrasada" : ""}`}>
                        {c.proxima_revisao <= hoje ? "vence hoje" : `próxima: ${formatarData(c.proxima_revisao)}`}
                      </span>
                    </div>
                  </div>
                  <details className="editar">
                    <summary>Editar ou excluir</summary>
                    <form action={editarFlashcard} className="stack">
                      <input type="hidden" name="flashcard_id" value={c.id} />
                      <label>
                        Pergunta
                        <textarea name="frente" rows={2} defaultValue={c.frente} required />
                      </label>
                      <label>
                        Resposta
                        <textarea name="verso" rows={3} defaultValue={c.verso} required />
                      </label>
                      <div className="acoes">
                        <button className="primario pequeno">Salvar alterações</button>
                        <BotaoConfirmar
                          className="perigo pequeno"
                          formAction={excluirFlashcard}
                          formNoValidate
                          mensagem="Excluir este cartão?"
                        >
                          Excluir cartão
                        </BotaoConfirmar>
                      </div>
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </>
  );
}
