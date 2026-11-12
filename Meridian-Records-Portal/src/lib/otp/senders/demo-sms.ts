import type { OtpSender, SendResult } from './types';

/**
 * Demo SMS (SPEC 8.1 step 3): no message is sent. In demo mode the code is
 * returned so the page can show it in a clearly labelled "Demo SMS" box.
 * With demo mode off, the SMS channel is disabled.
 */
export class DemoSmsSender implements OtpSender {
  readonly channel = 'sms_demo' as const;

  async send(_to: string, code: string): Promise<SendResult> {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return { delivered: false };
    return { delivered: true, displayCode: code };
  }
}
