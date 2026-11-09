import Link from "next/link";
import GerarSimulado from "@/components/GerarSimulado";
import { listarTopicosParaSelecao } from "@/lib/consultas";
import { formatarData } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

type Linha = {
  id: string;
  titulo: string;
  tipo: string;
  total: number;
  acertos: number | null;
  finalizado_em: string | null;
  created_at: string;
};

export default async function SimuladosPage() {
  const supabase = await createClient();

  const [topicos, consulta] = await Promise.all([
    listarTopicosParaSelecao(supabase),
    supabase
      .from("simulados")
      .select("id, titulo, tipo, total, acertos, finalizado_em, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  // Sem a tabela, o SQL da fase 4 ainda não foi executado.
  if (consulta.error) {
    return (
      <>
        <h1>Simulados</h1>
        <p className="aviso erro">
          Falta uma atualização no banco. No Supabase, abra o SQL Editor e execute o arquivo{" "}
          <code>supabase/fase4_simulados.sql</code> uma vez. Depois, recarregue esta página.
        </p>
      </>
    );
  }

  const simulados = (consulta.data ?? []) as Linha[];

  return (
    <>
      <h1>Simulados</h1>
      <p className="subtitulo">Envie um PDF e a IA monta questões só com o conteúdo dele.</p>

      <section className="card">
        <h2>Novo simulado</h2>
        <GerarSimulado topicos={topicos} />
      </section>

      <section className="card">
        <h2>Meus simulados</h2>
        {simulados.length === 0 ? (
          <p className="vazio">Nenhum simulado ainda. Envie um PDF acima para gerar o primeiro.</p>
        ) : (
          <ul className="lista">
            {simulados.map((s) => (
              <li key={s.id}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <Link href={`/simulados/${s.id}`}>
                    <strong>{s.titulo}</strong>
                  </Link>
                  <div className="muted" style={{ fontSize: "0.9rem" }}>
                    {s.total} questões · {s.tipo === "certo_errado" ? "certo ou errado" : "múltipla escolha"} ·{" "}
                    {formatarData(s.created_at.slice(0, 10))}
                  </div>
                </div>
                {s.finalizado_em && s.acertos !== null ? (
                  <span className="tag concluido">
                    {s.acertos}/{s.total} ({Math.round((s.acertos / s.total) * 100)}%)
                  </span>
                ) : (
                  <span className="tag">Não feito</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
