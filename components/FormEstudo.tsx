"use client";

import { useEffect, useRef, useState } from "react";
import { registrarSessao } from "@/app/actions";
import type { TopicoOpcao } from "@/lib/consultas";

function mmss(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const FOCO_POMODORO = 25 * 60;

export default function FormEstudo({
  topicos,
  topicoInicial,
}: {
  topicos: TopicoOpcao[];
  topicoInicial?: string;
}) {
  const [pomodoro, setPomodoro] = useState(false);
  const [pausa, setPausa] = useState(false);
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

  // No modo pomodoro, o foco termina sozinho aos 25 minutos e sugere 5 de pausa.
  useEffect(() => {
    if (pomodoro && rodando && segundos >= FOCO_POMODORO) {
      setRodando(false);
      setSegundos(FOCO_POMODORO);
      setMinutos("25");
      setPausa(true);
    }
  }, [pomodoro, rodando, segundos]);

  function alternar() {
    setPausa(false);
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
    setPausa(false);
    inicio.current = null;
  }

  return (
    <form action={registrarSessao} className="stack">
      <label>
        Tópico
        <select name="topico_id" required defaultValue={topicoInicial ?? ""}>
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
        <label style={{ flexDirection: "row", alignItems: "center", gap: 8, display: "flex" }}>
          <input
            type="checkbox"
            checked={pomodoro}
            onChange={(e) => {
              setPomodoro(e.target.checked);
              setPausa(false);
            }}
            disabled={rodando}
          />
          Pomodoro (25 min de foco)
        </label>
      </div>
      <div className="row">
        <span className="cronometro">
          {pomodoro && !pausa ? mmss(Math.max(0, FOCO_POMODORO - segundos)) : mmss(segundos)}
        </span>
        <button type="button" onClick={alternar}>
          {rodando ? "Parar" : segundos > 0 ? "Continuar" : "Iniciar"}
        </button>
        <button type="button" onClick={zerar} disabled={segundos === 0 && !rodando}>
          Zerar
        </button>
      </div>

      {pausa && (
        <p className="aviso ok" role="status">
          Foco concluído! Registre a sessão e faça uma pausa de 5 minutos.
        </p>
      )}

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
