"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { secaoDoCaminho, subAbaAtiva } from "@/lib/navegacao";

// Botões das sub-abas da seção em que a pessoa está (ex.: Questões > Simulados com IA).
export default function SubAbas() {
  const caminho = usePathname() ?? "";
  const secao = secaoDoCaminho(caminho);
  if (!secao || secao.sub.length === 0) return null;

  return (
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
  );
}
