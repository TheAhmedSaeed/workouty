import { describe, expect, it } from 'vitest';
import { exercisesToCsv, exercisesToMarkdown } from '../lib/exerciseExport';
import { Exercise } from '../types';

const list: Exercise[] = [
  {
    id: 'bench',
    name: 'Bench Press (Barbell)',
    category: 'barbell',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    description: '',
  },
  {
    id: 'c1',
    name: 'My "Special" Move',
    category: 'other',
    primaryMuscles: ['biceps'],
    secondaryMuscles: [],
    description: '',
    isCustom: true,
  },
];

describe('exercisesToMarkdown', () => {
  it('lists each exercise with primary + secondary muscles', () => {
    const md = exercisesToMarkdown(list);
    expect(md).toContain('# Workouty exercises (2)');
    expect(md).toContain(
      '- **Bench Press (Barbell)** (barbell) — Primary: Chest · Secondary: Triceps, Shoulders',
    );
    expect(md).toContain('- **My "Special" Move** (other) — Primary: Biceps · _custom_');
  });
});

describe('exercisesToCsv', () => {
  it('quotes fields and lists muscles per column', () => {
    const csv = exercisesToCsv(list);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe(
      '"Name","Equipment","Primary muscles","Secondary muscles","Custom"',
    );
    expect(lines[1]).toBe(
      '"Bench Press (Barbell)","barbell","Chest","Triceps, Shoulders","no"',
    );
    // embedded quotes are doubled
    expect(lines[2]).toContain('"My ""Special"" Move"');
    expect(lines[2]).toContain('"yes"');
  });
});
