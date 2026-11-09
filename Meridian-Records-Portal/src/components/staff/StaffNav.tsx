'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/auth/roles';

/** Role-based navigation. Scrolls sideways on narrow screens. */
export function StaffNav({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Staff" className="border-b border-border bg-surface">
      <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 sm:px-4">
        <li>
          <Link
            href="/staff"
            aria-current={pathname === '/staff' ? 'page' : undefined}
            className={linkStyle(pathname === '/staff')}
          >
            Home
          </Link>
        </li>
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} className={linkStyle(isActive(item.href))}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function linkStyle(active: boolean): string {
  return `inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm font-semibold ${
    active ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'
  }`;
}
