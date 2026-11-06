"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function entrar(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("senha") ?? ""),
  });

  if (error) redirect(`/login?erro=${encodeURIComponent("E-mail ou senha incorretos.")}`);
  redirect("/");
}

export async function criarConta(formData: FormData) {
  const senha = String(formData.get("senha") ?? "");
  if (senha.length < 6) {
    redirect(`/login?erro=${encodeURIComponent("A senha precisa ter ao menos 6 caracteres.")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? "").trim(),
    password: senha,
  });

  if (error) redirect(`/login?erro=${encodeURIComponent(error.message)}`);

  // Com confirmação de e-mail ligada no Supabase, ainda não há sessão.
  if (!data.session) {
    redirect(
      `/login?info=${encodeURIComponent("Conta criada. Confirme o e-mail que você recebeu e entre.")}`,
    );
  }
  redirect("/");
}
