"use client";

import type { ButtonHTMLAttributes } from "react";

// Botão de envio que pede confirmação antes de executar (usado nas exclusões).
export default function BotaoConfirmar({
  mensagem,
  onClick,
  ...resto
}: { mensagem: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...resto}
      onClick={(e) => {
        if (!window.confirm(mensagem)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    />
  );
}
