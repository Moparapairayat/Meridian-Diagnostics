import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { IDLE_COOKIE, IDLE_COOKIE_OPTIONS, isIdleExpired } from './idle';
import { isStaffRole, type StaffRole } from './roles';

export interface Staff {
  userId: string;
  email: string | null;
  fullName: string;
  role: StaffRole;
  branchId: string;
  branchName: string;
  branchCode: string;
}

/**
 * The signed-in staff member, or null. Authorises with getClaims() (verified
 * JWT), never getSession(). Inactive or missing profiles return null because
 * RLS hides staff_profiles from non-staff. Cached per request.
 */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('full_name, role, active, branch_id, branches(name, code)')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile || !profile.active || !isStaffRole(profile.role) || !profile.branches) return null;

  return {
    userId,
    email: typeof data.claims.email === 'string' ? data.claims.email : null,
    fullName: profile.full_name,
    role: profile.role,
    branchId: profile.branch_id,
    branchName: profile.branches.name,
    branchCode: profile.branches.code,
  };
});

/** Server re-check of the 15-minute idle timeout (the client timer is the other half). */
export async function isIdle(): Promise<boolean> {
  const cookieStore = await cookies();
  return isIdleExpired(cookieStore.get(IDLE_COOKIE)?.value);
}

/** Marks the staff member as active now. Only callable where cookies can be set. */
export async function markActive(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(IDLE_COOKIE, String(Date.now()), IDLE_COOKIE_OPTIONS);
}

/** For Server Components and Server Actions: any active staff member. */
export async function requireStaff(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    // Signed in but not (or no longer) staff: end that session.
    redirect(data?.claims?.sub ? '/auth/signout?reason=no_access' : '/login');
  }
  if (await isIdle()) redirect('/auth/signout?reason=idle');
  return staff;
}

/** For Server Components and Server Actions: one of the listed roles, else 403. */
export async function requireRole(...roles: StaffRole[]): Promise<Staff> {
  const staff = await requireStaff();
  if (!roles.includes(staff.role)) redirect('/staff/forbidden');
  return staff;
}
