-- Phase 1 / 03: order status rules (SPEC 5.1), results/reports guards,
-- create_order, release_order, amend_report (SPEC 6.1, 11.2).

-- ---------------------------------------------------------------------------
-- Order status trigger. SECURITY INVOKER so private.is_trusted_server() sees
-- the real caller.
--   staff:          must follow the transition table with the listed role;
--                   all timestamps are set by the database.
--   trusted server: from->to still enforced on UPDATE, supplied timestamps
--                   kept; INSERT may use any status (seed history).
-- ---------------------------------------------------------------------------
create or replace function private.orders_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_trusted       boolean := private.is_trusted_server();
  v_role          text;
  v_required_role text;
  v_reason        text;
begin
  if tg_op = 'INSERT' then
    if v_trusted then
      new.created_at := coalesce(new.created_at, now());
      if coalesce(new.order_no, '') = '' then
        new.order_no := private.next_order_no(new.created_at);
      end if;
      return new;
    end if;

    v_role := private.staff_role();
    if v_role is distinct from 'receptionist' then
      raise exception 'Only receptionists can create orders' using errcode = '42501';
    end if;
    if new.status <> 'registered' then
      raise exception 'New orders must start as registered' using errcode = '23514';
    end if;
    new.created_at    := now();
    new.created_by    := (select auth.uid());
    new.order_no      := private.next_order_no(new.created_at);
    new.retest_count  := 0;
    new.retest_reason := null;
    new.collected_at  := null;
    new.in_lab_at     := null;
    new.resulted_at   := null;
    new.released_at   := null;
    new.downloaded_at := null;
    return new;
  end if;

  -- ---------------- UPDATE ----------------
  if not v_trusted and (
       new.id <> old.id
       or new.order_no   is distinct from old.order_no
       or new.patient_id is distinct from old.patient_id
       or new.branch_id  is distinct from old.branch_id
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at) then
    raise exception 'Order identity fields cannot be changed' using errcode = '42501';
  end if;

  v_reason := new.retest_reason;

  -- Staff never set timestamps or re-test fields directly.
  if not v_trusted then
    new.collected_at  := old.collected_at;
    new.in_lab_at     := old.in_lab_at;
    new.resulted_at   := old.resulted_at;
    new.released_at   := old.released_at;
    new.downloaded_at := old.downloaded_at;
    new.retest_count  := old.retest_count;
    new.retest_reason := old.retest_reason;
  end if;

  if new.status = old.status then
    return new;
  end if;

  v_required_role := case
    when old.status = 'registered' and new.status = 'collected'  then 'sample_collector'
    when old.status = 'collected'  and new.status = 'in_lab'     then 'sample_collector'
    when old.status = 'in_lab'     and new.status = 'resulted'   then 'lab_technician'
    when old.status = 'resulted'   and new.status = 'released'   then 'pathologist'
    when old.status = 'resulted'   and new.status = 'in_lab'     then 'pathologist'
    when old.status = 'released'   and new.status = 'downloaded' then 'system'
  end;

  if v_required_role is null then
    raise exception 'Illegal status transition: % -> %', old.status, new.status using errcode = '23514';
  end if;

  if not v_trusted then
    v_role := private.staff_role();
    if v_required_role = 'system' or v_role is distinct from v_required_role then
      raise exception 'Your role cannot move an order from % to %', old.status, new.status
        using errcode = '42501';
    end if;

    -- Integrity: a result or a released report must exist before moving on.
    if new.status = 'resulted' and not exists (
         select 1 from public.results r
         join public.order_items oi on oi.id = r.order_item_id
         where oi.order_id = new.id) then
      raise exception 'Order has no results yet' using errcode = '23514';
    end if;
    if new.status = 'released' and not exists (
         select 1 from public.reports rp
         where rp.order_id = new.id and rp.status = 'released') then
      raise exception 'Use release_order() to sign and release' using errcode = '23514';
    end if;
  end if;

  -- Re-test loop: reason required, counter incremented.
  if old.status = 'resulted' and new.status = 'in_lab' then
    if char_length(btrim(coalesce(v_reason, ''))) < 3 then
      raise exception 'A re-test reason is required' using errcode = '23514';
    end if;
    new.retest_reason := btrim(v_reason);
    new.retest_count  := old.retest_count + 1;
    new.resulted_at   := null;
  end if;

  -- Timestamp of the new status: DB time for staff, supplied (or now) for trusted.
  case new.status
    when 'collected' then
      new.collected_at  := case when v_trusted then coalesce(new.collected_at, now()) else now() end;
    when 'in_lab' then
      -- On a re-test the old in_lab_at is carried in NEW, so keep a supplied
      -- value only when the trusted caller actually changed it.
      new.in_lab_at     := case when v_trusted and new.in_lab_at is distinct from old.in_lab_at
                                     and new.in_lab_at is not null
                                then new.in_lab_at else now() end;
    when 'resulted' then
      new.resulted_at   := case when v_trusted then coalesce(new.resulted_at, now()) else now() end;
    when 'released' then
      new.released_at   := case when v_trusted then coalesce(new.released_at, now()) else now() end;
    when 'downloaded' then
      new.downloaded_at := case when v_trusted then coalesce(new.downloaded_at, now()) else now() end;
    else
      null;
  end case;

  return new;
