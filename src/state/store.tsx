import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AppState,
  Exercise,
  LoggedSet,
  Settings,
  Template,
  TemplateDay,
  Workout,
} from '../types';
import { EXERCISES, EXERCISE_MAP } from '../data/exercises';
import { lastPerformance } from '../lib/stats';
import { uid } from '../lib/utils';

const STORAGE_KEY = 'workouty-state-v1';

function defaultState(): AppState {
  return {
    version: 1,
    settings: { unit: 'kg' },
    customExercises: [],
    templates: [],
    workouts: [],
    activeWorkout: null,
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as AppState;
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

interface StoreApi {
  state: AppState;
  getExercise: (id: string) => Exercise | undefined;
  allExercises: Exercise[];
  // settings
  setSettings: (s: Partial<Settings>) => void;
  // exercises
  addCustomExercise: (ex: Omit<Exercise, 'id' | 'isCustom'>) => Exercise;
  // templates
  saveTemplate: (t: Template) => void;
  deleteTemplate: (id: string) => void;
  // workouts
  startWorkout: (template?: Template, day?: TemplateDay) => void;
  startEmptyWorkout: () => void;
  updateActiveWorkout: (updater: (w: Workout) => Workout) => void;
  finishWorkout: () => void;
  discardWorkout: () => void;
  deleteWorkout: (id: string) => void;
  // backup
  exportData: () => string;
  importData: (json: string) => { ok: boolean; error?: string };
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full or unavailable — keep running in memory
    }
  }, [state]);

  const getExercise = useCallback(
    (id: string) =>
      EXERCISE_MAP.get(id) ?? state.customExercises.find((e) => e.id === id),
    [state.customExercises],
  );

  const allExercises = useMemo(
    () =>
      [...EXERCISES, ...state.customExercises].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [state.customExercises],
  );

  const setSettings = useCallback((s: Partial<Settings>) => {
    setState((st) => ({ ...st, settings: { ...st.settings, ...s } }));
  }, []);

  const addCustomExercise = useCallback(
    (ex: Omit<Exercise, 'id' | 'isCustom'>) => {
      const full: Exercise = { ...ex, id: 'custom-' + uid(), isCustom: true };
      setState((st) => ({
        ...st,
        customExercises: [...st.customExercises, full],
      }));
      return full;
    },
    [],
  );

  const saveTemplate = useCallback((t: Template) => {
    setState((st) => {
      const i = st.templates.findIndex((x) => x.id === t.id);
      const templates = [...st.templates];
      if (i >= 0) templates[i] = t;
      else templates.push(t);
      return { ...st, templates };
    });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setState((st) => ({
      ...st,
      templates: st.templates.filter((t) => t.id !== id),
    }));
  }, []);

  const startWorkout = useCallback((template?: Template, day?: TemplateDay) => {
    setState((st) => {
      if (st.activeWorkout) return st; // never clobber an in-progress workout
      const name = template && day ? `${template.name} — ${day.name}` : 'Workout';
      const w: Workout = {
        id: uid(),
        templateId: template?.id,
        dayId: day?.id,
        name,
        startedAt: new Date().toISOString(),
        exercises: (day?.exercises ?? []).map((te) => {
          const prev = lastPerformance(st.workouts, te.exerciseId);
          const nSets = Math.max(te.targetSets, 1);
          const sets: LoggedSet[] = Array.from({ length: nSets }, (_, i) => ({
            weight: prev?.sets[Math.min(i, prev.sets.length - 1)]?.weight ?? 0,
            reps: prev?.sets[Math.min(i, prev.sets.length - 1)]?.reps ?? 0,
            completed: false,
            type: 'normal',
          }));
          return { exerciseId: te.exerciseId, sets };
        }),
      };
      return { ...st, activeWorkout: w };
    });
  }, []);

  const startEmptyWorkout = useCallback(() => startWorkout(), [startWorkout]);

  const updateActiveWorkout = useCallback(
    (updater: (w: Workout) => Workout) => {
      setState((st) =>
        st.activeWorkout
          ? { ...st, activeWorkout: updater(st.activeWorkout) }
          : st,
      );
    },
    [],
  );

  const finishWorkout = useCallback(() => {
    setState((st) => {
      if (!st.activeWorkout) return st;
      const finished: Workout = {
        ...st.activeWorkout,
        finishedAt: new Date().toISOString(),
        // drop exercises where nothing was completed
        exercises: st.activeWorkout.exercises
          .map((e) => ({ ...e, sets: e.sets.filter((s) => s.completed) }))
          .filter((e) => e.sets.length > 0),
      };
      const workouts =
        finished.exercises.length > 0
          ? [...st.workouts, finished]
          : st.workouts;
      return { ...st, workouts, activeWorkout: null };
    });
  }, []);

  const discardWorkout = useCallback(() => {
    setState((st) => ({ ...st, activeWorkout: null }));
  }, []);

  const deleteWorkout = useCallback((id: string) => {
    setState((st) => ({
      ...st,
      workouts: st.workouts.filter((w) => w.id !== id),
    }));
  }, []);

  const exportData = useCallback(() => JSON.stringify(state, null, 2), [state]);

  const importData = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.workouts)) {
        return { ok: false, error: 'Not a valid Workouty backup file.' };
      }
      setState({ ...defaultState(), ...parsed });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not parse the file as JSON.' };
    }
  }, []);

  const api: StoreApi = {
    state,
    getExercise,
    allExercises,
    setSettings,
    addCustomExercise,
    saveTemplate,
    deleteTemplate,
    startWorkout,
    startEmptyWorkout,
    updateActiveWorkout,
    finishWorkout,
    discardWorkout,
    deleteWorkout,
    exportData,
    importData,
  };

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
