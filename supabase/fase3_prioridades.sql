-- Fase 3: Priorização por incidência
-- Rode este arquivo UMA vez no SQL Editor do Supabase (depois do schema.sql).
-- Incidência = o quanto o assunto costuma cair na prova: 1 (raramente) a 5 (sempre).

alter table public.topicos
  add column incidencia int not null default 3
  check (incidencia between 1 and 5);
