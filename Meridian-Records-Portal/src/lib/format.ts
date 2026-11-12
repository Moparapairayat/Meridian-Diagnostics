// Pure display helpers: Asia/Dhaka dates, BDT, masking (unit-tested).

export const PATIENT_CODE_RE = /^MD-\d{4}-\d{5,}$/;
export const ORDER_NO_RE = /^ORD-\d{4}-\d{6,}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 01712345689 -> 017******89 */
export function maskPhone(phone: string): string {
  if (phone.length < 6) return '*'.repeat(phone.length);
  return `${phone.slice(0, 3)}${'*'.repeat(phone.length - 5)}${phone.slice(-2)}`;
}

/** rahim@gmail.com -> r***@gmail.com */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 1) return '***';
  return `${email[0]}***${email.slice(at)}`;
}

/** MD-2026-00123 -> MD-2026-***23 (for staff alerts) */
export function maskPatientCode(code: string): string {
  const m = /^(MD-\d{4}-)(\d+)(\d{2})$/.exec(code);
  return m ? `${m[1]}${'*'.repeat(m[2].length)}${m[3]}` : '***';
}

/** "Rahim Uddin" -> "R.U." */
export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter((part) => /[A-Za-z]/.test(part))
    .map((part) => `${part.replace(/[^A-Za-z]/g, '')[0]?.toUpperCase() ?? ''}.`)
    .join('');
}

const dhakaDateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Dhaka',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const dhakaDate = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric' });

export function formatDhakaDateTime(value: string | Date): string {
  return dhakaDateTime.format(new Date(value));
}

export function formatDhakaDate(value: string | Date): string {
  return dhakaDate.format(new Date(value));
}

/** Integer taka with South Asian digit grouping: 120000 -> ৳1,20,000 */
export function formatBdt(amount: number): string {
  return `৳${Math.round(amount).toLocaleString('en-IN')}`;
}

export const SEX_LABELS: Record<string, string> = { female: 'Female', male: 'Male', other: 'Other' };
