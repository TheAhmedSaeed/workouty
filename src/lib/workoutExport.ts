import { Exercise, Unit, Workout } from '../types';
import { exerciseVolume, workoutVolume } from './stats';

/**
 * Build a self-contained, AI-friendly export of just the workout log: exercise
 * names and volumes are resolved so the file needs no app internals to read.
 */
export function buildWorkoutsExport(
  workouts: Workout[],
  unit: Unit,
  getExercise: (id: string) => Exercise | undefined,
  exportedAt: string,
): string {
  const data = {
    app: 'Workouty',
    exportedAt,
    unit,
    note: 'Volume = weight × reps summed over completed working sets. Weights are in the unit above.',
    workoutCount: workouts.length,
    workouts: workouts.map((w) => ({
      date: w.startedAt,
      name: w.name,
      durationMinutes: w.finishedAt
        ? Math.round(
            (new Date(w.finishedAt).getTime() -
              new Date(w.startedAt).getTime()) /
              60000,
          )
        : undefined,
      restMinutes: w.restSeconds
        ? Math.round((w.restSeconds / 60) * 10) / 10
        : undefined,
      totalVolume: workoutVolume(w),
      exercises: w.exercises.map((e) => ({
        exercise: getExercise(e.exerciseId)?.name ?? e.exerciseId,
        volume: exerciseVolume(e.sets),
        sets: e.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
      })),
    })),
  };
  return JSON.stringify(data, null, 2);
}
