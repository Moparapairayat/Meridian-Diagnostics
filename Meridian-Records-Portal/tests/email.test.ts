import { render, toPlainText } from '@react-email/components';
import { describe, expect, it } from 'vitest';
import { TESTS } from '../scripts/lib/demo-data';
import { maskPatientCode } from '@/lib/format';
import { OtpCodeEmail, PortalLoginAlertEmail, RegistrationConfirmationEmail, ReportReadyEmail } from '@/lib/email/templates/patient';
import { KbReviewDueEmail, OtpLockoutAlertEmail, RetestRequestedEmail } from '@/lib/email/templates/staff';

const PORTAL = 'https://portal.example.test/portal';
const testNames = TESTS.flatMap((t) => [t.name, t.code]);
const analyteNames = TESTS.flatMap((t) => t.analytes.map((a) => a.analyte));
const units = [...new Set(TESTS.flatMap((t) => t.analytes.map((a) => a.unit)))].filter((u) => u.length > 1);

describe('report_ready email (SPEC 9 golden rule)', () => {
  for (const lang of ['en', 'bn'] as const) {
    it(`contains no test names, analytes, units or values (${lang})`, async () => {
      const html = await render(ReportReadyEmail({ portalUrl: PORTAL, lang }));
      const text = toPlainText(html);
      for (const name of [...testNames, ...analyteNames]) {
        expect(text.toLowerCase()).not.toContain(name.toLowerCase());
      }
      for (const unit of units) expect(text).not.toContain(unit);
      // No numbers other than those in the portal link: values cannot appear.
      expect(text.replace(PORTAL, '')).not.toMatch(/\d/);
      expect(html).toContain(PORTAL);
      expect(html).not.toMatch(/attachment/i);
    });
  }

  it('is written in the patient’s language', async () => {
    expect(toPlainText(await render(ReportReadyEmail({ portalUrl: PORTAL, lang: 'bn' })))).toContain('রিপোর্ট প্রস্তুত');
    expect(toPlainText(await render(ReportReadyEmail({ portalUrl: PORTAL, lang: 'en' })))).toContain('A report is ready');
  });
});

describe('otp_code email', () => {
  for (const lang of ['en', 'bn'] as const) {
    it(`contains the code exactly once, the 5-minute expiry and "ignore if not you" (${lang})`, async () => {
      const html = await render(OtpCodeEmail({ code: '470193', lang }));
      expect(html.split('470193').length - 1).toBe(1);
      const text = toPlainText(html);
      expect(text).toMatch(lang === 'en' ? /5 minutes/ : /৫ মিনিট/);
      expect(text).toMatch(lang === 'en' ? /did not ask for this code/ : /উপেক্ষা করুন/);
    });
  }
});

describe('other emails stay within SPEC 9', () => {
  it('registration: Patient ID, branch and portal link, no tests', async () => {
    const text = toPlainText(await render(RegistrationConfirmationEmail({ patientCode: 'MD-2026-00012', branchName: 'North', portalUrl: PORTAL, lang: 'en' })));
    expect(text).toContain('MD-2026-00012');
    expect(text).toContain('North');
    for (const name of testNames) expect(text).not.toContain(name);
  });

  it('login alert and staff emails carry no results', async () => {
    const texts = await Promise.all([
      render(PortalLoginAlertEmail({ when: '12 Nov 2026, 10:15', lang: 'bn' })),
      render(RetestRequestedEmail({ orderNo: 'ORD-2026-000045', staffUrl: 'https://x.test/staff/lab' })),
      render(KbReviewDueEmail({ title: 'Sample labelling SOP', reviewDate: '1 Nov 2026', editUrl: 'https://x.test/edit' })),
      render(OtpLockoutAlertEmail({ maskedPatientCode: maskPatientCode('MD-2026-00123'), when: '12 Nov 2026, 10:15' })),
    ]).then((h) => h.map((x) => toPlainText(x)));
    for (const text of texts) {
      for (const name of analyteNames) expect(text).not.toContain(name);
      expect(text).toMatch(/DEMO|ডেমো/);
    }
    expect(texts[3]).toContain('MD-2026-***23');
    expect(texts[3]).not.toContain('MD-2026-00123');
  });
});
