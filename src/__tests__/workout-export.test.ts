import { describe, expect, it } from 'vitest';
import { buildWorkoutsExport } from '../lib/workoutExport';
import { Exercise, Workout } from '../types';

const bench: Exercise = {
  id: 'bench',
  name: 'Bench Press',
  category: 'barbell',
  primaryMuscles: ['chest'],
  secondaryMuscles: [],
  description: '',
};
const get = (id: string) => (id === 'bench' ? bench : undefined);

const workout: Workout = {
  id: 'w1',
  name: 'Push A',
  startedAt: '2026-07-01T18:00:00.000Z',
  finishedAt: '2026-07-01T18:45:00.000Z',
  restSeconds: 600,
  exercises: [
    {
      exerciseId: 'bench',
      sets: [
        { weight: 100, reps: 8, completed: true, type: 'normal' },
        { weight: 100, reps: 6, completed: true, type: 'normal' },
        { weight: 100, reps: 5, completed: false, type: 'normal' }, // not completed
      ],
    },
  ],
};

describe('buildWorkoutsExport', () => {
  const json = buildWorkoutsExport([workout], 'kg', get, '2026-07-25T00:00:00Z');
  const data = JSON.parse(json);

  it('is valid JSON with metadata', () => {
    expect(data.app).toBe('Workouty');
    expect(data.unit).toBe('kg');
    expect(data.workoutCount).toBe(1);
    expect(data.exportedAt).toBe('2026-07-25T00:00:00Z');
  });

  it('resolves exercise names and computes volume from completed sets only', () => {
    const w = data.workouts[0];
    expect(w.name).toBe('Push A');
    expect(w.durationMinutes).toBe(45);
    expect(w.restMinutes).toBe(10);
    const ex = w.exercises[0];
    expect(ex.exercise).toBe('Bench Press');
    // 100×8 + 100×6 = 1400 (the uncompleted 100×5 is excluded)
    expect(ex.volume).toBe(1400);
    expect(w.totalVolume).toBe(1400);
    expect(ex.sets).toHaveLength(3); // raw sets kept
  });

  it('falls back to the id for unknown exercises', () => {
    const j = buildWorkoutsExport(
      [{ ...workout, exercises: [{ exerciseId: 'ghost', sets: [] }] }],
      'lb',
      get,
      't',
    );
    expect(JSON.parse(j).workouts[0].exercises[0].exercise).toBe('ghost');
  });
});
