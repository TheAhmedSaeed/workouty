import { Exercise, MuscleGroup, Unit } from '../types';

/**
 * A single, do-it-now warm-up instruction. Kept deliberately short and
 * concrete so the user can read it at a glance and just do it.
 */
export interface WarmupStep {
  icon: string;
  title: string;
  detail?: string;
}

/** Quick dynamic drill for each muscle group the session hits. */
const MOBILITY: Record<MuscleGroup, string> = {
  chest: 'Band pull-aparts & doorway chest stretch',
  back: 'Band pull-aparts & scapular hangs',
  shoulders: 'Arm circles & band shoulder dislocates',
  biceps: 'Light arm swings & a few band curls',
  triceps: 'Overhead reach & band pressdowns',
  forearms: 'Wrist circles & gentle wrist stretches',
  quads: 'Bodyweight squats & walking lunges',
  hamstrings: 'Leg swings & hip-hinge toe touches',
  glutes: 'Glute bridges & hip circles',
  calves: 'Ankle bounces & slow calf raises',
  abs: 'Cat-cow & dead bugs',
  lower_back: 'Cat-cow & bodyweight good-mornings',
  traps: 'Shoulder shrugs & neck rolls',
};

/** Round a warm-up weight to a realistic plate jump for the unit. */
function roundToPlate(weight: number, unit: Unit): number {
  const step = unit === 'lb' ? 5 : 2.5;
  return Math.max(step, Math.round(weight / step) * step);
}

interface WarmupInput {
  exerciseId: string;
  sets: { weight: number }[];
}

/**
 * Build a warm-up tailored to today's session: light cardio, dynamic mobility
 * for the muscles you're about to train, and ramp-up sets for the main lift.
 */
export function buildWarmup(
  exercises: WarmupInput[],
  getExercise: (id: string) => Exercise | undefined,
  unit: Unit,
): WarmupStep[] {
  if (exercises.length === 0) return [];

  const steps: WarmupStep[] = [];

  // 1 — raise core temperature
  steps.push({
    icon: '🚲',
    title: '5 min easy cardio',
    detail:
      'Bike, row, or brisk walk — just enough to break a light sweat and warm up.',
  });

  // 2 — dynamic mobility for the muscles this session trains, most-used first
  const freq = new Map<MuscleGroup, number>();
  for (const we of exercises) {
    const ex = getExercise(we.exerciseId);
    if (!ex) continue;
    for (const m of ex.primaryMuscles) freq.set(m, (freq.get(m) ?? 0) + 1);
  }
  const drills: string[] = [];
  const seen = new Set<string>();
  for (const [m] of [...freq.entries()].sort((a, b) => b[1] - a[1])) {
    const d = MOBILITY[m];
    if (d && !seen.has(d)) {
      seen.add(d);
      drills.push(d);
    }
    if (drills.length >= 4) break;
  }
  if (drills.length > 0)
    steps.push({
      icon: '🤸',
      title: 'Dynamic mobility (1–2 min)',
      detail: drills.join(' · '),
    });

  // 3 — ramp-up sets for the first weighted (non-bodyweight) lift
  const main = exercises.find((we) => {
    const ex = getExercise(we.exerciseId);
    return ex && ex.category !== 'bodyweight';
  });
  if (main) {
    const ex = getExercise(main.exerciseId)!;
    const work = main.sets.reduce((m, s) => Math.max(m, s.weight || 0), 0);
    const minHeavy = unit === 'lb' ? 40 : 20;
    if (work >= minHeavy) {
      const plan = [
        { pct: 0.4, reps: 8 },
        { pct: 0.6, reps: 5 },
        { pct: 0.8, reps: 3 },
      ]
        .map(
          (s) => `${roundToPlate(work * s.pct, unit)} ${unit} × ${s.reps}`,
        )
        .join(', ');
      steps.push({
        icon: '🏋️',
        title: `Ramp-up sets — ${ex.name}`,
        detail: `Build up to your working weight (${work} ${unit}): ${plan}. Then start your working sets.`,
      });
    } else {
      steps.push({
        icon: '🏋️',
        title: `Warm-up sets — ${ex.name}`,
        detail:
          '1–2 light sets of 8–10 reps to groove the movement before your working sets.',
      });
    }
  }

  return steps;
}
