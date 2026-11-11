"use client";

import { useState } from "react";
import { importarEdital } from "@/app/actions";
import { TIPOS_EVENTO } from "@/lib/calendario";
import type { EditalExtraido } from "@/lib/edital-ia";

type Etapa = "envio" | "lendo" | "revisao";

export default function ImportarEdital({ chaveConfigurada }: { chaveConfigurada: boolean }) {
  const [etapa, setEtapa] = useState<Etapa>("envio");
  const [erro, setErro] = useState("");
  const [edital, setEdital] = useState<EditalExtraido | null>(null);
  // Tópicos ficam como texto (um por linha) durante a edição.
  const [textos, setTextos] = useState<string[]>([]);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const dados = new FormData(e.currentTarget);
    const arquivo = dados.get("pdf");
    if (!(arquivo instanceof File) || arquivo.size === 0) {
      setErro("Escolha um arquivo PDF.");
      return;
    }

    setEtapa("lendo");
    try {
      const resposta = await fetch("/api/edital", { method: "POST", body: dados });
      const json = (await resposta.json().catch(() => ({}))) as {
        erro?: string;
        edital?: EditalExtraido;
      };
      if (!resposta.ok || !json.edital) {
        setErro(json.erro ?? "Não foi possível ler o edital.");
        setEtapa("envio");
        return;
      }
      setEdital(json.edital);
      setTextos(json.edital.materias.map((m) => m.topicos.join("\n")));
      setEtapa("revisao");
    } catch {
      setErro("Falha de conexão. Verifique a internet e tente de novo.");
      setEtapa("envio");
    }
  }

  function alterar(campo: "nome" | "banca" | "cargo" | "data_prova", valor: string) {
    setEdital((atual) => (atual ? { ...atual, [campo]: valor } : atual));
  }

  function alterarMateria(i: number, campo: "nome" | "peso", valor: string | number) {
    setEdital((atual) =>
      atual
        ? {
            ...atual,
            materias: atual.materias.map((m, j) => (j === i ? { ...m, [campo]: valor } : m)),
          }
        : atual,
    );
  }

  function alterarData(i: number, campo: "titulo" | "data" | "tipo", valor: string) {
    setEdital((atual) =>
      atual
        ? {
            ...atual,
            datas: atual.datas.map((d, j) => (j === i ? { ...d, [campo]: valor } : d)),
          }
        : atual,
    );
  }

  function removerData(i: number) {
    setEdital((atual) => (atual ? { ...atual, datas: atual.datas.filter((_, j) => j !== i) } : atual));
  }

  function adicionarData() {
    setEdital((atual) =>
      atual
        ? { ...atual, datas: [...atual.datas, { titulo: "", data: "", tipo: "outro" }] }
        : atual,
    );
  }

  function removerMateria(i: number) {
    setEdital((atual) =>
      atual ? { ...atual, materias: atual.materias.filter((_, j) => j !== i) } : atual,
    );
    setTextos((atual) => atual.filter((_, j) => j !== i));
  }

  if (etapa !== "revisao" || !edital) {
    return (
      <section className="card">
        <h2>Enviar edital em PDF</h2>
        {!chaveConfigurada && (
          <p className="aviso atencao">
            A chave do Gemini ainda não foi cadastrada (variável <code>GEMINI_API_KEY</code> na
            Vercel). Sem ela, a leitura automática não funciona.
          </p>
        )}
        <form onSubmit={enviar} className="stack">
          <label>
            Arquivo PDF (até 4 MB)
            <input name="pdf" type="file" accept="application/pdf" required disabled={etapa === "lendo"} />
          </label>
          <p className="muted">
            Dica: se o edital for grande, envie só as páginas do conteúdo programático. A IA lê o PDF
            e monta o concurso, as matérias e os tópicos; você revisa antes de salvar.
          </p>
          {erro && <p className="aviso erro" role="alert">{erro}</p>}
          <button className="primario" disabled={etapa === "lendo"}>
            {etapa === "lendo" ? "Lendo o edital… (pode levar alguns minutos, não feche a página)" : "Ler edital com IA"}
          </button>
        </form>
      </section>
    );
  }

  const dados: EditalExtraido = {
    ...edital,
    materias: edital.materias.map((m, i) => ({
      ...m,
      topicos: (textos[i] ?? "").split("\n"),
    })),
  };
  const totalTopicos = dados.materias.reduce(
    (soma, m) => soma + m.topicos.filter((t) => t.trim()).length,
    0,
  );

  return (
    <form action={importarEdital} className="stack">
      <p className="aviso info">
        A IA pode errar. Revise os nomes, o peso (1 a 5) e os tópicos antes de salvar. Encontrei{" "}
        {dados.materias.length} matérias, {totalTopicos} tópicos e {edital.datas.length} datas.
      </p>

      <section className="card stack">
        <h2>Concurso</h2>
        <label>
          Nome
          <input value={edital.nome} onChange={(e) => alterar("nome", e.target.value)} required />
        </label>
        <div className="row">
          <label style={{ flex: 1, minWidth: 140 }}>
            Banca
            <input value={edital.banca} onChange={(e) => alterar("banca", e.target.value)} />
          </label>
          <label style={{ flex: 1, minWidth: 140 }}>
            Cargo
            <input value={edital.cargo} onChange={(e) => alterar("cargo", e.target.value)} />
          </label>
          <label style={{ flex: 1, minWidth: 140 }}>
            Data da prova
            <input
              type="date"
              value={edital.data_prova}
              onChange={(e) => alterar("data_prova", e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="card stack">
        <h2>Datas importantes (vão para o calendário)</h2>
        {edital.datas.length === 0 && (
          <p className="muted">A IA não encontrou datas no PDF. Você pode adicionar as suas abaixo.</p>
        )}
        {edital.datas.map((d, i) => (
          <div key={i} className="row">
            <label style={{ flex: 3, minWidth: 180 }}>
              Evento
              <input
                value={d.titulo}
                onChange={(e) => alterarData(i, "titulo", e.target.value)}
                placeholder="Ex.: Fim das inscrições"
              />
            </label>
            <label style={{ flex: 1, minWidth: 140 }}>
              Data
              <input type="date" value={d.data} onChange={(e) => alterarData(i, "data", e.target.value)} />
            </label>
            <label style={{ flex: 1, minWidth: 140 }}>
              Tipo
              <select value={d.tipo} onChange={(e) => alterarData(i, "tipo", e.target.value)}>
                {TIPOS_EVENTO.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="pequeno" onClick={() => removerData(i)}>
              Remover
            </button>
          </div>
        ))}
        <div>
          <button type="button" className="pequeno" onClick={adicionarData}>
            Adicionar data
          </button>
        </div>
      </section>

      {edital.materias.map((m, i) => (
        <section key={i} className="card stack">
          <div className="row">
            <label style={{ flex: 3, minWidth: 160 }}>
              Matéria
              <input value={m.nome} onChange={(e) => alterarMateria(i, "nome", e.target.value)} required />
            </label>
            <label style={{ flex: 1 }}>
              Peso (1-5)
              <input
                type="number"
                min={1}
                max={5}
                value={m.peso}
                onChange={(e) => alterarMateria(i, "peso", Number(e.target.value))}
              />
            </label>
          </div>
          <label>
            Tópicos (um por linha)
            <textarea
              rows={Math.min(12, Math.max(4, (textos[i] ?? "").split("\n").length))}
              value={textos[i] ?? ""}
              onChange={(e) =>
                setTextos((atual) => atual.map((t, j) => (j === i ? e.target.value : t)))
              }
            />
          </label>
          <button type="button" className="pequeno" onClick={() => removerMateria(i)}>
            Remover esta matéria
          </button>
        </section>
      ))}

      <input type="hidden" name="dados" value={JSON.stringify(dados)} />
      <div className="row">
        <button className="primario" disabled={dados.materias.length === 0}>
          Salvar concurso
        </button>
        <button type="button" onClick={() => setEtapa("envio")}>
          Enviar outro PDF
        </button>
      </div>
    </form>
  );
}
