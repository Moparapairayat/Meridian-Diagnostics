import { Badge, type Tone } from '@/components/ui/primitives';
import { ORDER_STATUSES, STATUS_LABELS, isOrderStatus, type OrderStatus } from '@/lib/orders';

// Text label always present; colour and the dot are secondary cues (WCAG 1.4.1).
const TONE: Record<OrderStatus, Tone> = {
  registered: 'neutral',
  collected: 'info',
  in_lab: 'warning',
  resulted: 'clay',
  released: 'success',
  downloaded: 'primary',
};

export function StatusBadge({ status }: { status: string }) {
  const known = isOrderStatus(status);
  return (
    <Badge tone={known ? TONE[status] : 'neutral'} dot srLabel="Status:">
      {known ? STATUS_LABELS[status] : status}
    </Badge>
  );
}

export function BranchBadge({ name, code }: { name: string; code: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-2">
      <span className="sr-only">Branch: </span>
      {name}
      <span className="font-normal text-ink-muted">{code}</span>
    </span>
  );
}

/** Six-step progress of an order (SPEC 5.1), readable by screen readers. */
export function StatusStepper({ status, retest = 0 }: { status: string; retest?: number }) {
  const current = isOrderStatus(status) ? ORDER_STATUSES.indexOf(status) : -1;
  return (
    <ol aria-label={`Order progress: ${isOrderStatus(status) ? STATUS_LABELS[status] : status}`} className="flex w-full items-center">
      {ORDER_STATUSES.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={s} className="flex flex-1 items-center last:flex-none" aria-current={now ? 'step' : undefined}>
            <span className="flex flex-col items-center gap-1.5">
              <span
                className={`grid size-3.5 place-items-center rounded-full ring-2 ${
                  done ? 'bg-primary ring-primary' : now ? 'bg-surface ring-primary' : 'bg-surface ring-line-strong'
                }`}
              >
                {now && <span className="size-1.5 rounded-full bg-primary" />}
              </span>
              <span className={`hidden text-[0.68rem] font-medium whitespace-nowrap sm:block ${now ? 'text-ink' : 'text-ink-muted'}`}>
                {STATUS_LABELS[s]}
                {s === 'in_lab' && retest > 0 && ` ×${retest + 1}`}
              </span>
              <span className="sr-only">{done ? '(done)' : now ? '(current)' : '(to do)'}</span>
            </span>
            {i < ORDER_STATUSES.length - 1 && (
              <span aria-hidden="true" className={`mx-1 mb-0 h-0.5 flex-1 rounded sm:mb-5 ${i < current ? 'bg-primary' : 'bg-line-strong'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
