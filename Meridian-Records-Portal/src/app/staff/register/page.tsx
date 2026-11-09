import type { Metadata } from 'next';
import { OrderConfirmation } from '@/components/staff/OrderConfirmation';
import { requireRole } from '@/lib/auth/staff';
import { UUID_RE } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = { title: 'Register patient' };

export default async function RegisterPage({ searchParams }: PageProps<'/staff/register'>) {
  const staff = await requireRole('receptionist');
  const { done } = await searchParams;

  if (typeof done === 'string' && UUID_RE.test(done)) {
    return <OrderConfirmation orderId={done} againHref="/staff/register" againLabel="Register another" />;
  }

  const supabase = await createClient();
  const { data: tests } = await supabase
    .from('test_catalog')
    .select('code, name, specimen, price_bdt')
    .eq('active', true)
    .order('name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Register patient</h1>
        <p className="mt-1 text-ink-muted">
          Search first: returning patients get a New order on their record. Registering at {staff.branchName} branch.
        </p>
      </div>
      <RegisterForm tests={tests ?? []} />
    </div>
  );
}
