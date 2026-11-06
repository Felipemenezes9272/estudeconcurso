import Link from "next/link";
import ImportarEdital from "@/components/ImportarEdital";

export default function ImportarEditalPage() {
  return (
    <>
      <h1>Importar edital</h1>
      <p className="subtitulo">
        <Link href="/edital">← Voltar ao edital</Link>
      </p>
      <ImportarEdital chaveConfigurada={Boolean(process.env.GEMINI_API_KEY)} />
    </>
  );
}
