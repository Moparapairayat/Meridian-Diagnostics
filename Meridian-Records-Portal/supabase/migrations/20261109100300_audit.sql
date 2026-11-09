-- Phase 1 / 04: audit trail (SPEC 7.3).
-- Writes: trigger records actor, role, branch, operation, table, record id and
-- ONLY the changed column names (+ old->new for status columns). Never values
-- of personal or result fields (data minimisation).
-- Reads: public.log_event() for staff; admin code inserts directly.

create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old       jsonb;
  v_new       jsonb;
  v_row       jsonb;
  v_changed   text[];
  v_details   jsonb;
  v_record    uuid;
  v_record_tx text;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new); end if;
  v_row := coalesce(v_new, v_old);

  v_details := jsonb_build_object('op', lower(tg_op));

  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into v_changed
    from jsonb_object_keys(v_new) as k
    where v_new -> k is distinct from v_old -> k;

    if v_changed is null then
      return null; -- no-op update, nothing to record
    end if;

    v_details := v_details || jsonb_build_object('columns', to_jsonb(v_changed));

    if 'status' = any (v_changed) then
      v_details := v_details || jsonb_build_object(
        'status', jsonb_build_object('from', v_old ->> 'status', 'to', v_new ->> 'status'));
    end if;
  end if;

  v_record_tx := coalesce(v_row ->> 'id', v_row ->> 'user_id', v_row ->> 'patient_id');
  if v_record_tx ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_record := v_record_tx::uuid;
  end if;

  insert into public.audit_log (actor_id, actor_role, branch_id, action, table_name, record_id, details)
  values (
    (select auth.uid()),
    coalesce(private.staff_role(), 'system'),
    private.staff_branch(),
    lower(tg_op),
    tg_table_name,
    v_record,
    v_details
  );
  return null;
end;
$$;

revoke execute on function private.audit_row_change() from public, anon, authenticated;

create trigger audit_patients       after insert or update or delete on public.patients       for each row execute function private.audit_row_change();
create trigger audit_orders         after insert or update or delete on public.orders         for each row execute function private.audit_row_change();
create trigger audit_results        after insert or update or delete on public.results        for each row execute function private.audit_row_change();
create trigger audit_reports        after insert or update or delete on public.reports        for each row execute function private.audit_row_change();
create trigger audit_invoices       after insert or update or delete on public.invoices       for each row execute function private.audit_row_change();
create trigger audit_kb_articles    after insert or update or delete on public.kb_articles    for each row execute function private.audit_row_change();
create trigger audit_staff_profiles after insert or update or delete on public.staff_profiles for each row execute function private.audit_row_change();
create trigger audit_app_settings   after insert or update or delete on public.app_settings   for each row execute function private.audit_row_change();

-- ---------------------------------------------------------------------------
-- Read logging for staff. Only known read actions; never query text.
-- ---------------------------------------------------------------------------
create or replace function public.log_event(
  p_action text, p_table text, p_record uuid, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_staff() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('view_patient', 'search', 'view_results', 'view_report') then
    raise exception 'Unknown audit action' using errcode = '22023';
  end if;
  if p_table is not null and p_table !~ '^[a-z_]{2,40}$' then
    raise exception 'Invalid table name' using errcode = '22023';
  end if;
  if p_details is not null and (jsonb_typeof(p_details) <> 'object' or length(p_details::text) > 1000) then
    raise exception 'Invalid audit details' using errcode = '22023';
  end if;

  insert into public.audit_log (actor_id, actor_role, branch_id, action, table_name, record_id, details)
  values (
    (select auth.uid()),
    private.staff_role(),
    private.staff_branch(),
    p_action,
    p_table,
    p_record,
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

revoke execute on function public.log_event(text, text, uuid, jsonb) from public, anon;
grant  execute on function public.log_event(text, text, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Append-only: no client writes, no policies for writes, and a trigger that
-- refuses UPDATE/DELETE for every role (including the secret key).
-- ---------------------------------------------------------------------------
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;
revoke update, delete, truncate on public.audit_log from service_role;

create or replace function private.audit_log_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'audit_log is append-only' using errcode = '42501';
end;
$$;

create trigger audit_log_no_update_delete
  before update or delete on public.audit_log
  for each row execute function private.audit_log_immutable();

create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function private.audit_log_immutable();

grant execute on function private.audit_log_immutable() to authenticated, service_role;
