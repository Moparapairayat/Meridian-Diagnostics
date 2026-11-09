-- Phase 1 / 01: schema, tables, constraints, code generators, indexes.
-- SPEC section 6. All data in this project is synthetic.

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Caller detection (SPEC 5.1 "two kinds of caller").
-- SECURITY INVOKER on purpose: inside a SECURITY DEFINER function current_user
-- would be the owner, not the caller.
-- ---------------------------------------------------------------------------
create or replace function private.is_trusted_server()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select current_user = 'service_role'
      or coalesce((select auth.jwt() ->> 'role'), '') = 'service_role';
$$;

-- ---------------------------------------------------------------------------
-- Reference tables
-- ---------------------------------------------------------------------------
create table public.branches (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 40),
  code text not null unique check (code ~ '^[A-Z]{3}$')
);

create table public.staff_profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  full_name    text not null check (char_length(full_name) between 2 and 80),
  role         text not null check (role in ('receptionist', 'sample_collector', 'lab_technician', 'pathologist', 'manager')),
  branch_id    uuid not null references public.branches (id),
  notify_email text check (notify_email is null or (char_length(notify_email) <= 254 and notify_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  active       boolean not null default true
);

create table public.test_catalog (
  code      text primary key check (code ~ '^[A-Z0-9]{2,12}$'),
  name      text not null check (char_length(name) between 2 and 80),
  specimen  text not null check (char_length(specimen) between 2 and 40),
  price_bdt integer not null check (price_bdt >= 0),
  prep_en   text not null default '',
  prep_bn   text not null default '',
  active    boolean not null default true
);

create table public.test_analytes (
  id        uuid primary key default gen_random_uuid(),
  test_code text not null references public.test_catalog (code) on update cascade,
  analyte   text not null check (char_length(analyte) between 1 and 60),
  unit      text not null default '',
  ref_low   numeric not null,
  ref_high  numeric not null,
  decimals  integer not null default 1 check (decimals between 0 and 4),
  unique (test_code, analyte),
  check (ref_low <= ref_high)
);

-- ---------------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------------
create sequence private.patient_code_seq;
create sequence private.order_no_seq;

create table public.patients (
  id                   uuid primary key default gen_random_uuid(),
  -- '' is a placeholder: the BEFORE INSERT trigger always assigns the real code.
  patient_code         text not null default '' unique check (patient_code ~ '^MD-[0-9]{4}-[0-9]{5,}$'),
  -- Latin letters, spaces and . ' - only: the English PDF font cannot encode Bengali.
  full_name            text not null check (char_length(full_name) between 2 and 80 and full_name ~ '^[A-Za-z .''-]+$'),
  age_years            integer not null check (age_years between 0 and 120),
  sex                  text not null check (sex in ('female', 'male', 'other')),
  phone                text not null check (phone ~ '^01[3-9][0-9]{8}$'),
  email                text check (email is null or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  email_opt_in         boolean not null default false,
  preferred_channel    text not null default 'sms_demo' check (preferred_channel in ('sms_demo', 'email')),
  language             text not null default 'bn' check (language in ('bn', 'en')),
  registered_branch_id uuid not null references public.branches (id),
  consent_given_at     timestamptz not null default now(),
  consent_version      text not null check (char_length(consent_version) between 1 and 20),
  created_by           uuid references auth.users (id) on delete set null,
  created_at           timestamptz not null default now(),
  constraint patients_opt_in_needs_email check (not email_opt_in or email is not null)
);

-- ---------------------------------------------------------------------------
-- Orders, items, invoices
-- ---------------------------------------------------------------------------
create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  -- '' is a placeholder: the status trigger always assigns the real number.
  order_no      text not null default '' unique check (order_no ~ '^ORD-[0-9]{4}-[0-9]{6,}$'),
  patient_id    uuid not null references public.patients (id) on delete cascade,
  branch_id     uuid not null references public.branches (id),
  status        text not null default 'registered'
                check (status in ('registered', 'collected', 'in_lab', 'resulted', 'released', 'downloaded')),
  retest_count  integer not null default 0 check (retest_count >= 0),
  retest_reason text check (retest_reason is null or char_length(retest_reason) <= 500),
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  collected_at  timestamptz,
  in_lab_at     timestamptz,
  resulted_at   timestamptz,
  released_at   timestamptz,
  downloaded_at timestamptz
);

create table public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  test_code      text not null references public.test_catalog (code) on update cascade,
  sample_barcode text not null unique check (sample_barcode ~ '^MD-[0-9]{4}-[0-9]{5,}-S[0-9]{2,}$'),
  unique (order_id, test_code)
);

