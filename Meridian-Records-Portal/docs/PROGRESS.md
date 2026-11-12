# Progress log

## Phase 0: Foundation (2026-11-09)

### Built
- Next.js 16.4.5 (App Router, TypeScript strict, `src/`, Tailwind CSS 4, ESLint, React Compiler) scaffolded with create-next-app.
- Packages installed at exact versions:
  - runtime: `@supabase/supabase-js` 2.119.0, `@supabase/ssr` 0.12.7, `zod` 4.6.7, `jose` 6.2.16, `resend` 6.37.0, `@react-email/components` 1.0.12, `pdf-lib` 1.17.1, `qrcode` 1.5.4, `jsbarcode` 3.12.3, `server-only` 0.0.1
  - dev: `vitest` 4.1.12, `tsx` 4.23.15, `dotenv` 18.0.10, `supabase` CLI 3.0.0, `@types/qrcode` 1.5.6
- Supabase SSR clients, following the official guide (`with-supabase` template):
  - `src/lib/supabase/client.ts`: browser client (auth UI only).
  - `src/lib/supabase/server.ts`: user-session server client (`server-only`).
  - `src/lib/supabase/proxy.ts`: `updateSession()`. It refreshes the session with `getClaims()`, forwards the cache headers (`Cache-Control`, `Expires`, `Pragma`) that `@supabase/ssr` sends with auth cookies, and redirects unauthenticated `/staff/*` requests to `/login?next=…`. If the Supabase env vars are missing, `/staff/*` fails closed.
  - `src/proxy.ts`: Next.js 16 proxy (exports `proxy`). Its matcher excludes static assets.
  - `src/lib/supabase/admin.ts`: secret-key client (`server-only`, `persistSession: false`, `autoRefreshToken: false`).
- `.env.example` lists every variable from SPEC §16. `.gitignore` ignores `.env*` but keeps `.env.example`.
- `vercel.json`: region `sin1` only. The cron job is added in Phase 7.
- `next.config.ts`: the security headers from SPEC §7.6 on every route, plus `poweredByHeader: false`.
- Root layout:
  - Inter + Noto Sans Bengali (`next/font/google`).
  - Calm teal/slate palette as Tailwind `@theme` tokens; every text pair is ≥ 4.5:1.
  - Visible `:focus-visible` ring and a skip-to-content link.
  - Persistent `<DemoBanner/>`.
  - `<html lang>` set from the `lang` cookie.
- i18n:
  - `src/lib/i18n/{en,bn}.json`.
  - `index.ts`: pure `t()`, `isLang()` and `normaliseLang()`.
  - `server.ts`: `getLang()` cookie reader.
  - `actions.ts`: `setLanguage` Server Action with zod validation.
  - `<LanguageToggle/>`: a plain form, so it works without JavaScript.
- Pages:
  - `/`: landing page with Staff login and Patient portal buttons and a privacy link.
  - Placeholders for `/login`, `/portal` and `/privacy`.
- Scripts and tests:
  - `package.json` scripts: `typecheck`, `test`, `seed`, `test:rls`, `db:types`.
  - `scripts/seed.ts` is a stub that refuses to run unless `DEMO_MODE=true`. `scripts/test-rls.ts` is a stub.
  - `vitest.config.ts` adds the `@/` alias and maps `server-only` to `tests/stubs/server-only.ts`.
  - `tests/i18n.test.ts`: dictionary key parity and `t()`.

### How to test manually
1. `npm run dev`, then open http://localhost:3000.
2. The landing page shows the demo banner, the app name, two large buttons and a privacy link.
3. Click **বাংলা**. All text switches to Bangla, and `<html lang="bn">` (check in DevTools). Click **English** to switch back.
4. Press Tab once. The "Skip to main content" link appears. Every control has a visible focus ring.
5. Open `/staff` with no session. You are redirected to `/login?next=/staff`.
6. `/login`, `/portal` and `/privacy` load without login.
7. In DevTools → Network, the response headers include CSP `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`.
8. In DevTools device mode at 360 px width, nothing scrolls horizontally.

### Decisions
- **Cache Components is off.** create-next-app 16.4 enables `cacheComponents` and `partialPrefetching` by default. With them on, every `cookies()` read (Supabase session, `lang`) must sit behind `<Suspense>`, which conflicts with setting `<html lang>` from a cookie. Almost every page here is per-user. This can be revisited before Next.js 17, where the docs say Cache Components becomes the default.

### Repository layout
- The app lives in the `Meridian-Records-Portal/` folder of the repository. Run all npm commands from that folder, and set Vercel's **Root Directory** to `Meridian-Records-Portal`.

