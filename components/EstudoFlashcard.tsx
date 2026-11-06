"use client";

import { useState } from "react";
import { avaliarFlashcard } from "@/app/actions";
import { NOTAS } from "@/lib/flashcards";

type Cartao = { id: string; frente: string; verso: string; contexto: string };

export default function EstudoFlashcard({
  cartao,
  restantes,
  reveladoInicial = false,
}: {
  cartao: Cartao;
  restantes: number;
  reveladoInicial?: boolean;
}) {
  const [revelado, setRevelado] = useState(reveladoInicial);

  return (
    <div className="flashcard">
      <div className="muted" style={{ fontSize: "0.85rem" }}>
        {cartao.contexto} · {restantes} {restantes === 1 ? "cartão restante" : "cartões restantes"} hoje
      </div>

      <div className="face">
        <div className="rotulo-face">Pergunta</div>
        <p>{cartao.frente}</p>
      </div>

      {revelado ? (
        <>
          <div className="face resposta">
            <div className="rotulo-face">Resposta</div>
            <p>{cartao.verso}</p>
          </div>
          <form action={avaliarFlashcard} className="notas">
            <input type="hidden" name="flashcard_id" value={cartao.id} />
            {NOTAS.map((n) => (
              <button key={n.valor} name="nota" value={n.valor} className={`nota ${n.valor}`}>
                {n.rotulo}
                <span>{n.dica}</span>
              </button>
            ))}
          </form>
        </>
      ) : (
        <button type="button" className="primario" onClick={() => setRevelado(true)}>
          Mostrar resposta
        </button>
      )}
    </div>
  );
}
