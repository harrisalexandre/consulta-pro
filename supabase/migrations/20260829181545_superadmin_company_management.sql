alter table public.companies add column if not exists created_by uuid references auth.users(id);
update public.companies set created_by=(select id from auth.users where lower(email)=lower('harrisalexandre308@gmail.com')) where created_by is null;
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies for select using (public.is_superadmin() or public.is_company_member(id));
drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies for update using (public.is_superadmin() or public.is_company_admin(id)) with check (public.is_superadmin() or public.is_company_admin(id));
