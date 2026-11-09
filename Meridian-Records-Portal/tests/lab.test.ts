import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { flagFor, roundTo, simulateValue, type AnalyteRange } from '@/lib/analyser';
import { buildReportPdf, pdfSafe, type ReportPdfInput } from '@/lib/pdf/report';
import { VERIFY_CODE_RE, generateVerifyCode } from '@/lib/verify-code';

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const glucose: AnalyteRange = { analyte: 'Glucose', unit: 'mmol/L', ref_low: 3.9, ref_high: 5.5, decimals: 1 };
const crp: AnalyteRange = { analyte: 'CRP', unit: 'mg/L', ref_low: 0, ref_high: 5, decimals: 1 };

describe('simulated analyser', () => {
  it('puts about 15% of values outside the range, flags consistent', () => {
    const rng = seeded(42);
    const values = Array.from({ length: 4000 }, () => simulateValue(glucose, rng));
    const outside = values.filter((v) => flagFor(v, glucose.ref_low, glucose.ref_high) !== 'N').length / values.length;
    expect(outside).toBeGreaterThan(0.11);
    expect(outside).toBeLessThan(0.19);
    expect(values.some((v) => flagFor(v, 3.9, 5.5) === 'L')).toBe(true);
    expect(values.some((v) => flagFor(v, 3.9, 5.5) === 'H')).toBe(true);
  });

  it('respects decimals and never returns negative values', () => {
    const rng = seeded(7);
    for (let i = 0; i < 500; i++) {
      const v = simulateValue(crp, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(roundTo(v, 1)).toBe(v);
    }
  });

  it('flags L/N/H from the reference range', () => {
    expect(flagFor(3.8, 3.9, 5.5)).toBe('L');
    expect(flagFor(3.9, 3.9, 5.5)).toBe('N');
    expect(flagFor(5.6, 3.9, 5.5)).toBe('H');
  });
});

describe('verify code', () => {
  it('is 10 characters from A–Z and 2–9', () => {
    const codes = new Set(Array.from({ length: 200 }, generateVerifyCode));
    for (const c of codes) expect(VERIFY_CODE_RE.test(c)).toBe(true);
    expect(codes.size).toBe(200);
  });
});

describe('PDF report', () => {
  const input: ReportPdfInput = {
    branchName: 'Central',
    patientCode: 'MD-2026-00012',
    patientName: "Rahim O'Neil Uddin",
    ageYears: 40,
    sex: 'Male',
    orderNo: 'ORD-2026-000045',
    createdAt: '2026-11-09T03:00:00Z',
    collectedAt: '2026-11-09T03:20:00Z',
    resultedAt: '2026-11-09T07:00:00Z',
    signedAt: '2026-11-09T09:00:00Z',
    signerName: 'Dr Farhana Rahman',
    version: 2,
    amendReason: 'Unit corrected – see note',
    verifyCode: 'ABCDEFGH23',
    verifyUrl: 'http://localhost:3000/verify/ABCDEFGH23',
    tests: Array.from({ length: 6 }, (_, t) => ({
      code: `T${t}`,
      name: `Test ${t}`,
      results: Array.from({ length: 8 }, (_, i) => ({ analyte: `Analyte ${i}`, value: 4.2 + i, unit: 'x10^9/L', refLow: 3.9, refHigh: 5.5, flag: i > 1 ? 'H' : 'N' })),
    })),
  };

  it('builds a valid multi-page A4 PDF', async () => {
    const bytes = await buildReportPdf(input);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
    const [w, h] = [doc.getPage(0).getWidth(), doc.getPage(0).getHeight()];
    expect(Math.round(w)).toBe(595);
    expect(Math.round(h)).toBe(842);
    expect(doc.getTitle()).toContain('ORD-2026-000045');
  });

  it('never crashes on characters the standard font cannot encode', async () => {
    expect(pdfSafe('রহিম – ok')).toBe('???? - ok');
    await expect(buildReportPdf({ ...input, patientName: 'রহিম', tests: [] })).resolves.toBeInstanceOf(Uint8Array);
  });
});
