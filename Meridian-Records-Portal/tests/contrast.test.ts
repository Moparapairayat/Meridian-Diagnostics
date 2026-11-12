import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Reads the design tokens from globals.css and checks WCAG 2.2 AA contrast for
// every text/background pair the UI uses (4.5:1 text, 3:1 focus ring).
const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
const token = (name: string): string => {
  const m = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!m) throw new Error(`token --color-${name} not found`);
  return m[1];
};

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const TEXT_PAIRS: [fg: string, bg: string][] = [
  ['ink', 'canvas'], ['ink', 'surface'], ['ink', 'sunken'],
  ['ink-2', 'canvas'], ['ink-2', 'surface'], ['ink-2', 'sunken'],
  ['ink-muted', 'canvas'], ['ink-muted', 'surface'], ['ink-muted', 'sunken'],
  ['primary', 'canvas'], ['primary', 'surface'], ['primary-ink', 'primary-soft'],
  ['primary-fg', 'primary'], ['primary-fg', 'primary-hover'],
  ['clay', 'canvas'], ['clay', 'surface'],
  ['success', 'success-bg'], ['success', 'surface'],
  ['warning-fg', 'warning-bg'],
  ['danger', 'danger-bg'], ['danger', 'surface'],
  ['info', 'info-bg'],
];

describe('design tokens meet WCAG 2.2 AA', () => {
  for (const [fg, bg] of TEXT_PAIRS) {
    it(`${fg} on ${bg} >= 4.5:1`, () => {
      expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
    });
  }
  it('focus ring >= 3:1 against canvas and surface', () => {
    expect(contrast(token('focus'), token('canvas'))).toBeGreaterThanOrEqual(3);
    expect(contrast(token('focus'), token('surface'))).toBeGreaterThanOrEqual(3);
  });
});
