'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';
import { LANG_COOKIE, LANGS } from './index';

const langSchema = z.object({ lang: z.enum(LANGS) });

/** Server Action: stores the chosen UI language in the `lang` cookie. */
export async function setLanguage(formData: FormData): Promise<void> {
  const parsed = langSchema.safeParse({ lang: formData.get('lang') });
  if (!parsed.success) return;

  const cookieStore = await cookies();
  cookieStore.set(LANG_COOKIE, parsed.data.lang, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  });
}
