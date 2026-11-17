
-- Etapa 8/13: harden tenant isolation and remove anonymous policy access.
alter policy appointments_all on public.appointments to authenticated;
alter policy automation_dispatches_all on public.automation_dispatches to authenticated;
alter policy automations_all on public.automations to authenticated;
alter policy companies_insert on public.companies to authenticated;
alter policy companies_select on public.companies to authenticated;
alter policy companies_update on public.companies to authenticated;
alter policy company_users_delete on public.company_users to authenticated;
alter policy company_users_insert on public.company_users to authenticated;
alter policy company_users_select on public.company_users to authenticated;
alter policy company_users_update on public.company_users to authenticated;
alter policy message_templates_delete on public.message_templates to authenticated;
alter policy message_templates_insert on public.message_templates to authenticated;
alter policy message_templates_select on public.message_templates to authenticated;
alter policy message_templates_update on public.message_templates to authenticated;
alter policy patients_all on public.patients to authenticated;
alter policy professionals_all on public.professionals to authenticated;
alter policy profiles_insert on public.profiles to authenticated;
alter policy profiles_select on public.profiles to authenticated;
alter policy profiles_update on public.profiles to authenticated;
alter policy whatsapp_integrations_all on public.whatsapp_integrations to authenticated;
alter policy whatsapp_messages_all on public.whatsapp_messages to authenticated;

drop policy appointments_all on public.appointments;
create policy appointments_all on public.appointments
for all to authenticated
using (is_company_member(company_id))
with check (
  is_company_member(company_id)
  and exists (
    select 1 from public.patients p
    where p.id = appointments.patient_id
      and p.company_id = appointments.company_id
  )
  and exists (
    select 1 from public.professionals pr
    where pr.id = appointments.professional_id
      and pr.company_id = appointments.company_id
  )
);

revoke execute on function public.create_company_with_owner(text,text,text,text,text) from anon;
revoke execute on function public.superadmin_create_company(text,text,text,text,text) from anon;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.is_company_member(uuid) from anon;
revoke execute on function public.is_company_admin(uuid) from anon;
revoke execute on function public.is_superadmin() from anon;
