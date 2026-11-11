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
  themeColor: "#1b3fd1",
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Public+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        {user && <Nav avisos={avisosNovos} />}
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