create table public.invoices (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null unique references public.orders (id) on delete cascade,
  amount_bdt integer not null check (amount_bdt >= 0),
  paid       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Results and reports
-- ---------------------------------------------------------------------------
create table public.results (
  id                uuid primary key default gen_random_uuid(),
  order_item_id     uuid not null references public.order_items (id) on delete cascade,
  analyte           text not null check (char_length(analyte) between 1 and 60),
  value             numeric not null,
  unit              text not null default '',
  ref_low           numeric not null,
  ref_high          numeric not null,
  flag              text not null default 'N' check (flag in ('L', 'N', 'H')),
  source            text not null default 'analyser' check (source in ('analyser', 'manual_correction')),
  correction_reason text check (correction_reason is null or char_length(correction_reason) <= 500),
  entered_by        uuid references auth.users (id) on delete set null,
  entered_at        timestamptz not null default now(),
  unique (order_item_id, analyte),
  check (ref_low <= ref_high),
  constraint results_correction_needs_reason
    check (source = 'analyser' or char_length(btrim(coalesce(correction_reason, ''))) >= 3)
);

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  version      integer not null check (version >= 1),
  status       text not null default 'released' check (status in ('released', 'superseded')),
  signed_by    uuid references auth.users (id) on delete set null,
  signed_at    timestamptz not null default now(),
  pdf_path     text check (pdf_path is null or char_length(pdf_path) <= 200),
  verify_code  text not null unique check (verify_code ~ '^[A-Z2-9]{10}$'),
  amend_reason text check (amend_reason is null or char_length(amend_reason) <= 500),
  unique (order_id, version),
  constraint reports_amend_needs_reason
    check (version = 1 or char_length(btrim(coalesce(amend_reason, ''))) >= 3)
);

-- At most one current (released) report version per order.
create unique index reports_one_released_per_order on public.reports (order_id) where status = 'released';

-- ---------------------------------------------------------------------------
-- Patient portal (admin client only)
-- ---------------------------------------------------------------------------
create table public.portal_otps (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  channel    text not null check (channel in ('sms_demo', 'email')),
  code_hash  text not null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  attempts   integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  ip_hash    text
);

create table public.portal_locks (
  patient_id   uuid primary key references public.patients (id) on delete cascade,
  locked_until timestamptz not null
);

-- ---------------------------------------------------------------------------
-- Notifications (never message bodies or OTP codes)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id                  uuid primary key default gen_random_uuid(),
  type                text not null check (type in (
                        'otp_code', 'registration_confirmation', 'report_ready', 'portal_login_alert',
                        'retest_requested', 'kb_review_due', 'otp_lockout_alert')),
  channel             text not null check (channel in ('email', 'sms_demo')),
  recipient_masked    text not null check (char_length(recipient_masked) <= 120),
  patient_id          uuid references public.patients (id) on delete set null,
  staff_user_id       uuid references auth.users (id) on delete set null,
  ref_id              uuid,
  status              text not null check (status in ('sent', 'failed')),
  provider_message_id text,
  error               text check (error is null or char_length(error) <= 500),
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Knowledge Hub
-- ---------------------------------------------------------------------------
create table public.kb_articles (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  category    text not null check (category in ('test_preparation', 'sop', 'faq', 'policy')),
  title_en    text not null check (char_length(title_en) between 2 and 150),
  title_bn    text not null check (char_length(title_bn) between 2 and 150),
  body_en     text not null check (char_length(body_en) <= 20000),
  body_bn     text not null check (char_length(body_bn) <= 20000),
  owner_id    uuid not null references public.staff_profiles (user_id),
  version     integer not null default 1 check (version >= 1),
  review_date date not null,
  updated_at  timestamptz not null default now(),
  published   boolean not null default false
);

