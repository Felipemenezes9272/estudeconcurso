-- Fase 2: Flashcards com repetição espaçada
-- Rode este arquivo UMA vez no SQL Editor do Supabase (depois do schema.sql).

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topico_id uuid not null references public.topicos (id) on delete cascade,
  frente text not null,
  verso text not null,
  -- Estado da repetição espaçada
  proxima_revisao date not null default current_date,
  intervalo_dias int not null default 0 check (intervalo_dias >= 0),
  repeticoes int not null default 0 check (repeticoes >= 0),
  facilidade numeric(3, 2) not null default 2.50 check (facilidade >= 1.30),
  ultima_revisao date,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index on public.flashcards (user_id, proxima_revisao) where deleted_at is null;
create index on public.flashcards (topico_id);

alter table public.flashcards enable row level security;

create policy "proprio usuario" on public.flashcards
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.topicos t where t.id = topico_id and t.user_id = auth.uid())
  );
