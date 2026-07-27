import { LengthUnit, Measurement, MeasureKey, Unit } from '../types';

export type MeasureKind = 'weight' | 'percent' | 'length';

export interface MeasureField {
  key: MeasureKey;
  label: string;
  kind: MeasureKind;
  /** Where/how to take the measurement. */
  how: string;
  /** Which direction counts as progress (for colour hints). */
  good?: 'up' | 'down';
}

/** The measurements we prompt for — the important ones for body composition. */
export const MEASURE_FIELDS: MeasureField[] = [
  {
    key: 'weight',
    label: 'Weight',
    kind: 'weight',
    how: 'Weigh in the morning, before eating and after the toilet — most consistent.',
  },
  {
    key: 'bodyFat',
    label: 'Body fat',
    kind: 'percent',
    good: 'down',
    how: 'From a smart scale or body scan, if you have one.',
  },
  {
    key: 'neck',
    label: 'Neck',
    kind: 'length',
    how: 'Around the middle of your neck, relaxed.',
  },
  {
    key: 'shoulders',
    label: 'Shoulders',
    kind: 'length',
    good: 'up',
    how: 'Widest point around both shoulders, arms hanging at your sides.',
  },
  {
    key: 'chest',
    label: 'Chest',
    kind: 'length',
    good: 'up',
    how: 'Around the chest at nipple level, arms relaxed, after a normal breath out.',
  },
  {
    key: 'waist',
    label: 'Waist',
    kind: 'length',
    good: 'down',
    how: 'Around the navel (or narrowest point). The key fat-loss number — stand relaxed, don’t suck in.',
  },
  {
    key: 'hips',
    label: 'Hips',
    kind: 'length',
    good: 'down',
    how: 'Widest point around your glutes, feet together.',
  },
  {
    key: 'arm',
    label: 'Arm',
    kind: 'length',
    good: 'up',
    how: 'Around the biggest part of the upper arm. Pick flexed or relaxed and stay consistent — same arm each time.',
  },
  {
    key: 'forearm',
    label: 'Forearm',
    kind: 'length',
    good: 'up',
    how: 'Around the widest part of the forearm.',
  },
  {
    key: 'thigh',
    label: 'Thigh',
    kind: 'length',
    good: 'up',
    how: 'Around the widest part of the upper thigh — same leg each time.',
  },
  {
    key: 'calf',
    label: 'Calf',
    kind: 'length',
    good: 'up',
    how: 'Around the widest part of the calf.',
  },
];

/** Unit label for a field, given the user's weight + length unit settings. */
export function measureUnitLabel(
  kind: MeasureKind,
  unit: Unit,
  lengthUnit: LengthUnit,
): string {
  if (kind === 'weight') return unit;
  if (kind === 'percent') return '%';
  return lengthUnit;
}

/** Measurements sorted oldest → newest by date. */
export function sortedMeasurements(list: Measurement[]): Measurement[] {
  return [...list].sort((a, b) => a.date.localeCompare(b.date));
}

/** Time series of a single field (only entries where it was recorded). */
export function fieldSeries(
  list: Measurement[],
  key: MeasureKey,
): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = [];
  for (const m of sortedMeasurements(list)) {
    const v = m[key];
    if (typeof v === 'number') out.push({ date: m.date, value: v });
  }
  return out;
}

export interface FieldTrend {
  latest: number;
  first: number;
  prev: number | null;
  sinceFirst: number;
  sincePrev: number | null;
  count: number;
}

/** Latest value + change since the first and previous recorded entries. */
export function fieldTrend(
  list: Measurement[],
  key: MeasureKey,
): FieldTrend | null {
  const s = fieldSeries(list, key);
  if (s.length === 0) return null;
  const latest = s[s.length - 1].value;
  const first = s[0].value;
  const prev = s.length > 1 ? s[s.length - 2].value : null;
  return {
    latest,
    first,
    prev,
    sinceFirst: Math.round((latest - first) * 10) / 10,
    sincePrev: prev === null ? null : Math.round((latest - prev) * 10) / 10,
    count: s.length,
  };
}
