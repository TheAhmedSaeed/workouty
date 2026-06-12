import { expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { importAIPlan } from '../lib/aiPlan';
import { EXERCISES } from '../data/exercises';

const PLANS_DIR = join(__dirname, '../../plans');

// Every plan file shipped in plans/ must import cleanly with every exercise
// name matching the built-in database exactly (no custom exercises created).
it('shipped plan files import with zero custom exercises', () => {
  const files = readdirSync(PLANS_DIR).filter((f) => f.endsWith('.json'));
  expect(files.length).toBeGreaterThan(0);
  for (const f of files) {
    const json = readFileSync(join(PLANS_DIR, f), 'utf8');
    const res = importAIPlan(json, EXERCISES, () => {
      throw new Error(`${f}: exercise name did not match the database`);
    });
    expect(res.ok, `${f} failed: ${res.error}`).toBe(true);
    expect(res.createdExercises).toEqual([]);
    expect(res.template!.days.length).toBeGreaterThan(0);
  }
});
