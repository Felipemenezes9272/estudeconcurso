"use client";

import { useEffect, useRef, useState } from "react";
import { registrarSessao } from "@/app/actions";
import type { TopicoOpcao } from "@/lib/consultas";

function mmss(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function FormEstudo({ topicos }: { topicos: TopicoOpcao[] }) {
  const [minutos, setMinutos] = useState("");
  const [rodando, setRodando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const inicio = useRef<number | null>(null);

  useEffect(() => {
    if (!rodando) return;
    const id = setInterval(() => {
      if (inicio.current) setSegundos(Math.floor((Date.now() - inicio.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [rodando]);

  function alternar() {
    if (!rodando) {
      inicio.current = Date.now() - segundos * 1000;
      setRodando(true);
      return;
    }
    setRodando(false);
    // Ao parar, preenche o tempo em minutos (arredondando para cima).
    setMinutos(String(Math.max(1, Math.ceil(segundos / 60))));
  }

  function zerar() {
    setRodando(false);
    setSegundos(0);
    inicio.current = null;
  }

  return (
    <form action={registrarSessao} className="stack">
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

      <div className="row">
        <span className="cronometro">{mmss(segundos)}</span>
        <button type="button" onClick={alternar}>
          {rodando ? "Parar" : segundos > 0 ? "Continuar" : "Iniciar"}
        </button>
        <button type="button" onClick={zerar} disabled={segundos === 0 && !rodando}>
          Zerar
        </button>
      </div>

      <div className="row">
        <label style={{ flex: 1 }}>
          Minutos estudados
          <input
            name="minutos"
            type="number"
            min={1}
            required
            value={minutos}
            onChange={(e) => setMinutos(e.target.value)}
          />
        </label>
        <label style={{ flex: 1 }}>
          Tipo
          <select name="tipo" defaultValue="teoria">
            <option value="teoria">Teoria</option>
            <option value="questoes">Questões</option>
            <option value="revisao">Revisão</option>
          </select>
        </label>
      </div>

      <button className="primario">Registrar sessão</button>
    </form>
  );
}
