import { describe, expect, it } from 'vitest';
import { lastPerformance } from '../lib/stats';
import { Workout } from '../types';

/** One-exercise workout of `squat` at a given weight × reps. */
const wk = (
  day: string,
  weight: number,
  reps = 5,
  extra: Partial<Workout> = {},
): Workout => ({
  id: day,
  name: 'Legs',
  startedAt: `2026-09-${day}T10:00:00Z`,
  finishedAt: `2026-09-${day}T11:00:00Z`,
  exercises: [
    {
      exerciseId: 'squat',
      sets: [{ weight, reps, completed: true, type: 'normal' }],
    },
  ],
  ...extra,
});

describe('lastPerformance', () => {
  it('returns the most recent normal session', () => {
    const res = lastPerformance([wk('01', 100), wk('08', 110)], 'squat');
    expect(res?.sets[0].weight).toBe(110);
  });

  it('ignores an off day where you did worse, keeping the normal reference', () => {
    const res = lastPerformance(
      [wk('01', 100), wk('08', 70, 5, { offDay: true })],
      'squat',
    );
    expect(res?.sets[0].weight).toBe(100);
  });

  it('still counts an off day where you did BETTER on that exercise', () => {
    const res = lastPerformance(
      [wk('01', 100), wk('08', 110, 5, { offDay: true })],
      'squat',
    );
    // beat the standard even on an off day → it carries forward
    expect(res?.sets[0].weight).toBe(110);
  });

  it('per-exercise: keeps the better off-day lift and drops the worse one', () => {
    // squat improved on the off day; bench regressed on the same off day
    const normal: Workout = {
      id: '01',
      name: 'Full',
      startedAt: '2026-09-01T10:00:00Z',
      exercises: [
        { exerciseId: 'squat', sets: [{ weight: 100, reps: 5, completed: true, type: 'normal' }] },
        { exerciseId: 'bench', sets: [{ weight: 80, reps: 5, completed: true, type: 'normal' }] },
      ],
    };
    const off: Workout = {
      id: '08',
      name: 'Full',
      startedAt: '2026-09-08T10:00:00Z',
      offDay: true,
      exercises: [
        { exerciseId: 'squat', sets: [{ weight: 110, reps: 5, completed: true, type: 'normal' }] },
        { exerciseId: 'bench', sets: [{ weight: 60, reps: 5, completed: true, type: 'normal' }] },
      ],
    };
    expect(lastPerformance([normal, off], 'squat')?.sets[0].weight).toBe(110);
    expect(lastPerformance([normal, off], 'bench')?.sets[0].weight).toBe(80);
  });

  it('uses estimated 1RM, so more reps at the same weight counts as better', () => {
    const res = lastPerformance(
      [wk('01', 100, 5), wk('08', 100, 8, { offDay: true })],
      'squat',
    );
    expect(res?.sets[0].reps).toBe(8); // 100×8 > 100×5 by 1RM
  });

  it('a normal day is always the standard, even after a strong off day', () => {
    const res = lastPerformance(
      [wk('01', 100), wk('05', 120, 5, { offDay: true }), wk('08', 100)],
      'squat',
    );
    expect(res?.sets[0].weight).toBe(100); // latest normal day wins
  });

  it('falls back to a lone off day when there is no normal reference', () => {
    const res = lastPerformance([wk('08', 70, 5, { offDay: true })], 'squat');
    expect(res?.sets[0].weight).toBe(70);
  });
});
