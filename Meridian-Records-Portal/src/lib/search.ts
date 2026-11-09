// Pure search-query classification (unit-tested). The query text itself is
// never logged; only the kind of search and the number of results.
import { NAME_RE, PHONE_RE, normalisePhone } from './validation/patient';

export type SearchBy = 'code' | 'phone' | 'name';

export interface ClassifiedQuery {
  by: SearchBy;
  /** For exact matches. */
  exact?: string;
  /** ILIKE pattern, already escaped. */
  pattern?: string;
}

/** Escapes LIKE wildcards so user input is matched literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export function classifyQuery(raw: string): ClassifiedQuery | null {
  const q = raw.trim().replace(/\s+/g, ' ');
  if (q.length < 2 || q.length > 80) return null;

  // Patient code, full or partial: MD-2026-00012 / md-2026-000
  if (/^md-[\d-]*$/i.test(q)) {
    const code = q.toUpperCase();
    return /^MD-\d{4}-\d{5,}$/.test(code) ? { by: 'code', exact: code } : { by: 'code', pattern: `${escapeLike(code)}%` };
  }

  // Phone, full or partial (at least 4 digits)
  if (/^\+?[\d\s\-()]+$/.test(q)) {
    const phone = normalisePhone(q);
    if (PHONE_RE.test(phone)) return { by: 'phone', exact: phone };
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 4 ? { by: 'phone', pattern: `%${escapeLike(digits)}%` } : null;
  }

  // Name (Latin letters, as stored)
  if (NAME_RE.test(q)) return { by: 'name', pattern: `%${escapeLike(q)}%` };

  return null;
}
