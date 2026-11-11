import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import { carregarAvisos } from "@/lib/avisos-consulta";
import { hoje } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Estudos para Concursos",
  description: "Edital, revisões e desempenho em um só lugar.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Contador do sino. Qualquer falha na consulta não pode derrubar a página.
  let avisosNovos = 0;
  if (user) {
    try {
      avisosNovos = (await carregarAvisos(supabase, hoje())).naoLidos.length;
    } catch {
      avisosNovos = 0;
    }
  }

  return (
    <html lang="pt-BR">
      <body>
        {user && <Nav avisos={avisosNovos} />}
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
