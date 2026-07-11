import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { ExercisePicker } from '../components/ExercisePicker';
import { ExerciseInfo } from '../components/ExerciseInfo';
import { Modal } from '../components/Modal';
import { NumberInput } from '../components/NumberInput';
import {
  lastPerformance,
  personalRecord,
  workoutSetCount,
  workoutVolume,
} from '../lib/stats';
import { incrementFor, nextWeight } from '../lib/progression';
import { buildWarmup, WarmupStep } from '../lib/warmup';
import { similarExercises } from '../lib/similar';
import { workoutRecords, WorkoutRecord } from '../lib/trophies';
import { formatDate, formatRest } from '../lib/utils';
import { DEFAULT_REST_SECONDS, Exercise, MUSCLE_LABELS } from '../types';

// One shared AudioContext, unlocked on a user gesture (ticking a set), so the
// rest-over chime can still play later when the countdown reaches zero.
let audioCtx: AudioContext | null = null;
function ensureAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}
function playRestDoneChime(): void {
  const ctx = ensureAudio();
  if (!ctx) return;
  const start = ctx.currentTime;
  [0, 0.2, 0.4].forEach((t) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, start + t);
    gain.gain.exponentialRampToValueAtTime(0.3, start + t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t + 0.18);
    osc.start(start + t);
    osc.stop(start + t + 0.2);
  });
}

/** Fire a "rest's up" browser notification (best-effort; the chime still plays). */
async function showRestDoneNotification(): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted')
    return;
  const options: NotificationOptions = {
    body: 'Time for your next set.',
    tag: 'workouty-rest',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  };
  try {
    // Android Chrome forbids `new Notification()` — it requires the service
    // worker's showNotification(). Use the SW when one is registered.
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification("Rest's up! 💪", options);
        return;
      }
    }
    const n = new Notification("Rest's up! 💪", options);
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // best-effort — the in-app chime + vibration still cover it
  }
}

/** Hand the rest fire-time (or a cancel) to the service worker so the
 * notification still fires when the app is backgrounded. */
async function postRestToSW(
  message: { type: 'schedule-rest'; at: number } | { type: 'cancel-rest' },
): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage(message);
  } catch {
    // no worker yet — the in-page timer still fires when foregrounded
  }
}

