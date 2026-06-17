import { describe, expect, it } from 'vitest';
import { buildWarmup } from '../lib/warmup';
import { Exercise } from '../types';

const DB: Record<string, Exercise> = {
  squat: {
    id: 'squat',
    name: 'Squat (Barbell)',
    category: 'barbell',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings'],
    description: '',
  },
  curl: {
    id: 'curl',
    name: 'Biceps Curl',
    category: 'dumbbell',
    primaryMuscles: ['biceps'],
    secondaryMuscles: [],
    description: '',
  },
  plank: {
    id: 'plank',
    name: 'Plank',
    category: 'bodyweight',
    primaryMuscles: ['abs'],
    secondaryMuscles: [],
    description: '',
  },
};
const get = (id: string) => DB[id];

describe('buildWarmup', () => {
  it('returns nothing for an empty workout', () => {
    expect(buildWarmup([], get, 'kg')).toEqual([]);
  });

  it('always starts with light cardio', () => {
    const steps = buildWarmup([{ exerciseId: 'plank', sets: [] }], get, 'kg');
    expect(steps[0].title).toMatch(/cardio/i);
  });

  it('adds mobility drills for the muscles trained', () => {
    const steps = buildWarmup([{ exerciseId: 'squat', sets: [{ weight: 0 }] }], get, 'kg');
    const mob = steps.find((s) => /mobility/i.test(s.title));
    expect(mob).toBeTruthy();
    // quads is a primary muscle of the squat
    expect(mob!.detail).toMatch(/squats|lunges/i);
  });

  it('gives ramp-up sets scaled to the working weight for a heavy lift', () => {
    const steps = buildWarmup(
      [{ exerciseId: 'squat', sets: [{ weight: 100 }, { weight: 100 }] }],
      get,
      'kg',
    );
    const ramp = steps.find((s) => /ramp-up/i.test(s.title));
    expect(ramp).toBeTruthy();
    expect(ramp!.title).toContain('Squat (Barbell)');
    // 40/60/80% of 100kg, rounded to 2.5kg plates
    expect(ramp!.detail).toContain('40 kg × 8');
    expect(ramp!.detail).toContain('60 kg × 5');
    expect(ramp!.detail).toContain('80 kg × 3');
  });

  it('uses a generic warm-up set for light / first-time weights', () => {
    const steps = buildWarmup([{ exerciseId: 'squat', sets: [{ weight: 0 }] }], get, 'kg');
    const ramp = steps.find((s) => /warm-up sets/i.test(s.title));
    expect(ramp).toBeTruthy();
    expect(ramp!.detail).toMatch(/light sets/i);
  });

  it('skips ramp-up sets when the session is bodyweight only', () => {
    const steps = buildWarmup([{ exerciseId: 'plank', sets: [] }], get, 'kg');
    expect(steps.some((s) => /ramp-up|warm-up sets/i.test(s.title))).toBe(false);
  });
});
