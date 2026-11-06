-- Schema do MVP: Sistema de Estudos para Concursos
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute uma vez.

-- ============ Tabelas ============

create table public.concursos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null,
  banca text,
  cargo text,
  data_prova date,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.materias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  concurso_id uuid not null references public.concursos (id) on delete cascade,
  nome text not null,
  peso int not null default 1 check (peso between 1 and 5),
  dificuldade int not null default 3 check (dificuldade between 1 and 5),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.topicos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  materia_id uuid not null references public.materias (id) on delete cascade,
  parent_id uuid references public.topicos (id) on delete cascade,
  nome text not null,
  status text not null default 'nao_iniciado'
    check (status in ('nao_iniciado', 'estudando', 'concluido')),
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.sessoes_estudo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topico_id uuid not null references public.topicos (id) on delete cascade,
  data date not null default current_date,
  minutos int not null check (minutos > 0),
  tipo text not null default 'teoria' check (tipo in ('teoria', 'questoes', 'revisao')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.registros_questoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topico_id uuid not null references public.topicos (id) on delete cascade,
  data date not null default current_date,
  total int not null check (total > 0),
  acertos int not null check (acertos >= 0),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (acertos <= total)
);

create table public.revisoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topico_id uuid not null references public.topicos (id) on delete cascade,
  intervalo_dias int not null,
  data_prevista date not null,
  data_feita date,
  resultado text check (resultado in ('facil', 'medio', 'dificil')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ============ Índices ============

create index on public.concursos (user_id);
create index on public.materias (concurso_id);
create index on public.topicos (materia_id);
create index on public.topicos (parent_id);
create index on public.sessoes_estudo (topico_id, data);
create index on public.registros_questoes (topico_id, data);
create index on public.revisoes (user_id, data_prevista) where data_feita is null;

-- ============ Segurança: Row Level Security ============
-- Cada usuário enxerga e altera apenas as próprias linhas. Nas tabelas filhas,
-- também exige que o registro pai pertença ao mesmo usuário.

alter table public.concursos enable row level security;
alter table public.materias enable row level security;
alter table public.topicos enable row level security;
alter table public.sessoes_estudo enable row level security;
alter table public.registros_questoes enable row level security;
alter table public.revisoes enable row level security;

create policy "proprio usuario" on public.concursos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "proprio usuario" on public.materias
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.concursos c where c.id = concurso_id and c.user_id = auth.uid())
  );

create policy "proprio usuario" on public.topicos
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.materias m where m.id = materia_id and m.user_id = auth.uid())
  );

create policy "proprio usuario" on public.sessoes_estudo
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.topicos t where t.id = topico_id and t.user_id = auth.uid())
  );

create policy "proprio usuario" on public.registros_questoes
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.topicos t where t.id = topico_id and t.user_id = auth.uid())
  );

create policy "proprio usuario" on public.revisoes
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.topicos t where t.id = topico_id and t.user_id = auth.uid())
  );
