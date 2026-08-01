import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  Exercise,
  ExerciseProgression,
  LoggedSet,
  Measurement,
  Settings,
  Template,
  TemplateDay,
  Workout,
} from '../types';
import { EXERCISES, EXERCISE_MAP } from '../data/exercises';
import { lastPerformance } from '../lib/stats';
import { buildWorkoutsExport } from '../lib/workoutExport';
import { nextWeight } from '../lib/progression';
import { uid } from '../lib/utils';
import {
  SyncConfig,
  getClient,
  getSyncConfig,
  mergeStates,
  setSyncConfig,
  stripForSync,
} from '../lib/sync';

const STORAGE_KEY = 'workouty-state-v1';

function defaultState(): AppState {
  return {
    version: 1,
    settings: { unit: 'kg' },
    customExercises: [],
    templates: [],
    workouts: [],
    activeWorkout: null,
    measurements: [],
    exerciseNotes: {},
    progressions: {},
    deleted: { workouts: [], templates: [] },
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
  /** Edit a custom exercise you created (rename, muscles, etc.). */
  updateCustomExercise: (
    id: string,
    patch: Partial<Omit<Exercise, 'id' | 'isCustom'>>,
  ) => void;
  /** Persistent note shown every time this exercise is trained. */
  exerciseNote: (exerciseId: string) => string;
  setExerciseNote: (exerciseId: string, note: string) => void;
  /** Per-exercise progression (increment + next-time target). */
  getProgression: (exerciseId: string) => ExerciseProgression;
  setProgression: (
    exerciseId: string,
    patch: Partial<ExerciseProgression>,
  ) => void;
  // templates
  saveTemplate: (t: Template) => void;
  deleteTemplate: (id: string) => void;
  /** Reorder a plan up (-1) or down (+1) within its folder group. */
  moveTemplate: (id: string, dir: -1 | 1) => void;
  /** Move a plan into a folder (or undefined to ungroup it). */
  setTemplateFolder: (id: string, folderId?: string) => void;
  /** Hide/show a plan (hidden plans live in a collapsed "Hidden" section). */
  setTemplateArchived: (id: string, archived: boolean) => void;
  // plan folders
  addFolder: (name: string) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  moveFolder: (id: string, dir: -1 | 1) => void;
  // workouts
  startWorkout: (template?: Template, day?: TemplateDay) => void;
  startEmptyWorkout: () => void;
  updateActiveWorkout: (updater: (w: Workout) => Workout) => void;
  finishWorkout: () => void;
  discardWorkout: () => void;
  deleteWorkout: (id: string) => void;
  // body measurements
  addMeasurement: (m: Omit<Measurement, 'id'>) => void;
  updateMeasurement: (id: string, patch: Partial<Omit<Measurement, 'id'>>) => void;
  deleteMeasurement: (id: string) => void;
  // backup
  exportData: () => string;
  /** Just your logged workouts, with exercise names + volumes resolved. */
  exportWorkouts: () => string;
  importData: (json: string) => { ok: boolean; error?: string };
  // cloud sync
  sync: SyncApi;
}

export interface SyncApi {
  configured: boolean;
  userEmail: string | null;
  syncing: boolean;
  lastSync: Date | null;
  error: string | null;
  configure: (config: SyncConfig | null) => void;
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<string | null>;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full or unavailable — keep running in memory
    }
  }, [state]);

  // ── Cloud sync (optional, user's own Supabase project) ─────────────────
  const [syncConfigured, setSyncConfigured] = useState(() => !!getSyncConfig());
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncNow = useCallback(async (): Promise<string | null> => {
    const client = getClient();
    if (!client) return 'Sync is not configured.';
    setSyncing(true);
    setSyncError(null);
    try {
      const { data: userData } = await client.auth.getUser();
      const user = userData?.user;
      if (!user) return 'Not signed in.';
      const { data, error } = await client
        .from('app_state')
        .select('state')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      let next = stateRef.current;
      if (data?.state) next = mergeStates(stateRef.current, data.state as AppState);
      setState(next);
      const { error: upError } = await client.from('app_state').upsert({
        user_id: user.id,
        state: stripForSync(next),
        updated_at: new Date().toISOString(),
      });
      if (upError) throw new Error(upError.message);
      setLastSync(new Date());
      return null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sync failed.';
      setSyncError(msg);
      return msg;
    } finally {
      setSyncing(false);
    }
  }, []);

  // watch auth state; pull + merge as soon as we're signed in
  useEffect(() => {
    if (!syncConfigured) {
      setUserEmail(null);
      return;
    }
    const client = getClient();
    if (!client) return;
    client.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email ?? null;
      setUserEmail(email);
      if (email) syncNow();
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [syncConfigured, syncNow]);

  const pushNow = useCallback(async () => {
    const client = getClient();
    if (!client) return;
    const { data } = await client.auth.getUser();
    if (!data?.user) return;
    const { error } = await client.from('app_state').upsert({
      user_id: data.user.id,
      state: stripForSync(stateRef.current),
      updated_at: new Date().toISOString(),
    });
    if (error) setSyncError(error.message);
    else {
      setSyncError(null);
      setLastSync(new Date());
    }
  }, []);

  // auto-push (debounced) whenever state changes while signed in
  useEffect(() => {
    if (!userEmail) return;
    const t = setTimeout(pushNow, 2500);
    return () => clearTimeout(t);
  }, [state, userEmail, pushNow]);

  // flush immediately when the app is backgrounded or closed, so the
  // debounce window can't swallow the last change
  useEffect(() => {
    if (!userEmail) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden') pushNow();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [userEmail, pushNow]);

  const sync: SyncApi = {
    configured: syncConfigured,
    userEmail,
    syncing,
    lastSync,
    error: syncError,
    configure: (config) => {
      setSyncConfig(config);
      setSyncConfigured(!!config);
      setSyncError(null);
      if (!config) setUserEmail(null);
    },
    signUp: async (email, password) => {
      const client = getClient();
      if (!client) return 'Sync is not configured.';
      const { error } = await client.auth.signUp({ email, password });
      if (error) return error.message;
      await syncNow();
      return null;
    },
    signIn: async (email, password) => {
      const client = getClient();
      if (!client) return 'Sync is not configured.';
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) return error.message;
      await syncNow();
      return null;
    },
    signOut: async () => {
      await getClient()?.auth.signOut();
      setUserEmail(null);
    },
    syncNow,
  };

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
    setState((st) => ({
      ...st,
      settings: { ...st.settings, ...s, updatedAt: new Date().toISOString() },
    }));
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

  const updateCustomExercise = useCallback(
    (id: string, patch: Partial<Omit<Exercise, 'id' | 'isCustom'>>) => {
      setState((st) => ({
        ...st,
        customExercises: st.customExercises.map((e) =>
          e.id === id ? { ...e, ...patch, id: e.id, isCustom: true } : e,
        ),
      }));
    },
    [],
  );

  const exerciseNote = useCallback(
    (exerciseId: string) => state.exerciseNotes?.[exerciseId] ?? '',
    [state.exerciseNotes],
  );

  const setExerciseNote = useCallback((exerciseId: string, note: string) => {
    setState((st) => {
      const next = { ...(st.exerciseNotes ?? {}) };
      const trimmed = note.trim();
      if (trimmed) next[exerciseId] = trimmed;
      else delete next[exerciseId];
      return { ...st, exerciseNotes: next };
    });
  }, []);

  const getProgression = useCallback(
    (exerciseId: string): ExerciseProgression =>
      state.progressions?.[exerciseId] ?? {},
    [state.progressions],
  );

  const setProgression = useCallback(
    (exerciseId: string, patch: Partial<ExerciseProgression>) => {
      setState((st) => {
        const next = { ...(st.progressions ?? {}) };
        const merged: ExerciseProgression = { ...next[exerciseId], ...patch };
        // drop empty / non-positive fields so the entry can be cleaned up
        if (!merged.increment || merged.increment <= 0) delete merged.increment;
        if (!merged.target || merged.target <= 0) delete merged.target;
        if (merged.increment == null && merged.target == null)
          delete next[exerciseId];
        else next[exerciseId] = merged;
        return { ...st, progressions: next };
      });
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
      deleted: {
        workouts: st.deleted?.workouts ?? [],
        templates: [...(st.deleted?.templates ?? []), id],
      },
    }));
  }, []);

  // Reorder within the same folder group by swapping with the nearest neighbour
  // that shares the folder, so display order (which filters by folder) changes.
  const moveTemplate = useCallback((id: string, dir: -1 | 1) => {
    setState((st) => {
      const arr = [...st.templates];
      const i = arr.findIndex((t) => t.id === id);
      if (i < 0) return st;
      const folderId = arr[i].folderId;
      let j = i + dir;
      while (j >= 0 && j < arr.length && arr[j].folderId !== folderId) j += dir;
      if (j < 0 || j >= arr.length) return st;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...st, templates: arr };
    });
  }, []);

  const setTemplateFolder = useCallback((id: string, folderId?: string) => {
    setState((st) => ({
      ...st,
      templates: st.templates.map((t) =>
        t.id === id ? { ...t, folderId } : t,
      ),
    }));
  }, []);

  const setTemplateArchived = useCallback((id: string, archived: boolean) => {
    setState((st) => ({
      ...st,
      templates: st.templates.map((t) =>
        t.id === id ? { ...t, archived } : t,
      ),
    }));
  }, []);

  const addFolder = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((st) => ({
      ...st,
      folders: [...(st.folders ?? []), { id: uid(), name: trimmed }],
    }));
  }, []);

  const renameFolder = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((st) => ({
      ...st,
      folders: (st.folders ?? []).map((f) =>
        f.id === id ? { ...f, name: trimmed } : f,
      ),
    }));
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setState((st) => ({
      ...st,
      folders: (st.folders ?? []).filter((f) => f.id !== id),
      // keep the plans — just move them back to ungrouped
      templates: st.templates.map((t) =>
        t.folderId === id ? { ...t, folderId: undefined } : t,
      ),
    }));
  }, []);

  const moveFolder = useCallback((id: string, dir: -1 | 1) => {
    setState((st) => {
      const arr = [...(st.folders ?? [])];
      const i = arr.findIndex((f) => f.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return st;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...st, folders: arr };
    });
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
          const prog = st.progressions?.[te.exerciseId];
          const nSets = Math.max(te.targetSets, 1);
          const sets: LoggedSet[] = Array.from({ length: nSets }, (_, i) => {
            const pw = prev?.sets[Math.min(i, prev.sets.length - 1)]?.weight ?? 0;
            return {
              // only bump the weight if the user chose to (a target is set);
              // otherwise repeat last time's weight — never auto-increase
              weight: nextWeight(pw, {
                target: prog?.target,
                progress: false,
                increment: 0,
              }),
              // leave reps blank when hiding last time, so they don't anchor you
              reps: st.settings.hidePrevious
                ? 0
                : (prev?.sets[Math.min(i, prev.sets.length - 1)]?.reps ?? 0),
              completed: false,
              type: 'normal',
            };
          });
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
      // clear any next-time target you reached this session
      let progressions = st.progressions;
      if (progressions) {
        let changed = false;
        const next = { ...progressions };
        for (const e of finished.exercises) {
          const t = next[e.exerciseId]?.target;
          if (t != null && e.sets.some((s) => s.weight >= t)) {
            const { increment } = next[e.exerciseId];
            if (increment) next[e.exerciseId] = { increment };
            else delete next[e.exerciseId];
            changed = true;
          }
        }
        if (changed) progressions = next;
      }
      return { ...st, workouts, activeWorkout: null, progressions };
    });
  }, []);

  const discardWorkout = useCallback(() => {
    setState((st) => ({ ...st, activeWorkout: null }));
  }, []);

  const deleteWorkout = useCallback((id: string) => {
    setState((st) => ({
      ...st,
      workouts: st.workouts.filter((w) => w.id !== id),
      deleted: {
        workouts: [...(st.deleted?.workouts ?? []), id],
        templates: st.deleted?.templates ?? [],
      },
    }));
  }, []);

  const addMeasurement = useCallback((m: Omit<Measurement, 'id'>) => {
    const full: Measurement = { ...m, id: uid() };
    setState((st) => ({
      ...st,
      measurements: [...(st.measurements ?? []), full],
    }));
  }, []);

  const updateMeasurement = useCallback(
    (id: string, patch: Partial<Omit<Measurement, 'id'>>) => {
      setState((st) => ({
        ...st,
        measurements: (st.measurements ?? []).map((m) =>
          m.id === id ? { ...m, ...patch, id } : m,
        ),
      }));
    },
    [],
  );

  const deleteMeasurement = useCallback((id: string) => {
    setState((st) => ({
      ...st,
      measurements: (st.measurements ?? []).filter((m) => m.id !== id),
    }));
  }, []);

  const exportData = useCallback(() => JSON.stringify(state, null, 2), [state]);

  // Just the workout log, enriched with exercise names + volumes so it's
  // self-contained and easy to hand to an AI for progress analysis.
  const exportWorkouts = useCallback(
    () =>
      buildWorkoutsExport(
        state.workouts,
        state.settings.unit,
        getExercise,
        new Date().toISOString(),
      ),
    [state.workouts, state.settings.unit, getExercise],
  );

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
    updateCustomExercise,
    exerciseNote,
    setExerciseNote,
    getProgression,
    setProgression,
    saveTemplate,
    deleteTemplate,
    moveTemplate,
    setTemplateFolder,
    setTemplateArchived,
    addFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    startWorkout,
    startEmptyWorkout,
    updateActiveWorkout,
    finishWorkout,
    discardWorkout,
    deleteWorkout,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
    exportData,
    exportWorkouts,
    importData,
    sync,
  };

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
