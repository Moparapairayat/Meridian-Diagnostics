// Portal logout (SPEC 8.1 step 9): clears the session cookies.
import { NextResponse, type NextRequest } from 'next/server';
import { clearPortalCookies } from '@/lib/portal/session';

export async function POST(request: NextRequest) {
  await clearPortalCookies();
  return NextResponse.redirect(new URL('/portal?signedout=1', request.url), 303);
}
