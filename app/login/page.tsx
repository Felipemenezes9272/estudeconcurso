import { criarConta, entrar } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; info?: string }>;
}) {
  const { erro, info } = await searchParams;

  return (
    <main className="login">
      <h1>Estudos para Concursos</h1>
      <p className="muted">Entre ou crie sua conta para começar.</p>

      {erro && <p className="aviso erro">{erro}</p>}
      {info && <p className="aviso info">{info}</p>}

      <form className="stack">
        <label>
          E-mail
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Senha
          <input name="senha" type="password" autoComplete="current-password" required />
        </label>
        <div className="row">
          <button formAction={entrar} className="primario">
            Entrar
          </button>
          <button formAction={criarConta}>Criar conta</button>
        </div>
      </form>
    </main>
  );
}
