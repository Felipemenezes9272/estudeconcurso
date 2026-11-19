"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function QuizDoDia({ idExistente }: { idExistente?: string }) {
  const router = useRouter();
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");

  async function comecar() {
    setErro("");
    setGerando(true);
    try {
      const resposta = await fetch("/api/quiz-diario", { method: "POST" });
      const json = (await resposta.json().catch(() => ({}))) as { erro?: string; id?: string };
      if (!resposta.ok || !json.id) {
        setErro(json.erro ?? "Não foi possível montar o quiz agora.");
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
    <div className="stack">
      {idExistente ? (
        <p style={{ margin: 0 }}>
          <Link href={`/simulados/${idExistente}`} className="botao primario">
            Abrir o quiz de hoje
          </Link>
        </p>
      ) : (
        <p style={{ margin: 0 }}>
          <button className="primario" onClick={comecar} disabled={gerando}>
            {gerando ? "Montando o quiz… (alguns segundos)" : "Começar o quiz de hoje"}
          </button>
        </p>
      )}
      {erro && (
        <p className="aviso erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
