/**
 * Convert Eastern numerals to plain Western (ASCII) digits so they can be
 * parsed and stored consistently. Covers Arabic-Indic (٠-٩, U+0660–0669) and
 * Extended Arabic-Indic / Persian-Urdu (۰-۹, U+06F0–06F9), plus the Arabic
 * decimal separator (٫) and thousands separator (٬).
 */
export function toWesternDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x0660 && code <= 0x0669) out += String(code - 0x0660);
    else if (code >= 0x06f0 && code <= 0x06f9) out += String(code - 0x06f0);
    else if (ch === '٫') out += '.'; // Arabic decimal separator
    else if (ch === '٬') continue; // Arabic thousands separator — drop
    else out += ch;
  }
  return out;
}

/**
 * Parse a string that may contain Eastern numerals into a number.
 * Returns NaN for empty / non-numeric input so callers can pick a fallback.
 */
export function parseNumber(input: string): number {
  const w = toWesternDigits(input).trim();
  if (w === '' || w === '.') return NaN;
  const n = Number(w);
  return Number.isFinite(n) ? n : NaN;
}
