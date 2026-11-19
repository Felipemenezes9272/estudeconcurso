/** Título do quiz de abertura de um dia (AAAA-MM-DD): "Quiz do dia 19/11". */
export function tituloDoQuiz(dia: string): string {
  const [, m, d] = dia.split("-");
  return `Quiz do dia ${d}/${m}`;
}
