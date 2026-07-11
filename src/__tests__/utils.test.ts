import { describe, expect, it } from 'vitest';
import { formatRest } from '../lib/utils';

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
