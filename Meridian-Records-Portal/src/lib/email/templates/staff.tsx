import { Button, Text } from '@react-email/components';
import { DEMO_LABEL, Layout, STAFF_FOOTER, button, text } from './Layout';

// Staff emails (SPEC 9), English. Identifiers and links only: no results.

export const STAFF_SUBJECTS = {
  retest_requested: (orderNo: string) => `Re-test requested: ${orderNo}`,
  kb_review_due: (title: string) => `Knowledge Hub review due: ${title}`,
  otp_lockout_alert: 'Patient portal account locked',
} as const;

export function RetestRequestedEmail({ orderNo, staffUrl }: { orderNo: string; staffUrl: string }) {
  return (
    <Layout lang="en" preview={`Re-test requested for ${orderNo}`} demoLabel={DEMO_LABEL.en} footer={STAFF_FOOTER}>
      <Text style={text}>
        The pathologist has requested a re-test for order <strong>{orderNo}</strong>. It is back on the lab worklist.
      </Text>
      <Button href={staffUrl} style={button}>
        Open the lab worklist
      </Button>
    </Layout>
  );
}

export function KbReviewDueEmail({ title, reviewDate, editUrl }: { title: string; reviewDate: string; editUrl: string }) {
  return (
    <Layout lang="en" preview={`Review due: ${title}`} demoLabel={DEMO_LABEL.en} footer={STAFF_FOOTER}>
      <Text style={text}>
        The Knowledge Hub article <strong>{title}</strong> you own was due for review on {reviewDate}.
      </Text>
      <Text style={text}>Please check it is still correct, then save it to set a new review date.</Text>
      <Button href={editUrl} style={button}>
        Review the article
      </Button>
    </Layout>
  );
}

export function OtpLockoutAlertEmail({ maskedPatientCode, when }: { maskedPatientCode: string; when: string }) {
  return (
    <Layout lang="en" preview="A patient portal account was locked" demoLabel={DEMO_LABEL.en} footer={STAFF_FOOTER}>
      <Text style={text}>
        Patient portal access for <strong>{maskedPatientCode}</strong> was locked for 15 minutes after 5 wrong codes, on {when} (Dhaka).
      </Text>
      <Text style={text}>No action is needed unless this keeps happening. Details are in the audit log.</Text>
    </Layout>
  );
}
