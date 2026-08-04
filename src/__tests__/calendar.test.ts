import { describe, expect, it } from 'vitest';
import { dateKey, monthMatrix, workoutsByDay } from '../lib/calendar';
import { Workout } from '../types';

describe('monthMatrix', () => {
  it('is a 6×7 grid starting on Sunday', () => {
    const m = monthMatrix(2026, 7); // August 2026
    expect(m).toHaveLength(6);
    expect(m[0]).toHaveLength(7);
    expect(m[0][0].getDay()).toBe(0); // Sunday
    // Aug 1 2026 is a Saturday → last cell of the first week
    expect(dateKey(m[0][6])).toBe('2026-08-01');
    expect(dateKey(m[0][0])).toBe('2026-07-26'); // leading days from July
  });
});

describe('workoutsByDay', () => {
  it('groups workouts under their local day key', () => {
    const w = (id: string, iso: string): Workout => ({
      id,
      name: '',
      startedAt: iso,
      exercises: [],
    });
    const map = workoutsByDay([
      w('a', '2026-08-03T18:00:00'),
      w('b', '2026-08-03T20:00:00'),
      w('c', '2026-08-05T07:00:00'),
    ]);
    expect(map.get('2026-08-03')).toHaveLength(2);
    expect(map.get('2026-08-05')).toHaveLength(1);
    expect(map.get('2026-08-04')).toBeUndefined();
  });
});
