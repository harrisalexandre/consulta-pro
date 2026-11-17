
revoke execute on function public.create_company_with_owner(text,text,text,text,text) from public;
revoke execute on function public.superadmin_create_company(text,text,text,text,text) from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.is_company_member(uuid) from public;
revoke execute on function public.is_company_admin(uuid) from public;
revoke execute on function public.is_superadmin() from public;

grant execute on function public.create_company_with_owner(text,text,text,text,text) to authenticated;
grant execute on function public.superadmin_create_company(text,text,text,text,text) to authenticated;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.is_company_admin(uuid) to authenticated;
grant execute on function public.is_superadmin() to authenticated;

alter function public.server_now() set search_path = public;
