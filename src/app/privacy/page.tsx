import type { Metadata } from 'next';
import { PlaceholderPage } from '@/components/PlaceholderPage';

export const metadata: Metadata = { title: 'Privacy notice' };

export default function Page() {
  return <PlaceholderPage titleKey="privacy.title" />;
}
