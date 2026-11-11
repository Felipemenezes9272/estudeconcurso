import Link from "next/link";
import {
  alterarStatusTopico,
  criarConcurso,
  criarMateria,
  criarTopicos,
  editarConcurso,
  editarMateria,
  editarTopico,
  excluirConcurso,
  excluirMateria,
  excluirTopico,
} from "@/app/actions";
import BotaoConfirmar from "@/components/BotaoConfirmar";
import { formatarData } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

type Topico = { id: string; nome: string; status: string; ordem: number };
type Materia = { id: string; nome: string; peso: number; dificuldade: number; topicos: Topico[] };
type Concurso = {
  id: string;
  nome: string;
  banca: string | null;
  cargo: string | null;
  data_prova: string | null;
  materias: Materia[];
};

// Formato bruto devolvido pelo banco, ainda com os campos de exclusão lógica.
type TopicoBruto = Topico & { deleted_at: string | null };
type MateriaBruta = Omit<Materia, "topicos"> & { deleted_at: string | null; topicos: TopicoBruto[] };
type ConcursoBruto = Omit<Concurso, "materias"> & { materias: MateriaBruta[] };

const ROTULO_STATUS: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  estudando: "Estudando",
  concluido: "Concluído",
};

// Próximo status ao clicar: não iniciado → estudando → concluído → não iniciado.
const PROXIMO: Record<string, string> = {
  nao_iniciado: "estudando",
  estudando: "concluido",
  concluido: "nao_iniciado",
};