### Known issues
- `npm audit` reports 4 low-severity advisories in `deepmerge`, pulled in through `@react-email/components` → `@react-email/render` → `html-to-text`. No fix is available without a breaking change. Low risk: it only renders our own templates.
- The first Vercel deploy needs the student's accounts (GitHub + Vercel). See the Phase 0 handover notes.

## Phase 1: Database (2026-11-09)

### Built
- Supabase project `meridian-records-portal`, region Singapore (`ap-southeast-1`), ref `rbmxgscplkgnixxympav`. `supabase/config.toml` from `supabase init`. Linked, and the migrations below were applied with `supabase db push --remote`.
- Migrations in `supabase/migrations/`:
  - `20261109100000_schema.sql`: the `private` schema and all 16 tables from SPEC §6.
    - Check constraints for roles, statuses, channels, languages, sex, the Bangladeshi phone format, the Latin-only `full_name` and the verify-code format.
    - Sequences + BEFORE INSERT triggers for `patient_code` (`MD-YYYY-00000`) and `order_no` (`ORD-YYYY-000000`). The year is taken in Asia/Dhaka.
    - Indexes.
  - `20261109100100_rls.sql`:
    - `private.staff_role()`, `staff_branch()` and `is_staff()` (security definer, `search_path = ''`).
    - Explicit grants. `anon` has no table, sequence or function access.
    - RLS on every table, with policies following the SPEC §4 matrix.
  - `20261109100200_order_workflow.sql`:
    - Order status trigger (SECURITY INVOKER) with the "two kinds of caller" rule.
    - Guards on results, reports and kb_articles.
    - `create_order`, `release_order` and `amend_report` (all SECURITY INVOKER).
  - `20261109100300_audit.sql`:
    - `private.audit_row_change()` on the 8 tables listed in SPEC §7.3. It records changed column names only, plus status old→new.
    - `public.log_event()`, which accepts only the 4 staff read actions.
    - `audit_log` is append-only. A trigger refuses UPDATE/DELETE/TRUNCATE for every role, including the secret key.
  - `20261109100400_settings_mfa_storage.sql`: the `app_settings` row, restrictive aal2 policies on `audit_log` and `notifications`, and the private `reports` bucket (PDF only, 5 MB).
- `src/lib/database.types.ts` generated. The `db:types` script now uses `--remote`, because `--linked` is deprecated in Supabase CLI 3.

### Access matrix (default deny; `anon` has nothing)
| Table | select | insert | update | delete |
|---|---|---|---|---|
| branches, test_catalog, test_analytes, staff_profiles | all staff | – | – | – |
| patients | all staff | receptionist, own branch | receptionist, own-branch patients (code/branch/consent immutable) | – |
| orders | all staff | receptionist, own branch, `registered` | collector / lab / pathologist (transitions policed by trigger) | – |
| order_items | all staff | receptionist, only inside `create_order` | – | – |
| invoices | receptionist, manager | receptionist, only inside `create_order` | – | – |
| results | lab_technician, pathologist | lab_technician, order `in_lab` | lab_technician, order `in_lab` (correction needs reason) | – |
| reports | lab_technician, pathologist, manager | pathologist (`release_order` / `amend_report`) | pathologist, only released→superseded | – |
| kb_articles | staff: published; manager: all | manager | manager (version auto-increments) | – |
| app_settings | all staff | – | manager | – |
| notifications | manager (+ aal2 when enforced) | admin client only | – | – |
| audit_log | manager (+ aal2 when enforced) | triggers, `log_event`, admin client | nobody | nobody |
| portal_otps, portal_locks | – | admin client only | admin client only | admin client only |

### Decisions
- **Invoices and order items only through `create_order`.** The function is SECURITY INVOKER (SPEC), so a plain policy cannot tell that the call came from it. `create_order` sets a transaction-local flag (`meridian.create_order`), and the insert policies require it. Clients cannot set it, because `set_config` is not exposed by the Data API.
- **The trusted-server check** (`private.is_trusted_server()`) is SECURITY INVOKER, so `current_user` is the real caller. SQL Editor sessions (`postgres`) count as staff without a role, so they cannot move order statuses. The seed must use the secret key through the API.
- **Result flags (`L`/`N`/`H`) are computed by the database** from value and range, so the client cannot mislabel them.
- **Moving an order to `resulted` requires results**, and moving it to `released` requires a released report (`release_order`).
- **Barcode numbering continues per patient across orders** (`-S01`, `-S02`, then `-S03` on the next order), because `sample_barcode` is globally unique. An advisory lock per patient serialises numbering.
- **Audit history survives re-seeding**, because `audit_log` cannot be deleted by anyone. This is intended.

