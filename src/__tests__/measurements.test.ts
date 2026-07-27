import { describe, expect, it } from 'vitest';
import {
  fieldSeries,
  fieldTrend,
  measureUnitLabel,
} from '../lib/measurements';
import { Measurement } from '../types';

const M = (date: string, waist?: number, arm?: number): Measurement => ({
  id: date,
  date,
  waist,
  arm,
});

const list: Measurement[] = [
  M('2026-07-01', 90, 35),
  M('2026-07-15', 88, 35.5),
  M('2026-07-22', 86), // no arm this time
];

describe('fieldSeries', () => {
  it('returns only entries where the field was recorded, oldest first', () => {
    expect(fieldSeries(list, 'waist').map((s) => s.value)).toEqual([90, 88, 86]);
    expect(fieldSeries(list, 'arm').map((s) => s.value)).toEqual([35, 35.5]);
    expect(fieldSeries(list, 'chest')).toEqual([]);
  });
});

describe('fieldTrend', () => {
  it('reports latest value and change since first and previous', () => {
    const t = fieldTrend(list, 'waist')!;
    expect(t.latest).toBe(86);
    expect(t.first).toBe(90);
    expect(t.prev).toBe(88);
    expect(t.sinceFirst).toBe(-4);
    expect(t.sincePrev).toBe(-2);
    expect(t.count).toBe(3);
  });

  it('has no previous delta with a single entry', () => {
    const t = fieldTrend([M('2026-07-01', 90)], 'waist')!;
    expect(t.sincePrev).toBeNull();
    expect(t.sinceFirst).toBe(0);
  });

  it('returns null for an unrecorded field', () => {
    expect(fieldTrend(list, 'calf')).toBeNull();
  });
});

describe('measureUnitLabel', () => {
  it('uses the right unit per kind', () => {
    expect(measureUnitLabel('weight', 'kg', 'cm')).toBe('kg');
    expect(measureUnitLabel('percent', 'kg', 'cm')).toBe('%');
    expect(measureUnitLabel('length', 'kg', 'cm')).toBe('cm');
    expect(measureUnitLabel('length', 'lb', 'in')).toBe('in');
  });
});
