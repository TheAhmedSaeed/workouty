import { describe, expect, it } from 'vitest';
import { parsePlanMarkdown, planToMarkdown } from '../lib/planText';
import { Exercise, Template } from '../types';

const DB: Record<string, Exercise> = {
  bench: {
    id: 'bench',
    name: 'Bench Press (Barbell)',
    category: 'barbell',
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
    description: '',
  },
  squat: {
    id: 'squat',
    name: 'Squat (Barbell)',
    category: 'barbell',
    primaryMuscles: ['quads'],
    secondaryMuscles: [],
    description: '',
  },
};
const get = (id: string) => DB[id];

const plan: Template = {
  id: 'p',
  name: 'Push Pull',
  description: 'hypertrophy',
  createdAt: '',
  days: [
    {
      id: 'd1',
      name: 'Push',
      exercises: [
        { exerciseId: 'bench', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 },
      ],
    },
    {
      id: 'd2',
      name: 'Legs',
      exercises: [
        { exerciseId: 'squat', targetSets: 5, targetRepsMin: 5, targetRepsMax: 5 },
      ],
    },
  ],
};

describe('planToMarkdown', () => {
  it('produces readable, editable markdown', () => {
    const md = planToMarkdown(plan, get);
    expect(md).toContain('# Push Pull');
    expect(md).toContain('## Push');
    expect(md).toContain('- Bench Press (Barbell): 3 x 8-12');
    expect(md).toContain('- Squat (Barbell): 5 x 5-5');
  });
});

describe('parsePlanMarkdown', () => {
  it('round-trips the exported markdown', () => {
    const parsed = parsePlanMarkdown(planToMarkdown(plan, get))!;
    expect(parsed.name).toBe('Push Pull');
    expect(parsed.days.map((d) => d.name)).toEqual(['Push', 'Legs']);
    expect(parsed.days[0].exercises[0]).toEqual({
      name: 'Bench Press (Barbell)',
      sets: 3,
      repsMin: 8,
      repsMax: 12,
    });
  });

  it('accepts hand-typed variations (×, –, single reps, * bullets)', () => {
    const parsed = parsePlanMarkdown(
      ['## Day A', '* Deadlift: 4 × 5–8', '- Curl: 3 x 12'].join('\n'),
    )!;
    expect(parsed.days[0].exercises[0]).toMatchObject({
      name: 'Deadlift',
      sets: 4,
      repsMin: 5,
      repsMax: 8,
    });
    expect(parsed.days[0].exercises[1]).toMatchObject({
      name: 'Curl',
      sets: 3,
      repsMin: 12,
      repsMax: 12,
    });
  });

  it('returns null when there are no exercises', () => {
    expect(parsePlanMarkdown('just some notes')).toBeNull();
  });
});
