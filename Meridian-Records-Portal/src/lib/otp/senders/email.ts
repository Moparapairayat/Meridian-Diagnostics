import 'server-only';
import { sendEmail } from '@/lib/email/send';
import { OtpCodeEmail, PATIENT_SUBJECTS } from '@/lib/email/templates/patient';
import type { Lang } from '@/lib/i18n';
import type { OtpSender, SendContext, SendResult } from './types';

/**
 * Email OTP via Resend (SPEC 8.1, 9). Sent synchronously so a failure is known
 * at once; the OTP service then falls back to Demo SMS. `sendEmail` records
 * the notifications row (masked address, no code).
 */
export class EmailOtpSender implements OtpSender {
  readonly channel = 'email' as const;

  async send(to: string, code: string, lang: Lang, ctx?: SendContext): Promise<SendResult> {
    const { ok } = await sendEmail({
      type: 'otp_code',
      to,
      subject: PATIENT_SUBJECTS.otp_code[lang],
      react: OtpCodeEmail({ code, lang }),
      patientId: ctx?.patientId ?? null,
    });
    return { delivered: ok };
  }
}
