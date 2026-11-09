-- Fase 4: Simulados gerados por IA a partir de um PDF
-- Rode este arquivo UMA vez no SQL Editor do Supabase (depois do schema.sql).

create table public.simulados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo text not null,
  -- Tópico opcional: ao finalizar, o resultado entra nos registros de questões dele.
  topico_id uuid references public.topicos (id) on delete set null,
  tipo text not null check (tipo in ('multipla', 'certo_errado')),
  total int not null check (total > 0),
  acertos int check (acertos >= 0),
  finalizado_em timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index on public.simulados (user_id, created_at desc) where deleted_at is null;

alter table public.simulados enable row level security;

create policy "proprio usuario" on public.simulados
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      topico_id is null
      or exists (select 1 from public.topicos t where t.id = topico_id and t.user_id = auth.uid())
    )
  );

create table public.simulado_questoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  simulado_id uuid not null references public.simulados (id) on delete cascade,
  ordem int not null,
  enunciado text not null,
  alternativas jsonb not null,
  correta int not null check (correta >= 0),
  explicacao text,
  resposta int check (resposta >= 0),
  created_at timestamptz not null default now()
);

create index on public.simulado_questoes (simulado_id, ordem);

alter table public.simulado_questoes enable row level security;

create policy "proprio usuario" on public.simulado_questoes
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.simulados s where s.id = simulado_id and s.user_id = auth.uid())
  );
