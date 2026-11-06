import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
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

  return (
    <html lang="pt-BR">
      <body>
        {user && <Nav />}
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