end;
$$;

create trigger orders_before_write
  before insert or update on public.orders
  for each row execute function private.orders_before_write();

-- ---------------------------------------------------------------------------
-- Results: flag computed by the database; actor and time set for staff.
-- ---------------------------------------------------------------------------
create or replace function private.results_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.flag := case
    when new.value < new.ref_low  then 'L'
    when new.value > new.ref_high then 'H'
    else 'N'
  end;

  if new.source = 'analyser' then
    new.correction_reason := null;
  else
    new.correction_reason := btrim(new.correction_reason);
  end if;

  if not private.is_trusted_server() then
    new.entered_by := (select auth.uid());
    new.entered_at := now();
    if tg_op = 'UPDATE' then
      new.id            := old.id;
      new.order_item_id := old.order_item_id;
      new.analyte       := old.analyte;
    end if;
  end if;
  return new;
end;
$$;

create trigger results_before_write
  before insert or update on public.results
  for each row execute function private.results_before_write();

-- ---------------------------------------------------------------------------
-- Reports: staff may only insert via release/amend and only supersede on update.
-- ---------------------------------------------------------------------------
create or replace function private.reports_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if private.is_trusted_server() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'released' then
      raise exception 'New reports must be released' using errcode = '23514';
    end if;
    new.signed_by := (select auth.uid());
    new.signed_at := now();
    return new;
  end if;

  -- UPDATE by staff: only released -> superseded, nothing else changes.
  if not (old.status = 'released' and new.status = 'superseded') then
    raise exception 'Reports can only be superseded' using errcode = '42501';
  end if;
  if new.id <> old.id
     or new.order_id     is distinct from old.order_id
     or new.version      is distinct from old.version
     or new.signed_by    is distinct from old.signed_by
     or new.signed_at    is distinct from old.signed_at
     or new.pdf_path     is distinct from old.pdf_path
     or new.verify_code  is distinct from old.verify_code
     or new.amend_reason is distinct from old.amend_reason then
    raise exception 'Signed report fields cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger reports_before_write
  before insert or update on public.reports
  for each row execute function private.reports_before_write();

-- ---------------------------------------------------------------------------
-- Knowledge Hub: version and updated_at set by the database.
-- ---------------------------------------------------------------------------
create or replace function private.kb_articles_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not private.is_trusted_server() then
      new.version    := 1;
      new.updated_at := now();
    end if;
    return new;
  end if;

  new.id := old.id;
  if (new.title_en, new.title_bn, new.body_en, new.body_bn, new.category, new.slug)
     is distinct from
     (old.title_en, old.title_bn, old.body_en, old.body_bn, old.category, old.slug) then
    new.version := old.version + 1;
  else
    new.version := old.version;
  end if;
  if not private.is_trusted_server() then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger kb_articles_before_write
  before insert or update on public.kb_articles
  for each row execute function private.kb_articles_before_write();

grant execute on function
  private.orders_before_write(),
  private.results_before_write(),
  private.reports_before_write(),
  private.kb_articles_before_write(),
  private.patients_before_write()
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- create_order: one transaction -> order + items with barcodes + invoice.
-- ---------------------------------------------------------------------------
create or replace function public.create_order(p_patient_id uuid, p_test_codes text[])
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_patient_code text;
  v_order_id     uuid;
  v_codes        text[];
  v_known        integer;
  v_existing     integer;
