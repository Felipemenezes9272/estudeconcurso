# Estudos para Concursos

Sistema pessoal para organizar o edital, registrar estudo e questões e revisar no tempo certo.
Next.js (PWA) + Supabase + Vercel, tudo em planos gratuitos.

## O que já funciona (MVP)

- Login com e-mail e senha
- Cadastro de concursos, matérias (peso e dificuldade) e tópicos (vários de uma vez, um por linha)
- Checklist do edital: clique no status do tópico para avançar (não iniciado → estudando → concluído)
- Ao concluir um tópico, o sistema agenda 4 revisões: 1, 7, 30 e 60 dias depois
- Registro de sessões de estudo, com cronômetro
- Registro de questões (feitas e acertos)
- Painel: revisões de hoje, horas dos últimos 7 dias, taxa de acerto e progresso do edital
- Revisão marcada como "difícil" volta à fila em 3 dias (além das já agendadas)

## Fase 2 (em andamento)

- **Caderno de erros** (`/erros`): registre a questão errada, o motivo (desatenção, lacuna de conteúdo ou
  pegadinha) e uma anotação. A tela mostra os motivos mais frequentes, os tópicos onde você mais erra,
  filtra por motivo e permite marcar como "já dominei".
  Requer rodar `supabase/fase2_erros.sql` uma vez no SQL Editor (depois do `schema.sql`).

- **Relatórios** (`/relatorios`): últimos 7, 30 ou 90 dias, com horas estudadas, dias com estudo, taxa de
  acerto, gráfico de tempo por dia e resumo por matéria (tempo, acerto e progresso do edital).
  Mostra um "ponto de atenção" quando uma matéria tem menos de 70% de acerto em 10 questões ou mais.
  Não precisa de SQL novo: usa os dados que você já registra.

- **Flashcards** (`/flashcards`): crie cartões de pergunta e resposta ligados a um tópico. Cada dia o
  sistema mostra os que vencem; você vê a resposta e avalia (Errei, Difícil, Bom ou Fácil), e o próximo
  intervalo se ajusta sozinho (de 1 dia até no máximo 365). O painel avisa quando há cartões para hoje.
  Requer rodar `supabase/fase2_flashcards.sql` uma vez no SQL Editor.

## Fase 3 (em andamento)

- **Prioridades** (`/prioridades`, link no painel): lista os 10 tópicos que mais merecem atenção agora.
  Pontuação = incidência (o quanto o assunto cai na prova, de 1 a 5, definida por você) × peso da matéria
  × desempenho (a partir de 5 questões no tópico, quem erra mais sobe na lista). Tópicos concluídos só
  voltam se o acerto estiver abaixo de 70%.
  Requer rodar `supabase/fase3_prioridades.sql` uma vez no SQL Editor. Sem isso, a tela avisa o que fazer.

## Importar edital com IA

Em **Edital → Importar edital em PDF com IA** (`/edital/importar`): envie o PDF (até 4 MB; se for grande,
só as páginas do conteúdo programático), o Gemini extrai concurso, banca, cargo, data da prova, matérias
(com peso estimado) e tópicos. Você revisa e edita tudo antes de salvar; nada é gravado antes disso.
Requer a variável `GEMINI_API_KEY` (chave gratuita em aistudio.google.com/apikey) na Vercel, sem o prefixo
`NEXT_PUBLIC_`. Opcional: `GEMINI_MODEL` para trocar o modelo (padrão `gemini-3.8-flash`, com reserva automática em outros modelos atuais).

## Fase 4: Simulados com IA

Em **Simulados** (`/simulados`, link no painel): envie um PDF (apostila, resumo, lei; até 4 MB) e o Gemini
monta de 3 a 20 questões só com o conteúdo dele, em múltipla escolha (A a E) ou certo/errado (estilo
Cebraspe), no nível que você escolher. Você resolve, finaliza e vê o gabarito comentado; dá para refazer.
Se vincular o simulado a um tópico do edital, o resultado entra nos registros de questões (relatórios e
prioridades). Usa a mesma `GEMINI_API_KEY` da importação de edital.
Requer rodar `supabase/fase4_simulados.sql` uma vez no SQL Editor. Sem isso, a tela avisa o que fazer.

Ainda fora do projeto, de propósito: notificações e modo offline.

## Como colocar para rodar

### 1. Banco de dados (Supabase)

1. Crie uma conta gratuita em supabase.com e um novo projeto.
2. Abra **SQL Editor**, cole todo o conteúdo de `supabase/schema.sql` e execute. Depois faça o mesmo
   com `supabase/fase2_erros.sql` (caderno de erros) `supabase/fase2_flashcards.sql` (flashcards) e `supabase/fase3_prioridades.sql` (prioridades) e `supabase/fase4_simulados.sql` (simulados).
3. Em **Authentication → Providers → Email**, se quiser entrar logo após criar a conta, desligue
   "Confirm email" (é uso pessoal). Se deixar ligado, confirme o e-mail recebido antes de entrar.
4. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.

### 2. Rodar no seu computador

Requer Node.js 20 ou superior.

```bash
cp .env.example .env.local     # preencha as duas variáveis com os dados do passo 1.4
npm install
npm run dev                    # abre em http://localhost:3000
```

Antes de publicar, rode também `npm run typecheck` e `npm run build` e me avise se der erro.

### 3. Publicar (Vercel)

1. Suba o projeto para um repositório no GitHub (o `.gitignore` já exclui `.env.local`).
2. Em vercel.com, importe o repositório e cadastre as mesmas duas variáveis de ambiente.
3. No celular, abra o endereço e use "Adicionar à tela inicial" para instalar como app.

## Segurança

- Cada tabela tem Row Level Security: você só lê e altera as suas linhas. Isso foi testado em um
  Postgres local com dois usuários.
- A chave `anon` é pública por desenho; o que protege os dados são as regras acima.
  **Nunca** coloque a chave `service_role` no projeto.

## Estrutura

```
app/                páginas (painel, edital, estudo, questoes, erros, flashcards, prioridades, relatorios, revisoes, login) e ações
components/         formulário de estudo com cronômetro, lista de revisões, relatórios, menu
lib/                datas, regra das revisões, cálculo dos relatórios, consultas e clientes do Supabase
supabase/            schema.sql (MVP), fase2_erros.sql, fase2_flashcards.sql e fase3_prioridades.sql: tabelas, índices e regras de segurança
_anterior/          arquivos de uma versão anterior, guardados sem uso (podem ser apagados)
```
