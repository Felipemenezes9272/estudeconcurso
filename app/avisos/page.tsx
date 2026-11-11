import Link from "next/link";
import { marcarAvisoLido, marcarTodosAvisosLidos } from "@/app/actions";
import type { Aviso } from "@/lib/avisos";
import { carregarAvisos } from "@/lib/avisos-consulta";
import { hoje } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

const ROTULO_NIVEL = { urgente: "Urgente", atencao: "Atenção", info: "Informação" } as const;
const CLASSE_NIVEL = { urgente: "erro", atencao: "atencao", info: "info" } as const;

function ItemAviso({ aviso, lido }: { aviso: Aviso; lido: boolean }) {
  return (
    <li className={`aviso-item${lido ? " lido" : ""}`}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <span className={`tag nivel-${aviso.nivel}`}>{ROTULO_NIVEL[aviso.nivel]}</span>{" "}
        <strong>{aviso.titulo}</strong>
        <div className="muted" style={{ fontSize: "0.9rem", marginTop: 2 }}>
          {aviso.texto}
        </div>
        <Link href={aviso.href}>{aviso.rotuloLink} →</Link>
      </div>
      {!lido && (
        <form action={marcarAvisoLido}>
          <input type="hidden" name="chave" value={aviso.chave} />
          <button className="pequeno">Marcar como lido</button>
        </form>
      )}
    </li>
  );
}

export default async function AvisosPage() {
  const supabase = await createClient();
  const { naoLidos, lidos } = await carregarAvisos(supabase, hoje());

  return (
    <>
      <h1>Avisos</h1>
      <p className="subtitulo">
        {naoLidos.length === 0
          ? "Tudo em dia."
          : `${naoLidos.length} ${naoLidos.length === 1 ? "aviso novo" : "avisos novos"}`}
      </p>

      <section className="card">
        {naoLidos.length === 0 ? (
          <p className="vazio">
            Nenhum aviso novo. Aqui aparecem revisões atrasadas, cartões do dia, datas do calendário
            (inscrição, prova), erros pendentes e dias sem estudar.
          </p>
        ) : (
          <>
            <ul className="lista">
              {naoLidos.map((a) => (
                <ItemAviso key={a.chave} aviso={a} lido={false} />
              ))}
            </ul>
            <form action={marcarTodosAvisosLidos} style={{ marginTop: 12 }}>
              <input type="hidden" name="chaves" value={JSON.stringify(naoLidos.map((a) => a.chave))} />
              <button className="pequeno">Marcar todos como lidos</button>
            </form>
          </>
        )}
      </section>

      {lidos.length > 0 && (
        <section className="card">
          <details>
            <summary>Já lidos ({lidos.length})</summary>
            <ul className="lista">
              {lidos.map((a) => (
                <ItemAviso key={a.chave} aviso={a} lido />
              ))}
            </ul>
          </details>
        </section>
      )}
    </>
  );
}
