import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/AuthCard';
import { linkClass } from '@/components/ui/styles';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Reset your password" intro="Enter your work email and we will send you a link to choose a new password.">
      <div className="space-y-5">
        <ForgotPasswordForm />
        <p className="text-sm">
          <Link href="/login" className={linkClass}>
            Back to staff login
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
