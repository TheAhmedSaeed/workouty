import { describe, expect, it } from 'vitest';
import { lastPerformance } from '../lib/stats';
import { Workout } from '../types';

const wk = (
  id: string,
  weight: number,
  extra: Partial<Workout> = {},
): Workout => ({
  id,
  name: 'Legs',
  startedAt: `2026-09-${id.padStart(2, '0')}T10:00:00Z`,
  finishedAt: `2026-09-${id.padStart(2, '0')}T11:00:00Z`,
  exercises: [
    {
      exerciseId: 'squat',
      sets: [{ weight, reps: 5, completed: true, type: 'normal' }],
    },
  ],
  ...extra,
});

describe('lastPerformance', () => {
  it('returns the most recent matching session', () => {
    const res = lastPerformance([wk('01', 100), wk('08', 110)], 'squat');
    expect(res?.sets[0].weight).toBe(110);
  });

  it('skips off-day sessions, falling back to the last normal one', () => {
    const res = lastPerformance(
      [wk('01', 100), wk('08', 70, { offDay: true })],
      'squat',
    );
    // the off day (70) is ignored; the previous normal day (100) is the ref
    expect(res?.sets[0].weight).toBe(100);
  });

  it('returns null when every matching session is an off day', () => {
    const res = lastPerformance([wk('08', 70, { offDay: true })], 'squat');
    expect(res).toBeNull();
  });
});