### How to test
- **Done:** all 5 migrations were run in a local PGlite database with Supabase stubs, with 79 scenario checks. They cover:
  - the 11 RLS cases from SPEC §18.1
  - every status transition, including re-test and amend
  - DB-set timestamps and the trusted-server path
  - audit minimisation and append-only
  - MFA aal2 enforcement
  - KB versioning

  All 79 passed. `supabase db lint --remote` reports no errors.
- **Manual:** Supabase dashboard → Table Editor. Every table shows "RLS enabled". Storage shows a private `reports` bucket.
- `npm run test:rls` against the live database comes in Phase 2, after the seed.

### Known issues
- The database password was generated randomly when the project was created and was not stored. To connect with a SQL client, reset it under Supabase → Project Settings → Database.
- `kpi_summary()` is deferred to Phase 9 (as planned).

## Phase 2: Seed data and RLS tests (2026-11-09)

### Built
- `scripts/lib/env.ts`: loads `.env.local` and creates the script's own admin and publishable clients. It does not import `src/lib/supabase/admin.ts`. Also holds the plus-address helper and the 6 demo staff accounts.
- `scripts/lib/demo-data.ts`:
  - 5 branches.
  - 12 tests with analytes and bilingual preparation text.
  - Fictional name lists, re-test and amendment reasons.
  - 10 bilingual Knowledge Hub articles from SPEC §10.
- `scripts/seed.ts` (`npm run seed`):
  - Refuses to run unless `DEMO_MODE=true`.
  - Wipes the demo tables (child first) and the `reports` bucket, deletes the 6 demo auth users, then recreates them with `email_confirm: true`.
  - Inserts with the secret key, so orders go in directly in their final status with realistic historical timestamps (SPEC 5.1).
  - Randomness comes from a fixed seed, so every run tells the same story.
  - Patient codes and order numbers come from the database sequences, so they keep increasing on each re-seed.
- `scripts/test-rls.ts` (`npm run test:rls`):
  - Signs in as each demo role with the publishable key and runs the 11 SPEC §18.1 cases plus 8 extras: back-dating, the secret-key trusted path both ways, manager results, direct invoice insert, anon RPC, pathologist → downloaded, portal_otps.
  - Writes `docs/test-results/rls.md` and exits non-zero on any FAIL.
  - Temporary rows created for a test are removed afterwards.
- `.env.local` was created locally (git-ignored, not committed).
  - Supabase keys were fetched with the CLI and written without being printed.
  - `OTP_SECRET`, `PORTAL_SESSION_SECRET`, `CRON_SECRET` and `SEED_DEMO_PASSWORD` were generated randomly.
  - `DEMO_INBOX` is the student's Gmail.

### Seeded data
| Item | Count |
|---|---|
| Branches / staff / tests | 5 / 6 / 12 |
| Patients (3 registered today, 2 with email + opt-in) | 30 |
| Orders: registered / collected / in_lab / resulted / released / downloaded | 4 / 3 / 5 / 5 / 17 / 26 (60) |
| Orders with a re-test (2 waiting in the lab) | 5 |
| Amended reports (v1 superseded, v2 released) | 2 |
| Results / report rows | 117 / 45 |
| KB articles (2 overdue for review) | 10 |

Seeded reports have `pdf_path = null`. The PDF is generated on first view or download (Phase 5).

### How to test
- `npm run seed`: prints a summary, the demo staff emails and the 2 portal demo patient codes (never the password).
- `npm run test:rls`: **19 of 19 passed** against the live database (see `docs/test-results/rls.md`).
- The seed was run twice in a row to confirm it can be repeated safely.
- **Demo password:** the `SEED_DEMO_PASSWORD` line in `.env.local`. It is the same for all 6 demo staff accounts.

### Known issues
- Each re-seed gives the portal demo patients new codes, because the sequences are not reset. Read the current codes from the seed output.
- Audit rows from earlier seeds and test runs stay in `audit_log`, which is append-only by design.

## Phase 3: Staff authentication and app shell (2026-11-09)

### Built
- **Auth pages** (Server Actions + zod, generic error messages):
  - `/login`: email + password. Already-signed-in staff are sent to `/staff`. Messages for idle sign-out, sign-out and no access. In demo mode it lists the demo account emails, never the password.
  - `/forgot-password`: `resetPasswordForEmail` with `redirectTo = <APP_URL>/auth/confirm?next=/reset-password`. Always the same answer, so it never reveals whether an account exists.
  - `/auth/confirm`: `verifyOtp({ type, token_hash })` per the Supabase SSR guide (recovery, invite, email). Also `exchangeCodeForSession(code)` for Supabase's default template. `next` is validated, so open redirects are blocked.
  - `/reset-password`: needs the session started by the email link. Rule: 10+ characters with upper and lower case letters and a number (the same rule is set in Supabase).
  - `/auth/signout` (GET for idle, POST for the button, 303 redirect).
