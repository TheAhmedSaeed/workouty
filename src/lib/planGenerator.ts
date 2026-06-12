import { Template, TemplateDay, TemplateExercise } from '../types';
import { uid } from './utils';

export type Goal = 'strength' | 'hypertrophy' | 'general';
export type Experience = 'beginner' | 'intermediate' | 'advanced';

export interface GeneratorOptions {
  daysPerWeek: 2 | 3 | 4 | 5 | 6;
  goal: Goal;
  experience: Experience;
}

interface Slot {
  exerciseId: string;
  /** 'main' = heavy compound, 'secondary' = compound accessory, 'iso' = isolation */
  role: 'main' | 'secondary' | 'iso';
}

function reps(goal: Goal, role: Slot['role']): [number, number] {
  if (role === 'main') {
    if (goal === 'strength') return [3, 5];
    if (goal === 'hypertrophy') return [6, 10];
    return [5, 8];
  }
  if (role === 'secondary') {
    if (goal === 'strength') return [5, 8];
    return [8, 12];
  }
  return goal === 'strength' ? [8, 12] : [10, 15];
}

function sets(experience: Experience, role: Slot['role']): number {
  const base = role === 'main' ? 4 : 3;
  if (experience === 'beginner') return base - 1;
  if (experience === 'advanced' && role !== 'main') return base + 1;
  return base;
}

function day(
  name: string,
  slots: Slot[],
  opts: GeneratorOptions,
  maxExercises: number,
): TemplateDay {
  const trimmed = slots.slice(0, maxExercises);
  const exercises: TemplateExercise[] = trimmed.map((s) => {
    const [lo, hi] = reps(opts.goal, s.role);
    return {
      exerciseId: s.exerciseId,
      targetSets: sets(opts.experience, s.role),
      targetRepsMin: lo,
      targetRepsMax: hi,
    };
  });
  return { id: uid(), name, exercises };
}

const m = (exerciseId: string): Slot => ({ exerciseId, role: 'main' });
const s = (exerciseId: string): Slot => ({ exerciseId, role: 'secondary' });
const i = (exerciseId: string): Slot => ({ exerciseId, role: 'iso' });

// ── Day blueprints (exercise ids refer to the built-in database) ──────────
const PUSH_A: Slot[] = [
  m('bench-press'),
  s('db-shoulder-press'),
  s('incline-db-press'),
  i('lateral-raise'),
  i('triceps-pushdown'),
  i('overhead-triceps-extension'),
];
const PUSH_B: Slot[] = [
  m('overhead-press'),
  s('incline-bench-press'),
  s('dips'),
  i('cable-fly'),
  i('lateral-raise'),
  i('skull-crusher'),
];
const PULL_A: Slot[] = [
  m('barbell-row'),
  s('lat-pulldown'),
  s('seated-cable-row'),
  i('face-pull'),
  i('barbell-curl'),
  i('hammer-curl'),
];
const PULL_B: Slot[] = [
  m('deadlift'),
  s('pull-up'),
  s('db-row'),
  i('rear-delt-fly'),
  i('db-curl'),
  i('cable-curl'),
];
const LEGS_A: Slot[] = [
  m('squat'),
  s('romanian-deadlift'),
  s('leg-press'),
  i('leg-curl'),
  i('leg-extension'),
  i('standing-calf-raise'),
];
const LEGS_B: Slot[] = [
  m('front-squat'),
  s('hip-thrust'),
  s('bulgarian-split-squat'),
  i('leg-curl'),
  i('seated-calf-raise'),
  i('hanging-leg-raise'),
];
const UPPER_A: Slot[] = [
  m('bench-press'),
  m('barbell-row'),
  s('db-shoulder-press'),
  s('lat-pulldown'),
  i('barbell-curl'),
  i('triceps-pushdown'),
];
const UPPER_B: Slot[] = [
  m('overhead-press'),
  s('incline-db-press'),
  s('pull-up'),
  s('seated-cable-row'),
  i('lateral-raise'),
  i('hammer-curl'),
];
const LOWER_A: Slot[] = [
  m('squat'),
  s('romanian-deadlift'),
  s('leg-press'),
  i('leg-curl'),
  i('standing-calf-raise'),
  i('crunch-cable'),
];
const LOWER_B: Slot[] = [
  m('deadlift'),
  s('hack-squat'),
  s('hip-thrust'),
  i('leg-extension'),
  i('seated-calf-raise'),
  i('plank'),
];
const FULL_A: Slot[] = [
  m('squat'),
  m('bench-press'),
  s('barbell-row'),
  i('lateral-raise'),
  i('barbell-curl'),
  i('plank'),
];
const FULL_B: Slot[] = [
  m('deadlift'),
  m('overhead-press'),
  s('lat-pulldown'),
  s('leg-press'),
  i('triceps-pushdown'),
  i('crunch-cable'),
];
const FULL_C: Slot[] = [
  m('front-squat'),
  s('incline-db-press'),
  s('pull-up'),
  s('romanian-deadlift'),
  i('lateral-raise'),
  i('hanging-leg-raise'),
];

