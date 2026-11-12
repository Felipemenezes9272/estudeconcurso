import type { ReactNode } from "react";

// Mostra o markdown simples que a IA devolve (títulos, listas, negrito) sem HTML cru.

function inline(linha: string): ReactNode[] {
  return linha.split(/(\*\*[^*]+\*\*)/g).map((trecho, i) =>
    trecho.startsWith("**") && trecho.endsWith("**") && trecho.length > 4 ? (
      <strong key={i}>{trecho.slice(2, -2)}</strong>
    ) : (
      trecho
    ),
  );
}

export default function TextoEstudo({ texto }: { texto: string }) {
  const blocos: ReactNode[] = [];
  let itens: { ordenada: boolean; linhas: string[] } | null = null;

  const fecharLista = () => {
    if (!itens) return;
    const lista = itens.linhas.map((l, i) => <li key={i}>{inline(l)}</li>);
    blocos.push(itens.ordenada ? <ol key={blocos.length}>{lista}</ol> : <ul key={blocos.length}>{lista}</ul>);
    itens = null;
  };

  for (const bruta of texto.split("\n")) {
    const linha = bruta.trim();
    const titulo = /^(#{1,4})\s+(.*)$/.exec(linha);
    const marcador = /^[-*•]\s+(.*)$/.exec(linha);
    const numerado = /^\d+[.)]\s+(.*)$/.exec(linha);

    if (titulo) {
      fecharLista();
      blocos.push(<h3 key={blocos.length}>{inline(titulo[2])}</h3>);
    } else if (marcador || numerado) {
      const ordenada = !marcador;
      if (itens && itens.ordenada !== ordenada) fecharLista();
      if (!itens) itens = { ordenada, linhas: [] };
      itens.linhas.push((marcador ?? numerado)![1]);
    } else if (linha === "") {
      fecharLista();
    } else {
      fecharLista();
      blocos.push(<p key={blocos.length}>{inline(linha)}</p>);
    }
  }
  fecharLista();

  return <div className="texto-estudo">{blocos}</div>;
}
