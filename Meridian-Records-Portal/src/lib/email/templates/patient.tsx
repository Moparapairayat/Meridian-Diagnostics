import { Button, Text } from '@react-email/components';
import { DEMO_LABEL, Layout, PATIENT_FOOTER, button, text } from './Layout';

// Patient emails (SPEC 9). Golden rule: no health information, ever.
// No test names, results, diagnoses or attachments; only a pointer to the portal.

type Lang = 'en' | 'bn';

export const PATIENT_SUBJECTS = {
  otp_code: { en: 'Your Meridian portal code', bn: 'আপনার মেরিডিয়ান পোর্টাল কোড' },
  registration_confirmation: { en: 'Welcome to Meridian Diagnostics', bn: 'মেরিডিয়ান ডায়াগনস্টিকসে স্বাগতম' },
  report_ready: { en: 'Your report is ready in the patient portal', bn: 'আপনার রিপোর্ট পেশেন্ট পোর্টালে প্রস্তুত' },
  portal_login_alert: { en: 'New login to your patient portal', bn: 'আপনার পেশেন্ট পোর্টালে নতুন লগইন' },
} as const;

export function OtpCodeEmail({ code, lang }: { code: string; lang: Lang }) {
  const bn = lang === 'bn';
  return (
    <Layout
      lang={lang}
      preview={bn ? 'আপনার এককালীন কোড' : 'Your one-time code'}
      demoLabel={DEMO_LABEL[lang]}
      footer={PATIENT_FOOTER[lang]}
    >
      <Text style={text}>{bn ? 'পেশেন্ট পোর্টালে লগইনের জন্য আপনার কোড:' : 'Your code to log in to the patient portal:'}</Text>
      <Text style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '8px', fontFamily: 'Courier New, monospace', margin: '0 0 14px' }}>{code}</Text>
      <Text style={text}>
        {bn ? 'কোডটি ৫ মিনিট কাজ করবে এবং একবারই ব্যবহার করা যাবে।' : 'The code works for 5 minutes and can be used once.'}
      </Text>
      <Text style={text}>
        {bn
          ? 'আপনি এই কোড না চেয়ে থাকলে এই ইমেইলটি উপেক্ষা করুন। কাউকে কোডটি জানাবেন না।'
          : 'If you did not ask for this code, ignore this email. Never share the code with anyone.'}
      </Text>
    </Layout>
  );
}

export function RegistrationConfirmationEmail({
  patientCode,
  branchName,
  portalUrl,
  lang,
}: {
  patientCode: string;
  branchName: string;
  portalUrl: string;
  lang: Lang;
}) {
  const bn = lang === 'bn';
  return (
    <Layout
      lang={lang}
      preview={bn ? 'আপনার রেজিস্ট্রেশন সম্পন্ন হয়েছে' : 'Your registration is complete'}
      demoLabel={DEMO_LABEL[lang]}
      footer={PATIENT_FOOTER[lang]}
    >
      <Text style={text}>
        {bn ? `${branchName} শাখায় আপনার রেজিস্ট্রেশন সম্পন্ন হয়েছে।` : `You are now registered at our ${branchName} branch.`}
      </Text>
      <Text style={text}>
        {bn ? 'আপনার পেশেন্ট আইডি:' : 'Your Patient ID:'} <strong>{patientCode}</strong>
      </Text>
      <Text style={text}>
        {bn
          ? 'রিপোর্ট প্রস্তুত হলে আপনি পেশেন্ট আইডি ও মোবাইল নম্বর দিয়ে পোর্টাল থেকে ডাউনলোড করতে পারবেন।'
          : 'When your report is ready you can download it from the portal with your Patient ID and mobile number.'}
      </Text>
      <Button href={portalUrl} style={button}>
        {bn ? 'পেশেন্ট পোর্টাল খুলুন' : 'Open the patient portal'}
      </Button>
    </Layout>
  );
}

/** Deliberately says nothing about which tests or what they show. */
export function ReportReadyEmail({ portalUrl, lang }: { portalUrl: string; lang: Lang }) {
  const bn = lang === 'bn';
  return (
    <Layout
      lang={lang}
      preview={bn ? 'একটি রিপোর্ট প্রস্তুত' : 'A report is ready'}
      demoLabel={DEMO_LABEL[lang]}
      footer={PATIENT_FOOTER[lang]}
    >
      <Text style={text}>{bn ? 'আপনার একটি রিপোর্ট প্রস্তুত।' : 'A report is ready for you.'}</Text>
      <Text style={text}>
        {bn
          ? 'নিরাপত্তার জন্য রিপোর্ট ইমেইলে পাঠানো হয় না। পোর্টালে আপনার পেশেন্ট আইডি ও মোবাইল নম্বর দিয়ে লগইন করে ডাউনলোড করুন।'
          : 'For your privacy, reports are never sent by email. Log in to the portal with your Patient ID and mobile number to download it.'}
      </Text>
      <Button href={portalUrl} style={button}>
        {bn ? 'পোর্টালে লগইন করুন' : 'Log in to the portal'}
      </Button>
    </Layout>
  );
}

export function PortalLoginAlertEmail({ when, lang }: { when: string; lang: Lang }) {
  const bn = lang === 'bn';
  return (
    <Layout
      lang={lang}
      preview={bn ? 'পোর্টালে নতুন লগইন' : 'New portal login'}
      demoLabel={DEMO_LABEL[lang]}
      footer={PATIENT_FOOTER[lang]}
    >
      <Text style={text}>
        {bn ? `আপনার পেশেন্ট পোর্টালে লগইন করা হয়েছে: ${when} (ঢাকা সময়)।` : `Someone logged in to your patient portal on ${when} (Dhaka time).`}
      </Text>
      <Text style={text}>
        {bn
          ? 'এটি আপনি না হলে অনুগ্রহ করে আমাদের যেকোনো শাখায় যোগাযোগ করুন।'
          : 'If this was not you, please contact any of our branches.'}
      </Text>
    </Layout>
  );
}
