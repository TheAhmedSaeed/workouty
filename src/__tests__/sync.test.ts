import { describe, expect, it } from 'vitest';
import { mergeStates, stripForSync } from '../lib/sync';
import { AppState, Workout } from '../types';

const workout = (id: string, daysAgo: number): Workout => ({
  id,
  name: `W ${id}`,
  startedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  finishedAt: new Date(Date.now() - daysAgo * 86400000 + 3600000).toISOString(),
  exercises: [
    {
      exerciseId: 'bench-press',
      sets: [{ weight: 80, reps: 8, completed: true, type: 'normal' }],
    },
  ],
});

const base = (over: Partial<AppState>): AppState => ({
  version: 1,
  settings: { unit: 'kg' },
  customExercises: [],
  templates: [],
  workouts: [],
  activeWorkout: null,
  deleted: { workouts: [], templates: [] },
  ...over,
});

describe('sync merge', () => {
  it('unions workouts from both devices, sorted by date', () => {
    const local = base({ workouts: [workout('a', 1)] });
    const remote = base({ workouts: [workout('b', 3), workout('a', 1)] });
    const merged = mergeStates(local, remote);
    expect(merged.workouts.map((w) => w.id)).toEqual(['b', 'a']);
  });

  it('local version wins when the same id exists on both sides', () => {
    const local = base({
      templates: [
        { id: 't1', name: 'Edited locally', days: [], createdAt: '2026-01-01' },
      ],
    });
    const remote = base({
      templates: [
        { id: 't1', name: 'Old remote name', days: [], createdAt: '2026-01-01' },
      ],
    });
    expect(mergeStates(local, remote).templates[0].name).toBe('Edited locally');
  });

  it('deletions propagate via tombstones instead of resurrecting', () => {
    // phone deleted workout "a"; laptop still has it
    const local = base({ deleted: { workouts: ['a'], templates: [] } });
    const remote = base({ workouts: [workout('a', 2), workout('b', 1)] });
    const merged = mergeStates(local, remote);
    expect(merged.workouts.map((w) => w.id)).toEqual(['b']);
    expect(merged.deleted!.workouts).toContain('a');
  });

  it('keeps local settings and active workout', () => {
    const local = base({
      settings: { unit: 'lb' },
      activeWorkout: workout('live', 0),
    });
    const remote = base({ settings: { unit: 'kg' } });
    const merged = mergeStates(local, remote);
    expect(merged.settings.unit).toBe('lb');
    expect(merged.activeWorkout?.id).toBe('live');
  });

  it('stripForSync never uploads the in-progress workout', () => {
    const s = base({ activeWorkout: workout('live', 0) });
    expect(stripForSync(s).activeWorkout).toBeNull();
  });

  it('tolerates remote states from older app versions without arrays', () => {
    const local = base({ workouts: [workout('a', 1)] });
    const remote = { version: 1, settings: { unit: 'kg' } } as AppState;
    const merged = mergeStates(local, remote);
    expect(merged.workouts.map((w) => w.id)).toEqual(['a']);
  });
});
