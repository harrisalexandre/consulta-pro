
drop function if exists public.company_now(uuid);
create or replace function public.company_local_now(target_company uuid)
returns timestamp language sql stable security definer
set search_path = public
as $$
  select now() at time zone c.timezone
  from public.companies c
  where c.id = target_company;
$$;
revoke execute on function public.company_local_now(uuid) from public;
grant execute on function public.company_local_now(uuid) to authenticated;
