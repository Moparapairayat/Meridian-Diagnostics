-- Phase 1 / 02: helper functions, grants, Row Level Security (SPEC 4, 7.1).
-- Default deny: every public table has RLS on; only the policies below exist.

-- ---------------------------------------------------------------------------
-- Helpers (private schema, not exposed by the Data API)
-- ---------------------------------------------------------------------------
create or replace function private.staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select sp.role
  from public.staff_profiles sp
  where sp.user_id = (select auth.uid()) and sp.active;
$$;

create or replace function private.staff_branch()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select sp.branch_id
  from public.staff_profiles sp
  where sp.user_id = (select auth.uid()) and sp.active;
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_profiles sp
    where sp.user_id = (select auth.uid()) and sp.active
  );
$$;

-- Postgres grants EXECUTE to PUBLIC by default; take it back, then grant precisely.
revoke execute on all functions in schema private from public, anon;
alter default privileges in schema private revoke execute on functions from public;
grant usage on schema private to authenticated, service_role;
grant execute on function
  private.staff_role(),
  private.staff_branch(),
  private.is_staff(),
  private.is_trusted_server(),
  private.next_patient_code(timestamptz),
  private.next_order_no(timestamptz)
to authenticated, service_role;
grant usage on sequence private.patient_code_seq, private.order_no_seq to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Table privileges: RLS is the gate for `authenticated`; `anon` gets nothing.
-- ---------------------------------------------------------------------------
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enable RLS on EVERY public table (never disable it).
-- ---------------------------------------------------------------------------
alter table public.branches       enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.test_catalog   enable row level security;
alter table public.test_analytes  enable row level security;
alter table public.patients       enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.invoices       enable row level security;
alter table public.results        enable row level security;
alter table public.reports        enable row level security;
alter table public.portal_otps    enable row level security;
alter table public.portal_locks   enable row level security;
alter table public.notifications  enable row level security;
alter table public.kb_articles    enable row level security;
alter table public.audit_log      enable row level security;
alter table public.app_settings   enable row level security;

-- ---------------------------------------------------------------------------
-- Reference data: read by all staff, no client writes.
-- ---------------------------------------------------------------------------
create policy "staff read branches" on public.branches
  for select to authenticated using ((select private.is_staff()));

create policy "staff read staff profiles" on public.staff_profiles
  for select to authenticated using ((select private.is_staff()));

create policy "staff read test catalog" on public.test_catalog
  for select to authenticated using ((select private.is_staff()));

create policy "staff read test analytes" on public.test_analytes
  for select to authenticated using ((select private.is_staff()));

-- ---------------------------------------------------------------------------
-- Patients: all staff search across branches; receptionist writes own branch.
-- ---------------------------------------------------------------------------
create policy "staff read patients" on public.patients
  for select to authenticated using ((select private.is_staff()));

create policy "receptionist registers patients in own branch" on public.patients
  for insert to authenticated
  with check (
    (select private.staff_role()) = 'receptionist'
    and registered_branch_id = (select private.staff_branch())
  );

create policy "receptionist edits own-branch patients" on public.patients
  for update to authenticated
  using (
    (select private.staff_role()) = 'receptionist'
    and registered_branch_id = (select private.staff_branch())
  )
  with check (
    (select private.staff_role()) = 'receptionist'
    and registered_branch_id = (select private.staff_branch())
  );

-- ---------------------------------------------------------------------------
-- Orders: all staff see status; transitions are policed by the status trigger.
-- ---------------------------------------------------------------------------
create policy "staff read orders" on public.orders
  for select to authenticated using ((select private.is_staff()));

create policy "receptionist creates orders in own branch" on public.orders
  for insert to authenticated
  with check (
    (select private.staff_role()) = 'receptionist'
    and branch_id = (select private.staff_branch())
    and status = 'registered'
  );

create policy "workflow roles update orders" on public.orders
  for update to authenticated
  using ((select private.staff_role()) in ('sample_collector', 'lab_technician', 'pathologist'))
  with check ((select private.staff_role()) in ('sample_collector', 'lab_technician', 'pathologist'));

