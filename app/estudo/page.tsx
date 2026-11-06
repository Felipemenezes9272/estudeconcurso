import Link from "next/link";
import FormEstudo from "@/components/FormEstudo";
import { listarTopicosParaSelecao } from "@/lib/consultas";
import { formatarData, formatarMinutos } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

const ROTULO_TIPO: Record<string, string> = {
  teoria: "Teoria",
  questoes: "Questões",
  revisao: "Revisão",
};

export default async function EstudoPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const supabase = await createClient();

  const [topicos, recentes] = await Promise.all([
    listarTopicosParaSelecao(supabase),
    supabase
      .from("sessoes_estudo")
      .select("id, data, minutos, tipo, topicos(nome)")
      .is("deleted_at", null)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const sessoes = (recentes.data ?? []) as unknown as {
    id: string;
    data: string;
    minutos: number;
    tipo: string;
    topicos: { nome: string } | null;
  }[];

  return (
    <>
      <h1>Registrar estudo</h1>
      {ok && <p className="aviso ok">Sessão registrada.</p>}

      <section className="card">
        {topicos.length === 0 ? (
          <p className="muted">
            Cadastre os tópicos no <Link href="/edital">edital</Link> para poder registrar o estudo.
          </p>
        ) : (
          <FormEstudo topicos={topicos} />
        )}
      </section>

      <section className="card">
        <h2>Últimas sessões</h2>
        {sessoes.length === 0 ? (
          <p className="vazio">Nada registrado ainda.</p>
        ) : (
          <ul className="lista">
            {sessoes.map((s) => (
              <li key={s.id}>
                <span>
                  <strong>{s.topicos?.nome ?? "Tópico"}</strong>{" "}
                  <span className="tag">{ROTULO_TIPO[s.tipo] ?? s.tipo}</span>
                </span>
                <span className="muted">
                  {formatarData(s.data)} · {formatarMinutos(s.minutos)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
