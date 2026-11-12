import { Body, Container, Head, Hr, Html, Preview, Section, Text } from '@react-email/components';
import type { ReactNode } from 'react';

// Shared, simple, accessible email layout with the "Demo" label (SPEC 9).
// Patient emails are in one language (patients.language); staff emails are English.

const styles = {
  body: { backgroundColor: '#f5f8fa', fontFamily: 'Arial, Helvetica, sans-serif', color: '#0f2a3a', margin: 0, padding: '24px 0' },
  container: { backgroundColor: '#ffffff', maxWidth: '560px', margin: '0 auto', padding: '24px', borderRadius: '8px' },
  demo: { backgroundColor: '#fef3c7', color: '#78350f', fontSize: '13px', fontWeight: 700, padding: '6px 10px', borderRadius: '4px', margin: '0 0 16px' },
  brand: { color: '#0b6e74', fontSize: '18px', fontWeight: 700, margin: '0 0 12px' },
  footer: { color: '#475569', fontSize: '12px', lineHeight: '18px', margin: 0 },
};

export const text = { fontSize: '16px', lineHeight: '24px', margin: '0 0 14px' } as const;
export const button = {
  backgroundColor: '#0b6e74',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 700,
  padding: '12px 20px',
  borderRadius: '6px',
  textDecoration: 'none',
  display: 'inline-block',
} as const;

export function Layout({
  lang,
  preview,
  demoLabel,
  footer,
  children,
}: {
  lang: 'en' | 'bn';
  preview: string;
  demoLabel: string;
  footer: string;
  children: ReactNode;
}) {
  return (
    <Html lang={lang}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.demo}>{demoLabel}</Text>
          <Text style={styles.brand}>{lang === 'bn' ? 'মেরিডিয়ান ডায়াগনস্টিকস (ডেমো)' : 'Meridian Diagnostics (Demo)'}</Text>
          <Section>{children}</Section>
          <Hr style={{ borderColor: '#c4d0da', margin: '24px 0 12px' }} />
          <Text style={styles.footer}>{footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export const DEMO_LABEL = {
  en: 'DEMO – synthetic data only',
  bn: 'ডেমো – শুধুমাত্র কৃত্রিম ডেটা',
} as const;

export const PATIENT_FOOTER = {
  en: 'This is an automated message from a demo system. It never contains test results. Reports are only available in the secure patient portal.',
  bn: 'এটি একটি ডেমো সিস্টেমের স্বয়ংক্রিয় বার্তা। এতে কখনো পরীক্ষার ফলাফল থাকে না। রিপোর্ট শুধু নিরাপদ পেশেন্ট পোর্টালে পাওয়া যায়।',
} as const;

export const STAFF_FOOTER = 'Meridian Records Portal (demo, synthetic data). Do not forward patient information by email or WhatsApp.';
