-- Fase 7: Central de estudo (meta diária e anotações por tópico)
-- Rode este arquivo UMA vez no SQL Editor do Supabase (depois do schema.sql).

create table public.metas_estudo (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  minutos_dia int not null default 120 check (minutos_dia between 10 and 1440),
  updated_at timestamptz not null default now()
);

create table public.anotacoes_topico (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topico_id uuid not null references public.topicos (id) on delete cascade,
  texto text not null default '',
  updated_at timestamptz not null default now(),
  unique (topico_id)
);

alter table public.metas_estudo enable row level security;
alter table public.anotacoes_topico enable row level security;

create policy "proprio usuario" on public.metas_estudo
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "proprio usuario" on public.anotacoes_topico
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.topicos t where t.id = topico_id and t.user_id = auth.uid())
  );