- **`src/lib/auth/`:**
  - `roles.ts` (pure): roles, labels, role → screens (SPEC 11), `safeNextPath()`.
  - `idle.ts` (pure): 15-minute rule.
  - `staff.ts`: `getStaff()` (`getClaims()` → `staff_profiles` + branch; null if missing or inactive), `requireStaff()`, `requireRole(...)` (→ `/staff/forbidden`).
- **Staff shell** (`src/app/staff/layout.tsx`):
  - Guard, plus a header with name, role, branch badge and Sign out.
  - Role-based navigation that scrolls sideways at 360 px.
  - `/staff` home with the role's task cards, and a 403 page at `/staff/forbidden`.
- **Idle timeout** (SPEC 7.6):
  - `IdleTimeout` client component: warns at 14 minutes and signs out at 15.
  - Reports activity at most once a minute through the `touchActivity` Server Action, which refreshes an httpOnly `staff_last_active` cookie.
  - `requireStaff()` re-checks that cookie on every request, so a stale or missing cookie signs the user out even without JavaScript.
- **`/privacy`:** full bilingual notice (SPEC 7.5), with content in `src/lib/i18n/privacy.ts` (version `2026-11-v1`).
- **Supabase clients** now carry the generated `Database` type.
- **Supabase Auth config** (`supabase/config.toml`, pushed with `supabase config push`):
  - sign-ups disabled
  - minimum password length 10, with `lower_upper_letters_digits`
  - redirect URL `http://localhost:3000/**`
  - TOTP MFA kept enabled
  - The diff was reviewed first, so only these properties changed.

### How to test (manual)
1. `npm run dev`. Sign in as each demo account. Each role sees only its own menu items:
   - receptionist: Register, Search, Knowledge Hub
   - collector: Collection, …
   - lab: Lab worklist, …
   - pathologist: Review, …
   - manager: Dashboard, Audit log, …
2. The header shows the branch badge. North reception shows North (NOR).
3. Sign out → "You have signed out". Opening `/staff` after that → login.
4. Stay idle for 14 minutes → warning. At 15 minutes → signed out with "You were signed out for security…".
5. `/privacy` → switch to বাংলা.
6. Forgot password → generic confirmation message (see known issues for email delivery).

Automated smoke run against a production build: all 5 roles' menus, branch badges, `/login` redirect when signed in, idle sign-out (stale and missing cookie), anonymous `/staff/*` → login, bad email link → error, open-redirect blocked, privacy in both languages. All checks passed. Unit tests: 14 passing (`tests/auth.test.ts`, `tests/i18n.test.ts`).

### Known issues
- **Custom email templates are not active yet.** The Supabase free plan refuses template changes while the default email provider is used. The templates are ready (`supabase/templates/recovery.html`, `invite.html`), with their config commented out in `config.toml`. Turn them on in Phase 7, after Resend SMTP is connected. Until then the default reset email uses a `?code=` link, which `/auth/confirm` also handles. It only works in the same browser that asked for the reset.
- **Supabase's default email service is heavily rate-limited** and only delivers to project team members. Forgot-password emails may not arrive until Resend SMTP is set up (Phase 7).
- The navigation links to screens built in later phases (Register, Search, …), which show 404 until then.

## Phase 4: Registration, orders, invoice, barcode labels, cross-branch search (2026-11-09)

### Built
- **`/staff/register`** (receptionist):
  - One form: English name, age, sex, Bangladeshi mobile (accepts +880, spaces and dashes), optional email, language and preferred OTP channel.
  - Test picker with prices and a live total.
  - Required consent checkbox linking `/privacy`, and a separate optional email opt-in that starts unticked.
  - The Server Action validates with zod, inserts the patient with the user-session client (RLS, own branch, consent version `2026-11-v1`), then calls `create_order` (order + barcodes + invoice in one transaction).
  - It then redirects to `/staff/register?done=<orderId>`, a confirmation showing Patient ID, Order No, invoice total and samples, with **Print labels**, **Register another** and **Open patient record**. Refreshing the page does not register twice.