export function generatePlan(opts: GeneratorOptions): Template {
  // Beginners get fewer exercises per day; advanced get the full menu.
  const maxEx =
    opts.experience === 'beginner' ? 5 : opts.experience === 'advanced' ? 6 : 6;

  let name: string;
  let description: string;
  let days: TemplateDay[];

  switch (opts.daysPerWeek) {
    case 2:
      name = 'Full Body ×2';
      description = 'Two full-body sessions hitting every major muscle twice a week.';
      days = [
        day('Full Body A', FULL_A, opts, maxEx),
        day('Full Body B', FULL_B, opts, maxEx),
      ];
      break;
    case 3:
      name = 'Full Body ×3';
      description =
        'Three rotating full-body days — the most efficient setup for 3 days a week.';
      days = [
        day('Full Body A', FULL_A, opts, maxEx),
        day('Full Body B', FULL_B, opts, maxEx),
        day('Full Body C', FULL_C, opts, maxEx),
      ];
      break;
    case 4:
      name = 'Upper / Lower';
      description =
        'Upper and lower body alternated, each trained twice a week.';
      days = [
        day('Upper A', UPPER_A, opts, maxEx),
        day('Lower A', LOWER_A, opts, maxEx),
        day('Upper B', UPPER_B, opts, maxEx),
        day('Lower B', LOWER_B, opts, maxEx),
      ];
      break;
    case 5:
      name = 'PPL + Upper / Lower';
      description =
        'Push, Pull, Legs followed by an Upper and a Lower day — everything hit roughly twice a week.';
      days = [
        day('Push', PUSH_A, opts, maxEx),
        day('Pull', PULL_A, opts, maxEx),
        day('Legs', LEGS_A, opts, maxEx),
        day('Upper', UPPER_B, opts, maxEx),
        day('Lower', LOWER_B, opts, maxEx),
      ];
      break;
    case 6:
    default:
      name = 'Push Pull Legs ×2';
      description =
        'The classic PPL run twice through the week, with A and B variations.';
      days = [
        day('Push A', PUSH_A, opts, maxEx),
        day('Pull A', PULL_A, opts, maxEx),
        day('Legs A', LEGS_A, opts, maxEx),
        day('Push B', PUSH_B, opts, maxEx),
        day('Pull B', PULL_B, opts, maxEx),
        day('Legs B', LEGS_B, opts, maxEx),
      ];
      break;
  }

  const goalLabel =
    opts.goal === 'strength'
      ? 'strength focus'
      : opts.goal === 'hypertrophy'
        ? 'muscle-building focus'
        : 'general fitness';

  return {
    id: uid(),
    name,
    description: `${description} Generated for ${opts.daysPerWeek} days/week, ${goalLabel}, ${opts.experience} level.`,
    days,
    createdAt: new Date().toISOString(),
  };
}
