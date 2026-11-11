-- Fase 5: Calendário de datas importantes
-- Rode este arquivo UMA vez no SQL Editor do Supabase (depois do schema.sql).

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  concurso_id uuid references public.concursos (id) on delete cascade,
  titulo text not null,
  data date not null,
  tipo text not null default 'outro'
    check (tipo in ('inscricao', 'isencao', 'prova', 'resultado', 'recurso', 'outro')),
  observacao text,
  origem text not null default 'manual' check (origem in ('manual', 'edital')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index on public.eventos (user_id, data) where deleted_at is null;
create index on public.eventos (concurso_id);

alter table public.eventos enable row level security;

create policy "proprio usuario" on public.eventos
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      concurso_id is null
      or exists (select 1 from public.concursos c where c.id = concurso_id and c.user_id = auth.uid())
    )
  );
