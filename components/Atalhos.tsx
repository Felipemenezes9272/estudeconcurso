import Link from "next/link";

const ATALHOS = [
  {
    href: "/simulados",
    titulo: "Simulados com IA",
    texto: "Envie um PDF e resolva questões geradas do conteúdo.",
    icone: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </>
    ),
  },
  {
    href: "/prioridades",
    titulo: "O que estudar primeiro",
    texto: "Prioridades por edital e por matéria.",
    icone: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="0.5" />
      </>
    ),
  },
  {
    href: "/relatorios",
    titulo: "Relatórios de evolução",
    texto: "Horas, acertos e pontos fracos por matéria.",
    icone: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  },
] as const;

// Atalhos do painel: botões para as áreas que ficam dentro das seções do menu.
export default function Atalhos() {
  return (
    <section aria-label="Atalhos" className="atalhos">
      {ATALHOS.map((a) => (
        <Link key={a.href} href={a.href} className="atalho">
          <span className="atalho-icone">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {a.icone}
            </svg>
          </span>
          <span>
            <strong>{a.titulo}</strong>
            <span className="atalho-texto">{a.texto}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}