- **Duplicate guard (SPEC 5.2):** if the mobile number already exists, nothing is saved. A warning lists the matching record(s) with links, and the form keeps every typed value. "This is a different person: register anyway" re-submits the same data.
- **`/staff/labels/[orderId]`** (collector, receptionist):
  - One Code 128 label per sample (jsbarcode SVG), showing patient code, initials, sample barcode, test code, specimen and date (Dhaka).
  - Prints at 50 × 25 mm, one per page, using a CSS named page (`@page label`). The demo banner and staff header are hidden in print.
- **`/staff/search`** (all staff):
  - One box that detects the input type: Patient ID (full or prefix), mobile (full, or 4+ digits) or name (Latin, ILIKE with wildcards escaped).
  - Searches all five branches. Results show a branch badge, the latest order status and a masked phone, plus the server time.
  - It is a **POST Server Action, so the query text never appears in a URL or request log**. The audit row is `search` with `{ by, results }` only.
- **`/staff/patients/[id]`**, role-based:
  - receptionist and manager: demographics with full contact details, orders with status and invoice
  - lab technician and pathologist: results with flag shown as text (Low/Normal/High)
  - collector: masked contact details, status and labels link
  - Logs `view_patient`, and `view_results` when results are shown.
  - Receptionists get **New order**: pick tests only, then `create_order`, then the same confirmation. Barcodes continue per patient (S03, …).
- **Pure helpers with unit tests:**
  - `src/lib/format.ts`: masking, initials, Dhaka dates, `৳` with South Asian grouping, code regexes.
  - `src/lib/search.ts`: query classification, LIKE escaping.
  - `src/lib/orders.ts`: status labels and a TypeScript mirror of the transition table.
  - `src/lib/validation/patient.ts`.
- `src/lib/audit.ts`: `logStaffRead()` wrapper around `log_event`.

### Fixed during testing
- An empty **age** was accepted as 0 years, because `z.coerce.number('')` returns 0. Age is now parsed from the text strictly. A unit test covers it.

### How to test
- Unit tests: 29 passing.
- **Browser end-to-end run** (Chrome, 360 px, production build, live database): 25/25 checks passed.
  - Text errors on empty submit, and the live total.
  - Registration confirmation and 2 labels with S01/S02.
  - Duplicate warning that keeps typed values.
  - North reception finds the new Central patient by code, phone and name (about 0.1 s server time, 0.4 s end-to-end), with branch badge and masked phone.
  - New order: barcode S03, invoice total correct.
  - Collector, lab and manager views. Collector → register and manager → labels both give 403.
  - Audit: `search` rows contain only `{by, results}`, no phone or name anywhere in details; `view_patient`, `view_results` and the patient insert are logged.
  - The synthetic test patient was deleted afterwards. Its audit rows remain by design.
- **Manual:**
  1. As reception.central, register a patient with consent, then print labels.
  2. As reception.north, search the new Patient ID and time it with a stopwatch for the "before vs after" evidence.
  3. As manager, check the audit rows in Supabase → Table Editor → `audit_log`.

### Known issues
- No screen to edit demographics yet. The database already allows receptionists to edit their own branch's patients (SPEC 4).
- Next.js keeps background prefetch requests open for links to screens not built yet (Knowledge Hub etc.). Direct navigation returns 404 instantly. This goes away once those screens exist.

## Phase 5: Collection, lab, pathologist review, PDF reports (2026-11-09)

### Built
- **`/staff/collection`** (sample collector):
  - "To collect" list: Print labels → Mark collected.
  - "Collected, ready for the lab" list: Send to lab.
  - Transitions use the user-session client (`src/lib/order-actions.ts`) with `.eq('status', from)`, so a double click is harmless. Trigger and RLS rejections are shown as plain text (`src/lib/db-errors.ts`).
- **`/staff/lab`** (lab technician):
  - `in_lab` worklist from all branches, with re-tests listed first.
  - The order view has **Import from analyser (simulated)**: `src/lib/analyser.ts` gives about 15% of values out of range, half low and half high, rounded to the analyte's decimals, without rounding back onto the boundary. Values are upserted on (order item, analyte), so a re-import after a re-test replaces them.
  - Per-value **Correct** needs a reason, and sets source `manual_correction`. The database recomputes the flag.
  - **Submit results** only when every analyte has a value; it moves the order to `resulted`.
  - Opening an order with values logs `view_results`.
- **`/staff/review`** (pathologist):
  - "To review" list. The order view shows values with L/N/H in text and the abnormal count.
  - **E-sign & release** (confirm step).
  - **Request re-test** (reason required; resulted → in_lab, retest_count + 1).
  - After an action the page shows the outcome: re-test reason, or report version, verification code and View PDF.
  - "Released" tab: View PDF and **Amend** (reason required).
