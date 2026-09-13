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
  /**
   * Optional exercise: do it only when it makes sense on the day. The workout
   * screen flags it and shows `notes` so you can decide each time.
   */
  optional?: boolean;
  /** Note shown with the exercise — e.g. when to include an optional one. */
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
  /**
   * When the plan was last edited. Drives newest-wins conflict resolution when
   * two devices sync — without it, an edit made on one device would be silently
   * overwritten by another device's older copy (same id).
   */
  updatedAt?: string;
  archived?: boolean;
  /** Folder this plan belongs to (undefined = ungrouped). */
  folderId?: string;
}

/** A named folder for grouping plans on the home screen. */
export interface PlanFolder {
  id: string;
  name: string;
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

export interface Workout {
  id: string;
  templateId?: string;
  dayId?: string;
  name: string;
  startedAt: string;
  finishedAt?: string;
  exercises: WorkoutExercise[];
  /** Total seconds spent on the rest timer during this workout. */
  restSeconds?: number;
  /**
   * Marked as a below-par / off day. Still saved and counted for adherence,
   * but its numbers are ignored as the "last time" reference so a bad day
   * doesn't drag down next session's pre-filled weights and hints.
   */
  offDay?: boolean;
}

export type Unit = 'kg' | 'lb';
/** Unit for tape-measure body measurements. */
export type LengthUnit = 'cm' | 'in';

/** Numeric body-measurement fields (all optional per entry). */
export type MeasureKey =
  | 'weight'
  | 'bodyFat'
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'arm'
  | 'forearm'
  | 'thigh'
  | 'calf';

/** One dated set of body measurements (tape + weight). */
export interface Measurement {
  id: string;
  date: string; // 'YYYY-MM-DD'
  weight?: number;
  bodyFat?: number; // %
  neck?: number;
  shoulders?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  arm?: number;
  forearm?: number;
  thigh?: number;
  calf?: number;
  notes?: string;
}

/** The kind of cardio done in a session. */
export type CardioType =
  | 'run'
  | 'walk'
  | 'cycle'
  | 'row'
  | 'elliptical'
  | 'swim'
  | 'hike'
  | 'jump_rope'
  | 'stairmaster'
  | 'other';

/** One logged cardio session on a given day. */
export interface CardioSession {
  id: string;
  date: string; // 'YYYY-MM-DD'
  type: CardioType;
  /** Duration in minutes. */
  minutes: number;
  /** Optional distance covered, in kilometres. */
  distanceKm?: number;
  notes?: string;
}

export interface Settings {
  unit: Unit;
  /** Unit for body measurements (cm or inches). */
  measureUnit?: LengthUnit;
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
  /** The plan you're currently running — drives the weekly adherence tracker. */
  currentTemplateId?: string;
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
  /** Folders for organising plans (order = array order). */
  folders?: PlanFolder[];
  workouts: Workout[]; // finished workouts, newest last
  activeWorkout: Workout | null;
  /** Dated body measurements (tape + weight), for tracking body composition. */
  measurements?: Measurement[];
  /** Logged cardio sessions (running, cycling, …) for week-by-week tracking. */
  cardio?: CardioSession[];
  /**
   * Persistent per-exercise notes, keyed by exercise id. Unlike a workout's
   * per-set notes these stick to the exercise, so a reminder like "weight
   * excludes the bar" shows up every time you train that exercise.
   */
  exerciseNotes?: Record<string, string>;
  /** Tombstones so deletions propagate across synced devices. */
  deleted?: { workouts: string[]; templates: string[] };
}
