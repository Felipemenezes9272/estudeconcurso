import RelatoriosView from "@/components/RelatoriosView";
import { hoje, somarDias } from "@/lib/datas";
import {
  PERIODOS,
  agregar,
  type LinhaQuestoes,
  type LinhaSessao,
  type LinhaTopico,
} from "@/lib/relatorios";
import { createClient } from "@/lib/supabase/server";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const { dias: diasParam } = await searchParams;
  const pedido = Number.parseInt(diasParam ?? "", 10);
  const dias = (PERIODOS as readonly number[]).includes(pedido) ? pedido : 30;

  const supabase = await createClient();
  const dataHoje = hoje();
  const inicio = somarDias(dataHoje, -(dias - 1));

  const [sessoes, questoes, topicos] = await Promise.all([
    supabase
      .from("sessoes_estudo")
      .select("data, minutos, topicos(materias(nome))")
      .is("deleted_at", null)
      .gte("data", inicio)
      .limit(5000),
    supabase
      .from("registros_questoes")
      .select("data, total, acertos, topicos(materias(nome))")
      .is("deleted_at", null)
      .gte("data", inicio)
      .limit(5000),
    supabase.from("topicos").select("status, materias(nome)").is("deleted_at", null).limit(5000),
  ]);

  const relatorio = agregar({
    sessoes: (sessoes.data ?? []) as unknown as LinhaSessao[],
    questoes: (questoes.data ?? []) as unknown as LinhaQuestoes[],
    topicos: (topicos.data ?? []) as unknown as LinhaTopico[],
    hoje: dataHoje,
    dias,
  });

  return <RelatoriosView relatorio={relatorio} dias={dias} />;
}
