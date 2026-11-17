import FiltroTopico from "@/components/FiltroTopico";
import FlashcardsView, { type LinhaCartao } from "@/components/FlashcardsView";
import { listarTopicosParaSelecao } from "@/lib/consultas";
import { hoje } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; topico?: string; so?: string }>;
}) {
  const { ok, topico, so } = await searchParams;
  const supabase = await createClient();

  const [topicos, consulta] = await Promise.all([
    listarTopicosParaSelecao(supabase),
    supabase
      .from("flashcards")
      .select("id, topico_id, frente, verso, proxima_revisao, intervalo_dias, topicos(nome, materias(nome))")
      .is("deleted_at", null)
      .order("proxima_revisao")
      .order("created_at")
      .limit(1000),
  ]);

  const foco = topicos.find((t) => t.id === so);
  const todos = (consulta.data ?? []) as unknown as (LinhaCartao & { topico_id: string })[];
  const cartoes = foco ? todos.filter((c) => c.topico_id === foco.id) : todos;

  return (
    <>
      {foco && (
        <FiltroTopico rotulo={foco.rotulo} limparHref="/flashcards" voltarHref={`/estudo/topico?topico=${foco.id}`} />
      )}
    <FlashcardsView
      cartoes={cartoes}
      topicos={topicos}
      hoje={hoje()}
      ok={Boolean(ok)}
      topicoSelecionado={topicos.some((t) => t.id === topico) ? topico : foco?.id}
    />
    </>
  );
}
