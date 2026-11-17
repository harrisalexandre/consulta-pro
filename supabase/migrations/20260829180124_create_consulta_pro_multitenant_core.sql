
create extension if not exists pgcrypto;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  cnpj text,
  phone text,
  email text,
  zip_code text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.company_role as enum ('owner','admin','attendant','professional');

create table public.company_users (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.company_role not null default 'attendant',
  status text not null default 'active' check (status in ('active','inactive','invited')),
  created_at timestamptz not null default now(),
  primary key (company_id,user_id)
);

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  specialty text,
  professional_registration text,
  registration_type text,
  phone text,
  email text,
  calendar_color text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  cpf text,
  birth_date date,
  sex text,
  phone text,
  whatsapp text,
  email text,
  zip_code text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  notes text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.appointment_status as enum ('scheduled','confirmed','cancelled','completed','no_show');

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  professional_id uuid not null references public.professionals(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  appointment_type text,
  notes text,
  status public.appointment_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.whatsapp_integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  provider text not null default 'evolution_api',
  instance_name text,
  phone_number text,
  status text not null default 'disconnected' check (status in ('connected','disconnected','connecting','error')),
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.message_direction as enum ('inbound','outbound');
create type public.message_kind as enum ('manual','automatic');

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  integration_id uuid references public.whatsapp_integrations(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  recipient_number text,
  direction public.message_direction not null,
  kind public.message_kind not null default 'manual',
  body text not null,
  provider_message_id text,
  status text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.automations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  type text not null,
  advance_minutes integer not null default 1440 check (advance_minutes >= 0),
  channel text not null default 'whatsapp',
  message_template text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.automation_dispatches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  automation_id uuid not null references public.automations(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  recipient_number text not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  unique (company_id, automation_id, appointment_id, recipient_number)
);

create index company_users_user_idx on public.company_users(user_id);
create index professionals_company_idx on public.professionals(company_id);
create index patients_company_idx on public.patients(company_id);
create index appointments_company_start_idx on public.appointments(company_id, starts_at);
create index appointments_patient_idx on public.appointments(patient_id);
create index appointments_professional_idx on public.appointments(professional_id);
create index whatsapp_messages_company_created_idx on public.whatsapp_messages(company_id, created_at desc);
create index automation_dispatches_schedule_idx on public.automation_dispatches(company_id, scheduled_for);

create or replace function public.is_company_member(target_company uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.company_users cu where cu.company_id = target_company and cu.user_id = auth.uid() and cu.status = 'active'); $$;

create or replace function public.is_company_admin(target_company uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.company_users cu where cu.company_id = target_company and cu.user_id = auth.uid() and cu.status = 'active' and cu.role in ('owner','admin')); $$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_users enable row level security;
alter table public.professionals enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.whatsapp_integrations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.automations enable row level security;
alter table public.automation_dispatches enable row level security;

create policy companies_select on public.companies for select using (public.is_company_member(id));
create policy companies_insert on public.companies for insert with check (auth.uid() is not null);
create policy companies_update on public.companies for update using (public.is_company_admin(id)) with check (public.is_company_admin(id));

create policy profiles_select on public.profiles for select using (id = auth.uid() or exists (select 1 from public.company_users cu where cu.user_id = profiles.id and public.is_company_member(cu.company_id)));
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy company_users_select on public.company_users for select using (user_id = auth.uid() or public.is_company_member(company_id));
create policy company_users_insert on public.company_users for insert with check (public.is_company_admin(company_id));
create policy company_users_update on public.company_users for update using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));
create policy company_users_delete on public.company_users for delete using (public.is_company_admin(company_id));

create policy professionals_all on public.professionals for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy patients_all on public.patients for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy appointments_all on public.appointments for all using (public.is_company_member(company_id)) with check (
  public.is_company_member(company_id)
  and exists (select 1 from public.patients p where p.id = patient_id and p.company_id = company_id)
  and exists (select 1 from public.professionals pr where pr.id = professional_id and pr.company_id = company_id)
);
create policy whatsapp_integrations_all on public.whatsapp_integrations for all using (public.is_company_member(company_id)) with check (public.is_company_admin(company_id));
create policy whatsapp_messages_all on public.whatsapp_messages for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy automations_all on public.automations for all using (public.is_company_member(company_id)) with check (public.is_company_admin(company_id));
create policy automation_dispatches_all on public.automation_dispatches for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name','')); return new; end; $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

do $$ declare t text; begin
  foreach t in array array['companies','profiles','professionals','patients','appointments','whatsapp_integrations','automations'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', 'set_updated_at_'||t, t);
  end loop;
end $$;
