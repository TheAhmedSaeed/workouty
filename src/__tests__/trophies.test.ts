import { describe, expect, it } from 'vitest';
import {
  bestWeeklyStreak,
  computeAchievements,
  workoutRecords,
} from '../lib/trophies';
import { Workout } from '../types';

const wk = (id: string, daysAgo: number, sets: [number, number][]): Workout => ({
  id,
  name: id,
  startedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  finishedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  exercises: [
    {
      exerciseId: 'bench-press',
      sets: sets.map(([weight, reps]) => ({
        weight,
        reps,
        completed: true,
        type: 'normal' as const,
      })),
    },
  ],
});

describe('bestWeeklyStreak', () => {
  it('counts the longest run of consecutive weeks', () => {
    const workouts = [wk('a', 21, [[60, 5]]), wk('b', 14, [[60, 5]]), wk('c', 7, [[60, 5]])];
    expect(bestWeeklyStreak(workouts)).toBe(3);
  });

  it('resets across a skipped week', () => {
    const workouts = [wk('a', 21, [[60, 5]]), wk('c', 0, [[60, 5]])]; // 3 weeks apart
    expect(bestWeeklyStreak(workouts)).toBe(1);
  });

  it('is 0 with no workouts', () => {
    expect(bestWeeklyStreak([])).toBe(0);
  });
});

describe('computeAchievements', () => {
  it('unlocks the first-workout trophy after one workout', () => {
    const a = computeAchievements([wk('a', 0, [[60, 5]])], 'kg');
    const first = a.find((x) => x.id === 'workouts-1')!;
    expect(first.unlocked).toBe(true);
    expect(a.find((x) => x.id === 'workouts-100')!.unlocked).toBe(false);
  });

  it('reports progress toward locked trophies', () => {
    const a = computeAchievements([wk('a', 0, [[60, 5]])], 'kg');
    const five = a.find((x) => x.id === 'workouts-5')!;
    expect(five.current).toBe(1);
    expect(five.target).toBe(5);
  });
});

describe('workoutRecords', () => {
  it('flags an estimated-1RM PR against prior history', () => {
    const prior = [wk('a', 7, [[60, 5]])];
    const finished = wk('b', 0, [[70, 5]]); // heavier → new e1RM and weight PR
    const recs = workoutRecords(finished, prior);
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({ exerciseId: 'bench-press', kind: 'e1RM' });
  });

  it('reports no record when you did not beat your best', () => {
    const prior = [wk('a', 7, [[100, 5]])];
    const finished = wk('b', 0, [[60, 5]]);
    expect(workoutRecords(finished, prior)).toHaveLength(0);
  });

  it('everything is a record on your first-ever session', () => {
    const finished = wk('b', 0, [[40, 8]]);
    expect(workoutRecords(finished, [])).toHaveLength(1);
  });
});
