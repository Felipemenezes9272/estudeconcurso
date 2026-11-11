import { somarDias } from "@/lib/datas";

export const META_PADRAO = 120;
export const MIN_POR_TOPICO = 40;
export const MIN_POR_REVISAO = 10;

/** Dias seguidos com estudo, contando até hoje (ou até ontem, se hoje ainda não teve). */
export function calcularSequencia(datas: string[], hoje: string): number {
  const conjunto = new Set(datas);
  let dia = conjunto.has(hoje) ? hoje : somarDias(hoje, -1);
  let total = 0;
  while (conjunto.has(dia)) {
    total += 1;
    dia = somarDias(dia, -1);
  }
  return total;
}

export type ItemPlano = { tipo: "revisao" | "topico"; id: string; nome: string; minutos: number };
export type DiaPlano = { data: string; itens: ItemPlano[]; minutos: number };

export type RevisaoPlano = { id: string; data: string; nome: string };
export type TopicoPlano = { id: string; nome: string; materia: string };

/**
 * Distribui revisões (na data prevista; as atrasadas caem em hoje) e tópicos
 * prioritários pelos próximos dias, sem passar da meta diária.
 * Cada dia recebe pelo menos um item se houver o que estudar.
 */
export function montarPlano(opcoes: {
  hoje: string;
  metaMinutos: number;
  revisoes: RevisaoPlano[];
  topicos: TopicoPlano[];
  dias?: number;
}): DiaPlano[] {
  const { hoje, metaMinutos, revisoes, topicos } = opcoes;
  const total = opcoes.dias ?? 7;
  const fila = [...topicos];
  const plano: DiaPlano[] = [];

  for (let i = 0; i < total; i++) {
    const data = somarDias(hoje, i);
    const itens: ItemPlano[] = [];
    let minutos = 0;

    const doDia = revisoes.filter((r) => (i === 0 ? r.data <= data : r.data === data));
    for (const r of doDia) {
      itens.push({ tipo: "revisao", id: r.id, nome: r.nome, minutos: MIN_POR_REVISAO });
      minutos += MIN_POR_REVISAO;
    }

    while (fila.length > 0 && (minutos + MIN_POR_TOPICO <= metaMinutos || itens.length === 0)) {
      const t = fila.shift()!;
      itens.push({ tipo: "topico", id: t.id, nome: `${t.materia} › ${t.nome}`, minutos: MIN_POR_TOPICO });
      minutos += MIN_POR_TOPICO;
    }

    plano.push({ data, itens, minutos });
  }
  return plano;
}