-- ---------------------------------------------------------------------------
-- Audit log (append-only, see 04_audit) and settings
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor_id   uuid,
  actor_role text not null check (actor_role in (
               'receptionist', 'sample_collector', 'lab_technician', 'pathologist', 'manager',
               'patient', 'system', 'public')),
  branch_id  uuid,
  action     text not null check (char_length(action) between 2 and 40),
  table_name text,
  record_id  uuid,
  details    jsonb not null default '{}'::jsonb
);

create table public.app_settings (
  id                  integer primary key default 1 check (id = 1),
  require_manager_mfa boolean not null default false
);

-- ---------------------------------------------------------------------------
-- Code generators
-- ---------------------------------------------------------------------------
create or replace function private.next_patient_code(p_at timestamptz)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select 'MD-' || to_char(p_at at time zone 'Asia/Dhaka', 'YYYY') || '-'
         || lpad(nextval('private.patient_code_seq')::text, 5, '0');
$$;

create or replace function private.next_order_no(p_at timestamptz)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select 'ORD-' || to_char(p_at at time zone 'Asia/Dhaka', 'YYYY') || '-'
         || lpad(nextval('private.order_no_seq')::text, 6, '0');
$$;

-- Patients: DB-set code, actor and timestamps for staff; immutable identity fields.
create or replace function private.patients_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_trusted boolean := private.is_trusted_server();
begin
  if tg_op = 'INSERT' then
    if v_trusted then
      new.created_at := coalesce(new.created_at, now());
      if coalesce(new.patient_code, '') = '' then
        new.patient_code := private.next_patient_code(new.created_at);
      end if;
    else
      new.created_at       := now();
      new.consent_given_at := now();
      new.created_by       := (select auth.uid());
      new.patient_code     := private.next_patient_code(new.created_at);
    end if;
    return new;
  end if;

  -- UPDATE: staff may edit demographics only.
  if not v_trusted then
    new.id                   := old.id;
    new.patient_code         := old.patient_code;
    new.registered_branch_id := old.registered_branch_id;
    new.consent_given_at     := old.consent_given_at;
    new.consent_version      := old.consent_version;
    new.created_by           := old.created_by;
    new.created_at           := old.created_at;
  end if;
  return new;
end;
$$;

create trigger patients_before_write
  before insert or update on public.patients
  for each row execute function private.patients_before_write();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index patients_phone_idx            on public.patients (phone);
create index patients_lower_name_idx       on public.patients (lower(full_name) text_pattern_ops);
create index patients_branch_idx           on public.patients (registered_branch_id);
create index orders_status_idx             on public.orders (status);
create index orders_patient_idx            on public.orders (patient_id);
create index orders_branch_created_idx     on public.orders (branch_id, created_at desc);
create index order_items_order_idx         on public.order_items (order_id);
create index results_order_item_idx        on public.results (order_item_id);
create index reports_order_idx             on public.reports (order_id);
create index portal_otps_patient_idx       on public.portal_otps (patient_id, created_at desc);
create index notifications_created_idx     on public.notifications (created_at desc);
create index notifications_ref_idx         on public.notifications (type, ref_id, created_at desc);
create index kb_articles_category_idx      on public.kb_articles (category);
create index staff_profiles_branch_idx     on public.staff_profiles (branch_id);
create index audit_log_at_idx              on public.audit_log (at desc);
create index audit_log_action_idx          on public.audit_log (action, at desc);
create index audit_log_table_idx           on public.audit_log (table_name, at desc);
