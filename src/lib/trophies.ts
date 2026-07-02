import { Unit, Workout } from '../types';
import { workoutSetCount, workoutVolume } from './stats';
import { estimate1RM, round1, weekStart } from './utils';

const isWorking = (s: { type: string; completed: boolean }) =>
  s.completed && s.type !== 'warmup';

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  /** Human-readable progress, e.g. "12 / 25 workouts". */
  description: string;
  unlocked: boolean;
  current: number;
  target: number;
}

type Metric = 'workouts' | 'volume' | 'streak' | 'variety' | 'sets';

interface TierDef {
  metric: Metric;
  noun: (unit: Unit) => string;
  tiers: [target: number, icon: string, title: string][];
}

const DEFS: TierDef[] = [
  {
    metric: 'workouts',
    noun: () => 'workouts',
    tiers: [
      [1, '🎉', 'First Workout'],
      [5, '🏋️', 'Getting Started'],
      [10, '🏋️', 'Regular'],
      [25, '🔥', 'Committed'],
      [50, '🔥', 'Dedicated'],
      [100, '💯', 'Century Club'],
      [200, '🏆', 'Iron Veteran'],
    ],
  },
  {
    metric: 'volume',
    noun: (u) => `${u} lifted`,
    tiers: [
      [1000, '💪', 'Ton Lifted'],
      [10000, '💪', '10k Club'],
      [50000, '🦾', '50k Club'],
      [100000, '🦍', '100k Club'],
      [500000, '🏅', 'Half-Million'],
      [1000000, '👑', 'Millionaire'],
    ],
  },
  {
    metric: 'streak',
    noun: () => 'week streak',
    tiers: [
      [2, '📅', '2-Week Streak'],
      [4, '📅', 'Month Strong'],
      [8, '🔥', '8-Week Streak'],
      [12, '🔥', 'Quarter Streak'],
      [26, '🏅', 'Half-Year Hero'],
      [52, '👑', 'Year-Round'],
    ],
  },
  {
    metric: 'variety',
    noun: () => 'exercises',
    tiers: [
      [5, '🎯', 'Explorer'],
      [15, '🎯', 'Well-Rounded'],
      [30, '🧭', 'Exercise Buff'],
    ],
  },
  {
    metric: 'sets',
    noun: () => 'sets',
    tiers: [
      [100, '✅', '100 Sets'],
      [500, '✅', '500 Sets'],
      [1000, '🏅', '1000 Sets'],
    ],
  },
];

/** Longest run of consecutive calendar weeks that contain a workout. */
export function bestWeeklyStreak(workouts: Workout[]): number {
  const weeks = new Set<number>();
  for (const w of workouts)
    weeks.add(weekStart(new Date(w.startedAt)).getTime());
  const sorted = [...weeks].sort((a, b) => a - b);
  const WEEK = 7 * 86400000;
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const t of sorted) {
    run = prev !== null && t - prev === WEEK ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

/** All milestone trophies with their unlocked state and progress. */
export function computeAchievements(
  workouts: Workout[],
  unit: Unit,
): Achievement[] {
  let volume = 0;
  let sets = 0;
  const exercises = new Set<string>();
  for (const w of workouts) {
    volume += workoutVolume(w);
    sets += workoutSetCount(w);
    for (const e of w.exercises) exercises.add(e.exerciseId);
  }
  const values: Record<Metric, number> = {
    workouts: workouts.length,
    volume: Math.round(volume),
    streak: bestWeeklyStreak(workouts),
    variety: exercises.size,
    sets,
  };

  const out: Achievement[] = [];
  for (const def of DEFS) {
    const value = values[def.metric];
    for (const [target, icon, title] of def.tiers) {
      out.push({
        id: `${def.metric}-${target}`,
        icon,
        title,
        description: `${value.toLocaleString()} / ${target.toLocaleString()} ${def.noun(unit)}`,
        unlocked: value >= target,
        current: value,
        target,
      });
    }
  }
  return out;
}

export interface WorkoutRecord {
  exerciseId: string;
  kind: 'e1RM' | 'weight';
  value: number;
}

function priorBests(
  workouts: Workout[],
  exerciseId: string,
): { e1RM: number; weight: number } {
  let e1RM = 0;
  let weight = 0;
  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      for (const s of ex.sets) {
        if (!isWorking(s)) continue;
        if (s.weight > weight) weight = s.weight;
        const e = estimate1RM(s.weight, s.reps);
        if (e > e1RM) e1RM = e;
      }
    }
  }
  return { e1RM, weight };
}

/**
 * Which exercises set a new personal record in `finished`, compared with all
 * `prior` workouts. Reports the strongest record per exercise (estimated 1RM
 * beats a raw weight PR). Used for the post-workout trophy celebration.
 */
export function workoutRecords(
  finished: Workout,
  prior: Workout[],
): WorkoutRecord[] {
  const records: WorkoutRecord[] = [];
  for (const ex of finished.exercises) {
    const working = ex.sets.filter(isWorking);
    if (working.length === 0) continue;
    let bestWeight = 0;
    let bestE1RM = 0;
    for (const s of working) {
      if (s.weight > bestWeight) bestWeight = s.weight;
      const e = estimate1RM(s.weight, s.reps);
      if (e > bestE1RM) bestE1RM = e;
    }
    const prev = priorBests(prior, ex.exerciseId);
    if (bestE1RM > prev.e1RM)
      records.push({ exerciseId: ex.exerciseId, kind: 'e1RM', value: round1(bestE1RM) });
    else if (bestWeight > prev.weight)
      records.push({ exerciseId: ex.exerciseId, kind: 'weight', value: bestWeight });
  }
  return records;
}
