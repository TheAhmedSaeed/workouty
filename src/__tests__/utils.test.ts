import { describe, expect, it } from 'vitest';
import { formatRest, weekStart } from '../lib/utils';

describe('weekStart', () => {
  it('starts weeks on Sunday (Sun–Sat)', () => {
    // Aug 5 2026 is a Wednesday; its week starts Sunday Aug 2
    const s = weekStart(new Date(2026, 7, 5));
    expect(s.getDay()).toBe(0);
    expect(s.getFullYear()).toBe(2026);
    expect(s.getMonth()).toBe(7);
    expect(s.getDate()).toBe(2);
    // a Sunday maps to itself
    expect(weekStart(new Date(2026, 7, 2)).getDate()).toBe(2);
  });
});

describe('formatRest', () => {
  it('formats seconds compactly', () => {
    expect(formatRest(45)).toBe('45s');
    expect(formatRest(60)).toBe('1m');
    expect(formatRest(90)).toBe('1m 30s');
    expect(formatRest(750)).toBe('12m 30s');
    expect(formatRest(0)).toBe('0s');
  });

  it('rounds and never goes negative', () => {
    expect(formatRest(89.6)).toBe('1m 30s');
    expect(formatRest(-5)).toBe('0s');
  });
});
