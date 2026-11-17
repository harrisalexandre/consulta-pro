
alter table public.profiles add column if not exists is_superadmin boolean not null default false;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_superadmin = true); $$;

create or replace function public.is_company_member(target_company uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.is_superadmin() or exists (select 1 from public.company_users cu where cu.company_id = target_company and cu.user_id = auth.uid() and cu.status = 'active'); $$;

create or replace function public.is_company_admin(target_company uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.is_superadmin() or exists (select 1 from public.company_users cu where cu.company_id = target_company and cu.user_id = auth.uid() and cu.status = 'active' and cu.role in ('owner','admin')); $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name','')) on conflict (id) do nothing; return new; end; $$;

create or replace function public.create_company_with_owner(
  company_name text,
  legal_name text default null,
  cnpj text default null,
  phone text default null,
  email text default null
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare new_company public.companies;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  insert into public.profiles (id) values (auth.uid()) on conflict (id) do nothing;
  insert into public.companies (name, legal_name, cnpj, phone, email)
  values (company_name, legal_name, cnpj, phone, email)
  returning * into new_company;
  insert into public.company_users (company_id, user_id, role, status)
  values (new_company.id, auth.uid(), 'owner', 'active');
  return new_company;
end;
$$;

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.is_company_member(uuid) from anon, authenticated;
revoke execute on function public.is_company_admin(uuid) from anon, authenticated;
grant execute on function public.create_company_with_owner(text,text,text,text,text) to authenticated;

insert into public.profiles (id, full_name, is_superadmin)
select id, coalesce(raw_user_meta_data->>'full_name','Alexandre'), true
from auth.users
where lower(email)=lower('harrisalexandre308@gmail.com')
on conflict (id) do update set is_superadmin=true;

drop policy if exists companies_insert on public.companies;
create policy companies_insert on public.companies for insert with check (public.is_superadmin());

drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies for select using (public.is_company_member(id));

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_superadmin() or exists (select 1 from public.company_users cu where cu.user_id = profiles.id and public.is_company_member(cu.company_id)));

drop policy if exists company_users_select on public.company_users;
create policy company_users_select on public.company_users for select using (user_id = auth.uid() or public.is_superadmin() or public.is_company_member(company_id));

drop policy if exists company_users_insert on public.company_users;
create policy company_users_insert on public.company_users for insert with check (public.is_company_admin(company_id));

drop policy if exists company_users_update on public.company_users;
create policy company_users_update on public.company_users for update using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

drop policy if exists company_users_delete on public.company_users;
create policy company_users_delete on public.company_users for delete using (public.is_company_admin(company_id));
