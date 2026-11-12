'use client';

import { useState } from 'react';
import { formatBdt } from '@/lib/format';

export interface CatalogTest {
  code: string;
  name: string;
  specimen: string;
  price_bdt: number;
}

/** Multi-select of tests with prices and a live total. Posts `tests` values. */
export function TestPicker({
  tests,
  defaultSelected = [],
  error,
}: {
  tests: CatalogTest[];
  defaultSelected?: string[];
  error?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(defaultSelected));
  const total = tests.filter((t) => selected.has(t.code)).reduce((sum, t) => sum + t.price_bdt, 0);

  const toggle = (code: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  return (
    <fieldset aria-describedby={error ? 'tests-error' : undefined}>
      <legend className="text-sm font-semibold text-ink">Tests</legend>
      {error && (
        <p id="tests-error" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {tests.map((t) => (
          <li key={t.code}>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border bg-surface px-3 py-2 has-checked:border-primary has-checked:bg-primary-soft">
              <input
                type="checkbox"
                name="tests"
                value={t.code}
                checked={selected.has(t.code)}
                onChange={() => toggle(t.code)}
                className="mt-1 size-5 accent-primary"
              />
              <span className="flex-1">
                <span className="block font-medium text-ink">{t.name}</span>
                <span className="block text-xs text-ink-muted">
                  {t.code} · {t.specimen}
                </span>
              </span>
              <span className="font-semibold text-ink">{formatBdt(t.price_bdt)}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-right text-base text-ink" aria-live="polite">
        {selected.size} test{selected.size === 1 ? '' : 's'} · Total <strong>{formatBdt(total)}</strong>
      </p>
    </fieldset>
  );
}
