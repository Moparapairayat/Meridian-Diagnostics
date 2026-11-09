// Pure idle-timeout rules (SPEC 7.6: sign out after 15 minutes of inactivity).

export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const IDLE_COOKIE = 'staff_last_active';
/** The client reports activity to the server at most this often. */
export const IDLE_HEARTBEAT_MS = 60 * 1000;

/** True when the last-activity timestamp is missing, invalid or too old. */
export function isIdleExpired(lastActive: string | undefined, now: number = Date.now()): boolean {
  if (!lastActive || !/^\d{10,16}$/.test(lastActive)) return true;
  const at = Number(lastActive);
  if (at > now + 60_000) return true; // from the future: not trusted
  return now - at >= IDLE_TIMEOUT_MS;
}

export const IDLE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 12,
};
