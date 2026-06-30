import { describe, expect, it } from 'vitest';
import { similarExercises, similarityScore } from '../lib/similar';
import { Exercise } from '../types';

const ex = (
  id: string,
  category: Exercise['category'],
  primary: Exercise['primaryMuscles'],
  secondary: Exercise['secondaryMuscles'] = [],
): Exercise => ({
  id,
  name: id,
  category,
  primaryMuscles: primary,
  secondaryMuscles: secondary,
  description: '',
});

const benchBarbell = ex('bench-bb', 'barbell', ['chest'], ['triceps', 'shoulders']);
const DB: Exercise[] = [
  benchBarbell,
  ex('bench-db', 'dumbbell', ['chest'], ['triceps', 'shoulders']),
  ex('machine-press', 'machine', ['chest'], ['triceps']),
  ex('squat', 'barbell', ['quads'], ['glutes']),
  ex('curl', 'dumbbell', ['biceps']),
];

describe('similarityScore', () => {
  it('is 0 for the same exercise and for no shared prime mover', () => {
    expect(similarityScore(benchBarbell, benchBarbell)).toBe(0);
    expect(similarityScore(benchBarbell, DB[3])).toBe(0); // squat
  });

  it('rewards shared primary muscles and same equipment', () => {
    const dumbbell = similarityScore(benchBarbell, DB[1]); // shares chest, diff equip
    const machine = similarityScore(benchBarbell, DB[2]); // shares chest, diff equip
    expect(dumbbell).toBeGreaterThan(0);
    expect(machine).toBeGreaterThan(0);
    // dumbbell press also shares the shoulders secondary, so it scores higher
    expect(dumbbell).toBeGreaterThan(machine);
  });
});

describe('similarExercises', () => {
  it('suggests same-muscle moves best-first and excludes the target', () => {
    const out = similarExercises(benchBarbell, DB, 6);
    expect(out.map((e) => e.id)).not.toContain('bench-bb');
    expect(out.map((e) => e.id)).toEqual(['bench-db', 'machine-press']);
  });

  it('respects the limit', () => {
    expect(similarExercises(benchBarbell, DB, 1)).toHaveLength(1);
  });
});
