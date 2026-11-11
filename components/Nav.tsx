"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "@/app/actions";
import { Logo } from "@/components/Ilustracoes";
import { SECOES, secaoDoCaminho } from "@/lib/navegacao";

function Icone({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONES: Record<string, React.ReactNode> = {
  painel: <path d="M3 12l9-9 9 9M5 10v10h14V10" />,
  edital: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  estudo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  questoes: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  revisoes: <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />,
  agenda: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
};

export default function Nav({ avisos = 0 }: { avisos?: number }) {
  const caminho = usePathname() ?? "";
  const atual = secaoDoCaminho(caminho);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <span className="marca">
          <Logo />
          Estudos
        </span>
        <nav className="tabs" aria-label="Principal">
          {SECOES.map((l) => {
            const ativo = atual?.id === l.id;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={ativo ? "ativo" : undefined}
                aria-current={ativo ? "page" : undefined}
              >
                <Icone>{ICONES[l.id]}</Icone>
                {l.rotulo}
              </Link>
            );
          })}
        </nav>
        <div className="topbar-acoes">
          <Link
            href="/avisos"
            className={`sino${caminho.startsWith("/avisos") ? " ativo" : ""}`}
            aria-label={avisos > 0 ? `Avisos: ${avisos} novos` : "Avisos"}
          >
            <Icone>
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
            </Icone>
            {avisos > 0 && <span className="sino-numero">{avisos > 9 ? "9+" : avisos}</span>}
          </Link>
          <form action={sair}>
            <button className="link">Sair</button>
          </form>
        </div>
      </div>
    </header>
  );
}
