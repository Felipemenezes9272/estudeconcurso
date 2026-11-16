"use client";

import { useState } from "react";
import { criarFlashcardsEmLote } from "@/app/actions";
import type { CartaoIA } from "@/lib/flashcards-ia";

export default function GerarCartoes({ conteudoId, topicoId }: { conteudoId: string; topicoId: string }) {
  const [quantidade, setQuantidade] = useState("10");
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const [cartoes, setCartoes] = useState<CartaoIA[] | null>(null);
  const [marcados, setMarcados] = useState<boolean[]>([]);

  async function gerar() {
    setErro("");
    setGerando(true);
    try {
      const resposta = await fetch("/api/flashcards-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conteudo_id: conteudoId, quantidade: Number(quantidade) }),
      });
      const json = (await resposta.json().catch(() => ({}))) as { erro?: string; cartoes?: CartaoIA[] };
      if (!resposta.ok || !json.cartoes) {
        setErro(json.erro ?? "Não foi possível gerar os cartões.");
      } else {
        setCartoes(json.cartoes);
        setMarcados(json.cartoes.map(() => true));
      }
    } catch {
      setErro("Falha de conexão. Verifique a internet e tente de novo.");
    }
    setGerando(false);
  }

  function editar(i: number, campo: "frente" | "verso", valor: string) {
    setCartoes((atual) => (atual ? atual.map((c, j) => (j === i ? { ...c, [campo]: valor } : c)) : atual));
  }

  const escolhidos = (cartoes ?? []).filter((_, i) => marcados[i]);

  if (!cartoes) {
    return (
      <div className="stack">
        <div className="row">
          <label style={{ width: 140 }}>
            Nº de cartões
            <input type="number" min={3} max={20} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} disabled={gerando} />
          </label>
          <button type="button" onClick={gerar} disabled={gerando}>
            {gerando ? "Gerando cartões…" : "Gerar flashcards com IA"}
          </button>
        </div>
        {erro && (
          <p className="aviso erro" role="alert">
            {erro}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={criarFlashcardsEmLote} className="stack">
      <input type="hidden" name="topico_id" value={topicoId} />
      <input type="hidden" name="cartoes" value={JSON.stringify(escolhidos)} />
      <p className="muted" style={{ margin: 0 }}>
        Marque os cartões que quer guardar e ajuste o texto se precisar.
      </p>
      {cartoes.map((c, i) => (
        <div key={i} className="card" style={{ opacity: marcados[i] ? 1 : 0.55 }}>
          <label style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={marcados[i]}
              onChange={(e) => setMarcados((a) => a.map((m, j) => (j === i ? e.target.checked : m)))}
            />
            Cartão {i + 1}
          </label>
          <label>
            Pergunta
            <textarea rows={2} value={c.frente} onChange={(e) => editar(i, "frente", e.target.value)} />
          </label>
          <label>
            Resposta
            <textarea rows={3} value={c.verso} onChange={(e) => editar(i, "verso", e.target.value)} />
          </label>
        </div>
      ))}
      <div className="acoes">
        <button className="primario" disabled={escolhidos.length === 0}>
          Salvar {escolhidos.length} {escolhidos.length === 1 ? "cartão" : "cartões"}
        </button>
        <button type="button" onClick={() => setCartoes(null)}>
          Descartar
        </button>
      </div>
    </form>
  );
}
