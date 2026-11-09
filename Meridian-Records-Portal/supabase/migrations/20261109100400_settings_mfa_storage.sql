-- Phase 1 / 05: app settings, manager MFA enforcement (SPEC 7.4), storage bucket.

insert into public.app_settings (id, require_manager_mfa)
values (1, false)
on conflict (id) do nothing;

-- Restrictive policies are AND-ed with the permissive ones, so a manager on
-- aal1 sees nothing while MFA is enforced.
create policy "manager needs aal2 when enforced" on public.audit_log
  as restrictive for select to authenticated
  using (
    not (select require_manager_mfa from public.app_settings where id = 1)
    or (select auth.jwt() ->> 'aal') = 'aal2'
  );

create policy "manager needs aal2 when enforced" on public.notifications
  as restrictive for select to authenticated
  using (
    not (select require_manager_mfa from public.app_settings where id = 1)
    or (select auth.jwt() ->> 'aal') = 'aal2'
  );

-- Private bucket for PDF reports. No client policies: the server uploads and
-- creates 60-second signed URLs with the admin client.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reports', 'reports', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;
