import { Alert } from './primitives';

// Back-compat wrapper: older screens use <Notice tone="error|info|success">.
const MAP = { error: 'danger', info: 'info', success: 'success' } as const;

export function Notice({ tone, children }: { tone: keyof typeof MAP; children: React.ReactNode }) {
  return <Alert tone={MAP[tone]}>{children}</Alert>;
}
