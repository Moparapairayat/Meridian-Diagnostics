import 'server-only';
import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Patient portal session (SPEC 8.1 step 6): jose HS256 JWT in an httpOnly
// cookie scoped to /portal, valid 15 minutes. Patients have no Supabase account.
const SESSION_COOKIE = 'portal_session';
const PENDING_COOKIE = 'portal_pending';
const SESSION_AUDIENCE = 'meridian-portal-session';
const PENDING_AUDIENCE = 'meridian-portal-pending';
const SESSION_SECONDS = 15 * 60;
const PENDING_SECONDS = 10 * 60;

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: true, // browsers accept Secure cookies on http://localhost too
  sameSite: 'lax' as const,
  path: '/portal',
  maxAge,
});

function key(): Uint8Array {
  const secret = process.env.PORTAL_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('PORTAL_SESSION_SECRET is not configured.');
  return new TextEncoder().encode(secret);
}

export interface PortalSession {
  patientId: string;
  sid: string;
}

export async function createPortalSession(patientId: string): Promise<void> {
  const token = await new SignJWT({ sid: randomUUID() })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(patientId)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(key());
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(SESSION_SECONDS));
}

export async function getPortalSession(): Promise<PortalSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { audience: SESSION_AUDIENCE, algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') return null;
    return { patientId: payload.sub, sid: payload.sid };
  } catch {
    return null;
  }
}

export async function clearPendingChallenge(): Promise<void> {
  (await cookies()).delete({ name: PENDING_COOKIE, path: '/portal' });
}

export async function clearPortalCookies(): Promise<void> {
  const store = await cookies();
  store.delete({ name: SESSION_COOKIE, path: '/portal' });
  store.delete({ name: PENDING_COOKIE, path: '/portal' });
}

/**
 * The step between "send code" and "enter code". It exists whether or not the
 * Patient ID and phone matched (patientId null), so the page never reveals it.
 */
export interface PendingChallenge {
  patientId: string | null;
  destination: string;
  channel: 'sms_demo' | 'email';
}

export async function setPendingChallenge(challenge: PendingChallenge): Promise<void> {
  const token = await new SignJWT({ pid: challenge.patientId, dst: challenge.destination, ch: challenge.channel })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(PENDING_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${PENDING_SECONDS}s`)
    .sign(key());
  (await cookies()).set(PENDING_COOKIE, token, cookieOptions(PENDING_SECONDS));
}

export async function getPendingChallenge(): Promise<PendingChallenge | null> {
  const token = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { audience: PENDING_AUDIENCE, algorithms: ['HS256'] });
    const pid = payload.pid;
    if (typeof payload.dst !== 'string' || (pid !== null && typeof pid !== 'string')) return null;
    return { patientId: pid, destination: payload.dst, channel: payload.ch === 'email' ? 'email' : 'sms_demo' };
  } catch {
    return null;
  }
}
