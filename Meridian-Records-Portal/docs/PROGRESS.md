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