function mmss(total: number): string {
  const s = Math.max(0, total);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface Rest {
  startedAt: number; // epoch ms the rest began
  target: number; // goal rest seconds (drives the ring + the "time's up" chime)
}

/**
 * Rest timer that counts UP so you can see exactly how long you've rested. The
 * ring fills toward your target and chimes when you reach it, but it keeps
 * counting past that — you decide when you're ready and tap Done. Add/subtract
 * 15s moves the target; Minimize shrinks it to a bottom bar.
 */
function RestTimer({
  rest,
  notify,
  canEnableNotify,
  onEnableNotify,
  minimized,
  onMinimize,
  onExpand,
  onChange,
  onSkip,
}: {
  rest: Rest;
  notify: boolean;
  canEnableNotify: boolean;
  onEnableNotify: () => void;
  minimized: boolean;
  onMinimize: () => void;
  onExpand: () => void;
  onChange: (r: Rest) => void;
  onSkip: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const alerted = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // a fresh rest period re-arms the alert
  useEffect(() => {
    alerted.current = false;
  }, [rest.startedAt]);

  const elapsed = Math.max(0, Math.floor((now - rest.startedAt) / 1000));
  const reached = elapsed >= rest.target;

  useEffect(() => {
    if (reached && !alerted.current) {
      alerted.current = true;
      playRestDoneChime();
      if ('vibrate' in navigator) navigator.vibrate?.([300, 120, 300]);
      if (notify) showRestDoneNotification();
      // no auto-dismiss — keep counting so you can see your total rest time
    }
  }, [reached, notify]);

  const fraction = Math.min(1, rest.target > 0 ? elapsed / rest.target : 1);
  const R = 130;
  const C = 2 * Math.PI * R;
  // ±15s moves the target (the chime point); it never rewinds your elapsed time
  const adjust = (delta: number) =>
    onChange({ ...rest, target: Math.max(15, rest.target + delta) });

  // Minimized: a slim bottom bar so you can see your other exercises.
  if (minimized) {
    return (
      <div className="rest-mini" role="dialog" aria-label="Rest timer (minimized)">
        <div
          className={`rest-mini-progress${reached ? ' reached' : ''}`}
          style={{ width: `${fraction * 100}%` }}
        />
        <button className="rest-mini-main" onClick={onExpand} title="Expand timer">
          <span className="rest-mini-time">⏱ {mmss(elapsed)}</span>
          <span className="faint">
            {reached ? 'rested — tap to expand' : `resting / ${mmss(rest.target)}`}
          </span>
        </button>
        <div className="rest-mini-actions">
          <button className="btn small" onClick={() => adjust(15)}>
            +15s
          </button>
          <button className="btn small primary" onClick={onSkip}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rest-overlay${reached ? ' reached' : ''}`}
      role="dialog"
      aria-label="Rest timer"
    >
      <div className="rest-overlay-head">
        {reached ? "Rest's up — go when you're ready" : 'Resting'}
      </div>

      <div className="rest-ring">
        <svg viewBox="0 0 300 300">
          <circle className="rest-ring-track" cx="150" cy="150" r={R} />
          <circle
            className="rest-ring-fill"
            cx="150"
            cy="150"
            r={R}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - fraction)}
            transform="rotate(-90 150 150)"
          />
        </svg>
        <div className="rest-ring-center">
          <div className="rest-ring-time">{mmss(elapsed)}</div>
          <div className="rest-ring-sub">of {mmss(rest.target)} target</div>
        </div>
      </div>

      <div className="rest-overlay-adjust">
        <button className="btn rest-adjust" onClick={() => adjust(-15)}>
          −15s
        </button>
        <button className="btn rest-adjust" onClick={() => adjust(15)}>
          +15s
        </button>
      </div>

      <button
        className={`btn block ${reached ? 'success' : 'primary'} rest-skip`}
        onClick={onSkip}
      >
        {reached ? '✓ Done — next set' : 'Skip rest →'}
      </button>

      <button className="btn block rest-minimize" onClick={onMinimize}>
        ▾ Minimize
      </button>

      {canEnableNotify && (
        <button className="rest-notify-enable" onClick={onEnableNotify}>
          🔔 Notify me when rest ends
        </button>
      )}
    </div>
  );
}

/**
 * Collapsible, tailored warm-up shown at the top of the session: a clear
 * checklist of cardio, mobility for today's muscles, and ramp-up sets.
 */
function WarmupPanel({ steps }: { steps: WarmupStep[] }) {
  const [open, setOpen] = useState(true);
  const [done, setDone] = useState<boolean[]>(() => steps.map(() => false));

  if (steps.length === 0) return null;
  const doneCount = done.filter(Boolean).length;
  const allDone = doneCount === steps.length;

  return (
    <div className={`warmup${allDone ? ' complete' : ''}`}>
      <button className="warmup-head" onClick={() => setOpen((o) => !o)}>
        <span className="warmup-title">
          {allDone ? '✅' : '🔥'} Warm-up
          <span className="faint"> · {doneCount}/{steps.length} done</span>
        </span>
        <span className="warmup-caret">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="warmup-body">
          {steps.map((s, i) => (
            <label className={`warmup-step${done[i] ? ' done' : ''}`} key={i}>
              <input
                type="checkbox"
                checked={done[i]}
                onChange={() =>
                  setDone((d) => d.map((v, j) => (j === i ? !v : v)))
                }
              />
              <span className="warmup-step-main">
                <span className="warmup-step-title">
                  {s.icon} {s.title}
                </span>
                {s.detail && (
                  <span className="warmup-step-detail">{s.detail}</span>
                )}
              </span>
            </label>
          ))}
          <p className="faint warmup-foot">
            Warming up primes your muscles and joints and lowers injury risk.
            Already warm? Just tick them off or collapse this.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * "Replace for today" picker: when a machine is busy, suggest substitute
 * exercises that train the same muscles, best match first, with a fall-back
 * to the full exercise list. Swapping only changes the active workout — the
 * plan is left untouched.
 */
function ReplaceExerciseModal({
  target,
  existingIds,
  onPick,
  onClose,
}: {
  target: Exercise;
  existingIds: string[];
  onPick: (exerciseId: string) => void;
  onClose: () => void;
}) {
  const { allExercises } = useStore();
  const [browse, setBrowse] = useState(false);

  const suggestions = useMemo(
    () =>
      similarExercises(target, allExercises, 12)
        .filter((e) => !existingIds.includes(e.id))
        .slice(0, 6),
    [target, allExercises, existingIds],
  );

  if (browse)
    return <ExercisePicker onClose={onClose} onPick={(ex) => onPick(ex.id)} />;

  return (
    <Modal title={`Replace ${target.name}`} onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Machine busy or out of order? Swap in a similar exercise for today only
        — your plan won't change.
      </p>
      {suggestions.length === 0 ? (
        <p className="faint">No close matches — browse the full list below.</p>
      ) : (
        <>
          <div className="faint" style={{ marginBottom: 6 }}>
            Similar exercises (same muscles)
          </div>
          {suggestions.map((ex) => (
            <button
              key={ex.id}
              className="card clickable replace-option"
              onClick={() => onPick(ex.id)}
            >
              <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{ex.name}</div>
              <div className="faint">
                {ex.primaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ')}
              </div>
            </button>
          ))}
        </>
      )}
      <button
        className="btn block"
        style={{ marginTop: 10 }}
        onClick={() => setBrowse(true)}
      >
        🔍 Browse all exercises…
      </button>
    </Modal>
  );
}

function useElapsed(startIso: string): string {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((Date.now() - new Date(startIso).getTime()) / 1000));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  if (mm >= 60)
    return `${Math.floor(mm / 60)}:${String(mm % 60).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

/** The live logging screen for the active workout. */
export function WorkoutPage({ onClose }: { onClose: () => void }) {
  const {
    state,
    getExercise,
    exerciseNote,
    getProgression,
    setProgression,
    setSettings,
    updateActiveWorkout,
    finishWorkout,
    discardWorkout,
  } = useStore();
  const w = state.activeWorkout!;
  const unit = state.settings.unit;
  const hidePrev = !!state.settings.hidePrevious;
  const elapsed = useElapsed(w.startedAt);
  const [picking, setPicking] = useState(false);
  const [replacing, setReplacing] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null);
  const [infoFor, setInfoFor] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<{
    sets: number;
    volume: number;
    records: WorkoutRecord[];
    restSeconds: number;
  } | null>(null);
  const [rest, setRest] = useState<Rest | null>(null);
  const [restMin, setRestMin] = useState(false);
  // per-exercise expand override (by exercise id); undefined = auto (a finished
  // exercise auto-collapses to save space, but you can expand it back)
  const [expandOverride, setExpandOverride] = useState<Record<string, boolean>>({});
  // exercises we've already asked "increase next time?" this session
  const [askedIncrease, setAskedIncrease] = useState<Record<string, boolean>>({});
  const restSeconds = state.settings.restTimerSeconds ?? DEFAULT_REST_SECONDS;
  const restNotify = !!state.settings.restNotify;
  const notifySupported = typeof Notification !== 'undefined';
  const notifyActive =
    restNotify && notifySupported && Notification.permission === 'granted';
  // offer the in-timer enable button until alerts are actually on (and allowed)
  const canEnableNotify =
    notifySupported && Notification.permission !== 'denied' && !notifyActive;

  // enable rest notifications straight from the timer — the tap is the gesture
  // browsers require to ask for permission
  const enableRestNotify = async () => {
    if (Notification.permission === 'default') await Notification.requestPermission();
    setSettings({ restNotify: true });
  };
  // Keep the service worker's scheduled rest notification in sync with the
  // live timer, so it fires even if the phone is locked / the app backgrounded.
  const restEndsAt = rest ? rest.startedAt + rest.target * 1000 : null;
  useEffect(() => {
    if (restEndsAt && notifyActive)
      postRestToSW({ type: 'schedule-rest', at: restEndsAt });
    else postRestToSW({ type: 'cancel-rest' });
  }, [restEndsAt, notifyActive]);

  // Fold a finished/replaced rest period into the workout's total rest time.
  const accumulateRest = (r: Rest) => {
    const sec = Math.round((Date.now() - r.startedAt) / 1000);
    if (sec > 0)
      updateActiveWorkout((wk) => ({
        ...wk,
        restSeconds: (wk.restSeconds ?? 0) + sec,
      }));
  };
  const endRest = () => {
    if (rest) accumulateRest(rest);
    setRest(null);
    setRestMin(false);
  };

  // computed once for the session — the warm-up is a start-of-workout thing
  const [warmup] = useState(() => buildWarmup(w.exercises, getExercise, unit));

  // template day targets, to show "3 × 8–12" next to each exercise
  const targets = useMemo(() => {
    const t = state.templates.find((x) => x.id === w.templateId);
    const d = t?.days.find((x) => x.id === w.dayId);
    const map = new Map<string, string>();
    for (const te of d?.exercises ?? [])
      map.set(
        te.exerciseId,
        `${te.targetSets} × ${te.targetRepsMin}–${te.targetRepsMax}`,
      );
    return map;
  }, [state.templates, w.templateId, w.dayId]);

  const doneSets = w.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.completed).length,
    0,
  );

  const setField = (
    ei: number,
    si: number,
    field: 'weight' | 'reps',
    value: number,
  ) =>
    updateActiveWorkout((wk) => ({
      ...wk,
      exercises: wk.exercises.map((e, i) =>
        i === ei
          ? {
              ...e,
              sets: e.sets.map((s, j) => {
                if (j === si) return { ...s, [field]: value };
                // Typing the first set cascades into the later sets you
                // haven't ticked off yet, so you only enter it once.
                if (si === 0 && j > si && !s.completed)
                  return { ...s, [field]: value };
                return s;
              }),
            }
          : e,
      ),
    }));

  // Save the finished workout and leave the screen (called from the
  // post-workout celebration's Done button / dismiss).
  const completeWorkout = () => {
    finishWorkout();
    setCelebrate(null);
    onClose();
  };

  // Swap an exercise for today only (busy machine, etc.) — re-seed its sets
  // from the substitute's own history, keeping the plan untouched.
  const replaceExercise = (ei: number, newId: string) => {
    const prev = lastPerformance(state.workouts, newId);
    const tgt = getProgression(newId).target;
    updateActiveWorkout((wk) => ({
      ...wk,
      exercises: wk.exercises.map((e, i) => {
        if (i !== ei) return e;
        const count = Math.max(e.sets.length, prev?.sets.length ?? 0, 1);
        return {
          exerciseId: newId,
          sets: Array.from({ length: count }, (_, k) => ({
            weight: nextWeight(prev?.sets[k]?.weight ?? 0, {
              target: tgt,
              progress: false,
              increment: 0,
            }),
            reps: hidePrev ? 0 : (prev?.sets[k]?.reps ?? 0),
            completed: false,
            type: 'normal' as const,
          })),
        };
      }),
    }));
    setReplacing(null);
  };

  const toggleSet = (ei: number, si: number) => {
    const willComplete = !w.exercises[ei]?.sets[si]?.completed;
    // Ticking a set off starts the rest countdown; un-ticking does nothing.
    if (willComplete && restSeconds > 0) {
      ensureAudio(); // unlock audio within this tap so the chime can play later
      // ask for notification permission inside the gesture, if opted in
      if (
        restNotify &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'default'
      )
        void Notification.requestPermission();
      if (rest) accumulateRest(rest); // bank the previous rest before restarting
      setRestMin(false); // a new rest always opens full, then you can minimize
      setRest({ startedAt: Date.now(), target: restSeconds });
    }
    updateActiveWorkout((wk) => ({
      ...wk,
      exercises: wk.exercises.map((e, i) =>
        i === ei
          ? {
              ...e,
              sets: e.sets.map((s, j) =>
                j === si ? { ...s, completed: !s.completed } : s,
              ),
            }
          : e,
      ),
    }));
  };

  const infoExercise = infoFor ? getExercise(infoFor) : undefined;

  return (
    <div>
      <div className="page-title">
        <button className="btn small ghost" onClick={onClose}>
          ← Back
        </button>
        <span className="workout-timer">⏱ {elapsed}</span>
      </div>

      <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 2 }}>
        {w.name}
      </div>
      <div className="faint" style={{ marginBottom: 16 }}>
        {doneSets} sets completed
      </div>

      <WarmupPanel steps={warmup} />

      {w.exercises.map((we, ei) => {
        const ex = getExercise(we.exerciseId);
        const prev = lastPerformance(state.workouts, we.exerciseId);
        const shownPrev = hidePrev ? null : prev; // what we reveal while logging
        const target = targets.get(we.exerciseId);
        const note = exerciseNote(we.exerciseId);
        const prog = getProgression(we.exerciseId);
        const progHint = prog.target
          ? `🎯 Aim for ${prog.target} ${unit} — hit it to clear this target`
          : null;
        // a fully-completed exercise auto-collapses; the user can override
        const allDone = we.sets.length > 0 && we.sets.every((s) => s.completed);
        const key = we.exerciseId;
        const expanded = expandOverride[key] ?? !allDone;
        const doneSetsList = we.sets.filter((s) => s.completed);
        // heaviest weight completed this session (for the +weight prompt)
        const topWeight = doneSetsList.reduce((m, s) => Math.max(m, s.weight), 0);
        const inc = incrementFor(ex, prog, unit);
        // ask "increase next time?" once an exercise is done, unless already
        // answered this session or a target is already queued
        const askIncrease =
          allDone && topWeight > 0 && !askedIncrease[key] && !prog.target;
        const answerIncrease = (yes: boolean) => {
          setAskedIncrease((a) => ({ ...a, [key]: true }));
          if (yes) setProgression(key, { target: topWeight + inc });
        };
        const setExpanded = (v: boolean) =>
          setExpandOverride((o) => ({ ...o, [key]: v }));
        return (
          <div
            className={`exercise-block${allDone ? ' complete' : ''}${expanded ? '' : ' collapsed'}`}
            key={ei}
          >
            <div className="row between" style={{ marginBottom: expanded ? 4 : 0 }}>
              <h3 onClick={() => setInfoFor(we.exerciseId)}>
                {allDone ? '✅ ' : ''}
                {ex?.name ?? 'Unknown exercise'} ⓘ
              </h3>
              <div className="row" style={{ gap: 4 }}>
                {expanded && (
                  <>
                    <button
                      className="btn small ghost"
                      title="Replace for today"
                      onClick={() => setReplacing(ei)}
                    >
                      ⇄ Replace
                    </button>
                    <button
                      className="btn small danger ghost"
                      title="Remove exercise"
                      onClick={() =>
                        updateActiveWorkout((wk) => ({
                          ...wk,
                          exercises: wk.exercises.filter((_, i) => i !== ei),
                        }))
                      }
                    >
                      ✕
                    </button>
                  </>
                )}
                <button
                  className="btn small ghost"
                  title={expanded ? 'Collapse' : 'Expand'}
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? '▾' : '▸'}
                </button>
              </div>
            </div>

            {askIncrease && (
              <div className="increase-ask">
                <div>
                  💪 All sets done! Add weight to <b>{topWeight + inc} {unit}</b>{' '}
                  next time?
                </div>
                <div className="increase-ask-btns">
                  <button
                    className="btn small success grow"
                    onClick={() => answerIncrease(true)}
                  >
                    👍 Yes, +{inc} {unit}
                  </button>
                  <button
                    className="btn small grow"
                    onClick={() => answerIncrease(false)}
                  >
                    Keep same
                  </button>
                </div>
              </div>
            )}

            {!expanded && (
              <div className="ex-collapsed" onClick={() => setExpanded(true)}>
                {doneSetsList.length} set{doneSetsList.length === 1 ? '' : 's'} done
                {doneSetsList.length > 0 && (
                  <span className="ex-collapsed-sets">
                    {' · '}
                    {doneSetsList.map((s) => `${s.weight}×${s.reps}`).join(', ')} {unit}
                  </span>
                )}
                {prog.target && (
                  <span className="ex-collapsed-target">
                    {' · '}🎯 next {prog.target} {unit}
                  </span>
                )}
              </div>
            )}

            {expanded && (
            <>
            <div className="faint" style={{ marginBottom: 10 }}>
              {target ? `Target: ${target}` : ''}
              {target && shownPrev ? ' · ' : ''}
              {shownPrev
                ? `Last time (${formatDate(shownPrev.date)}): ${shownPrev.sets
                    .map((s) => `${s.weight}×${s.reps}`)
                    .join(', ')}`
                : hidePrev
                  ? target
                    ? ''
                    : '🙈 Last time hidden'
                  : !target
                    ? 'First time doing this exercise'
                    : ''}
            </div>

            {note ? (
              <div
                className="ex-note inline"
                onClick={() => setInfoFor(we.exerciseId)}
                title="Tap to edit note"
              >
                <span className="ex-note-label">📝</span> {note}
              </div>
            ) : (
              <button
                className="btn small ghost ex-note-add"
                onClick={() => setInfoFor(we.exerciseId)}
              >
                📝 Add note
              </button>
            )}

            {progHint && (
              <div
                className={`prog-hint${prog.target ? ' target' : ''}`}
                onClick={() => setInfoFor(we.exerciseId)}
                title="Tap to adjust progression"
              >
                {progHint}
              </div>
            )}

            <div className="set-grid header">
              <span>Set</span>
              <span style={{ textAlign: 'center' }}>Previous</span>
              <span style={{ textAlign: 'center' }}>{unit}</span>
              <span style={{ textAlign: 'center' }}>Reps</span>
              <span />
            </div>
            {we.sets.map((s, si) => {
              const p = shownPrev?.sets[si];
              return (
                <div className={`set-grid${s.completed ? ' done' : ''}`} key={si}>
                  <span className="set-num">{si + 1}</span>
                  <span className="set-prev">
                    {p ? `${p.weight} ${unit} × ${p.reps}` : '—'}
                  </span>
                  <NumberInput
                    value={s.weight}
                    placeholder={p ? String(p.weight) : '0'}
                    onValue={(n) =>
                      setField(ei, si, 'weight', Number.isNaN(n) ? 0 : n)
                    }
                  />
                  <NumberInput
                    decimal={false}
                    value={s.reps}
                    placeholder={p ? String(p.reps) : '0'}
                    onValue={(n) =>
                      setField(ei, si, 'reps', Number.isNaN(n) ? 0 : n)
                    }
                  />
                  <button
                    className={`set-check${s.completed ? ' done' : ''}`}
                    onClick={() => toggleSet(ei, si)}
                  >
                    ✓
                  </button>
                </div>
              );
            })}

            <div className="row" style={{ marginTop: 8 }}>
              <button
                className="btn small grow"
                onClick={() =>
                  updateActiveWorkout((wk) => ({
                    ...wk,
                    exercises: wk.exercises.map((e, i) =>
                      i === ei
                        ? {
                            ...e,
                            sets: [
                              ...e.sets,
                              {
                                ...(e.sets[e.sets.length - 1] ?? {
                                  weight: 0,
                                  reps: 0,
                                }),
                                completed: false,
                                type: 'normal' as const,
                              },
                            ],
                          }
                        : e,
                    ),
                  }))
                }
              >
                ＋ Add set
              </button>
              {we.sets.length > 1 && (
                <button
                  className="btn small"
                  onClick={() =>
                    updateActiveWorkout((wk) => ({
                      ...wk,
                      exercises: wk.exercises.map((e, i) =>
                        i === ei ? { ...e, sets: e.sets.slice(0, -1) } : e,
                      ),
                    }))
                  }
                >
                  − Remove set
                </button>
              )}
            </div>
            </>
            )}
          </div>
        );
      })}

      <button className="btn block" onClick={() => setPicking(true)}>
        ＋ Add exercise
      </button>

      <div className="row" style={{ marginTop: 16 }}>
        <button
          className="btn success grow"
          onClick={() => setConfirm('finish')}
        >
          ✓ Finish workout
        </button>
        <button className="btn danger" onClick={() => setConfirm('discard')}>
          Discard
        </button>
      </div>

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(ex) => {
            const prev = lastPerformance(state.workouts, ex.id);
            const target = getProgression(ex.id).target;
            updateActiveWorkout((wk) => ({
              ...wk,
              exercises: [
                ...wk.exercises,
                {
                  exerciseId: ex.id,
                  sets: Array.from(
                    { length: Math.max(prev?.sets.length ?? 3, 1) },
                    (_, i) => ({
                      weight: nextWeight(prev?.sets[i]?.weight ?? 0, {
                        target,
                        progress: false,
                        increment: 0,
                      }),
                      reps: hidePrev ? 0 : (prev?.sets[i]?.reps ?? 0),
                      completed: false,
                      type: 'normal' as const,
                    }),
                  ),
                },
              ],
            }));
            setPicking(false);
          }}
        />
      )}

      {replacing !== null &&
        (() => {
          const we = w.exercises[replacing];
          const tgt = we && getExercise(we.exerciseId);
          if (!tgt) return null;
          return (
            <ReplaceExerciseModal
              target={tgt}
              existingIds={w.exercises.map((e) => e.exerciseId)}
              onPick={(id) => replaceExercise(replacing, id)}
              onClose={() => setReplacing(null)}
            />
          );
        })()}

      {infoExercise && (
        <Modal title={infoExercise.name} onClose={() => setInfoFor(null)}>
          <ExerciseInfo exercise={infoExercise} />
          {(() => {
            const pr = personalRecord(state.workouts, infoExercise.id);
            return pr ? (
              <p className="muted" style={{ marginTop: 12 }}>
                🏆 Personal record: {pr.weight} {unit} × {pr.reps} (est. 1RM ≈{' '}
                {pr.est1RM} {unit})
              </p>
            ) : null;
          })()}
        </Modal>
      )}

      {rest && (
        <RestTimer
          rest={rest}
          notify={restNotify}
          canEnableNotify={canEnableNotify}
          onEnableNotify={enableRestNotify}
          minimized={restMin}
          onMinimize={() => setRestMin(true)}
          onExpand={() => setRestMin(false)}
          onChange={setRest}
          onSkip={endRest}
        />
      )}

      {confirm && (
        <Modal
          title={confirm === 'finish' ? 'Finish workout?' : 'Discard workout?'}
          onClose={() => setConfirm(null)}
        >
          <p className="muted">
            {confirm === 'finish'
              ? `Save this workout with ${doneSets} completed sets? Sets without a ✓ are not saved.`
              : 'Throw away this workout? Nothing will be saved.'}
          </p>
          <div className="row">
            <button
              className={`btn grow ${confirm === 'finish' ? 'success' : 'danger'}`}
              onClick={() => {
                if (confirm === 'discard') {
                  discardWorkout();
                  setConfirm(null);
                  onClose();
                  return;
                }
                // finishing: capture records/stats now (before the workout is
                // saved) and celebrate; the actual save happens on "Done"
                // fold any in-progress rest into the workout's total
                if (rest) accumulateRest(rest);
                setRest(null);
                const totalRest =
                  (w.restSeconds ?? 0) +
                  (rest ? Math.round((Date.now() - rest.startedAt) / 1000) : 0);
                const summary = {
                  sets: workoutSetCount(w),
                  volume: Math.round(workoutVolume(w)),
                  records: workoutRecords(w, state.workouts),
                  restSeconds: totalRest,
                };
                setConfirm(null);
                if (summary.sets > 0) setCelebrate(summary);
                else {
                  finishWorkout();
                  onClose();
                }
              }}
            >
              {confirm === 'finish' ? '✓ Finish' : 'Discard'}
            </button>
            <button className="btn grow" onClick={() => setConfirm(null)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {celebrate && (
        <Modal title="Workout complete 💪" onClose={completeWorkout}>
          <div className="stat-grid" style={{ marginBottom: 6 }}>
            <div className="stat-box">
              <div className="value">{celebrate.sets}</div>
              <div className="label">Sets</div>
            </div>
            <div className="stat-box">
              <div className="value">
                {celebrate.volume >= 1000
                  ? `${Math.round(celebrate.volume / 1000)}k`
                  : celebrate.volume}
              </div>
              <div className="label">Volume ({unit})</div>
            </div>
            <div className="stat-box">
              <div className="value">{celebrate.records.length}</div>
              <div className="label">Records</div>
            </div>
          </div>
          {celebrate.restSeconds > 0 && (
            <p className="muted" style={{ marginTop: 0 }}>
              🛋️ Total rest: {formatRest(celebrate.restSeconds)}
            </p>
          )}
          {celebrate.records.length > 0 ? (
            <>
              <p className="muted" style={{ marginBottom: 8 }}>
                🏆 New personal record{celebrate.records.length > 1 ? 's' : ''}!
              </p>
              {celebrate.records.map((r) => (
                <div key={r.exerciseId} className="pr-line">
                  🏆 <b>{getExercise(r.exerciseId)?.name ?? 'Exercise'}</b> —{' '}
                  {r.kind === 'e1RM'
                    ? `est. 1RM ${r.value} ${unit}`
                    : `${r.value} ${unit} top set`}
                </div>
              ))}
            </>
          ) : (
            <p className="faint">
              No new records this time — consistency wins. Keep going! 💪
            </p>
          )}
          <button
            className="btn success block"
            style={{ marginTop: 14 }}
            onClick={completeWorkout}
          >
            ✓ Done
          </button>
        </Modal>
      )}
    </div>
  );
}
