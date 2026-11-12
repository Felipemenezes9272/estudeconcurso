"use client";

import { useState } from "react";
import { salvarConteudo } from "@/app/actions";
import TextoEstudo from "@/components/TextoEstudo";

type Resultado = { titulo: string; texto: string; fontes: { titulo: string; url: string }[] };

export default function PesquisaIA({ topicoId }: { topicoId: string }) {
  const [foco, setFoco] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function pesquisar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setResultado(null);
    setBuscando(true);
    try {
      const resposta = await fetch("/api/pesquisa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topico_id: topicoId, foco }),
      });
      const json = (await resposta.json().catch(() => ({}))) as Partial<Resultado> & { erro?: string };
      if (!resposta.ok || !json.texto) {
        setErro(json.erro ?? "Não foi possível pesquisar agora.");
      } else {
        setResultado({ titulo: json.titulo ?? "Conteúdo", texto: json.texto, fontes: json.fontes ?? [] });
      }
    } catch {
      setErro("Falha de conexão. Verifique a internet e tente de novo.");
    }
    setBuscando(false);
  }

  return (
    <div className="stack">
      <form onSubmit={pesquisar} className="row">
        <label style={{ flex: 1, minWidth: 220 }}>
          Foco da pesquisa (opcional)
          <input
            value={foco}
            onChange={(e) => setFoco(e.target.value)}
            maxLength={200}
            placeholder="Ex.: súmulas, exceções, como a banca cobra"
            disabled={buscando}
          />
        </label>
        <button className="primario" disabled={buscando}>
          {buscando ? "Pesquisando…" : "Pesquisar com IA"}
        </button>
      </form>

      {erro && (
        <p className="aviso erro" role="alert">
          {erro}
        </p>
      )}

      {resultado && (
        <article className="card">
          <TextoEstudo texto={resultado.texto} />
          {resultado.fontes.length > 0 && (
            <>
              <h3>Fontes consultadas</h3>
              <ul>
                {resultado.fontes.map((f) => (
                  <li key={f.url}>
                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                      {f.titulo}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Conteúdo gerado por IA a partir de pesquisa na web. Confira nas fontes antes de decorar artigos e números.
          </p>
          <form action={salvarConteudo} className="acoes">
            <input type="hidden" name="topico_id" value={topicoId} />
            <input type="hidden" name="titulo" value={foco ? `${resultado.titulo} — ${foco}` : resultado.titulo} />
            <input type="hidden" name="texto" value={resultado.texto} />
            <input type="hidden" name="fontes" value={JSON.stringify(resultado.fontes)} />
            <button className="primario">Salvar conteúdo</button>
            <button type="button" onClick={() => setResultado(null)}>
              Descartar
            </button>
          </form>
        </article>
      )}
    </div>
  );
}