- **Release order of operations (SPEC 11.2)** in `review/actions.ts`:
  1. `requireRole('pathologist')`
  2. load the data with the user session
  3. build the PDF
  4. upload `reports/<order_id>/v1.pdf` with the admin client
  5. `release_order()` with the user session
  6. delete the file if step 5 fails

  Amend works the same way with `v<n+1>.pdf` and `amend_report()`. The old version is superseded, and the order status does not change.
- **PDF** (`src/lib/pdf/report.ts`, pdf-lib, English, Helvetica):
  - A4 with header, branch, patient and order block, and Dhaka times.
  - One table per test, with abnormal values in bold and L (low)/H (high).
  - Page breaks for long reports.
  - "Electronically signed by …" and a QR code to `/verify/<code>` with the code printed beside it.
  - Diagonal "DEMO - SYNTHETIC DATA" watermark.
  - An "AMENDED REPORT - version n" banner plus the reason.
  - All text is sanitised to WinAnsi, so Bengali can never crash it.
- **`src/lib/pdf/ensure.ts`:**
  - `ensureReportPdf()` generates and stores a missing PDF on first view (for seeded reports). The portal will use it in Phase 6.
  - Also `signedReportUrl()` (60 s), `uploadReportFile()` and `removeReportFile()`.
  - It uses the admin client, so callers must authorise first.
- **`/staff/reports/[reportId]/pdf`** (lab technician, pathologist): role check, RLS check on the report row, generate if missing, `view_report` audit, then a 303 redirect to a 60-second signed URL (`no-store`). Lab and pathologist also get View PDF links on the patient record.
- **Email hooks:** `TODO(phase 7)` comments mark where `report_ready` (release) and `retest_requested` (re-test) will be sent.

### How to test
- Unit tests: 35 passing. New in `tests/lab.test.ts`: analyser distribution (11–19% out of range over 4,000 values), decimals, flags, verify-code format and uniqueness, multi-page A4 PDF, Bengali text that does not crash the PDF.
- **Browser end-to-end run** (Chrome, production build, live database): 31/31 checks passed.
  - register → collect → send to lab (collector → lab page is 403)
  - import 5 values → correct one with a reason → submit
  - re-test blocked without a reason; with a reason → in_lab, retest_count 1, lab sees the reason → re-import replaces values → submit
  - e-sign & release → report v1, verify code, PDF in the private bucket
  - View PDF → 303 to signed URL → PDF served; anonymous → login; receptionist → 403
  - amend → v1 superseded, v2 with a new PDF and code, order still released
  - a seeded report's PDF is generated on first view
  - audit has every status move with the right role, `view_report`, and the result correction, with no result values or re-test text in details
  - The test patient and its files were removed afterwards.
- `npm run test:rls`: 19/19 still pass.
- **Manual:**
  1. Run collect → import → request re-test → import → sign.
  2. Open the PDF and scan the QR code. It opens `/verify/<code>`, which is built in Phase 6.

### Known issues
- "Amend" issues a new signed version (new PDF, verify code, reason). Result values cannot change after release, because RLS only lets the lab write while an order is `in_lab`. This matches the SPEC data model.
- The QR code points to `NEXT_PUBLIC_APP_URL` (localhost during development). Set it to the Vercel URL in production.

## Phase 6: Patient portal (OTP) and public report verification (2026-11-12)

### Built
- **`src/lib/otp/otp-core.ts`** (pure, unit-tested):
  - 6-digit codes from `crypto.randomInt`.
  - The database stores only `HMAC-SHA256(OTP_SECRET, otpId:code)`; codes are compared with `timingSafeEqual`.
  - Rules: expiry, a 60-second resend cooldown, at most 3 codes per 15 minutes, and a lock on the 5th failed attempt.
  - IP addresses are hashed, never stored raw.
- **`src/lib/otp/otp.ts`** (server-only, admin client):
  - **Request:** finds the patient by Patient ID + phone, checks `portal_locks` and the issue limits, inserts `portal_otps` (5-minute expiry), sends the code, and writes a `notifications` row (`otp_code`, masked recipient, no code).
  - **Verify:** the code is single use (an atomic `used_at` claim). Failed attempts are counted within the window, and the 5th one creates a 15-minute `portal_locks` row.
  - Audit rows (actor `patient`): `portal_login`, `portal_otp_failed`, `portal_locked`.
  - Phase 7 TODOs: the lockout email to managers and the login alert.
- **Senders** (`src/lib/otp/senders/`), behind the `OtpSender` interface:
  - `DemoSmsSender` returns the code for on-screen display only when `NEXT_PUBLIC_DEMO_MODE=true`.
  - `EmailOtpSender` is a stub until Phase 7.
  - If Email is chosen but there is no email with opt-in, or (until Phase 7) email cannot be delivered, the code goes by Demo SMS. The page says so inside the Demo SMS box.
