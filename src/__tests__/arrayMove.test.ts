import { describe, expect, it } from 'vitest';
import { arrayMove } from '../lib/utils';

describe('arrayMove', () => {
  it('moves an item down', () => {
    expect(arrayMove(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('moves an item up', () => {
    expect(arrayMove(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('swaps neighbours', () => {
    expect(arrayMove(['a', 'b', 'c'], 1, 0)).toEqual(['b', 'a', 'c']);
  });

  it('does not mutate the input', () => {
    const input = ['a', 'b', 'c'];
    arrayMove(input, 0, 2);
    expect(input).toEqual(['a', 'b', 'c']);
  });

  it('returns the same list for out-of-range or no-op moves', () => {
    const input = ['a', 'b', 'c'];
    expect(arrayMove(input, 1, 1)).toBe(input);
    expect(arrayMove(input, -1, 2)).toBe(input);
    expect(arrayMove(input, 0, 5)).toBe(input);
  });
});
