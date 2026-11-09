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
