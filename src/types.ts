export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'lower_back'
  | 'traps';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'lower_back',
  'traps',
];

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back (lats)',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs / Core',
  lower_back: 'Lower back',
  traps: 'Traps',
};

export type ExerciseCategory =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'other';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  /** Plain-language explanation of what the exercise does / targets. */
  description: string;
  isCustom?: boolean;
}

export interface TemplateExercise {
  exerciseId: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  notes?: string;
}

export interface TemplateDay {
  id: string;
  name: string; // e.g. "Push", "Upper A"
  exercises: TemplateExercise[];
}

/** A program / plan, e.g. "Push Pull Legs". */
export interface Template {
  id: string;
  name: string;
  description?: string;
  days: TemplateDay[];
  createdAt: string;
  archived?: boolean;
}

export type SetType = 'normal' | 'warmup' | 'failure' | 'drop';

export interface LoggedSet {
  weight: number;
  reps: number;
  completed: boolean;
  type: SetType;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: LoggedSet[];
  notes?: string;
}

/**
 * Progression settings for an exercise, keyed by exercise id in app state.
 * Lets the app help you add weight over time: it can auto-suggest a bump when
 * you've hit all your reps, and you can also set an explicit target to chase.
 */
export interface ExerciseProgression {
  /** Weight step used when auto-suggesting a heavier next session. */
  increment?: number;
  /** Manual weight to aim for next time; cleared once you hit it. */
  target?: number;
}

export interface Workout {
  id: string;
  templateId?: string;
  dayId?: string;
  name: string;
  startedAt: string;
  finishedAt?: string;
  exercises: WorkoutExercise[];
}

export type Unit = 'kg' | 'lb';

export interface Settings {
  unit: Unit;
  /**
   * Seconds to rest after completing a set. The workout screen starts a
   * countdown each time you tick a set off. 0 disables the rest timer.
   */
  restTimerSeconds?: number;
  /** Show a browser notification when the rest countdown reaches zero. */
  restNotify?: boolean;
  /**
   * Hide last time's performance while logging (the "last time" line, the
   * Previous column and pre-filled reps), so past numbers don't anchor you.
   */
  hidePrevious?: boolean;
  /** When settings last changed — newer side wins when devices sync. */
  updatedAt?: string;
}

/** Default rest-timer length when the user hasn't picked one. */
export const DEFAULT_REST_SECONDS = 90;

export interface AppState {
  version: 1;
  settings: Settings;
  customExercises: Exercise[];
  templates: Template[];
  workouts: Workout[]; // finished workouts, newest last
  activeWorkout: Workout | null;
  /**
   * Persistent per-exercise notes, keyed by exercise id. Unlike a workout's
   * per-set notes these stick to the exercise, so a reminder like "weight
   * excludes the bar" shows up every time you train that exercise.
   */
  exerciseNotes?: Record<string, string>;
  /** Per-exercise progression settings (increment + next-time target). */
  progressions?: Record<string, ExerciseProgression>;
  /** Tombstones so deletions propagate across synced devices. */
  deleted?: { workouts: string[]; templates: string[] };
}
