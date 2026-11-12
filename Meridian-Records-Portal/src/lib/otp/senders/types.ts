// Provider pattern (SPEC 8.2): a real SMS gateway can be added later without
// touching the OTP logic.
import type { Lang } from '@/lib/i18n';

export type OtpChannel = 'sms_demo' | 'email';

export interface SendResult {
  delivered: boolean;
  /** Only the demo SMS sender sets this, and only in demo mode. */
  displayCode?: string;
  providerMessageId?: string;
}

export interface OtpSender {
  readonly channel: OtpChannel;
  send(to: string, code: string, lang: Lang): Promise<SendResult>;
}
