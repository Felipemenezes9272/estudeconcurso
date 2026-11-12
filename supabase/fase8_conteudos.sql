-- Fase 8: Conteúdos de estudo pesquisados pela IA e salvos por tópico
-- Rode este arquivo UMA vez no SQL Editor do Supabase (depois do schema.sql).

create table public.conteudos_estudo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topico_id uuid not null references public.topicos (id) on delete cascade,
  titulo text not null,
  texto text not null,
  fontes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index on public.conteudos_estudo (topico_id) where deleted_at is null;

alter table public.conteudos_estudo enable row level security;

create policy "proprio usuario" on public.conteudos_estudo
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.topicos t where t.id = topico_id and t.user_id = auth.uid())
  );
