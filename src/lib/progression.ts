import { Exercise, ExerciseProgression, MuscleGroup, Unit } from '../types';

const LOWER_BODY: MuscleGroup[] = ['quads', 'hamstrings', 'glutes', 'calves'];

/**
 * A sensible default weight step for an exercise in the user's unit. Lower-body
 * lifts jump in bigger increments than upper-body / isolation work, and pounds
 * use larger steps than kilos. The user can override this per exercise.
 */
export function defaultIncrement(ex: Exercise | undefined, unit: Unit): number {
  const lower = !!ex?.primaryMuscles.some((m) => LOWER_BODY.includes(m));
  if (unit === 'lb') return lower ? 10 : 5;
  return lower ? 5 : 2.5;
}

/** The increment to actually use: the user's override, else the default. */
export function incrementFor(
  ex: Exercise | undefined,
  prog: ExerciseProgression | undefined,
  unit: Unit,
): number {
  const v = prog?.increment;
  return v && v > 0 ? v : defaultIncrement(ex, unit);
}

/**
 * Double-progression trigger: last time you completed every working set at (or
 * above) the top of the prescribed rep range, so it's time to add weight.
 */
export function readyToProgress(
  prevSets: { reps: number }[],
  repsMax: number,
): boolean {
  return (
    repsMax > 0 && prevSets.length > 0 && prevSets.every((s) => s.reps >= repsMax)
  );
}

/**
 * The weight to pre-fill a set with for the next session. An explicit target
 * always wins; otherwise we add the increment when you're ready to progress,
 * and just repeat last time's weight when you're not.
 */
export function nextWeight(
  prevWeight: number,
  opts: { target?: number; progress: boolean; increment: number },
): number {
  if (opts.target != null && opts.target > 0) return opts.target;
  if (opts.progress && prevWeight > 0) return prevWeight + opts.increment;
  return prevWeight;
}
