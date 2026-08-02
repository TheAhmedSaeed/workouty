import { Exercise, MuscleGroup, TemplateDay, Workout } from '../types';

/** Default recovery window before a muscle is considered ready again. */
export const REST_HOURS = 48;

/** When each muscle was last trained (as a primary or secondary mover). */
export function muscleLastTrained(
  workouts: Workout[],
  getExercise: (id: string) => Exercise | undefined,
): Map<MuscleGroup, number> {
  const map = new Map<MuscleGroup, number>();
  for (const w of workouts) {
    const t = new Date(w.startedAt).getTime();
    for (const we of w.exercises) {
      if (!we.sets.some((s) => s.completed && s.type !== 'warmup')) continue;
      const ex = getExercise(we.exerciseId);
      if (!ex) continue;
      for (const m of [...ex.primaryMuscles, ...ex.secondaryMuscles]) {
        if (t > (map.get(m) ?? 0)) map.set(m, t);
      }
    }
  }
  return map;
}

export interface DayReadiness {
  ready: boolean;
  /** Muscles still inside the rest window, most-recently-trained first. */
  recovering: { muscle: MuscleGroup; hoursLeft: number }[];
  /** How many of the day's target muscles are rested. */
  restedCount: number;
  totalCount: number;
}

/**
 * How ready a plan day is: for the muscles it targets (primary movers), are
 * they past the rest window since they were last trained?
 */
export function dayReadiness(
  day: TemplateDay,
  getExercise: (id: string) => Exercise | undefined,
  lastTrained: Map<MuscleGroup, number>,
  nowMs: number,
  restHours = REST_HOURS,
): DayReadiness {
  const muscles = new Set<MuscleGroup>();
  for (const te of day.exercises) {
    const ex = getExercise(te.exerciseId);
    if (ex) for (const m of ex.primaryMuscles) muscles.add(m);
  }
  const recovering: { muscle: MuscleGroup; hoursLeft: number }[] = [];
  for (const m of muscles) {
    const last = lastTrained.get(m);
    if (last == null) continue;
    const hoursSince = (nowMs - last) / 3_600_000;
    if (hoursSince < restHours)
      recovering.push({
        muscle: m,
        hoursLeft: Math.max(1, Math.ceil(restHours - hoursSince)),
      });
  }
  recovering.sort((a, b) => b.hoursLeft - a.hoursLeft);
  return {
    ready: recovering.length === 0,
    recovering,
    restedCount: muscles.size - recovering.length,
    totalCount: muscles.size,
  };
}
