import { Exercise } from '../types';

const overlap = <T>(a: T[], b: T[]): number => {
  const set = new Set(b);
  let n = 0;
  for (const x of a) if (set.has(x)) n++;
  return n;
};

/**
 * Score how good a substitute `candidate` is for `target`, based on the
 * muscles worked and the equipment used. Higher is a closer match; 0 means
 * it shares no primary muscle and isn't worth suggesting.
 */
export function similarityScore(target: Exercise, candidate: Exercise): number {
  if (candidate.id === target.id) return 0;
  const primaryPrimary = overlap(candidate.primaryMuscles, target.primaryMuscles);
  if (primaryPrimary === 0) return 0; // must hit at least one of the same prime movers
  let score = primaryPrimary * 4;
  score += overlap(candidate.primaryMuscles, target.secondaryMuscles);
  score += overlap(candidate.secondaryMuscles, target.primaryMuscles);
  score += 0.5 * overlap(candidate.secondaryMuscles, target.secondaryMuscles);
  if (candidate.category === target.category) score += 1; // same equipment feel
  return score;
}

/**
 * Suggest substitute exercises that train the same muscles as `target`,
 * best match first — e.g. for when a machine is busy and you need a swap.
 */
export function similarExercises(
  target: Exercise,
  all: Exercise[],
  limit = 6,
): Exercise[] {
  return all
    .map((e) => ({ e, s: similarityScore(target, e) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.e.name.localeCompare(b.e.name))
    .slice(0, limit)
    .map((x) => x.e);
}
