import 'server-only';
import { appUrl } from '@/lib/app-url';
import { formatDhakaDate, formatDhakaDateTime, maskPatientCode } from '@/lib/format';
import { normaliseLang } from '@/lib/i18n';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from './send';
import { PATIENT_SUBJECTS, PortalLoginAlertEmail, RegistrationConfirmationEmail, ReportReadyEmail } from './templates/patient';
import { KbReviewDueEmail, OtpLockoutAlertEmail, RetestRequestedEmail, STAFF_SUBJECTS } from './templates/staff';

// One function per event (SPEC 9). Each picks recipients, checks email +
// opt-in for patients, chooses the language and never throws. Callers run
// these after the response with `after()` (except the OTP code itself).

async function patientContact(patientId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('patients')
    .select('id, patient_code, email, email_opt_in, language, branches(name)')
    .eq('id', patientId)
    .maybeSingle();
  if (!data?.email || !data.email_opt_in) return null;
  return { ...data, email: data.email, lang: normaliseLang(data.language) };
}

async function staffEmails(role: 'lab_technician' | 'manager') {
  const admin = createAdminClient();
  const { data } = await admin.from('staff_profiles').select('user_id, notify_email').eq('role', role).eq('active', true);
  return (data ?? []).filter((s): s is { user_id: string; notify_email: string } => !!s.notify_email);
}

function safely(label: string, fn: () => Promise<void>): Promise<void> {
  return fn().catch(() => console.warn('notify failed', label));
}

export function notifyRegistration(patientId: string): Promise<void> {
  return safely('registration_confirmation', async () => {
    const p = await patientContact(patientId);
    if (!p) return;
    await sendEmail({
      type: 'registration_confirmation',
      to: p.email,
      subject: PATIENT_SUBJECTS.registration_confirmation[p.lang],
      react: RegistrationConfirmationEmail({
        patientCode: p.patient_code,
        branchName: p.branches?.name ?? '',
        portalUrl: `${appUrl()}/portal`,
        lang: p.lang,
      }),
      patientId: p.id,
      idempotencyKey: `registration/${p.id}`,
    });
  });
}

/** Release or amendment: "a report is ready", portal link only. */
export function notifyReportReady(orderId: string, reportVersion = 1): Promise<void> {
  return safely('report_ready', async () => {
    const admin = createAdminClient();
    const { data: order } = await admin.from('orders').select('patient_id').eq('id', orderId).maybeSingle();
    if (!order) return;
    const p = await patientContact(order.patient_id);
    if (!p) return;
    await sendEmail({
      type: 'report_ready',
      to: p.email,
      subject: PATIENT_SUBJECTS.report_ready[p.lang],
      react: ReportReadyEmail({ portalUrl: `${appUrl()}/portal`, lang: p.lang }),
      patientId: p.id,
      refId: orderId,
      idempotencyKey: `report-ready/${orderId}/v${reportVersion}`,
    });
  });
}

export function notifyPortalLogin(patientId: string): Promise<void> {
  return safely('portal_login_alert', async () => {
    const p = await patientContact(patientId);
    if (!p) return;
    await sendEmail({
      type: 'portal_login_alert',
      to: p.email,
      subject: PATIENT_SUBJECTS.portal_login_alert[p.lang],
      react: PortalLoginAlertEmail({ when: formatDhakaDateTime(new Date()), lang: p.lang }),
      patientId: p.id,
    });
  });
}

/** To every active lab technician's notify_email: order number + staff link only. */
export function notifyRetestRequested(orderId: string): Promise<void> {
  return safely('retest_requested', async () => {
    const admin = createAdminClient();
    const { data: order } = await admin.from('orders').select('order_no, retest_count').eq('id', orderId).maybeSingle();
    if (!order) return;
    for (const tech of await staffEmails('lab_technician')) {
      await sendEmail({
        type: 'retest_requested',
        to: tech.notify_email,
        subject: STAFF_SUBJECTS.retest_requested(order.order_no),
        react: RetestRequestedEmail({ orderNo: order.order_no, staffUrl: `${appUrl()}/staff/lab?order=${orderId}` }),
        staffUserId: tech.user_id,
        refId: orderId,
        idempotencyKey: `retest/${orderId}/${order.retest_count}/${tech.user_id}`,
      });
    }
  });
}

/** To every active manager: masked patient code + time. */
export function notifyLockout(patientId: string): Promise<void> {
  return safely('otp_lockout_alert', async () => {
    const admin = createAdminClient();
    const { data: patient } = await admin.from('patients').select('patient_code').eq('id', patientId).maybeSingle();
    if (!patient) return;
    const when = formatDhakaDateTime(new Date());
    for (const manager of await staffEmails('manager')) {
      await sendEmail({
        type: 'otp_lockout_alert',
        to: manager.notify_email,
        subject: STAFF_SUBJECTS.otp_lockout_alert,
        react: OtpLockoutAlertEmail({ maskedPatientCode: maskPatientCode(patient.patient_code), when }),
        staffUserId: manager.user_id,
        refId: patientId,
      });
    }
  });
}

/** Daily cron: owner of an overdue Knowledge Hub article. */
export async function sendKbReviewDue(article: {
  id: string;
  slug: string;
  title_en: string;
  review_date: string;
  ownerId: string;
  ownerEmail: string;
  today: string;
}): Promise<boolean> {
  const { ok } = await sendEmail({
    type: 'kb_review_due',
    to: article.ownerEmail,
    subject: STAFF_SUBJECTS.kb_review_due(article.title_en),
    react: KbReviewDueEmail({
      title: article.title_en,
      reviewDate: formatDhakaDate(`${article.review_date}T00:00:00+06:00`),
      editUrl: `${appUrl()}/staff/knowledge/${article.slug}/edit`,
    }),
    staffUserId: article.ownerId,
    refId: article.id,
    idempotencyKey: `kb-review/${article.id}/${article.today}`,
  });
  return ok;
}
