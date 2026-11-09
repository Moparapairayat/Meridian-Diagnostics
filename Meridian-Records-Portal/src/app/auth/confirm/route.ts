// Verifies email links (password reset, invite) and starts a session.
// Follows the Supabase SSR guide: token_hash + type -> verifyOtp. The `code`
// branch handles the default Supabase template (PKCE) until custom templates
// are enabled with custom SMTP in Phase 7.
import { type EmailOtpType } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { markActive } from '@/lib/auth/staff';
import { safeNextPath } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_TYPES: readonly EmailOtpType[] = ['recovery', 'invite', 'email'];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'), '/staff', ['/staff', '/reset-password']);

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type && (ALLOWED_TYPES as readonly string[]).includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash });
    ok = !error;
    if (error) console.warn('auth/confirm: verifyOtp failed', error.code ?? error.status);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (error) console.warn('auth/confirm: code exchange failed', error.code ?? error.status);
  }

  if (!ok) redirect('/login?error=link');

  await markActive();
  redirect(next);
}
