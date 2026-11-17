create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  category text not null default 'general',
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists message_templates_company_idx on public.message_templates(company_id);
alter table public.message_templates enable row level security;
drop policy if exists message_templates_select on public.message_templates;
drop policy if exists message_templates_insert on public.message_templates;
drop policy if exists message_templates_update on public.message_templates;
drop policy if exists message_templates_delete on public.message_templates;
create policy message_templates_select on public.message_templates for select using (is_company_member(company_id));
create policy message_templates_insert on public.message_templates for insert with check (is_company_admin(company_id));
create policy message_templates_update on public.message_templates for update using (is_company_admin(company_id)) with check (is_company_admin(company_id));
create policy message_templates_delete on public.message_templates for delete using (is_company_admin(company_id));
