import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { AppState } from '../types';

/**
 * Cloud sync via the user's own free Supabase project. The whole app state
 * is stored as one JSON row per user; devices merge on pull so workouts
 * logged on different devices are never lost.
 */

const CONFIG_KEY = 'workouty-sync-config';

export interface SyncConfig {
  url: string;
  anonKey: string;
}

export function getSyncConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    return c?.url && c?.anonKey ? c : null;
  } catch {
    return null;
  }
}

export function setSyncConfig(config: SyncConfig | null): void {
  if (config) localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  else localStorage.removeItem(CONFIG_KEY);
  client = undefined; // force re-create with new config
}

let client: SupabaseClient | null | undefined;

export function getClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const config = getSyncConfig();
  client = config ? createClient(config.url, config.anonKey) : null;
  return client;
}

const TOMBSTONE_CAP = 1000;

/**
 * Merge two app states (this device + cloud). Collections are unioned by id
 * with local winning on conflicts; deletions are propagated via tombstones;
 * settings and the in-progress workout stay local.
 */
export function mergeStates(local: AppState, remote: AppState): AppState {
  const delWorkouts = new Set([
    ...(local.deleted?.workouts ?? []),
    ...(remote.deleted?.workouts ?? []),
  ]);
  const delTemplates = new Set([
    ...(local.deleted?.templates ?? []),
    ...(remote.deleted?.templates ?? []),
  ]);

  const unionById = <T extends { id: string }>(
    a: T[],
    b: T[],
    deleted: Set<string>,
  ): T[] => {
    const map = new Map<string, T>();
    for (const x of b ?? []) map.set(x.id, x);
    for (const x of a ?? []) map.set(x.id, x); // local wins on conflict
    return [...map.values()].filter((x) => !deleted.has(x.id));
  };

  // settings follow whichever device changed them most recently
  const settings =
    (remote.settings?.updatedAt ?? '') > (local.settings?.updatedAt ?? '')
      ? remote.settings
      : local.settings;

  return {
    ...local,
    settings,
    workouts: unionById(local.workouts, remote.workouts ?? [], delWorkouts).sort(
      (a, b) => a.startedAt.localeCompare(b.startedAt),
    ),
    templates: unionById(local.templates, remote.templates ?? [], delTemplates),
    customExercises: unionById(
      local.customExercises,
      remote.customExercises ?? [],
      new Set(),
    ),
    deleted: {
      workouts: [...delWorkouts].slice(-TOMBSTONE_CAP),
      templates: [...delTemplates].slice(-TOMBSTONE_CAP),
    },
  };
}

/** What gets uploaded — the in-progress workout stays on the device. */
export function stripForSync(state: AppState): AppState {
  return { ...state, activeWorkout: null };
}

/** SQL the user runs once in the Supabase SQL editor. */
export const SETUP_SQL = `-- Workouty sync table (run once in Supabase SQL Editor)
create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

create policy "select own state" on public.app_state
  for select using (auth.uid() = user_id);
create policy "insert own state" on public.app_state
  for insert with check (auth.uid() = user_id);
create policy "update own state" on public.app_state
  for update using (auth.uid() = user_id);`;