-- ---------------------------------------------------------------------------
-- Order items and invoices: insert only inside public.create_order().
-- create_order sets a transaction-local flag that clients cannot set
-- (pg_catalog.set_config is not exposed by the Data API).
-- ---------------------------------------------------------------------------
create policy "staff read order items" on public.order_items
  for select to authenticated using ((select private.is_staff()));

create policy "order items only via create_order" on public.order_items
  for insert to authenticated
  with check (
    (select private.staff_role()) = 'receptionist'
    and current_setting('meridian.create_order', true) = 'on'
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.branch_id = (select private.staff_branch())
    )
  );

create policy "reception and manager read invoices" on public.invoices
  for select to authenticated
  using ((select private.staff_role()) in ('receptionist', 'manager'));

create policy "invoices only via create_order" on public.invoices
  for insert to authenticated
  with check (
    (select private.staff_role()) = 'receptionist'
    and current_setting('meridian.create_order', true) = 'on'
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.branch_id = (select private.staff_branch())
    )
  );

-- ---------------------------------------------------------------------------
-- Results: values visible only to lab technician and pathologist.
-- ---------------------------------------------------------------------------
create policy "lab and pathologist read results" on public.results
  for select to authenticated
  using ((select private.staff_role()) in ('lab_technician', 'pathologist'));

create policy "lab technician inserts results for in_lab orders" on public.results
  for insert to authenticated
  with check (
    (select private.staff_role()) = 'lab_technician'
    and exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_id and o.status = 'in_lab'
    )
  );

create policy "lab technician corrects results for in_lab orders" on public.results
  for update to authenticated
  using (
    (select private.staff_role()) = 'lab_technician'
    and exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_id and o.status = 'in_lab'
    )
  )
  with check (
    (select private.staff_role()) = 'lab_technician'
    and exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_id and o.status = 'in_lab'
    )
  );

-- ---------------------------------------------------------------------------
-- Reports: metadata for lab, pathologist, manager; pathologist writes.
-- ---------------------------------------------------------------------------
create policy "lab pathologist manager read reports" on public.reports
  for select to authenticated
  using ((select private.staff_role()) in ('lab_technician', 'pathologist', 'manager'));

create policy "pathologist inserts reports" on public.reports
  for insert to authenticated
  with check ((select private.staff_role()) = 'pathologist');

create policy "pathologist updates reports" on public.reports
  for update to authenticated
  using ((select private.staff_role()) = 'pathologist')
  with check ((select private.staff_role()) = 'pathologist');

-- ---------------------------------------------------------------------------
-- Knowledge Hub: all staff read published; managers read all and write. No delete.
-- ---------------------------------------------------------------------------
create policy "staff read published articles, managers read all" on public.kb_articles
  for select to authenticated
  using (
    (select private.is_staff())
    and (published or (select private.staff_role()) = 'manager')
  );

create policy "manager creates articles" on public.kb_articles
  for insert to authenticated
  with check ((select private.staff_role()) = 'manager');

create policy "manager edits articles" on public.kb_articles
  for update to authenticated
  using ((select private.staff_role()) = 'manager')
  with check ((select private.staff_role()) = 'manager');

-- ---------------------------------------------------------------------------
-- Settings, notifications, audit log.
-- (audit_log / notifications also get restrictive aal2 policies in 05.)
-- ---------------------------------------------------------------------------
create policy "staff read settings" on public.app_settings
  for select to authenticated using ((select private.is_staff()));

create policy "manager updates settings" on public.app_settings
  for update to authenticated
  using ((select private.staff_role()) = 'manager')
  with check ((select private.staff_role()) = 'manager');

create policy "manager reads notifications" on public.notifications
  for select to authenticated
  using ((select private.staff_role()) = 'manager');

create policy "manager reads audit log" on public.audit_log
  for select to authenticated
  using ((select private.staff_role()) = 'manager');

-- portal_otps, portal_locks: RLS on, NO policies (admin client only).
