import CampoSenha from "@/components/CampoSenha";
import { GabaritoArte, Logo } from "@/components/Ilustracoes";
import { criarConta, entrar } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; info?: string }>;
}) {
  const { erro, info } = await searchParams;

  return (
    <main className="entrada">
      <section className="entrada-arte">
        <span className="marca">
          <Logo />
          Estudos
        </span>
        <h1>Edital, revisões e simulados em um só caderno.</h1>
        <p>Cada tópico que você conclui agenda as próprias revisões. Você só precisa abrir e estudar.</p>
        <GabaritoArte className="entrada-ilustracao" />
      </section>

      <section className="entrada-form">
        <div className="entrada-cartao">
          <h2>Entre no seu caderno</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Primeira vez aqui? Preencha e toque em Criar conta.
          </p>

          {erro && <p className="aviso erro">{erro}</p>}
          {info && <p className="aviso info">{info}</p>}

          <form className="stack">
            <label>
              E-mail
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Senha
              <CampoSenha />
            </label>
            <div className="row">
              <button formAction={entrar} className="primario" style={{ flex: 1 }}>
                Entrar
              </button>
              <button formAction={criarConta} style={{ flex: 1 }}>
                Criar conta
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
