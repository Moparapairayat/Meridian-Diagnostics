import type { Metadata } from 'next';
import { PlaceholderPage } from '@/components/PlaceholderPage';

export const metadata: Metadata = { title: 'Patient portal' };

export default function Page() {
  return <PlaceholderPage titleKey="portal.title" />;
}
