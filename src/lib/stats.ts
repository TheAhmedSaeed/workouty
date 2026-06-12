import {
  Exercise,
  MuscleGroup,
  MUSCLE_GROUPS,
  Template,
  Workout,
} from '../types';
import { estimate1RM, weekStart, shortWeekLabel } from './utils';

const isWorkingSet = (s: { type: string; completed: boolean }) =>
  s.completed && s.type !== 'warmup';

/** Total volume (weight × reps) of completed working sets in a workout. */
export function workoutVolume(w: Workout): number {
  let v = 0;
  for (const ex of w.exercises)
    for (const s of ex.sets) if (isWorkingSet(s)) v += s.weight * s.reps;
  return v;
}

export function workoutSetCount(w: Workout): number {
  let n = 0;
  for (const ex of w.exercises)
    for (const s of ex.sets) if (isWorkingSet(s)) n++;
  return n;
}

export interface WeekPoint {
  label: string;
  weekKey: number;
  workouts: number;
  volume: number;
  sets: number;
}

/** Per-week totals across all finished workouts (last `weeks` weeks). */
export function weeklySeries(workouts: Workout[], weeks = 12): WeekPoint[] {
  const now = weekStart(new Date());
  const points: WeekPoint[] = [];
  const byKey = new Map<number, WeekPoint>();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const p: WeekPoint = {
      label: shortWeekLabel(d),
      weekKey: d.getTime(),
      workouts: 0,
      volume: 0,
      sets: 0,
    };
    points.push(p);
    byKey.set(p.weekKey, p);
  }
  for (const w of workouts) {
    const key = weekStart(new Date(w.startedAt)).getTime();
    const p = byKey.get(key);
    if (!p) continue;
    p.workouts++;
    p.volume += workoutVolume(w);
    p.sets += workoutSetCount(w);
  }
  return points;
}

export interface ExercisePoint {
  date: string; // ISO of workout start
  label: string;
  bestWeight: number; // heaviest completed working set
  est1RM: number; // best estimated 1RM that day
  volume: number;
  sets: number;
  bestSet: { weight: number; reps: number } | null;
}

/** Per-workout history for one exercise, oldest first. */
export function exerciseHistory(
  workouts: Workout[],
  exerciseId: string,
): ExercisePoint[] {
  const points: ExercisePoint[] = [];
  for (const w of workouts) {
    const ex = w.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const working = ex.sets.filter(isWorkingSet);
    if (working.length === 0) continue;
    let bestWeight = 0;
    let est = 0;
    let volume = 0;
    let bestSet: { weight: number; reps: number } | null = null;
    for (const s of working) {
      volume += s.weight * s.reps;
      if (s.weight > bestWeight) bestWeight = s.weight;
      const e1 = estimate1RM(s.weight, s.reps);
      if (e1 > est) {
        est = e1;
        bestSet = { weight: s.weight, reps: s.reps };
      }
    }
    points.push({
      date: w.startedAt,
      label: new Date(w.startedAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      }),
      bestWeight,
      est1RM: Math.round(est * 10) / 10,
      volume,
      sets: working.length,
      bestSet,
    });
  }
  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}

/**
 * The most recent performance of an exercise — what "last time" looked like.
 * Used to pre-fill sets and show "Previous" hints during a workout.
 */
export function lastPerformance(
  workouts: Workout[],
  exerciseId: string,
): { date: string; sets: { weight: number; reps: number }[] } | null {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const ex = workouts[i].exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const working = ex.sets.filter(isWorkingSet);
    if (working.length === 0) continue;
    return {
      date: workouts[i].startedAt,
      sets: working.map((s) => ({ weight: s.weight, reps: s.reps })),
    };
  }
  return null;
}

/** Personal record (best estimated 1RM ever) for an exercise. */
export function personalRecord(
  workouts: Workout[],
  exerciseId: string,
): { weight: number; reps: number; est1RM: number } | null {
  let best: { weight: number; reps: number; est1RM: number } | null = null;
  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      for (const s of ex.sets) {
        if (!isWorkingSet(s)) continue;
        const e1 = estimate1RM(s.weight, s.reps);
        if (!best || e1 > best.est1RM)
          best = { weight: s.weight, reps: s.reps, est1RM: Math.round(e1 * 10) / 10 };
      }
    }
  }
  return best;
}

/**
 * Weekly hard sets per muscle group for a template (counting every day once).
 * Primary muscles count a full set, secondaries half — the common heuristic.
 */
export function templateMuscleSets(
  template: Template,
  getExercise: (id: string) => Exercise | undefined,
): Record<MuscleGroup, number> {
  const sets = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, 0])) as Record<
    MuscleGroup,
    number
  >;
  for (const day of template.days) {
    for (const te of day.exercises) {
      const ex = getExercise(te.exerciseId);
      if (!ex) continue;
      for (const m of ex.primaryMuscles) sets[m] += te.targetSets;
      for (const m of ex.secondaryMuscles) sets[m] += te.targetSets * 0.5;
    }
  }
  return sets;
}

/** Same heuristic over actually-logged workouts in a date window. */
export function loggedMuscleSets(
  workouts: Workout[],
  getExercise: (id: string) => Exercise | undefined,
  sinceDays = 7,
): Record<MuscleGroup, number> {
  const sets = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, 0])) as Record<
    MuscleGroup,
    number
  >;
  const since = Date.now() - sinceDays * 86400000;
  for (const w of workouts) {
    if (new Date(w.startedAt).getTime() < since) continue;
    for (const we of w.exercises) {
      const ex = getExercise(we.exerciseId);
      if (!ex) continue;
      const n = we.sets.filter(isWorkingSet).length;
      for (const m of ex.primaryMuscles) sets[m] += n;
      for (const m of ex.secondaryMuscles) sets[m] += n * 0.5;
    }
  }
  return sets;
}

/** Coverage verdict for a weekly set count, based on common volume landmarks. */
export function coverageVerdict(weeklySets: number): {
  level: 'none' | 'low' | 'good' | 'high';
  label: string;
} {
  if (weeklySets < 1) return { level: 'none', label: 'Not trained' };
  if (weeklySets < 8) return { level: 'low', label: 'Low volume' };
  if (weeklySets <= 22) return { level: 'good', label: 'Good' };
  return { level: 'high', label: 'Very high' };
}