export default async function EditalPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("concursos")
    .select(
      "id, nome, banca, cargo, data_prova, materias(id, nome, peso, dificuldade, deleted_at, topicos(id, nome, status, ordem, deleted_at))",
    )
    .is("deleted_at", null)
    .order("created_at");

  // Remove itens "excluídos" (exclusão lógica) das listas aninhadas.
  const concursos: Concurso[] = ((data ?? []) as unknown as ConcursoBruto[]).map((c) => ({
    ...c,
    materias: c.materias
      .filter((m) => !m.deleted_at)
      .map((m) => ({
        ...m,
        topicos: m.topicos.filter((t) => !t.deleted_at).sort((a, b) => a.ordem - b.ordem),
      })),
  }));

  return (
    <>
      <h1>Edital</h1>
      <p className="row" style={{ marginBottom: 12 }}>
        <Link href="/edital/importar">Importar edital em PDF com IA →</Link>
      </p>

      {concursos.length === 0 && (
        <p className="muted">Nenhum concurso cadastrado ainda. Comece criando o primeiro abaixo.</p>
      )}

      {concursos.map((concurso) => {
        const topicos = concurso.materias.flatMap((m) => m.topicos);
        const feitos = topicos.filter((t) => t.status === "concluido").length;
        const pct = topicos.length > 0 ? Math.round((feitos / topicos.length) * 100) : 0;

        return (
          <section key={concurso.id} className="card">
            <h2>{concurso.nome}</h2>
            <p className="muted">
              {[concurso.banca, concurso.cargo, concurso.data_prova && `prova em ${formatarData(concurso.data_prova)}`]
                .filter(Boolean)
                .join(" · ") || "Sem detalhes"}
            </p>
            <div className="barra">
              <span style={{ width: `${pct}%` }} />
            </div>
            <p className="muted">
              {feitos} de {topicos.length} tópicos concluídos ({pct}%)
            </p>

            <details className="editar">
              <summary>Editar ou excluir concurso</summary>
              <form action={editarConcurso} className="stack">
                <input type="hidden" name="concurso_id" value={concurso.id} />
                <label>
                  Nome
                  <input name="nome" defaultValue={concurso.nome} required />
                </label>
                <div className="row">
                  <label style={{ flex: 1, minWidth: 140 }}>
                    Banca
                    <input name="banca" defaultValue={concurso.banca ?? ""} />
                  </label>
                  <label style={{ flex: 1, minWidth: 140 }}>
                    Cargo
                    <input name="cargo" defaultValue={concurso.cargo ?? ""} />
                  </label>
                  <label style={{ flex: 1, minWidth: 140 }}>
                    Data da prova
                    <input name="data_prova" type="date" defaultValue={concurso.data_prova ?? ""} />
                  </label>
                </div>
                <div className="acoes">
                  <button className="primario pequeno">Salvar alterações</button>
                  <BotaoConfirmar
                    className="perigo pequeno"
                    formAction={excluirConcurso}
                    formNoValidate
                    mensagem={`Excluir o concurso "${concurso.nome}" com todas as matérias, tópicos, revisões, cartões, erros e registros de estudo dele?`}
                  >
                    Excluir concurso
                  </BotaoConfirmar>
                </div>
              </form>
            </details>

            {concurso.materias.map((materia) => {
              const feitosMateria = materia.topicos.filter((t) => t.status === "concluido").length;
              return (
                <details key={materia.id} style={{ marginTop: 12 }}>
                  <summary>
                    {materia.nome}{" "}
                    <span className="muted">
                      ({feitosMateria}/{materia.topicos.length}) · peso {materia.peso} · dificuldade{" "}
                      {materia.dificuldade}
                    </span>
                  </summary>

                  <details className="editar" style={{ marginTop: 8 }}>
                    <summary>Editar ou excluir matéria</summary>
                    <form action={editarMateria} className="stack">
                      <input type="hidden" name="materia_id" value={materia.id} />
                      <div className="row">
                        <label style={{ flex: 3, minWidth: 160 }}>
                          Nome
                          <input name="nome" defaultValue={materia.nome} required />
                        </label>
                        <label style={{ flex: 1 }}>
                          Peso (1-5)
                          <input name="peso" type="number" min={1} max={5} defaultValue={materia.peso} />
                        </label>
                        <label style={{ flex: 1 }}>
                          Dificuldade (1-5)
                          <input
                            name="dificuldade"
                            type="number"
                            min={1}
                            max={5}
                            defaultValue={materia.dificuldade}
                          />
                        </label>
                      </div>
                      <div className="acoes">
                        <button className="primario pequeno">Salvar alterações</button>
                        <BotaoConfirmar
                          className="perigo pequeno"
                          formAction={excluirMateria}
                    formNoValidate
                          mensagem={`Excluir a matéria "${materia.nome}" com todos os tópicos, revisões, cartões, erros e registros de estudo dela?`}
                        >
                          Excluir matéria
                        </BotaoConfirmar>
                      </div>
                    </form>
                  </details>

                  <ul className="lista">
                    {materia.topicos.map((t) => (
                      <li key={t.id}>
                        <span className={t.status === "concluido" ? "feito" : undefined}>{t.nome}</span>
                        <form action={alterarStatusTopico} className="row">
                          <input type="hidden" name="topico_id" value={t.id} />
                          <button
                            name="status"
                            value={PROXIMO[t.status]}
                            className={`tag ${t.status}`}
                            title="Clique para avançar o status"
                          >
                            {ROTULO_STATUS[t.status]}
                          </button>
                        </form>
                        <details className="editar">
                          <summary>Renomear ou excluir</summary>
                          <form action={editarTopico} className="row">
                            <input type="hidden" name="topico_id" value={t.id} />
                            <input
                              name="nome"
                              defaultValue={t.nome}
                              required
                              aria-label="Nome do tópico"
                              style={{ flex: 1, minWidth: 180 }}
                            />
                            <button className="primario pequeno">Salvar</button>
                            <BotaoConfirmar
                              className="perigo pequeno"
                              formAction={excluirTopico}
                              formNoValidate
                              mensagem={`Excluir o tópico "${t.nome}" com revisões, cartões, erros e registros de estudo dele?`}
                            >
                              Excluir
                            </BotaoConfirmar>
                          </form>
                        </details>
                      </li>
                    ))}
                  </ul>

                  <form action={criarTopicos} className="stack">
                    <input type="hidden" name="materia_id" value={materia.id} />
                    <label>
                      Adicionar tópicos (um por linha)
                      <textarea name="nomes" rows={3} required />
                    </label>
                    <button className="pequeno">Adicionar tópicos</button>
                  </form>
                </details>
              );
            })}

            <form action={criarMateria} className="stack" style={{ marginTop: 16 }}>
              <input type="hidden" name="concurso_id" value={concurso.id} />
              <strong>Nova matéria</strong>
              <div className="row">
                <label style={{ flex: 3, minWidth: 160 }}>
                  Nome
                  <input name="nome" required />
                </label>
                <label style={{ flex: 1 }}>
                  Peso (1-5)
                  <input name="peso" type="number" min={1} max={5} defaultValue={1} />
                </label>
                <label style={{ flex: 1 }}>
                  Dificuldade (1-5)
                  <input name="dificuldade" type="number" min={1} max={5} defaultValue={3} />
                </label>
              </div>
              <button className="pequeno">Adicionar matéria</button>
            </form>
          </section>
        );
      })}

      <section className="card">
        <h2>Novo concurso</h2>
        <form action={criarConcurso} className="stack">
          <label>
            Nome
            <input name="nome" required placeholder="Ex.: INSS 2026" />
          </label>
          <div className="row">
            <label style={{ flex: 1, minWidth: 140 }}>
              Banca
              <input name="banca" />
            </label>
            <label style={{ flex: 1, minWidth: 140 }}>
              Cargo
              <input name="cargo" />
            </label>
            <label style={{ flex: 1, minWidth: 140 }}>
              Data da prova
              <input name="data_prova" type="date" />
            </label>
          </div>
          <button className="primario">Criar concurso</button>
        </form>
      </section>
    </>
  );
}
