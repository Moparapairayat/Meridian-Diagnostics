import 'server-only';
import { cookies } from 'next/headers';
import { LANG_COOKIE, normaliseLang, type Lang } from './index';

/** Reads the `lang` cookie (defaults to English). */
export async function getLang(): Promise<Lang> {
  const cookieStore = await cookies();
  return normaliseLang(cookieStore.get(LANG_COOKIE)?.value);
}
