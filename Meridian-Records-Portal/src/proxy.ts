// Next.js 16 proxy (formerly middleware). Refreshes the Supabase session and
// protects /staff/* only. Public routes (/, /login, /auth/*, /portal/*,
// /verify/*, /privacy, /api/cron/*) pass through untouched.
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation files)
     * - favicon.ico (favicon file)
     * - images: .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
