"use client";

import { useEffect, useState } from "react";

// Registra o service worker (app instalável e páginas visitadas offline) e avisa quando a internet cai.
export default function RegistrarSW() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const atualizar = () => setOffline(!navigator.onLine);
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="aviso-offline" role="status">
      Sem internet. Você vê as páginas já visitadas; salvar, pesquisar e gerar com IA voltam quando a conexão voltar.
    </div>
  );
}
