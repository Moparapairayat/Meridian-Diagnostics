import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter, Noto_Sans_Bengali, Noto_Serif_Bengali } from 'next/font/google';
import { t } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const notoBengali = Noto_Sans_Bengali({
  variable: '--font-noto-bengali',
  subsets: ['bengali'],
  display: 'swap',
});

// Display serif for headings (English) and its Bengali counterpart.
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  display: 'swap',
  axes: ['opsz', 'SOFT'],
});

const notoSerifBengali = Noto_Serif_Bengali({
  variable: '--font-noto-serif-bengali',
  subsets: ['bengali'],
  weight: ['500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Meridian Records Portal',
    template: '%s · Meridian Records Portal',
  },
  description: 'Academic prototype for a fictional diagnostic chain. Demo with synthetic data only.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#faf8f5',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const lang = await getLang();

  return (
    <html lang={lang} className={`${inter.variable} ${notoBengali.variable} ${fraunces.variable} ${notoSerifBengali.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-60 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-3 focus:font-semibold focus:text-primary focus:shadow-lg"
        >
          {t(lang, 'a11y.skipToContent')}
        </a>
        {children}
      </body>
    </html>
  );
}
