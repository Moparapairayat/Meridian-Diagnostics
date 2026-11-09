import type { Metadata } from 'next';
import { PlaceholderPage } from '@/components/PlaceholderPage';

export const metadata: Metadata = { title: 'Staff login' };

export default function Page() {
  return <PlaceholderPage titleKey="login.title" />;
}
