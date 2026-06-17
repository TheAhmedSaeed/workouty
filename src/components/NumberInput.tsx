import { InputHTMLAttributes, useEffect, useRef, useState } from 'react';
import { parseNumber, toWesternDigits } from '../lib/numerals';

type BaseProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
>;

interface Props extends BaseProps {
  /** Current numeric value (or '' for empty). */
  value: number | '';
  /** Called with the parsed number, or NaN when the field is empty/invalid. */
  onValue: (n: number) => void;
  /** Allow a decimal point (weights) vs. integers only (reps/sets). */
  decimal?: boolean;
}

const numFromValue = (v: number | ''): number =>
  typeof v === 'number' ? v : NaN;

const fmt = (v: number | ''): string => {
  const n = numFromValue(v);
  return Number.isNaN(n) || n === 0 ? '' : String(n);
};

/**
 * A text-based number field that accepts Eastern (Arabic-Indic / Persian)
 * numerals and converts them to Western digits as you type, while preserving
 * in-progress decimals. Uses a numeric on-screen keyboard on mobile.
 *
 * We can't use <input type="number"> because browsers reject Arabic-Indic
 * digits there (value comes back empty).
 */
export function NumberInput({ value, onValue, decimal = true, ...rest }: Props) {
  const [text, setText] = useState(() => fmt(value));
  const lastNum = useRef(numFromValue(value));

  // Sync when the value changes from the outside (auto-fill, target pre-fill,
  // progression bump) — but never clobber what the user is mid-typing.
  useEffect(() => {
    const ext = numFromValue(value);
    if (ext !== lastNum.current) {
      lastNum.current = ext;
      const cur = parseNumber(text);
      if (!(cur === ext || (Number.isNaN(cur) && Number.isNaN(ext))))
        setText(fmt(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handle = (raw: string) => {
    let cleaned = toWesternDigits(raw).replace(decimal ? /[^0-9.]/g : /[^0-9]/g, '');
    if (decimal) {
      const dot = cleaned.indexOf('.');
      if (dot !== -1)
        cleaned = cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
    }
    setText(cleaned);
    const n = parseNumber(cleaned);
    lastNum.current = n;
    onValue(n);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={text}
      onChange={(e) => handle(e.target.value)}
    />
  );
}
