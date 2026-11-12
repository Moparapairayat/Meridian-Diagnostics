import 'server-only';
import type { ReactElement } from 'react';
import { Resend } from 'resend';
import { maskEmail } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';

export type EmailType =
  | 'otp_code'
  | 'registration_confirmation'
  | 'report_ready'
  | 'portal_login_alert'
  | 'retest_requested'
  | 'kb_review_due'
  | 'otp_lockout_alert';

export interface SendEmailInput {
  type: EmailType;
  to: string;
  subject: string;
  react: ReactElement;
  patientId?: string | null;
  staffUserId?: string | null;
  /** e.g. the order or KB article; used to de-duplicate daily emails. */
  refId?: string | null;
  /** Resend idempotency key (<event>/<entity-id>), valid 24 h. */
  idempotencyKey?: string;
}

let client: Resend | null = null;
function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  client ??= new Resend(key);
  return client;
}

/**
 * Sends one email with Resend (SPEC 9). Never throws into the user flow.
 * Always writes a `notifications` row with a masked recipient and sent/failed.
 * Never logs or stores the body, the code or the full address.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean }> {
  const from = process.env.EMAIL_FROM;
  const api = resend();
  let ok = false;
  let providerId: string | null = null;
  let errorText: string | null = null;

  if (!api || !from) {
    errorText = 'email not configured';
  } else {
    try {
      const { data, error } = await api.emails.send(
        {
          from,
          to: input.to,
          subject: input.subject,
          react: input.react,
          tags: [{ name: 'type', value: input.type }],
        },
        input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
      );
      if (error) errorText = error.name.slice(0, 120);
      else {
        ok = true;
        providerId = data?.id ?? null;
      }
    } catch {
      errorText = 'network error';
    }
  }

  if (!ok) console.warn('email not sent', input.type, errorText);

  const admin = createAdminClient();
  const { error: logError } = await admin.from('notifications').insert({
    type: input.type,
    channel: 'email',
    recipient_masked: maskEmail(input.to),
    patient_id: input.patientId ?? null,
    staff_user_id: input.staffUserId ?? null,
    ref_id: input.refId ?? null,
    status: ok ? 'sent' : 'failed',
    provider_message_id: providerId,
    error: errorText,
  });
  if (logError) console.warn('notifications insert failed', logError.code);

  return { ok };
}

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}
