// PDF report (SPEC 11.2): pdf-lib, A4, English only with the standard
// Helvetica font (it cannot shape Bengali, so all text is sanitised to
// WinAnsi). QR code links to the public verify page. No server-only imports,
// so it can be unit-tested.
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';
import { formatDhakaDateTime } from '@/lib/format';

export interface ReportResultRow {
  analyte: string;
  value: number;
  unit: string;
  refLow: number;
  refHigh: number;
  flag: string;
}

export interface ReportPdfInput {
  branchName: string;
  patientCode: string;
  patientName: string;
  ageYears: number;
  sex: string;
  orderNo: string;
  createdAt: string;
  collectedAt: string | null;
  resultedAt: string | null;
  signedAt: string;
  signerName: string;
  version: number;
  amendReason: string | null;
  verifyCode: string;
  verifyUrl: string;
  tests: { code: string; name: string; results: ReportResultRow[] }[];
}

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 50;
const INK = rgb(0.06, 0.16, 0.23);
const MUTED = rgb(0.28, 0.33, 0.41);
const PRIMARY = rgb(0.04, 0.43, 0.45);
const FLAG_TEXT: Record<string, string> = { L: 'L (low)', N: 'N', H: 'H (high)' };

/** Keeps only characters the standard PDF font can encode. */
export function pdfSafe(text: string): string {
  return text
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

export async function buildReportPdf(input: ReportPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(pdfSafe(`Report ${input.orderNo} v${input.version}`));
  doc.setAuthor('Meridian Diagnostics (Demo)');
  doc.setSubject('Synthetic demo data');
  doc.setProducer('Meridian Records Portal');
  doc.setCreationDate(new Date(input.signedAt));

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const newPage = (): PDFPage => {
    const page = doc.addPage(A4);
    // Watermark first, so the content is drawn on top of it.
    page.drawText('DEMO - SYNTHETIC DATA', {
      x: 80,
      y: 200,
      size: 44,
      font: bold,
      color: rgb(0.85, 0.15, 0.15),
      opacity: 0.12,
      rotate: degrees(35),
    });
    return page;
  };

  let page = newPage();
  let y = A4[1] - MARGIN;
  const text = (s: string, x: number, size = 10, font: PDFFont = regular, color = INK) =>
    page.drawText(pdfSafe(s), { x, y, size, font, color });

  // Header
  text('Meridian Diagnostics (Demo)', MARGIN, 18, bold, PRIMARY);
  y -= 16;
  text(`${input.branchName} branch  |  Laboratory report`, MARGIN, 10, regular, MUTED);
  if (input.version > 1) {
    page.drawText(pdfSafe(`AMENDED REPORT - version ${input.version}`), {
      x: A4[0] - MARGIN - bold.widthOfTextAtSize(`AMENDED REPORT - version ${input.version}`, 10),
      y,
      size: 10,
      font: bold,
      color: rgb(0.7, 0.14, 0.09),
    });
  }
  y -= 12;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y }, thickness: 1, color: PRIMARY });
  y -= 22;

  // Patient and order block
  const pairs: [string, string][] = [
    ['Patient ID', input.patientCode],
    ['Name', input.patientName],
    ['Age / Sex', `${input.ageYears} years / ${input.sex}`],
    ['Order', input.orderNo],
    ['Registered', `${formatDhakaDateTime(input.createdAt)} (Dhaka)`],
    ['Collected', input.collectedAt ? `${formatDhakaDateTime(input.collectedAt)} (Dhaka)` : '-'],
    ['Resulted', input.resultedAt ? `${formatDhakaDateTime(input.resultedAt)} (Dhaka)` : '-'],
  ];
  pairs.forEach(([label, value], i) => {
    const col = i % 2 === 0 ? MARGIN : A4[0] / 2 + 10;
    page.drawText(pdfSafe(label), { x: col, y, size: 8, font: regular, color: MUTED });
    page.drawText(pdfSafe(value), { x: col, y: y - 11, size: 10, font: bold, color: INK });
    if (i % 2 === 1 || i === pairs.length - 1) y -= 28;
  });
  y -= 6;

  // Results tables
  const cols = { analyte: MARGIN, value: 250, unit: 320, range: 400, flag: 490 };
  const ensureSpace = (needed: number) => {
    if (y - needed < 170) {
      page = newPage();
      y = A4[1] - MARGIN;
      text(`${input.patientCode}  |  ${input.orderNo}  |  continued`, MARGIN, 9, regular, MUTED);
      y -= 24;
    }
  };

  for (const test of input.tests) {
    ensureSpace(60);
    text(`${test.name} (${test.code})`, MARGIN, 12, bold, PRIMARY);
    y -= 16;
    for (const [key, label] of [
      ['analyte', 'Analyte'],
      ['value', 'Result'],
      ['unit', 'Unit'],
      ['range', 'Reference range'],
      ['flag', 'Flag'],
    ] as const) {
      text(label, cols[key], 8, bold, MUTED);
    }
    y -= 6;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y }, thickness: 0.5, color: MUTED });
    y -= 13;
    if (test.results.length === 0) {
      text('No result.', cols.analyte, 10, regular, MUTED);
      y -= 15;
    }
    for (const r of test.results) {
      ensureSpace(16);
      const abnormal = r.flag !== 'N';
      text(r.analyte, cols.analyte, 10);
      text(String(r.value), cols.value, 10, abnormal ? bold : regular);
      text(r.unit, cols.unit, 10);
      text(`${r.refLow} - ${r.refHigh}`, cols.range, 10);
      text(FLAG_TEXT[r.flag] ?? r.flag, cols.flag, 10, abnormal ? bold : regular, abnormal ? rgb(0.7, 0.14, 0.09) : INK);
      y -= 15;
    }
    y -= 12;
  }

  // Signature, amendment note and QR code (always on the last page)
  ensureSpace(130);
  if (input.amendReason) {
    text(`Amendment (version ${input.version}): ${input.amendReason}`.slice(0, 110), MARGIN, 9, bold, rgb(0.7, 0.14, 0.09));
    y -= 18;
  }
  const qrPng = await QRCode.toBuffer(input.verifyUrl, { type: 'png', margin: 1, width: 240, errorCorrectionLevel: 'M' });
  const qr = await doc.embedPng(qrPng);
  const qrSize = 92;
  const qrY = MARGIN + 20;
  page.drawImage(qr, { x: A4[0] - MARGIN - qrSize, y: qrY, width: qrSize, height: qrSize });

  let sy = qrY + qrSize - 10;
  const sig = (s: string, size: number, font: PDFFont, color = INK) => {
    page.drawText(pdfSafe(s), { x: MARGIN, y: sy, size, font, color });
    sy -= size + 6;
  };
  sig(`Electronically signed by ${input.signerName}`, 11, bold);
  sig(`${formatDhakaDateTime(input.signedAt)} (Asia/Dhaka)`, 10, regular, MUTED);
  sig(`Verify this report: scan the QR code or enter code ${input.verifyCode}`, 9, regular, MUTED);
  sig(input.verifyUrl, 9, regular, PRIMARY);
  page.drawText(pdfSafe(input.verifyCode), {
    x: A4[0] - MARGIN - qrSize,
    y: qrY - 12,
    size: 9,
    font: bold,
    color: INK,
  });

  // Footer on every page
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(pdfSafe(`Demo report with synthetic data. Not for clinical use.  Page ${i + 1} of ${pages.length}`), {
      x: MARGIN,
      y: 28,
      size: 8,
      font: regular,
      color: MUTED,
    });
  });

  return doc.save();
}