- **`src/lib/portal/session.ts`** (jose HS256, `PORTAL_SESSION_SECRET`):
  - `portal_session` holds `{sub: patient_id, sid}`. It is httpOnly, secure, `sameSite=lax`, `path=/portal` and lasts 15 minutes.
  - A signed `portal_pending` cookie carries the step between "send code" and "enter code". It exists **whether or not the details matched** (`patientId: null`), so the page itself never reveals a match.
- **`/portal`** (bilingual, mobile-first):
  - Patient ID + mobile + channel, with "SMS (Demo)" and "Email (if registered)" always shown. The answer is always "If the details match, a code has been sent".
  - The code step shows the masked destination, the Demo SMS box, a 60-second resend countdown, and "start again".
  - Public test-preparation guidance from `test_catalog.prep_*` in the visitor's language.
  - On login, the `lang` cookie is set to the patient's registered language if none was chosen.
- **`/portal/reports`:** only this patient's released/downloaded orders with the current report version (amended marked), test names, and logout. **`/portal/logout`** clears the cookies.
- **`/portal/reports/[orderId]/download`:**
  - Re-checks the session and that the order belongs to this patient.
  - Uses the shared `ensureReportPdf()` from Phase 5, then a 60-second signed URL (303, `no-store`).
  - The first download sets the order to `downloaded`, which the trusted-server rule allows.
  - Audit `portal_download` with `{report_version, first}`.
- **`/verify/[code]`** (public, bilingual; logic in `src/lib/portal/verify.ts`):
  - Shows Valid / Superseded / Not valid, test names, report date, version, signing pathologist and branch, and patient **initials only**. It never shows results or full details.
  - Rate limit: 30 checks per 10 minutes per IP hash.
  - Audit `verify_report` (actor `public`, `{result, ip_hash}`).
- **i18n:** 61 new English and Bangla keys for the portal and verify page.

### How to test
- Unit tests: 43 passing. New in `tests/otp.test.ts`: generation (with leading zeros), HMAC bound to the OTP id, right/wrong/malformed codes, expiry, 60-second cooldown, 3 per 15 minutes, lock at 5, IP hashing.
- **Browser end-to-end run** (Chrome at 360 px, Bangla, production build, live database): 33/33 checks passed.
  - Bangla portal with both channels and prep guidance; no horizontal scroll.
  - Non-matching details get the same screen with no code.
  - Demo SMS code, and the database holds only the hash.
  - A wrong code is rejected, the right one logs in, and a used code cannot be reused.
  - Cookie flags are correct, and the session lasts 15 minutes or less.
  - Download: 303 to a signed URL, the PDF is served, the order becomes `downloaded`. Another patient's order is refused; no session goes back to the portal.
  - The email choice falls back to Demo SMS.
  - The 5th wrong code locks the account; even the right code is refused while locked; the lock lasts 15 minutes.
  - Logout works.
  - Verify: valid in Bangla, initials only with no name or results; superseded flagged; unknown code is "Not valid"; rate limit works.
  - Audit: the four portal actions (actor patient) and `verify_report` (actor public), with no code, phone, name or raw IP anywhere.
  - Every send appears in `notifications`, masked.
- `npm run test:rls`: 19/19 still pass.
- **Manual (on a phone):**
  1. Open `/portal`, switch to বাংলা, and log in with SMS (Demo).
  2. Download the PDF.
  3. Enter a wrong code 5 times and check it locks.
  4. Scan the PDF's QR code and check the verify page opens.

### Known issues
- **Demo-mode caveat (SPEC 8.1):** the Demo SMS box appears only when the Patient ID and phone match, so demo mode reveals whether a pair is valid. Production would use a real SMS gateway and show nothing on screen. Rate limits are not reported on the first screen, so that does not leak a match.
- The email OTP channel delivers by Demo SMS until Resend is connected in Phase 7.
- The E2E run set some seeded `released` orders to `downloaded`. That is expected portal behaviour; `npm run seed` resets it.
- **Windows note:** if a terminal opens the project as `d:\…` (lower-case drive), Vitest loads itself twice and every suite fails with "Cannot read properties of undefined (reading 'config')". Run the commands from `D:\meridian\Meridian-Records-Portal`.

## Phase 7: Email (Resend), notifications, daily cron (2026-11-12)

**Status: integrated but not yet switched on.** `RESEND_API_KEY` and `EMAIL_FROM` are still empty by choice, so OTP codes stay on Demo SMS for now. Every email path runs and records a `notifications` row (`failed`, error `email not configured`). Filling the two variables turns email on with no code change.

