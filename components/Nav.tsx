"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "@/app/actions";

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

const links = [
  {
    href: "/",
    rotulo: "Painel",
    icone: <path d="M3 12l9-9 9 9M5 10v10h14V10" />,
  },
  {
    href: "/edital",
    rotulo: "Edital",
    icone: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  },
  {
    href: "/estudo",
    rotulo: "Estudo",
    icone: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  {
    href: "/questoes",
    rotulo: "Questões",
    icone: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
  {
    href: "/erros",
    rotulo: "Erros",
    icone: <path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />,
  },
  {
    href: "/flashcards",
    rotulo: "Cards",
    icone: (
      <>
        <rect x="3" y="6" width="14" height="12" rx="2" />
        <path d="M7 6V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      </>
    ),
  },
  {
    href: "/calendario",
    rotulo: "Agenda",
    icone: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
  },
  {
    href: "/revisoes",
    rotulo: "Revisões",
    icone: <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />,
  },
];

export default function Nav() {
  const caminho = usePathname() ?? "";

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <span className="marca">Estudos</span>
        <nav className="tabs" aria-label="Principal">
          {links.map((l) => {
            const ativo = l.href === "/" ? caminho === "/" : caminho.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={ativo ? "ativo" : undefined}
                aria-current={ativo ? "page" : undefined}
              >
                <Icone>{l.icone}</Icone>
                {l.rotulo}
              </Link>
            );
          })}
        </nav>
        <form action={sair}>
          <button className="link">Sair</button>
        </form>
      </div>
    </header>
  );
}
