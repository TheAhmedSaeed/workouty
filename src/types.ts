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
  /** When settings last changed — newer side wins when devices sync. */
  updatedAt?: string;
}

export interface AppState {
  version: 1;
  settings: Settings;
  customExercises: Exercise[];
  templates: Template[];
  workouts: Workout[]; // finished workouts, newest last
  activeWorkout: Workout | null;
  /** Tombstones so deletions propagate across synced devices. */
  deleted?: { workouts: string[]; templates: string[] };
}