### Built
- **`src/lib/email/send.ts`** (server-only), following the Resend Next.js guide:
  - `resend.emails.send({ from, to, subject, react: Template(props), tags }, { idempotencyKey })`.
  - Never throws into the user flow; the SDK returns `{data, error}`, and network errors are caught.
  - Always writes a `notifications` row: masked recipient, sent/failed, provider id, short error name.
  - Never stores or logs the body, the code or the full address.
  - `emailConfigured()` reports whether both variables are set.
- **React Email templates** (`src/lib/email/templates/`), simple accessible HTML with a "DEMO" label:
  - Patient templates use the patient's language (bn/en): `otp_code`, `registration_confirmation`, `report_ready`, `portal_login_alert`.
  - Staff templates are in English: `retest_requested`, `kb_review_due`, `otp_lockout_alert`.
  - Content strictly per SPEC 9. `report_ready` contains no test names, results, diagnoses or attachments, only "a report is ready" and the portal link.
- **`src/lib/email/notify.ts`:** one function per event. Each picks recipients (patients only with email + opt-in; lab technicians and managers via `notify_email`), chooses the language, sets an idempotency key, and never throws.
- **Wired hooks**, all sent with `after()` from `next/server` after the response:
  - registration → `registration_confirmation`
  - release and amend → `report_ready`
  - re-test → `retest_requested` to every active lab technician
  - successful portal login → `portal_login_alert`
  - lockout → `otp_lockout_alert` to every active manager, with a masked patient code (`MD-2026-***23`)
- **`EmailOtpSender`** (synchronous, so a failure is known at once). The portal uses email only when the patient has email + opt-in **and** email is configured; otherwise Demo SMS, with a note in the Demo SMS box. A failed email send also falls back to Demo SMS. When email is used, the code screen shows the masked address.
- **`/api/cron/daily`** (GET):
  - `Authorization: Bearer ${CRON_SECRET}` is checked with `timingSafeEqual`; otherwise 401.
  - Runs a tiny keep-alive query.
  - Sends `kb_review_due` to the owner of each published article with `review_date <= today` (Dhaka), at most once per article per day (checked in `notifications` by `ref_id`). Returns counts only.
- **`vercel.json`:** `crons: [{ "path": "/api/cron/daily", "schedule": "0 22 * * *" }]` (about 04:00 in Dhaka).
- `format.ts`: `maskPatientCode()`.

### How to test
- Unit tests: 50 passing. New in `tests/email.test.ts`:
  - `report_ready` in bn and en contains no test names, codes, analyte names, units or digits outside the portal link, and no attachment.
  - `otp_code` contains the code **exactly once**, plus the 5-minute expiry and "ignore if not you" (both languages).
  - Registration, login alert and staff emails stay within SPEC 9.
  - The lockout alert shows only the masked code.
- **Live checks** (production build, live database, no Resend key): 13/13 passed.
  - Cron: 401 without or with a wrong secret. One `kb_review_due` row per overdue article (2). A second run the same day sends nothing.
  - Registration with email + opt-in → `registration_confirmation` after the response, masked recipient.
  - Portal email choice → Demo SMS with a note, and no email OTP attempted.
  - Login → `portal_login_alert`.
  - 5 wrong codes → `otp_lockout_alert` to the manager.
  - Pathologist re-test → `retest_requested` to the lab technician.
  - Release → `report_ready` to the patient.
  - `notifications` hold no phone, full email, code or name.
- `npm run test:rls`: 19/19 pass.

### To switch email on later (needs the student's accounts)
1. Resend → Domains → add `notify.<your-domain>`. Add the DNS records Resend shows, then Verify. Optionally add DMARC `_dmarc.notify` = `v=DMARC1; p=none;`.
2. Resend → API Keys → create one with **Sending access** for that domain only.
3. In `.env.local` and Vercel, set:
   - `RESEND_API_KEY`
   - `EMAIL_FROM="Meridian Diagnostics (Demo) <no-reply@notify.<your-domain>>"`
4. Resend → Integrations → Connect to Supabase, so staff reset and invite emails go through Resend SMTP. Then un-comment the two `[auth.email.template.*]` blocks in `supabase/config.toml` and run `npx supabase config push`. The free plan only allows custom templates once custom SMTP is connected.
5. In Vercel, set `CRON_SECRET` (the same value as `.env.local`).

### Known issues
- Without a verified domain, Resend only delivers to the account owner, so the plus-address demo accounts need the domain.
- The live checks above left `failed` rows in `notifications`. They are expected and show in the manager's notification log (Phase 9).
