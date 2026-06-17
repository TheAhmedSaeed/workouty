import { describe, expect, it } from 'vitest';
import { parseNumber, toWesternDigits } from '../lib/numerals';

describe('toWesternDigits', () => {
  it('converts Arabic-Indic digits', () => {
    expect(toWesternDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('converts Extended Arabic-Indic (Persian/Urdu) digits', () => {
    expect(toWesternDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
  });

  it('maps the Arabic decimal separator and drops the thousands separator', () => {
    expect(toWesternDigits('٢٫٥')).toBe('2.5');
    expect(toWesternDigits('١٬٠٠٠')).toBe('1000');
  });

  it('leaves Western digits and other characters untouched', () => {
    expect(toWesternDigits('42.5')).toBe('42.5');
    expect(toWesternDigits('12٣')).toBe('123');
  });
});

describe('parseNumber', () => {
  it('parses Eastern numerals into a number', () => {
    expect(parseNumber('١٢٠')).toBe(120);
    expect(parseNumber('٢٫٥')).toBe(2.5);
  });

  it('returns NaN for empty or non-numeric input', () => {
    expect(Number.isNaN(parseNumber(''))).toBe(true);
    expect(Number.isNaN(parseNumber('.'))).toBe(true);
    expect(Number.isNaN(parseNumber('abc'))).toBe(true);
  });
});
