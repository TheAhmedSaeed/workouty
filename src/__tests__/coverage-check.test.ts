import { expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { importAIPlan } from '../lib/aiPlan';
import { EXERCISES, EXERCISE_MAP } from '../data/exercises';
import { templateMuscleSets, coverageVerdict } from '../lib/stats';
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '../types';

// The shipped plan is chest-priority: chest, back, shoulders and arms must
// all land in the "Good" coverage band.
it('shipped 3-day plan has good coverage on priority muscles', () => {
  const json = readFileSync(
    join(__dirname, '../../plans/upper-focus-ppl-3day.json'),
    'utf8',
  );
  const res = importAIPlan(json, EXERCISES, () => {
    throw new Error('no custom exercises expected');
  });
  expect(res.ok).toBe(true);
  const sets = templateMuscleSets(res.template!, (id) => EXERCISE_MAP.get(id));

  const report = MUSCLE_GROUPS.map(
    (m) =>
      `${MUSCLE_LABELS[m].padEnd(14)} ${String(sets[m]).padStart(5)}  ${coverageVerdict(sets[m]).label}`,
  ).join('\n');
  writeFileSync('/tmp/plan-coverage.txt', report);

  for (const m of ['chest', 'back', 'shoulders', 'biceps', 'triceps'] as const)
    expect(
      coverageVerdict(sets[m]).level,
      `${m} should be Good, got ${sets[m]} sets`,
    ).toBe('good');
  // legs are deliberately lower on this plan, but must still be trained
  for (const m of ['quads', 'hamstrings', 'glutes', 'calves'] as const)
    expect(sets[m], `${m} must not be zero`).toBeGreaterThan(2);
});
