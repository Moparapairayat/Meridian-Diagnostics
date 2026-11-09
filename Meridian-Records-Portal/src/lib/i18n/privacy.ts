// Bilingual privacy notice content (SPEC 7.5). Fictional organisation.
import type { Lang } from './index';

interface Section {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

interface PrivacyContent {
  title: string;
  demoNotice: string;
  updated: string;
  sections: Section[];
}

export const PRIVACY_VERSION = '2026-11-v1';

export const PRIVACY: Record<Lang, PrivacyContent> = {
  en: {
    title: 'Privacy notice',
    demoNotice: 'This is a demo with synthetic data. Meridian Diagnostics is a fictional organisation and no real patient data is stored.',
    updated: `Version ${PRIVACY_VERSION}`,
    sections: [
      {
        heading: 'What data we hold and why',
        items: [
          'Your name, age, sex, mobile number, and email address if you give one: to identify you and contact you about your tests.',
          'The tests ordered, sample barcodes, results and signed reports: to provide diagnostic services.',
          'Your invoice: to record payment.',
          'A record of who opened or changed your file: to keep your data safe and to investigate problems.',
        ],
      },
      {
        heading: 'Who can see your data',
        items: [
          'Reception staff see your details and the status of your tests, but not your results.',
          'Sample collectors see what they need to label and collect samples.',
          'Laboratory technicians and pathologists see your results so they can check and sign them.',
          'Managers see summary figures and the access log, not individual results.',
          'You can download your own reports from the patient portal with a one-time code.',
        ],
      },
      {
        heading: 'Sharing',
        paragraphs: [
          'We do not share your data with any third party except the hosting providers that run this service: Supabase (database, Singapore region), Vercel (web hosting) and Resend (email delivery).',
          'Reports are never sent by WhatsApp or as email attachments. Emails only tell you that something is ready and point you to the secure portal.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: ['In this demo, all data is reset regularly. A real service would keep records only as long as health regulations require.'],
      },
      {
        heading: 'Your rights',
        items: [
          'Ask for a copy of the data we hold about you.',
          'Ask us to correct anything that is wrong.',
          'Withdraw consent to email notifications at any time.',
          'Complain to us, and to the data protection authority.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: ['Privacy officer, Meridian Diagnostics (fictional): privacy@meridian-demo.example'],
      },
    ],
  },
  bn: {
    title: 'গোপনীয়তা নোটিশ',
    demoNotice: 'এটি কৃত্রিম (সিনথেটিক) ডেটা দিয়ে তৈরি একটি ডেমো। মেরিডিয়ান ডায়াগনস্টিকস একটি কাল্পনিক প্রতিষ্ঠান, এখানে কোনো আসল রোগীর তথ্য রাখা হয় না।',
    updated: `সংস্করণ ${PRIVACY_VERSION}`,
    sections: [
      {
        heading: 'আমরা কী তথ্য রাখি এবং কেন',
        items: [
          'আপনার নাম, বয়স, লিঙ্গ, মোবাইল নম্বর এবং দিলে ইমেইল ঠিকানা: আপনাকে শনাক্ত করতে ও পরীক্ষা সম্পর্কে যোগাযোগ করতে।',
          'যে পরীক্ষাগুলো দেওয়া হয়েছে, নমুনার বারকোড, ফলাফল ও স্বাক্ষরিত রিপোর্ট: ডায়াগনস্টিক সেবা দিতে।',
          'আপনার ইনভয়েস: পেমেন্টের হিসাব রাখতে।',
          'কে আপনার ফাইল খুলেছে বা বদলেছে তার রেকর্ড: আপনার তথ্য নিরাপদ রাখতে ও সমস্যা হলে খতিয়ে দেখতে।',
        ],
      },
      {
        heading: 'কারা আপনার তথ্য দেখতে পারে',
        items: [
          'রিসেপশন স্টাফ আপনার তথ্য ও পরীক্ষার অবস্থা দেখেন, কিন্তু ফলাফল দেখেন না।',
          'নমুনা সংগ্রহকারীরা শুধু লেবেল ও নমুনা সংগ্রহের জন্য যা দরকার তা দেখেন।',
          'ল্যাবরেটরি টেকনিশিয়ান ও প্যাথলজিস্টরা ফলাফল যাচাই ও স্বাক্ষরের জন্য তা দেখেন।',
          'ম্যানেজাররা সারসংক্ষেপ পরিসংখ্যান ও অ্যাক্সেস লগ দেখেন, কারো আলাদা ফলাফল নয়।',
          'আপনি নিজে এককালীন কোড দিয়ে পেশেন্ট পোর্টাল থেকে আপনার রিপোর্ট ডাউনলোড করতে পারেন।',
        ],
      },
      {
        heading: 'তথ্য শেয়ার করা',
        paragraphs: [
          'এই সেবা চালানোর হোস্টিং প্রতিষ্ঠান ছাড়া আমরা কোনো তৃতীয় পক্ষের সাথে আপনার তথ্য শেয়ার করি না: Supabase (ডেটাবেস, সিঙ্গাপুর অঞ্চল), Vercel (ওয়েব হোস্টিং) এবং Resend (ইমেইল পাঠানো)।',
          'রিপোর্ট কখনো হোয়াটসঅ্যাপে বা ইমেইলের সংযুক্তি হিসেবে পাঠানো হয় না। ইমেইলে শুধু জানানো হয় যে কিছু প্রস্তুত, এবং নিরাপদ পোর্টালের লিংক দেওয়া থাকে।',
        ],
      },
      {
        heading: 'কতদিন রাখা হয়',
        paragraphs: ['এই ডেমোতে সব তথ্য নিয়মিত মুছে নতুন করে তৈরি করা হয়। আসল সেবায় স্বাস্থ্য বিধিমালা যতদিন বলে, শুধু ততদিন রেকর্ড রাখা হতো।'],
      },
      {
        heading: 'আপনার অধিকার',
        items: [
          'আপনার সম্পর্কে আমাদের কাছে থাকা তথ্যের একটি কপি চাইতে পারেন।',
          'কোনো ভুল থাকলে তা সংশোধন করতে বলতে পারেন।',
          'যেকোনো সময় ইমেইল নোটিফিকেশনের সম্মতি প্রত্যাহার করতে পারেন।',
          'আমাদের কাছে এবং তথ্য সুরক্ষা কর্তৃপক্ষের কাছে অভিযোগ করতে পারেন।',
        ],
      },
      {
        heading: 'যোগাযোগ',
        paragraphs: ['প্রাইভেসি অফিসার, মেরিডিয়ান ডায়াগনস্টিকস (কাল্পনিক): privacy@meridian-demo.example'],
      },
    ],
  },
};