begin
  if private.staff_role() is distinct from 'receptionist' then
    raise exception 'Only receptionists can create orders' using errcode = '42501';
  end if;

  select array_agg(distinct c order by c) into v_codes
  from unnest(coalesce(p_test_codes, '{}'::text[])) as c
  where c is not null;

  if v_codes is null or cardinality(v_codes) = 0 then
    raise exception 'Select at least one test' using errcode = '22023';
  end if;
  if cardinality(v_codes) > 20 then
    raise exception 'Too many tests in one order' using errcode = '22023';
  end if;

  select count(*) into v_known
  from public.test_catalog t
  where t.code = any (v_codes) and t.active;
  if v_known <> cardinality(v_codes) then
    raise exception 'Unknown or inactive test code' using errcode = '22023';
  end if;

  select p.patient_code into v_patient_code
  from public.patients p
  where p.id = p_patient_id;
  if v_patient_code is null then
    raise exception 'Patient not found' using errcode = '22023';
  end if;

  -- Serialise barcode numbering per patient.
  perform pg_advisory_xact_lock(hashtextextended(p_patient_id::text, 0));

  select count(*) into v_existing
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.patient_id = p_patient_id;

  perform set_config('meridian.create_order', 'on', true);

  insert into public.orders (patient_id, branch_id, status)
  values (p_patient_id, private.staff_branch(), 'registered')
  returning id into v_order_id;

  insert into public.order_items (order_id, test_code, sample_barcode)
  select v_order_id,
         c.code,
         v_patient_code || '-S' ||
           case when v_existing + c.n < 100
                then lpad((v_existing + c.n)::text, 2, '0')
                else (v_existing + c.n)::text end
  from unnest(v_codes) with ordinality as c(code, n);

  insert into public.invoices (order_id, amount_bdt)
  select v_order_id, coalesce(sum(t.price_bdt), 0)
  from public.test_catalog t
  where t.code = any (v_codes);

  perform set_config('meridian.create_order', 'off', true);
  return v_order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- release_order: report v1 + order resulted -> released, one transaction.
-- ---------------------------------------------------------------------------
create or replace function public.release_order(p_order_id uuid, p_verify_code text, p_pdf_path text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status    text;
  v_report_id uuid;
begin
  if private.staff_role() is distinct from 'pathologist' then
    raise exception 'Only pathologists can release reports' using errcode = '42501';
  end if;

  select o.status into v_status
  from public.orders o
  where o.id = p_order_id
  for update;

  if v_status is null then
    raise exception 'Order not found' using errcode = '22023';
  end if;
  if v_status <> 'resulted' then
    raise exception 'Order is not awaiting release' using errcode = '23514';
  end if;

  insert into public.reports (order_id, version, status, pdf_path, verify_code)
  values (p_order_id, 1, 'released', p_pdf_path, p_verify_code)
  returning id into v_report_id;

  update public.orders set status = 'released' where id = p_order_id;

  return v_report_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- amend_report: supersede current version, insert version n+1.
-- Order status is NOT changed.
-- ---------------------------------------------------------------------------
create or replace function public.amend_report(
  p_order_id uuid, p_reason text, p_verify_code text, p_pdf_path text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status    text;
  v_version   integer;
  v_report_id uuid;
begin
  if private.staff_role() is distinct from 'pathologist' then
    raise exception 'Only pathologists can amend reports' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'An amendment reason is required' using errcode = '22023';
  end if;

  select o.status into v_status
  from public.orders o
  where o.id = p_order_id
  for update;

  if v_status is null then
    raise exception 'Order not found' using errcode = '22023';
  end if;
  if v_status not in ('released', 'downloaded') then
    raise exception 'Only released reports can be amended' using errcode = '23514';
  end if;

  select r.version into v_version
  from public.reports r
  where r.order_id = p_order_id and r.status = 'released'
  for update;

  if v_version is null then
    raise exception 'No current report to amend' using errcode = '23514';
  end if;

  update public.reports
  set status = 'superseded'
  where order_id = p_order_id and status = 'released';

  insert into public.reports (order_id, version, status, pdf_path, verify_code, amend_reason)
  values (p_order_id, v_version + 1, 'released', p_pdf_path, p_verify_code, btrim(p_reason))
  returning id into v_report_id;

  return v_report_id;
end;
$$;

revoke execute on function public.create_order(uuid, text[])              from public, anon;
revoke execute on function public.release_order(uuid, text, text)         from public, anon;
revoke execute on function public.amend_report(uuid, text, text, text)    from public, anon;
grant  execute on function public.create_order(uuid, text[])              to authenticated, service_role;
grant  execute on function public.release_order(uuid, text, text)         to authenticated, service_role;
grant  execute on function public.amend_report(uuid, text, text, text)    to authenticated, service_role;
