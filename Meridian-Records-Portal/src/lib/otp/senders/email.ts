import type { OtpSender, SendResult } from './types';

/**
 * Email OTP via Resend. Implemented in Phase 7 (otp_code template, sent
 * synchronously so a failure can be shown). Until then it reports "not
 * delivered" and the OTP service falls back to Demo SMS.
 */
export class EmailOtpSender implements OtpSender {
  readonly channel = 'email' as const;

  async send(): Promise<SendResult> {
    // TODO(phase 7): send the `otp_code` email with Resend.
    return { delivered: false };
  }
}
