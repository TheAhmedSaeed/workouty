import { describe, expect, it } from 'vitest';
import { Exercise, Workout } from '../types';
import {
  buildHistoryExport,
  filterWorkoutsByDays,
  HISTORY_PERIODS,
} from '../lib/historyExport';

const NOW = new Date('2026-10-26T12:00:00Z').getTime();

const wk = (daysAgo: number, over: Partial<Workout> = {}): Workout => {
  const started = new Date(NOW - daysAgo * 86400000).toISOString();
  return {
    id: `w${daysAgo}`,
    name: 'Legs',
    startedAt: started,
    finishedAt: new Date(NOW - daysAgo * 86400000 + 3600000).toISOString(),
    exercises: [
      {
        exerciseId: 'squat',
        sets: [
          { weight: 100, reps: 5, completed: true, type: 'normal' },
          { weight: 100, reps: 5, completed: true, type: 'normal' },
        ],
      },
    ],
    ...over,
  };
};

const get = (id: string): Exercise | undefined =>
  id === 'squat'
    ? {
        id: 'squat',
        name: 'Squat (Barbell)',
        category: 'barbell',
        primaryMuscles: ['quads'],
        secondaryMuscles: [],
        description: '',
      }
    : undefined;

describe('filterWorkoutsByDays', () => {
  const all = [wk(1), wk(10), wk(40), wk(200)];

  it('keeps only workouts within the window', () => {
    expect(filterWorkoutsByDays(all, 7, NOW).map((w) => w.id)).toEqual(['w1']);
    expect(filterWorkoutsByDays(all, 30, NOW).map((w) => w.id)).toEqual([
      'w1',
      'w10',
    ]);
    expect(filterWorkoutsByDays(all, 90, NOW).map((w) => w.id)).toEqual([
      'w1',
      'w10',
      'w40',
    ]);
  });

  it('returns everything for all-time (null)', () => {
    expect(filterWorkoutsByDays(all, null, NOW)).toHaveLength(4);
  });

  it('includes the boundary day', () => {
    expect(filterWorkoutsByDays([wk(7)], 7, NOW)).toHaveLength(1);
  });
});

describe('buildHistoryExport', () => {
  it('handles an empty period', () => {
    const md = buildHistoryExport([], 'kg', get, 'last 7 days', '2026-10-26T12:00:00Z');
    expect(md).toContain('No workouts logged in this period');
    expect(md).toContain('Workouts: 0');
  });

  it('includes a summary and sessions with resolved names + volume', () => {
    const md = buildHistoryExport([wk(1), wk(5)], 'kg', get, 'last 7 days', '2026-10-26T12:00:00Z');
    expect(md).toContain('# Workouty — Workout history (last 7 days)');
    expect(md).toContain('Workouts: 2');
    expect(md).toContain('Sessions: 2');
    expect(md).toContain('Total sets: 4'); // 2 workouts × 2 sets
    // 2 workouts × (100×5 + 100×5) = 2000
    expect(md).toContain('Total volume: 2,000 kg');
    expect(md).toContain('Squat (Barbell): 100×5, 100×5 · 1,000 kg');
  });

  it('lists sessions newest first and flags off days', () => {
    const md = buildHistoryExport(
      [wk(5), wk(1, { offDay: true })],
      'kg',
      get,
      'last 7 days',
      '2026-10-26T12:00:00Z',
    );
    const first = md.indexOf('(off day)'); // the 1-day-ago workout
    const older = md.lastIndexOf('### ');
    expect(first).toBeGreaterThan(-1);
    expect(first).toBeLessThan(older); // off-day session appears before the older one
  });

  it('includes an AI analysis prompt', () => {
    const md = buildHistoryExport([wk(1)], 'kg', get, 'last 30 days', '2026-10-26T12:00:00Z');
    expect(md.toLowerCase()).toContain('analyse my training');
  });
});

describe('HISTORY_PERIODS', () => {
  it('offers an all-time option', () => {
    expect(HISTORY_PERIODS.some((p) => p.days === null)).toBe(true);
  });
});
