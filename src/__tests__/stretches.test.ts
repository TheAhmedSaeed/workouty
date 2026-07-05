import { describe, expect, it } from 'vitest';
import {
  morningStretchRoutine,
  musclesTrainedYesterday,
  STRETCHES,
} from '../lib/stretches';
import { Exercise, Workout } from '../types';

const EX: Record<string, Exercise> = {
  bench: {
    id: 'bench',
    name: 'Bench',
    category: 'barbell',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps'],
    description: '',
  },
  squat: {
    id: 'squat',
    name: 'Squat',
    category: 'barbell',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: [],
    description: '',
  },
};
const get = (id: string) => EX[id];

// Fixed "now": 2026-06-15T08:00 local. Yesterday = 2026-06-14.
const NOW = new Date(2026, 5, 15, 8, 0, 0).getTime();
const at = (y: number, m: number, d: number, exerciseId: string): Workout => ({
  id: `${y}-${m}-${d}-${exerciseId}`,
  name: 'W',
  startedAt: new Date(y, m, d, 18, 0, 0).toISOString(),
  finishedAt: new Date(y, m, d, 19, 0, 0).toISOString(),
  exercises: [
    {
      exerciseId,
      sets: [{ weight: 60, reps: 8, completed: true, type: 'normal' }],
    },
  ],
});

describe('musclesTrainedYesterday', () => {
  it('picks up only the previous calendar day, most-worked first', () => {
    const workouts = [
      at(2026, 5, 14, 'squat'), // yesterday
      at(2026, 5, 13, 'bench'), // two days ago — ignored
      at(2026, 5, 15, 'bench'), // today — ignored
    ];
    expect(musclesTrainedYesterday(workouts, get, NOW)).toEqual(['quads', 'glutes']);
  });

  it('returns nothing when nothing was trained yesterday', () => {
    expect(musclesTrainedYesterday([at(2026, 5, 13, 'bench')], get, NOW)).toEqual([]);
  });
});

describe('morningStretchRoutine', () => {
  it('targets yesterday\'s muscles and only picks matching stretches', () => {
    const r = morningStretchRoutine([at(2026, 5, 14, 'squat')], get, NOW);
    expect(r.general).toBe(false);
    expect(r.targetMuscles).toContain('quads');
    expect(r.stretches.length).toBeGreaterThan(0);
    // every chosen stretch must hit a trained muscle
    for (const s of r.stretches)
      expect(s.muscles.some((m) => r.targetMuscles.includes(m))).toBe(true);
  });

  it('falls back to a general routine on a rest day', () => {
    const r = morningStretchRoutine([], get, NOW);
    expect(r.general).toBe(true);
    expect(r.stretches.length).toBeGreaterThanOrEqual(6);
  });

  it('every stretch has how-to instructions and a hold time', () => {
    for (const s of STRETCHES) {
      expect(s.how.length).toBeGreaterThan(20);
      expect(s.hold).toBeGreaterThan(0);
    }
  });
});
