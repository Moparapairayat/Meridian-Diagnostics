// Daily Vercel Cron (SPEC 11, 17): keeps the Supabase Free project active and
// emails owners of Knowledge Hub articles whose review date has passed, at most
// once per article per day (tracked in notifications). Secured with CRON_SECRET.
import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { sendKbReviewDue } from '@/lib/email/notify';
import { createAdminClient } from '@/lib/supabase/admin';

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization') ?? '';
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const dhakaToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const admin = createAdminClient();

  // 1. Keep-alive: a tiny query so the Free project is not paused for inactivity.
  const { error: pingError } = await admin.from('branches').select('id', { head: true, count: 'exact' });
  if (pingError) console.warn('cron: keep-alive query failed', pingError.code);

  // 2. Knowledge Hub reviews due (review_date on or before today, Dhaka).
  const today = dhakaToday();
  const startOfToday = new Date(`${today}T00:00:00+06:00`).toISOString();
  const { data: due } = await admin
    .from('kb_articles')
    .select('id, slug, title_en, review_date, owner_id, staff_profiles(notify_email, active)')
    .eq('published', true)
    .lte('review_date', today);

  let sent = 0;
  let skipped = 0;
  for (const article of due ?? []) {
    const owner = article.staff_profiles;
    if (!owner?.active || !owner.notify_email) {
      skipped++;
      continue;
    }
    // At most once per article per day.
    const { count } = await admin
      .from('notifications')
      .select('id', { head: true, count: 'exact' })
      .eq('type', 'kb_review_due')
      .eq('ref_id', article.id)
      .gte('created_at', startOfToday);
    if ((count ?? 0) > 0) {
      skipped++;
      continue;
    }
    const ok = await sendKbReviewDue({
      id: article.id,
      slug: article.slug,
      title_en: article.title_en,
      review_date: article.review_date,
      ownerId: article.owner_id,
      ownerEmail: owner.notify_email,
      today,
    });
    if (ok) sent++;
    else skipped++;
  }

  return NextResponse.json({ ok: true, date: today, reviewsDue: due?.length ?? 0, sent, skipped });
}
