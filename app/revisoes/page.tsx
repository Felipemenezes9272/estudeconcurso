import ListaRevisoes from "@/components/ListaRevisoes";
import { listarRevisoesPendentes } from "@/lib/consultas";
import { hoje } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

export default async function RevisoesPage() {
  const supabase = await createClient();
  const dataHoje = hoje();

  const pendentes = await listarRevisoesPendentes(supabase);
  const devidas = pendentes.filter((r) => r.data_prevista <= dataHoje);
  const futuras = pendentes.filter((r) => r.data_prevista > dataHoje);

  return (
    <>
      <h1>Revisões</h1>

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
