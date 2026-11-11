// Estrutura do menu: seis seções principais e, dentro de cada uma, sub-abas.
// As páginas continuam com os mesmos endereços; só mudou como chegamos a elas.

export type SubAba = {
  href: string;
  rotulo: string;
  /** Só fica ativa quando o endereço é exatamente este (ex.: /edital, mas não /edital/importar). */
  exato?: boolean;
};

export type Secao = {
  id: "painel" | "edital" | "estudo" | "questoes" | "revisoes" | "agenda";
  href: string;
  rotulo: string;
  /** Endereços que pertencem a esta seção. */
  prefixos: string[];
  sub: SubAba[];
};

export const SECOES: Secao[] = [
  { id: "painel", href: "/", rotulo: "Painel", prefixos: ["/"], sub: [] },
  {
    id: "edital",
    href: "/edital",
    rotulo: "Edital",
    prefixos: ["/edital"],
    sub: [
      { href: "/edital", rotulo: "Meu edital", exato: true },
      { href: "/edital/importar", rotulo: "Importar PDF com IA" },
    ],
  },
  {
    id: "estudo",
    href: "/estudo",
    rotulo: "Estudo",
    prefixos: ["/estudo", "/prioridades", "/relatorios"],
    sub: [
      { href: "/estudo", rotulo: "Estudo de hoje", exato: true },
      { href: "/estudo/topico", rotulo: "Por tópico" },
      { href: "/prioridades", rotulo: "O que estudar primeiro" },
      { href: "/relatorios", rotulo: "Relatórios de evolução" },
    ],
  },
  {
    id: "questoes",
    href: "/questoes",
    rotulo: "Questões",
    prefixos: ["/questoes", "/simulados", "/erros"],
    sub: [
      { href: "/questoes", rotulo: "Registrar questões" },
      { href: "/simulados", rotulo: "Simulados com IA" },
      { href: "/erros", rotulo: "Caderno de erros" },
    ],
  },
  {
    id: "revisoes",
    href: "/revisoes",
    rotulo: "Revisões",
    prefixos: ["/revisoes", "/flashcards"],
    sub: [
      { href: "/revisoes", rotulo: "Revisões do dia" },
      { href: "/flashcards", rotulo: "Flashcards" },
    ],
  },
  { id: "agenda", href: "/calendario", rotulo: "Agenda", prefixos: ["/calendario"], sub: [] },
];

const dentroDe = (caminho: string, prefixo: string) =>
  caminho === prefixo || caminho.startsWith(`${prefixo}/`);

/** Seção a que o endereço pertence (ou undefined, ex.: /avisos). */
export function secaoDoCaminho(caminho: string): Secao | undefined {
  if (caminho === "/") return SECOES[0];
  return SECOES.slice(1).find((s) => s.prefixos.some((p) => dentroDe(caminho, p)));
}

export function subAbaAtiva(caminho: string, aba: SubAba): boolean {
  return aba.exato ? caminho === aba.href : dentroDe(caminho, aba.href);
}
