'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChartColumn,
  FlaskConical,
  House,
  LogOut,
  Menu,
  ScrollText,
  Search,
  Stethoscope,
  TestTubeDiagonal,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import type { NavItem } from '@/lib/auth/roles';

const ICONS: Record<string, LucideIcon> = {
  '/staff': House,
  '/staff/register': UserPlus,
  '/staff/search': Search,
  '/staff/collection': TestTubeDiagonal,
  '/staff/lab': FlaskConical,
  '/staff/review': Stethoscope,
  '/staff/knowledge': BookOpen,
  '/staff/dashboard': ChartColumn,
  '/staff/audit': ScrollText,
};

export interface ShellUser {
  fullName: string;
  roleLabel: string;
  branchName: string;
  branchCode: string;
}

function initialsOf(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function NavList({ items, onNavigate }: { items: readonly NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const all = [{ href: '/staff', label: 'Home', description: '' }, ...items];
  const isActive = (href: string) => (href === '/staff' ? pathname === '/staff' : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <ul className="space-y-0.5">
      {all.map((item) => {
        const Icon = ICONS[item.href] ?? House;
        const active = isActive(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`group flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.95rem] font-medium transition-colors ${
                active ? 'bg-surface text-ink shadow-xs ring-1 ring-line' : 'text-ink-2 hover:bg-[#ece7df] hover:text-ink'
              }`}
            >
              <Icon aria-hidden="true" className={`size-[1.15rem] shrink-0 ${active ? 'text-primary' : 'text-ink-muted group-hover:text-ink-2'}`} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserCard({ user }: { user: ShellUser }) {
  return (
    <div className="rounded-[12px] border border-line bg-surface p-3 shadow-xs">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary-ink">
          {initialsOf(user.fullName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
          <p className="truncate text-xs text-ink-muted">
            {user.roleLabel} · <span className="sr-only">Branch: </span>
            {user.branchName} ({user.branchCode})
          </p>
        </div>
      </div>
      <form action="/auth/signout" method="post" className="mt-3">
        <button
          type="submit"
          className="flex min-h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-line-strong text-sm font-semibold text-ink-2 transition-colors hover:border-ink-muted hover:bg-canvas hover:text-ink"
        >
          <LogOut aria-hidden="true" className="size-4" />
          Sign out
        </button>
      </form>
    </div>
  );
}

/**
 * Staff navigation: a calm sidebar on large screens and a slide-over drawer on
 * phones. Shows only the role's screens (SPEC 11).
 */
export function StaffShell({ items, user }: { items: readonly NavItem[]; user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const trigger = menuButton.current;
    panel.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab' && panel.current) {
        const focusable = [...panel.current.querySelectorAll<HTMLElement>('a, button')];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      (previous ?? trigger)?.focus();
    };
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[17rem] shrink-0 flex-col border-r border-line bg-[#f4f1ec] px-4 py-5 lg:flex print:hidden">
        <Link href="/staff" className="mb-7 rounded-lg px-2">
          <Logo subtitle="Records Portal" />
        </Link>
        <p className="mb-2 px-3 text-[0.7rem] font-semibold tracking-widest text-ink-muted uppercase">Workspace</p>
        <nav aria-label="Staff" className="flex-1 overflow-y-auto">
          <NavList items={items} />
        </nav>
        <UserCard user={user} />
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-line bg-surface/90 px-4 py-2.5 backdrop-blur lg:hidden print:hidden">
        <Link href="/staff" className="rounded-lg">
          <Logo />
        </Link>
        <button
          ref={menuButton}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="staff-drawer"
          className="flex min-h-11 items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-sm font-semibold text-ink"
        >
          <Menu aria-hidden="true" className="size-5" />
          Menu
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Staff menu" id="staff-drawer">
          <button type="button" aria-label="Close menu" tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]" />
          <div ref={panel} className="relative flex h-full w-[85%] max-w-xs animate-slide-in flex-col bg-[#f4f1ec] px-4 py-5 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <Logo subtitle="Records Portal" />
              <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-md text-ink-2 hover:bg-sunken" aria-label="Close menu">
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <nav aria-label="Staff" className="flex-1 overflow-y-auto">
              <NavList items={items} onNavigate={() => setOpen(false)} />
            </nav>
            <UserCard user={user} />
          </div>
        </div>
      )}
    </>
  );
}
