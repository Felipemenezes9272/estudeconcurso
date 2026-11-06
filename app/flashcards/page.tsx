import FlashcardsView, { type LinhaCartao } from "@/components/FlashcardsView";
import { listarTopicosParaSelecao } from "@/lib/consultas";
import { hoje } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; topico?: string }>;
}) {
  const { ok, topico } = await searchParams;
  const supabase = await createClient();

  const [topicos, consulta] = await Promise.all([
    listarTopicosParaSelecao(supabase),
    supabase
      .from("flashcards")
      .select("id, frente, verso, proxima_revisao, intervalo_dias, topicos(nome, materias(nome))")
      .is("deleted_at", null)
      .order("proxima_revisao")
      .order("created_at")
      .limit(1000),
  ]);

  return (
    <FlashcardsView
      cartoes={(consulta.data ?? []) as unknown as LinhaCartao[]}
      topicos={topicos}
      hoje={hoje()}
      ok={Boolean(ok)}
      topicoSelecionado={topicos.some((t) => t.id === topico) ? topico : undefined}
    />
  );
}
