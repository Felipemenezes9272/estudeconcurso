-- Fase 10: explicação por IA guardada em cada erro do caderno
-- Rode este arquivo UMA vez no SQL Editor do Supabase.

alter table public.erros add column if not exists explicacao text;
