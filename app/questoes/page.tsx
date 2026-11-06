import Link from "next/link";
import { registrarQuestoes } from "@/app/actions";
import { listarTopicosParaSelecao } from "@/lib/consultas";
import { formatarData } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

export default async function QuestoesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const supabase = await createClient();

  const [topicos, recentes] = await Promise.all([
    listarTopicosParaSelecao(supabase),
    supabase
      .from("registros_questoes")
      .select("id, data, total, acertos, topicos(nome)")
      .is("deleted_at", null)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const registros = (recentes.data ?? []) as unknown as {
    id: string;
    data: string;
    total: number;
    acertos: number;
    topicos: { nome: string } | null;
  }[];

  return (
    <>
      <h1>Registrar questões</h1>
      {ok && <p className="aviso ok">Questões registradas.</p>}

      <section className="card">
        {topicos.length === 0 ? (
          <p className="muted">
            Cadastre os tópicos no <Link href="/edital">edital</Link> para poder registrar questões.
          </p>
        ) : (
          <form action={registrarQuestoes} className="stack">
            <label>
              Tópico
              <select name="topico_id" required defaultValue="">
                <option value="" disabled>
                  Escolha o tópico…
                </option>
                {topicos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <div className="row">
              <label style={{ flex: 1 }}>
                Questões feitas
                <input name="total" type="number" min={1} required />
              </label>
              <label style={{ flex: 1 }}>
                Acertos
                <input name="acertos" type="number" min={0} required />
              </label>
            </div>
            <button className="primario">Registrar</button>
          </form>
        )}
      </section>

      <section className="card">
        <h2>Últimos registros</h2>
        {registros.length === 0 ? (
          <p className="vazio">Nada registrado ainda.</p>
        ) : (
          <ul className="lista">
            {registros.map((r) => (
              <li key={r.id}>
                <strong>{r.topicos?.nome ?? "Tópico"}</strong>
                <span className="muted">
                  {formatarData(r.data)} · {r.acertos}/{r.total} ({Math.round((r.acertos / r.total) * 100)}%)
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
