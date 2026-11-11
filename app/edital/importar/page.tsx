import ImportarEdital from "@/components/ImportarEdital";

export default function ImportarEditalPage() {
  return (
    <>
      <h1>Importar edital</h1>
      <p className="subtitulo">Envie o PDF do edital e a IA monta o concurso, as matérias, os tópicos e as datas.</p>
      <ImportarEdital chaveConfigurada={Boolean(process.env.GEMINI_API_KEY)} />
    </>
  );
}
