// Text message box. Meaning is carried by the text and a label, not colour only.
const STYLES = {
  error: 'border-danger bg-red-50 text-danger',
  info: 'border-primary bg-primary-soft text-ink',
  success: 'border-success bg-green-50 text-success',
} as const;

const LABELS = { error: 'Error:', info: 'Note:', success: 'Done:' } as const;

export function Notice({ tone, children }: { tone: keyof typeof STYLES; children: React.ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-md border-l-4 px-4 py-3 text-sm ${STYLES[tone]}`}>
      <span className="font-semibold">{LABELS[tone]}</span> {children}
    </div>
  );
}
