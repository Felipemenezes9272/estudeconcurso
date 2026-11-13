"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArteSecao } from "@/components/Ilustracoes";
import { ArteSecao } from "@/components/Ilustracoes";
import { secaoDoCaminho, subAbaAtiva } from "@/lib/navegacao";

const DESCRICAO: Record<string, string> = {
  edital: "Concursos, matérias e tópicos",
  estudo: "Meta do dia, plano e prioridades",
  questoes: "Questões, simulados e erros",
  revisoes: "Revisões e flashcards",
};

// Botões das sub-abas da seção em que a pessoa está (ex.: Questões > Simulados com IA).
export default function SubAbas() {
  const caminho = usePathname() ?? "";
  const secao = secaoDoCaminho(caminho);
  if (!secao || secao.sub.length === 0) return null;

  return (
    <>
      <div className="faixa-secao">
        <ArteSecao id={secao.id} className="arte-secao" />
        <div>
          <strong>{secao.rotulo}</strong>
          <span>{DESCRICAO[secao.id] ?? ""}</span>
        </div>
      </div>
      <nav className="subabas" aria-label={`Seções de ${secao.rotulo}`}>
      {secao.sub.map((aba) => {
        const ativa = subAbaAtiva(caminho, aba);
        return (
          <Link
            key={aba.href}
            href={aba.href}
            className={ativa ? "ativa" : undefined}
            aria-current={ativa ? "page" : undefined}
          >
            {aba.rotulo}
          </Link>
        );
      })}
      </nav>
    </>
  );
}
