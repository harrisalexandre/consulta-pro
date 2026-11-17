
create extension if not exists pg_net with schema extensions;
select vault.create_secret('https://swrsjwmuqxrzgapqiacb.supabase.co','consulta_pro_project_url');
-- ATENCAO: o valor real desta chave NAO e versionado (repositorio publico).
-- Troque <DEFINIR_FORA_DO_GIT> pela anon key real antes de aplicar, ou crie/atualize
-- o secret direto no Vault do projeto (Dashboard > Integrations > Vault), fora do git.
-- Ver supabase/README.md.
select vault.create_secret('<DEFINIR_FORA_DO_GIT>','consulta_pro_legacy_anon_key');
