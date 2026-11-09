// Session refresh helper used by src/proxy.ts (official Supabase SSR pattern).
// Two jobs only: refresh the Supabase session, and
// redirect unauthenticated users away from /staff/*. Every Server Action and
// Route Handler still re-checks auth and role itself.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const CACHE_HEADERS = ['cache-control', 'expires', 'pragma'] as const;

function isStaffPath(pathname: string): boolean {
  return pathname === '/staff' || pathname.startsWith('/staff/');
}

function loginRedirect(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Not configured yet: public pages still work, staff pages fail closed.
  if (!supabaseUrl || !publishableKey) {
    return isStaffPath(request.nextUrl.pathname) ? loginRedirect(request) : supabaseResponse;
  }

  // Create a new client on every request; never store it globally.
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        // Responses that set auth cookies must not be cached by CDNs.
        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  // Do not run code between createServerClient and supabase.auth.getClaims().
  // A simple mistake could make it very hard to debug issues with users being
  // randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims && isStaffPath(request.nextUrl.pathname)) {
    // A new response must carry over the refreshed cookies and cache headers.
    const redirect = loginRedirect(request);
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    for (const header of CACHE_HEADERS) {
      const value = supabaseResponse.headers.get(header);
      if (value) redirect.headers.set(header, value);
    }
    return redirect;
  }

  // IMPORTANT: return the supabaseResponse object as it is, so the browser and
  // server cookies stay in sync.
  return supabaseResponse;
}
