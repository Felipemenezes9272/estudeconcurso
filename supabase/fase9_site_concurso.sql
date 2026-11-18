-- Fase 9: link do site de cada concurso
-- Rode este arquivo UMA vez no SQL Editor do Supabase.

alter table public.concursos add column if not exists site_url text;
alter table public.concursos add constraint concursos_site_url_http check (site_url is null or site_url ~* '^https?://');
