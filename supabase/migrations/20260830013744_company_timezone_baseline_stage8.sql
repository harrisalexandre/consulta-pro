
alter table public.companies
  add constraint companies_timezone_chk
  check (timezone = any (array[
    'America/Sao_Paulo','America/Rio_Branco','America/Manaus',
    'America/Belem','America/Fortaleza','America/Recife',
    'America/Bahia','America/Boa_Vista','America/Campo_Grande',
    'America/Cuiaba','America/Porto_Velho','America/Eirunepe',
    'America/Noronha','America/Araguaina','America/Maceio',
    'America/Santarem'
  ]));
create or replace function public.company_now(target_company uuid)
returns timestamptz language sql stable security definer
set search_path = public
as $$
  select now() at time zone c.timezone
  from public.companies c
  where c.id = target_company;
$$;
revoke execute on function public.company_now(uuid) from public;
grant execute on function public.company_now(uuid) to authenticated;
