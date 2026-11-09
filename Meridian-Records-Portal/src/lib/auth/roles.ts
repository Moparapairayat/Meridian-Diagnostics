// Pure role and navigation rules (no server imports, unit-tested).

export const STAFF_ROLES = ['receptionist', 'sample_collector', 'lab_technician', 'pathologist', 'manager'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && (STAFF_ROLES as readonly string[]).includes(value);
}

export const ROLE_LABELS: Record<StaffRole, string> = {
  receptionist: 'Receptionist',
  sample_collector: 'Sample collector',
  lab_technician: 'Lab technician',
  pathologist: 'Pathologist',
  manager: 'Manager',
};

export interface NavItem {
  href: string;
  label: string;
  description: string;
}

const NAV = {
  register: {
    href: '/staff/register',
    label: 'Register',
    description: 'Register a new patient once, create the order and invoice, and print barcode labels.',
  },
  search: {
    href: '/staff/search',
    label: 'Search',
    description: 'Find a patient by ID, phone number or name across all five branches.',
  },
  collection: {
    href: '/staff/collection',
    label: 'Collection',
    description: 'Print labels, mark samples collected and send them to the lab.',
  },
  lab: {
    href: '/staff/lab',
    label: 'Lab worklist',
    description: 'Import results from the analyser for samples in the lab.',
  },
  review: {
    href: '/staff/review',
    label: 'Review',
    description: 'Review results, e-sign and release reports, or request a re-test.',
  },
  knowledge: {
    href: '/staff/knowledge',
    label: 'Knowledge Hub',
    description: 'Test preparation, procedures and policies in English and Bangla.',
  },
  dashboard: {
    href: '/staff/dashboard',
    label: 'Dashboard',
    description: 'Turnaround, portal delivery and re-test KPIs per branch.',
  },
  audit: {
    href: '/staff/audit',
    label: 'Audit log',
    description: 'Who viewed or changed what, and the notification log.',
  },
} satisfies Record<string, NavItem>;

/** Screens each role can use (SPEC 11). The first item is the role's main task. */
export const NAV_BY_ROLE: Record<StaffRole, readonly NavItem[]> = {
  receptionist: [NAV.register, NAV.search, NAV.knowledge],
  sample_collector: [NAV.collection, NAV.search, NAV.knowledge],
  lab_technician: [NAV.lab, NAV.search, NAV.knowledge],
  pathologist: [NAV.review, NAV.search, NAV.knowledge],
  manager: [NAV.dashboard, NAV.audit, NAV.search, NAV.knowledge],
};

export function navFor(role: StaffRole): readonly NavItem[] {
  return NAV_BY_ROLE[role];
}

/**
 * Returns a same-site path to redirect to after login or an email link.
 * Only paths under the allowed prefixes are accepted, which blocks open
 * redirects such as `//evil.example` or `https://evil.example`.
 */
export function safeNextPath(
  next: unknown,
  fallback = '/staff',
  allowedPrefixes: readonly string[] = ['/staff'],
): string {
  if (typeof next !== 'string' || next.length === 0 || next.length > 200) return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  if (/[\s\u0000-\u001f]/.test(next)) return fallback;

  const path = next.split(/[?#]/)[0];
  const allowed = allowedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  return allowed ? next : fallback;
}
