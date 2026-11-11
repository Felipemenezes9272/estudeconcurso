// Regras dos avisos: a partir dos dados do usuário, decide quais alertas mostrar.
// Cada aviso tem uma "chave" estável; ler um aviso guarda a chave, e ele só volta
// se mudar de situação (ex.: de "em 7 dias" para "amanhã"), pois a chave muda.

import { ROTULO_EVENTO, diasEntre, type TipoEvento } from "@/lib/calendario";

export type NivelAviso = "urgente" | "atencao" | "info";

export type Aviso = {
  chave: string;
  nivel: NivelAviso;
  titulo: string;
  texto: string;
  href: string;
  rotuloLink: string;
};

export type EventoAviso = {
  id: string;
  titulo: string;
  data: string;
  tipo: TipoEvento;
  concurso_nome: string | null;
};

export type DadosAvisos = {
  hoje: string;
  revisoesAtrasadas: number;
  revisoesHoje: number;
  cartoesHoje: number;
  errosPendentes: number;
  temTopicos: boolean;
  ultimoEstudo: string | null; // AAAA-MM-DD da última sessão registrada
  eventos: EventoAviso[]; // de hoje até 30 dias à frente
};

const ORDEM: Record<NivelAviso, number> = { urgente: 0, atencao: 1, info: 2 };
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Faixa de antecedência de um evento, ou null se ainda está longe demais. */
function faixaDoEvento(tipo: TipoEvento, dias: number): "hoje" | "amanha" | "d7" | "d14" | "d30" | null {
  if (dias < 0) return null;
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanha";
  if (dias <= 7) return "d7";
  if (tipo === "prova" && dias <= 14) return "d14";
  if (tipo === "prova" && dias <= 30) return "d30";
  return null;
}

export function montarAvisos(d: DadosAvisos): Aviso[] {
  const avisos: Aviso[] = [];

  if (d.revisoesAtrasadas > 0) {
    avisos.push({
      chave: `rev-atrasadas:${d.hoje}`,
      nivel: "urgente",
      titulo: `${plural(d.revisoesAtrasadas, "revisão atrasada", "revisões atrasadas")}`,
      texto: "Revisar no tempo certo é o que fixa o conteúdo. Comece pelas mais antigas.",
      href: "/revisoes",
      rotuloLink: "Ver revisões",
    });
  }

  if (d.revisoesHoje > 0) {
    avisos.push({
      chave: `rev-hoje:${d.hoje}`,
      nivel: "atencao",
      titulo: `${plural(d.revisoesHoje, "revisão", "revisões")} para hoje`,
      texto: "Tópicos que você concluiu e que vencem hoje.",
      href: "/revisoes",
      rotuloLink: "Revisar agora",
    });
  }

  if (d.cartoesHoje > 0) {
    avisos.push({
      chave: `cartoes:${d.hoje}`,
      nivel: "atencao",
      titulo: `${plural(d.cartoesHoje, "cartão", "cartões")} para estudar hoje`,
      texto: "Seus flashcards com repetição espaçada vencem hoje.",
      href: "/flashcards",
      rotuloLink: "Estudar cartões",
    });
  }

  for (const e of d.eventos) {
    const dias = diasEntre(d.hoje, e.data);
    const faixa = faixaDoEvento(e.tipo, dias);
    if (!faixa) continue;

    const quando =
      faixa === "hoje" ? "Hoje" : faixa === "amanha" ? "Amanhã" : `Em ${dias} dias`;
    avisos.push({
      chave: `evento:${e.id}:${faixa}`,
      nivel: faixa === "hoje" || faixa === "amanha" ? "urgente" : e.tipo === "prova" ? "atencao" : "info",
      titulo: `${quando}: ${e.titulo}`,
      texto: `${ROTULO_EVENTO[e.tipo]}${e.concurso_nome ? ` · ${e.concurso_nome}` : ""}.`,
      href: `/calendario?mes=${e.data.slice(0, 7)}`,
      rotuloLink: "Abrir no calendário",
    });
  }

  if (d.errosPendentes >= 5) {
    avisos.push({
      chave: `erros:${Math.floor(d.errosPendentes / 5) * 5}`,
      nivel: "info",
      titulo: `${d.errosPendentes} erros esperando revisão`,
      texto: "Rever os erros no caderno evita repeti-los na prova.",
      href: "/erros",
      rotuloLink: "Abrir caderno de erros",
    });
  }

  if (d.temTopicos && d.ultimoEstudo) {
    const parado = diasEntre(d.ultimoEstudo, d.hoje);
    if (parado >= 2) {
      avisos.push({
        chave: `sem-estudo:${d.hoje}`,
        nivel: parado >= 4 ? "atencao" : "info",
        titulo: `${parado} dias sem registrar estudo`,
        texto: "Que tal uma sessão curta hoje para manter o ritmo?",
        href: "/estudo",
        rotuloLink: "Registrar estudo",
      });
    }
  }

  return avisos.sort((a, b) => ORDEM[a.nivel] - ORDEM[b.nivel]);
}
