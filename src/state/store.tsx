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
  LoggedSet,
  Settings,
  Template,
  TemplateDay,
  Workout,
} from '../types';
import { EXERCISES, EXERCISE_MAP } from '../data/exercises';
import { lastPerformance } from '../lib/stats';
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
      deleted: {
        workouts: [...(st.deleted?.workouts ?? []), id],
        templates: st.deleted?.templates ?? [],
      },
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
    sync,
  };

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
