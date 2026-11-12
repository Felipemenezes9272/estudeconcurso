import Link from "next/link";
import { alterarStatusTopico, excluirConteudo, salvarAnotacao } from "@/app/actions";
import BotaoConfirmar from "@/components/BotaoConfirmar";
import PesquisaIA from "@/components/PesquisaIA";
import TextoEstudo from "@/components/TextoEstudo";
import { listarTopicosParaSelecao } from "@/lib/consultas";
import { formatarData, formatarMinutos, hoje } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

const ROTULO_STATUS: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  estudando: "Estudando",
  concluido: "Concluído",
};
const PROXIMO: Record<string, string> = {
  nao_iniciado: "estudando",
  estudando: "concluido",
  concluido: "nao_iniciado",
};

export default async function EstudoPorTopicoPage({
  searchParams,
}: {
  searchParams: Promise<{ topico?: string; ok?: string }>;
}) {
  const { topico: id, ok } = await searchParams;
  const supabase = await createClient();
  const opcoes = await listarTopicosParaSelecao(supabase);
  const escolhido = opcoes.find((o) => o.id === id);

  const seletor = (
    <form method="get" className="row">
      <label style={{ flex: 1, minWidth: 220 }}>
        Tópico
        <select name="topico" defaultValue={escolhido?.id ?? ""} required>
          <option value="" disabled>
            Escolha o tópico…
          </option>
          {opcoes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </label>
      <button className="primario">Abrir tópico</button>
    </form>
  );

  if (!escolhido) {
    return (
      <>
        <h1>Estudo por tópico</h1>
        <p className="subtitulo">Tudo sobre um tópico em um só lugar: tempo, questões, revisões, cartões, erros e anotações.</p>
        <section className="card">
          {opcoes.length === 0 ? (
            <p className="vazio">
              Cadastre tópicos no <Link href="/edital">edital</Link> para começar.
            </p>
          ) : (
            seletor
          )}
        </section>
      </>
    );
  }

  const dia = hoje();
  const [topico, sessoes, questoes, revisoes, cartoes, erros, nota, conteudosRes] = await Promise.all([
    supabase.from("topicos").select("id, nome, status").eq("id", escolhido.id).single(),
    supabase.from("sessoes_estudo").select("minutos").eq("topico_id", escolhido.id).is("deleted_at", null),
    supabase.from("registros_questoes").select("total, acertos").eq("topico_id", escolhido.id).is("deleted_at", null),
    supabase
      .from("revisoes")
      .select("data_prevista, intervalo_dias")
      .eq("topico_id", escolhido.id)
      .is("data_feita", null)
      .is("deleted_at", null)
      .order("data_prevista"),
    supabase.from("flashcards").select("proxima_revisao").eq("topico_id", escolhido.id).is("deleted_at", null),
    supabase.from("erros").select("id").eq("topico_id", escolhido.id).eq("status", "pendente").is("deleted_at", null),
    supabase.from("anotacoes_topico").select("texto").eq("topico_id", escolhido.id).maybeSingle(),
    supabase
      .from("conteudos_estudo")
      .select("id, titulo, texto, fontes, created_at")
      .eq("topico_id", escolhido.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);
  const conteudos = (conteudosRes.data ?? []) as {
    id: string;
    titulo: string;
    texto: string;
    fontes: { titulo: string; url: string }[];
    created_at: string;
  }[];

  const status = (topico.data as { status: string } | null)?.status ?? "nao_iniciado";
  const minutos = ((sessoes.data ?? []) as { minutos: number }[]).reduce((s, x) => s + x.minutos, 0);
  const q = ((questoes.data ?? []) as { total: number; acertos: number }[]).reduce(
    (s, x) => ({ total: s.total + x.total, acertos: s.acertos + x.acertos }),
    { total: 0, acertos: 0 },
  );
  const taxa = q.total > 0 ? Math.round((q.acertos / q.total) * 100) : null;
  const pendentes = (revisoes.data ?? []) as { data_prevista: string; intervalo_dias: number }[];
  const listaCartoes = (cartoes.data ?? []) as { proxima_revisao: string }[];
  const cartoesHoje = listaCartoes.filter((c) => c.proxima_revisao <= dia).length;
  const qtdErros = (erros.data ?? []).length;
  const proxima = pendentes[0];

  return (
    <>
      <h1>Estudo por tópico</h1>
      <section className="card">{seletor}</section>

      <section className="card">
        <h2>{escolhido.rotulo}</h2>
        {ok === "conteudo" && <p className="aviso ok">Conteúdo salvo.</p>}
        {ok === "1" && <p className="aviso ok">Anotação salva.</p>}
        <form action={alterarStatusTopico} className="row">
          <input type="hidden" name="topico_id" value={escolhido.id} />
          <button name="status" value={PROXIMO[status]} className={`tag ${status}`} title="Clique para avançar o status">
            {ROTULO_STATUS[status]}
          </button>
        </form>
        <div className="atalhos" style={{ marginTop: 14 }}>
          <Link href={`/estudo?topico=${escolhido.id}`} className="atalho">
            <span>
              <strong>Estudar</strong>
              <span className="atalho-texto">{formatarMinutos(minutos)} registrados</span>
            </span>
          </Link>
          <Link href="/questoes" className="atalho">
            <span>
              <strong>Questões</strong>
              <span className="atalho-texto">
                {q.total === 0 ? "Nenhuma feita" : `${q.acertos}/${q.total} acertos (${taxa}%)`}
              </span>
            </span>
          </Link>
          <Link href="/revisoes" className="atalho">
            <span>
              <strong>Revisões</strong>
              <span className="atalho-texto">
                {proxima ? `${pendentes.length} pendente(s), próxima em ${formatarData(proxima.data_prevista)}` : "Nenhuma pendente"}
              </span>
            </span>
          </Link>
          <Link href="/flashcards" className="atalho">
            <span>
              <strong>Flashcards</strong>
              <span className="atalho-texto">
                {listaCartoes.length} cartões · {cartoesHoje} para hoje
              </span>
            </span>
          </Link>
          <Link href="/erros" className="atalho">
            <span>
              <strong>Caderno de erros</strong>
              <span className="atalho-texto">{qtdErros} pendente(s)</span>
            </span>
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Pesquisar e montar aula com IA</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          A IA pesquisa na web sobre este tópico e monta um resumo rápido ou uma aula completa (objetivos, desenvolvimento, exercícios com gabarito e roteiro de estudo). Salve o que for útil.
        </p>
        <PesquisaIA topicoId={escolhido.id} />
      </section>

      {conteudos.length > 0 && (
        <section className="card">
          <h2>Conteúdos salvos</h2>
          {conteudos.map((c) => (
            <details key={c.id} style={{ marginTop: 8 }}>
              <summary>
                {c.titulo} <span className="muted">· {formatarData(c.created_at.slice(0, 10))}</span>
              </summary>
              <TextoEstudo texto={c.texto} />
              {c.fontes.length > 0 && (
                <ul>
                  {c.fontes.map((f) => (
                    <li key={f.url}>
                      <a href={f.url} target="_blank" rel="noopener noreferrer">
                        {f.titulo}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <form action={excluirConteudo} className="acoes">
                <input type="hidden" name="conteudo_id" value={c.id} />
                <input type="hidden" name="topico_id" value={escolhido.id} />
                <BotaoConfirmar className="perigo pequeno" mensagem="Excluir este conteúdo salvo?">
                  Excluir conteúdo
                </BotaoConfirmar>
              </form>
            </details>
          ))}
        </section>
      )}

      <section className="card">
        <h2>Anotações</h2>
        <form action={salvarAnotacao} className="stack">
          <input type="hidden" name="topico_id" value={escolhido.id} />
          <label>
            Resumo, links da aula, artigos de lei…
            <textarea name="texto" rows={8} maxLength={10000} defaultValue={(nota.data as { texto: string } | null)?.texto ?? ""} />
          </label>
          <button className="primario">Salvar anotação</button>
        </form>
      </section>
    </>
  );
}
