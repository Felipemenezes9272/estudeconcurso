import FiltroTopico from "@/components/FiltroTopico";
import ListaRevisoes from "@/components/ListaRevisoes";
import { listarRevisoesPendentes, listarTopicosParaSelecao } from "@/lib/consultas";
import { hoje } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

export default async function RevisoesPage({
  searchParams,
}: {
  searchParams: Promise<{ so?: string }>;
}) {
  const { so } = await searchParams;
  const supabase = await createClient();
  const dataHoje = hoje();

  const [todas, opcoes] = await Promise.all([listarRevisoesPendentes(supabase), listarTopicosParaSelecao(supabase)]);
  const foco = opcoes.find((o) => o.id === so);
  const pendentes = foco ? todas.filter((r) => r.topico_id === foco.id) : todas;
  const devidas = pendentes.filter((r) => r.data_prevista <= dataHoje);
  const futuras = pendentes.filter((r) => r.data_prevista > dataHoje);

  return (
    <>
      <h1>Revisões</h1>
      <p className="subtitulo">
        O botão que você marca ajusta as próximas datas: <strong>Fácil</strong> afasta a próxima revisão,{" "}
        <strong>Difícil</strong> aproxima e agenda uma extra em 3 dias.
      </p>
      {foco && (
        <FiltroTopico rotulo={foco.rotulo} limparHref="/revisoes" voltarHref={`/estudo/topico?topico=${foco.id}`} />
      )}

      <section className="card">
        <h2>Para hoje ({devidas.length})</h2>
        <ListaRevisoes
          revisoes={devidas}
          hoje={dataHoje}
          vazio="Nada para revisar agora. Bom trabalho!"
        />
      </section>

      <section className="card">
        <h2>Próximas ({futuras.length})</h2>
        <ListaRevisoes revisoes={futuras} hoje={dataHoje} vazio="Nenhuma revisão agendada." />
      </section>
    </>
  );
}
