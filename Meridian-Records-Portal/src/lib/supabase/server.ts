// User-session server client (publishable key + cookies). RLS applies and
// auth.uid() is set, so use this for all staff data access (SPEC 3.1).
// Authorise with supabase.auth.getClaims(), never getSession().
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';
import { cookies } from 'next/headers';

/**
 * Don't put this client in a global variable. Always create a new client
 * within each function when using it (one client per request).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored because src/proxy.ts refreshes user sessions.
          }
        },
      },
    },
  );
}
