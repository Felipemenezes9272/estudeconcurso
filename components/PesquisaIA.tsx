"use client";

import { useState } from "react";
import { salvarConteudo } from "@/app/actions";
import TextoEstudo from "@/components/TextoEstudo";

type Resultado = { titulo: string; texto: string; fontes: { titulo: string; url: string }[]; semWeb?: boolean };

export default function PesquisaIA({ topicoId }: { topicoId: string }) {
  const [foco, setFoco] = useState("");
  const [modo, setModo] = useState<"resumo" | "aula">("resumo");
  const [nivel, setNivel] = useState("intermediario");
  const [duracao, setDuracao] = useState("60");
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState("");
  const [podeSemWeb, setPodeSemWeb] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function pesquisar(e?: React.FormEvent, semWeb = false) {
    e?.preventDefault();
    setErro("");
    setPodeSemWeb(false);
    setResultado(null);
    setBuscando(true);
    try {
      const resposta = await fetch("/api/pesquisa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topico_id: topicoId, foco, modo, nivel, duracao: Number(duracao), semWeb }),
      });
      const json = (await resposta.json().catch(() => ({}))) as Partial<Resultado> & { erro?: string; podeSemWeb?: boolean };
      if (!resposta.ok || !json.texto) {
        setErro(json.erro ?? "Não foi possível pesquisar agora.");
        setPodeSemWeb(Boolean(json.podeSemWeb));
      } else {
        setResultado({ titulo: json.titulo ?? "Conteúdo", texto: json.texto, fontes: json.fontes ?? [], semWeb: json.semWeb });
      }
    } catch {
      setErro("Falha de conexão. Verifique a internet e tente de novo.");
    }
    setBuscando(false);
  }

  return (
    <div className="stack">
      <nav className="subabas" aria-label="O que montar">
        <a
          href="#resumo"
          className={modo === "resumo" ? "ativa" : undefined}
          onClick={(e) => {
            e.preventDefault();
            if (!buscando) setModo("resumo");
          }}
        >
          Resumo rápido
        </a>
        <a
          href="#aula"
          className={modo === "aula" ? "ativa" : undefined}
          onClick={(e) => {
            e.preventDefault();
            if (!buscando) setModo("aula");
          }}
        >
          Montar aula completa
        </a>
      </nav>

      {modo === "aula" && (
        <div className="row">
          <label style={{ flex: 1, minWidth: 150 }}>
            Nível
            <select value={nivel} onChange={(e) => setNivel(e.target.value)} disabled={buscando}>
              <option value="basico">Básico</option>
              <option value="intermediario">Intermediário</option>
              <option value="avancado">Avançado</option>
            </select>
          </label>
          <label style={{ flex: 1, minWidth: 150 }}>
            Duração
            <select value={duracao} onChange={(e) => setDuracao(e.target.value)} disabled={buscando}>
              <option value="30">30 minutos</option>
              <option value="60">1 hora</option>
              <option value="90">1h30</option>
            </select>
          </label>
        </div>
      )}

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
          {buscando
            ? modo === "aula"
              ? "Montando a aula… (pode levar 1 a 2 minutos)"
              : "Pesquisando…"
            : modo === "aula"
              ? "Montar aula com IA"
              : "Pesquisar com IA"}
        </button>
      </form>

      {erro && (
        <div className="aviso erro" role="alert">
          <p style={{ margin: 0 }}>{erro}</p>
          {podeSemWeb && (
            <p style={{ margin: "8px 0 0" }}>
              <button type="button" className="pequeno" onClick={() => pesquisar(undefined, true)} disabled={buscando}>
                Gerar sem pesquisa na web
              </button>{" "}
              <span className="muted">Usa só o conhecimento da IA, sem fontes.</span>
            </p>
          )}
        </div>
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
          {resultado.semWeb && (
            <p className="aviso atencao">
              Gerado sem pesquisa na web, só com o conhecimento da IA e sem fontes. Confira leis e números antes de estudar.
            </p>
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
