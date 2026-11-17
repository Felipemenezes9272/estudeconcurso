import Link from "next/link";

// Aviso de que a lista está filtrada por um tópico, com botão para ver tudo.
export default function FiltroTopico({
  rotulo,
  limparHref,
  voltarHref,
}: {
  rotulo: string;
  limparHref: string;
  voltarHref: string;
}) {
  return (
    <div className="aviso info" role="status">
      <p style={{ margin: 0 }}>
        Mostrando só o tópico <strong>{rotulo}</strong>.
      </p>
      <p className="row" style={{ margin: "8px 0 0" }}>
        <Link href={limparHref} className="botao">
          Ver todos os tópicos
        </Link>
        <Link href={voltarHref} className="botao">
          Voltar ao tópico
        </Link>
      </p>
    </div>
  );
}
