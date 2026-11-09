'use server';

import { getStaff, isIdle, markActive } from '@/lib/auth/staff';

/**
 * Heartbeat from the idle timer. Refreshes the last-activity cookie, but
 * never revives a session that is already past the 15-minute limit.
 */
export async function touchActivity(): Promise<{ ok: boolean }> {
  const staff = await getStaff();
  if (!staff || (await isIdle())) return { ok: false };
  await markActive();
  return { ok: true };
}
