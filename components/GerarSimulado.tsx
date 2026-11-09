"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TopicoOpcao } from "@/lib/consultas";
import { MAX_QUESTOES, MIN_QUESTOES, ROTULO_DIFICULDADE, ROTULO_TIPO } from "@/lib/simulados";

export default function GerarSimulado({ topicos }: { topicos: TopicoOpcao[] }) {
  const router = useRouter();
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const dados = new FormData(e.currentTarget);
    const arquivo = dados.get("pdf");
    if (!(arquivo instanceof File) || arquivo.size === 0) {
      setErro("Escolha um arquivo PDF.");
      return;
    }

    setGerando(true);
    try {
      const resposta = await fetch("/api/simulados", { method: "POST", body: dados });
      const json = (await resposta.json().catch(() => ({}))) as { erro?: string; id?: string };
      if (!resposta.ok || !json.id) {
        setErro(json.erro ?? "Não foi possível gerar o simulado.");
        setGerando(false);
        return;
      }
      router.push(`/simulados/${json.id}`);
    } catch {
      setErro("Falha de conexão. Verifique a internet e tente de novo.");
      setGerando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="stack">
      <label>
        Arquivo PDF com o conteúdo (até 4 MB)
        <input name="pdf" type="file" accept="application/pdf" required disabled={gerando} />
      </label>
      <div className="row">
        <label style={{ flex: 1, minWidth: 120 }}>
          Nº de questões
          <input
            name="quantidade"
            type="number"
            min={MIN_QUESTOES}
            max={MAX_QUESTOES}
            defaultValue={10}
            disabled={gerando}
          />
        </label>
        <label style={{ flex: 2, minWidth: 200 }}>
          Estilo
          <select name="tipo" defaultValue="multipla" disabled={gerando}>
            {Object.entries(ROTULO_TIPO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: 1, minWidth: 120 }}>
          Dificuldade
          <select name="dificuldade" defaultValue="medio" disabled={gerando}>
            {Object.entries(ROTULO_DIFICULDADE).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Título (opcional)
        <input name="titulo" placeholder="A IA sugere um título a partir do PDF" disabled={gerando} />
      </label>
      <label>
        Tópico do edital (opcional)
        <select name="topico_id" defaultValue="" disabled={gerando}>
          <option value="">Não vincular</option>
          {topicos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.rotulo}
            </option>
          ))}
        </select>
      </label>
      <p className="muted">
        Se vincular a um tópico, o resultado entra nos seus registros de questões e conta nos relatórios e
        nas prioridades.
      </p>
      {erro && (
        <p className="aviso erro" role="alert">
          {erro}
        </p>
      )}
      <button className="primario" disabled={gerando}>
        {gerando ? "Gerando o simulado… (pode levar até 1 minuto)" : "Gerar simulado com IA"}
      </button>
    </form>
  );
}
