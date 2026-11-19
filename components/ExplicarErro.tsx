"use client";

import { useState } from "react";
import { salvarCartaoDoErro } from "@/app/actions";
import TextoEstudo from "@/components/TextoEstudo";

type Cartao = { frente: string; verso: string };

export default function ExplicarErro({
  erroId,
  topicoId,
  explicacaoSalva,
}: {
  erroId: string;
  topicoId: string;
  explicacaoSalva: string | null;
}) {
  const [explicacao, setExplicacao] = useState(explicacaoSalva ?? "");
  const [cartao, setCartao] = useState<Cartao | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");

  async function explicar() {
    setErro("");
    setGerando(true);
    try {
      const resposta = await fetch("/api/erros-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ erro_id: erroId }),
      });
      const json = (await resposta.json().catch(() => ({}))) as { erro?: string; explicacao?: string; cartao?: Cartao | null };
      if (!resposta.ok || !json.explicacao) {
        setErro(json.erro ?? "Não foi possível explicar agora.");
      } else {
        setExplicacao(json.explicacao);
        setCartao(json.cartao ?? null);
      }
    } catch {
      setErro("Falha de conexão. Verifique a internet e tente de novo.");
    }
    setGerando(false);
  }

  return (
    <div className="stack" style={{ marginTop: 8 }}>
      {explicacao && <TextoEstudo texto={explicacao} />}
      {cartao && (
        <form action={salvarCartaoDoErro} className="card stack">
          <input type="hidden" name="topico_id" value={topicoId} />
          <strong>Cartão sugerido</strong>
          <label>
            Pergunta
            <textarea name="frente" rows={2} defaultValue={cartao.frente} required />
          </label>
          <label>
            Resposta
            <textarea name="verso" rows={3} defaultValue={cartao.verso} required />
          </label>
          <div className="acoes">
            <button className="primario pequeno">Salvar como flashcard</button>
            <button type="button" className="pequeno" onClick={() => setCartao(null)}>
              Descartar
            </button>
          </div>
        </form>
      )}
      {erro && (
        <p className="aviso erro" role="alert">
          {erro}
        </p>
      )}
      <div>
        <button type="button" className="pequeno" onClick={explicar} disabled={gerando}>
          {gerando ? "Explicando…" : explicacao ? "Explicar de novo" : "Explicar com IA"}
        </button>
      </div>
    </div>
  );
}
