// Signs the staff member out and clears the idle cookie.
// GET is used by the idle timeout and server re-checks; POST by the Sign out button.
// 303 so the browser follows with GET even after a POST.
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { IDLE_COOKIE } from '@/lib/auth/idle';
import { createClient } from '@/lib/supabase/server';

const REASONS = new Set(['idle', 'no_access', 'signed_out']);

async function signOut(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(IDLE_COOKIE);

  const reason = request.nextUrl.searchParams.get('reason');
  const target = new URL('/login', request.url);
  target.searchParams.set('reason', reason && REASONS.has(reason) ? reason : 'signed_out');
  return NextResponse.redirect(target, 303);
}

export async function GET(request: NextRequest) {
  return signOut(request);
}

export async function POST(request: NextRequest) {
  return signOut(request);
}
