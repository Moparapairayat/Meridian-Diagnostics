// Pure order-status rules: a TypeScript mirror of the database trigger (SPEC 5.1).
import type { StaffRole } from './auth/roles';

export const ORDER_STATUSES = ['registered', 'collected', 'in_lab', 'resulted', 'released', 'downloaded'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  registered: 'Registered',
  collected: 'Collected',
  in_lab: 'In lab',
  resulted: 'Resulted',
  released: 'Released',
  downloaded: 'Downloaded',
};

/** Allowed transitions and who may make them ('system' = trusted server). */
export const TRANSITIONS: readonly { from: OrderStatus; to: OrderStatus; by: StaffRole | 'system' }[] = [
  { from: 'registered', to: 'collected', by: 'sample_collector' },
  { from: 'collected', to: 'in_lab', by: 'sample_collector' },
  { from: 'in_lab', to: 'resulted', by: 'lab_technician' },
  { from: 'resulted', to: 'released', by: 'pathologist' },
  { from: 'resulted', to: 'in_lab', by: 'pathologist' },
  { from: 'released', to: 'downloaded', by: 'system' },
];

export function canTransition(from: OrderStatus, to: OrderStatus, by: StaffRole | 'system'): boolean {
  return TRANSITIONS.some((t) => t.from === from && t.to === to && t.by === by);
}
