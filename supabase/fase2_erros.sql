-- Fase 2: Caderno de erros
-- Rode este arquivo UMA vez no SQL Editor do Supabase (depois do schema.sql).

create table public.erros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topico_id uuid not null references public.topicos (id) on delete cascade,
  data date not null default current_date,
  enunciado text not null,
  motivo text not null check (motivo in ('desatencao', 'lacuna', 'pegadinha')),
  anotacao text,
  status text not null default 'pendente' check (status in ('pendente', 'dominado')),
  ultima_revisao date,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index on public.erros (user_id, status, data desc);
create index on public.erros (topico_id);

alter table public.erros enable row level security;

create policy "proprio usuario" on public.erros
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.topicos t where t.id = topico_id and t.user_id = auth.uid())
  );
