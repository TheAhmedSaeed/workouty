import { describe, expect, it } from 'vitest';
import { dayReadiness, muscleLastTrained } from '../lib/readiness';
import { Exercise, TemplateDay, Workout } from '../types';

const ex = (
  id: string,
  primary: Exercise['primaryMuscles'],
  secondary: Exercise['secondaryMuscles'] = [],
): Exercise => ({
  id,
  name: id,
  category: 'barbell',
  primaryMuscles: primary,
  secondaryMuscles: secondary,
  description: '',
});
const DB: Record<string, Exercise> = {
  bench: ex('bench', ['chest'], ['triceps']),
  row: ex('row', ['back'], ['biceps']),
};
const get = (id: string) => DB[id];

const HOUR = 3_600_000;
const now = Date.now();
const workoutHrsAgo = (exId: string, hrs: number): Workout => ({
  id: `${exId}-${hrs}`,
  name: '',
  startedAt: new Date(now - hrs * HOUR).toISOString(),
  finishedAt: new Date(now - hrs * HOUR).toISOString(),
  exercises: [
    { exerciseId: exId, sets: [{ weight: 60, reps: 8, completed: true, type: 'normal' }] },
  ],
});

const day = (exId: string): TemplateDay => ({
  id: exId,
  name: exId,
  exercises: [{ exerciseId: exId, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 }],
});

describe('muscleLastTrained', () => {
  it('records the latest time each primary + secondary muscle was trained', () => {
    const m = muscleLastTrained([workoutHrsAgo('bench', 10)], get);
    expect(m.has('chest')).toBe(true);
    expect(m.has('triceps')).toBe(true); // secondary counts
    expect(m.has('back')).toBe(false);
  });
});

describe('dayReadiness', () => {
  it('flags a muscle still inside the 48h window', () => {
    const last = muscleLastTrained([workoutHrsAgo('bench', 10)], get);
    const r = dayReadiness(day('bench'), get, last, now);
    expect(r.ready).toBe(false);
    expect(r.recovering[0].muscle).toBe('chest');
    expect(r.recovering[0].hoursLeft).toBe(38); // 48 - 10
  });

  it('is ready once the muscle has rested past 48h', () => {
    const last = muscleLastTrained([workoutHrsAgo('bench', 50)], get);
    expect(dayReadiness(day('bench'), get, last, now).ready).toBe(true);
  });

  it('is ready for an untrained muscle', () => {
    const last = muscleLastTrained([workoutHrsAgo('bench', 10)], get);
    // back was never trained → ready
    expect(dayReadiness(day('row'), get, last, now).ready).toBe(true);
  });
});
