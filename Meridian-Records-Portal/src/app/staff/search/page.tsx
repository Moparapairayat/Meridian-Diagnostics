import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth/staff';
import { SearchClient } from './SearchClient';

export const metadata: Metadata = { title: 'Search patients' };

export default async function SearchPage() {
  const staff = await requireStaff();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Search patients</h1>
        <p className="mt-1 text-ink-muted">One record per patient, visible from every branch.</p>
      </div>
      <SearchClient canRegister={staff.role === 'receptionist'} />
    </div>
  );
}
