import { describe, expect, it } from 'vitest';
import {
  defaultIncrement,
  incrementFor,
  nextWeight,
  readyToProgress,
} from '../lib/progression';
import { Exercise } from '../types';

const ex = (primary: Exercise['primaryMuscles']): Exercise => ({
  id: 'x',
  name: 'X',
  category: 'barbell',
  primaryMuscles: primary,
  secondaryMuscles: [],
  description: '',
});

describe('default increment', () => {
  it('uses bigger steps for lower-body and for pounds', () => {
    expect(defaultIncrement(ex(['chest']), 'kg')).toBe(2.5);
    expect(defaultIncrement(ex(['quads']), 'kg')).toBe(5);
    expect(defaultIncrement(ex(['chest']), 'lb')).toBe(5);
    expect(defaultIncrement(ex(['quads']), 'lb')).toBe(10);
  });

  it('prefers a positive user override over the default', () => {
    expect(incrementFor(ex(['chest']), { increment: 1.25 }, 'kg')).toBe(1.25);
    expect(incrementFor(ex(['chest']), { increment: 0 }, 'kg')).toBe(2.5);
    expect(incrementFor(ex(['chest']), undefined, 'kg')).toBe(2.5);
  });
});

describe('readyToProgress', () => {
  it('is true only when every set hit the top of the rep range', () => {
    expect(readyToProgress([{ reps: 12 }, { reps: 12 }], 12)).toBe(true);
    expect(readyToProgress([{ reps: 12 }, { reps: 10 }], 12)).toBe(false);
    expect(readyToProgress([], 12)).toBe(false);
    expect(readyToProgress([{ reps: 12 }], 0)).toBe(false);
  });
});

describe('nextWeight', () => {
  it('an explicit target always wins', () => {
    expect(nextWeight(80, { target: 100, progress: true, increment: 5 })).toBe(100);
  });

  it('adds the increment when ready to progress', () => {
    expect(nextWeight(80, { progress: true, increment: 2.5 })).toBe(82.5);
  });

  it('repeats last weight when not progressing or when weight is unknown', () => {
    expect(nextWeight(80, { progress: false, increment: 2.5 })).toBe(80);
    expect(nextWeight(0, { progress: true, increment: 2.5 })).toBe(0);
  });
});
