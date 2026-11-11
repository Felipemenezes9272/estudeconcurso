-- Fase 6: Avisos (notificações dentro do app)
-- Rode este arquivo UMA vez no SQL Editor do Supabase (depois do schema.sql).
-- Os avisos são calculados na hora a partir dos seus dados; esta tabela só guarda quais você já leu.

create table public.avisos_lidos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chave text not null,
  created_at timestamptz not null default now(),
  unique (user_id, chave)
);

alter table public.avisos_lidos enable row level security;

create policy "proprio usuario" on public.avisos_lidos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
