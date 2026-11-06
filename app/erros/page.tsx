import Link from "next/link";
import { alterarStatusErro, registrarErro } from "@/app/actions";
import { listarTopicosParaSelecao } from "@/lib/consultas";
import { formatarData } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

type Erro = {
  id: string;
  data: string;
  enunciado: string;
  motivo: "desatencao" | "lacuna" | "pegadinha";
  anotacao: string | null;
  status: "pendente" | "dominado";
  ultima_revisao: string | null;
  topicos: { nome: string; materias: { nome: string } | null } | null;
};

const MOTIVOS = {
  desatencao: { rotulo: "Desatenção", dica: "Sabia o conteúdo, errei por distração", classe: "estudando" },
  lacuna: { rotulo: "Lacuna de conteúdo", dica: "Faltou estudar ou entender o assunto", classe: "atrasada" },
  pegadinha: { rotulo: "Pegadinha", dica: "Caí em um truque da banca", classe: "" },
} as const;

export default async function ErrosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; motivo?: string }>;
}) {
  const { ok, motivo } = await searchParams;
  const filtro = motivo && motivo in MOTIVOS ? (motivo as keyof typeof MOTIVOS) : null;

  const supabase = await createClient();
  const [topicos, consulta] = await Promise.all([
    listarTopicosParaSelecao(supabase),
    supabase
      .from("erros")
      .select("id, data, enunciado, motivo, anotacao, status, ultima_revisao, topicos(nome, materias(nome))")
      .is("deleted_at", null)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const todos = (consulta.data ?? []) as unknown as Erro[];
  const pendentes = todos.filter((e) => e.status === "pendente");
  const dominados = todos.filter((e) => e.status === "dominado");

  const doFiltro = (lista: Erro[]) => (filtro ? lista.filter((e) => e.motivo === filtro) : lista);

  // Tópicos com mais erros pendentes: onde vale revisar primeiro.
  const porTopico = new Map<string, { nome: string; materia: string; qtd: number }>();
  for (const e of pendentes) {
    const nome = e.topicos?.nome ?? "Tópico";
    const chave = `${e.topicos?.materias?.nome}|${nome}`;
    const atual = porTopico.get(chave) ?? { nome, materia: e.topicos?.materias?.nome ?? "", qtd: 0 };
    atual.qtd += 1;
    porTopico.set(chave, atual);
  }
  const topFracos = [...porTopico.values()].sort((a, b) => b.qtd - a.qtd).slice(0, 3);

  return (
    <>
      <h1>Caderno de erros</h1>
      <p className="subtitulo">
        {pendentes.length} para revisar · {dominados.length} dominado(s)
      </p>

      {ok && <p className="aviso ok">Erro registrado no caderno.</p>}

      <div className="grid">
        {(Object.keys(MOTIVOS) as (keyof typeof MOTIVOS)[]).map((m) => (
          <div key={m} className="stat">
            <div className="valor">{pendentes.filter((e) => e.motivo === m).length}</div>
            <div className="rotulo">
              {MOTIVOS[m].rotulo} pendente(s)
              <br />
              <span style={{ fontSize: "0.8rem" }}>{MOTIVOS[m].dica}</span>
            </div>
          </div>
        ))}
      </div>

      {topFracos.length > 0 && (
        <section className="card">
          <h2>Onde você mais erra</h2>
          <ul className="lista">
            {topFracos.map((t) => (
              <li key={`${t.materia}|${t.nome}`}>
                <span>
                  <strong>{t.nome}</strong> <span className="muted">· {t.materia}</span>
                </span>
                <span className="tag atrasada">{t.qtd} erro(s)</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Registrar erro</h2>
        {topicos.length === 0 ? (
          <p className="muted">
            Cadastre os tópicos no <Link href="/edital">edital</Link> para poder registrar erros.
          </p>
        ) : (
          <form action={registrarErro} className="stack">
            <label>
              Tópico
              <select name="topico_id" required defaultValue="">
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
              Questão (banca, ano, número ou um resumo)
              <input name="enunciado" required placeholder="Ex.: CESPE 2024, Q35: remédios constitucionais" />
            </label>
            <label>
              Por que errei?
              <select name="motivo" required defaultValue="">
                <option value="" disabled>
                  Escolha o motivo…
                </option>
                {(Object.keys(MOTIVOS) as (keyof typeof MOTIVOS)[]).map((m) => (
                  <option key={m} value={m}>
                    {MOTIVOS[m].rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Anotação: o que aprendi com este erro (opcional)
              <textarea name="anotacao" rows={3} />
            </label>
            <button className="primario">Registrar erro</button>
          </form>
        )}
      </section>

      <section className="card">
        <h2>Para revisar</h2>
        <div className="row" style={{ marginBottom: 12 }}>
          <Link href="/erros" className={`tag filtro${filtro ? "" : " ativo"}`}>
            Todos
          </Link>
          {(Object.keys(MOTIVOS) as (keyof typeof MOTIVOS)[]).map((m) => (
            <Link key={m} href={`/erros?motivo=${m}`} className={`tag filtro${filtro === m ? " ativo" : ""}`}>
              {MOTIVOS[m].rotulo}
            </Link>
          ))}
        </div>

        {doFiltro(pendentes).length === 0 ? (
          <p className="vazio">
            {pendentes.length === 0
              ? "Nenhum erro pendente. Quando errar uma questão, registre aqui para não repetir."
              : "Nenhum erro pendente com esse motivo."}
          </p>
        ) : (
          <ul className="lista">
            {doFiltro(pendentes).map((e) => (
              <ItemErro key={e.id} erro={e} />
            ))}
          </ul>
        )}
      </section>

      {doFiltro(dominados).length > 0 && (
        <section className="card">
          <details>
            <summary>Dominados ({doFiltro(dominados).length})</summary>
            <ul className="lista">
              {doFiltro(dominados).map((e) => (
                <ItemErro key={e.id} erro={e} />
              ))}
            </ul>
          </details>
        </section>
      )}
    </>
  );
}

function ItemErro({ erro }: { erro: Erro }) {
  const motivo = MOTIVOS[erro.motivo];
  const dominado = erro.status === "dominado";

  return (
    <li>
      <div style={{ flex: 1, minWidth: 220 }}>
        <strong>{erro.enunciado}</strong>
        <div className="muted" style={{ fontSize: "0.9rem" }}>
          {erro.topicos?.materias?.nome} › {erro.topicos?.nome} · {formatarData(erro.data)}{" "}
          <span className={`tag ${motivo.classe}`}>{motivo.rotulo}</span>
        </div>
        {erro.anotacao && <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{erro.anotacao}</p>}
        {dominado && erro.ultima_revisao && (
          <div className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
            Dominado em {formatarData(erro.ultima_revisao)}
          </div>
        )}
      </div>
      <form action={alterarStatusErro}>
        <input type="hidden" name="erro_id" value={erro.id} />
        {dominado ? (
          <button name="status" value="pendente" className="pequeno">
            Voltar para revisar
          </button>
        ) : (
          <button name="status" value="dominado" className="pequeno facil">
            Já dominei
          </button>
        )}
      </form>
    </li>
  );
}
