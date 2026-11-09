// Simulated analyser (SPEC 11.1). Pure: the random source is injectable so it
// can be unit-tested. Real analyser integration (HL7/ASTM) is out of scope.

export type Flag = 'L' | 'N' | 'H';

export interface AnalyteRange {
  analyte: string;
  unit: string;
  ref_low: number;
  ref_high: number;
  decimals: number;
}

export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Same rule as the database trigger on results. */
export function flagFor(value: number, low: number, high: number): Flag {
  if (value < low) return 'L';
  if (value > high) return 'H';
  return 'N';
}

/**
 * One analyser value: mostly inside the reference range, about
 * `outOfRangeRate` outside it (half low, half high), rounded to the analyte's
 * decimals.
 */
export function simulateValue(a: AnalyteRange, rng: () => number = Math.random, outOfRangeRate = 0.15): number {
  const low = Number(a.ref_low);
  const high = Number(a.ref_high);
  const span = high - low;
  const r = rng();
  const between = (min: number, max: number) => min + (max - min) * rng();

  let value: number;
  if (r < outOfRangeRate / 2 && low > 0) {
    value = low * between(0.7, 0.95);
  } else if (r < outOfRangeRate) {
    value = high > 0 ? high * between(1.08, 1.4) : between(1, 5);
  } else {
    value = between(low + span * 0.1, high - span * 0.1);
  }

  // Rounding must not pull an out-of-range value back onto the boundary.
  let rounded = roundTo(value, a.decimals);
  const step = 10 ** -a.decimals;
  if (value < low && rounded >= low) rounded = roundTo(low - step, a.decimals);
  if (value > high && rounded <= high) rounded = roundTo(high + step, a.decimals);
  return Math.max(0, rounded);
}
