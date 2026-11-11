"use client";

import { useState } from "react";

// Campo de senha com botão para mostrar ou esconder o que foi digitado.
export default function CampoSenha({ name = "senha" }: { name?: string }) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="campo-senha">
      <input
        name={name}
        type={visivel ? "text" : "password"}
        autoComplete="current-password"
        required
        minLength={6}
      />
      <button type="button" onClick={() => setVisivel((v) => !v)} aria-pressed={visivel}>
        {visivel ? "Esconder" : "Mostrar"}
      </button>
    </div>
  );
}
