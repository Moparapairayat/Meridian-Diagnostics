import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AuthCard } from '@/components/AuthCard';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      eyebrow="Account help"
      title="Reset your password"
      intro="Enter your work email and we will send you a secure link to choose a new password."
      footer={
        <Link href="/login" className="inline-flex min-h-6 items-center gap-1.5 font-medium text-ink-2 hover:text-ink">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
