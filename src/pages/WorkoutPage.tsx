import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { ExercisePicker } from '../components/ExercisePicker';
import { ExerciseInfo } from '../components/ExerciseInfo';
import { Modal } from '../components/Modal';
import { NumberInput } from '../components/NumberInput';
import { lastPerformance, personalRecord } from '../lib/stats';
import { incrementFor, nextWeight, readyToProgress } from '../lib/progression';
import { buildWarmup, WarmupStep } from '../lib/warmup';
import { similarExercises } from '../lib/similar';
import { formatDate } from '../lib/utils';
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
  endsAt: number; // epoch ms
  total: number; // seconds, for the progress bar
}

/**
 * Sticky rest countdown. Appears when a set is ticked off, beeps + vibrates
 * when time's up, and lets you add/subtract 15s or skip ahead.
 */
function RestTimer({
  rest,
  notify,
  canEnableNotify,
  onEnableNotify,
  onChange,
  onSkip,
}: {
  rest: Rest;
  notify: boolean;
  canEnableNotify: boolean;
  onEnableNotify: () => void;
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
  }, [rest.endsAt]);

  const remaining = Math.round((rest.endsAt - now) / 1000);

  useEffect(() => {
    if (remaining <= 0 && !alerted.current) {
      alerted.current = true;
      playRestDoneChime();
      if ('vibrate' in navigator) navigator.vibrate?.([300, 120, 300]);
      if (notify) showRestDoneNotification();
      onSkip(); // time's up — hide the overlay automatically, no tap needed
    }
  }, [remaining, notify, onSkip]);

  const fraction = Math.max(0, Math.min(1, remaining / rest.total));
  const R = 130;
  const C = 2 * Math.PI * R;
  const adjust = (delta: number) =>
    onChange({
      ...rest,
      endsAt: Math.max(Date.now(), rest.endsAt + delta * 1000),
      total: Math.max(rest.total + delta, 1),
    });

  return (
    <div className="rest-overlay" role="dialog" aria-label="Rest timer">
      <div className="rest-overlay-head">Rest</div>

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
          <div className="rest-ring-time">{mmss(remaining)}</div>
          <div className="rest-ring-sub">remaining</div>
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

      <button className="btn block primary rest-skip" onClick={onSkip}>
        Skip rest →
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
  const [rest, setRest] = useState<Rest | null>(null);
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
  const restEndsAt = rest?.endsAt ?? null;
  useEffect(() => {
    if (restEndsAt && notifyActive)
      postRestToSW({ type: 'schedule-rest', at: restEndsAt });
    else postRestToSW({ type: 'cancel-rest' });
  }, [restEndsAt, notifyActive]);

  // computed once for the session — the warm-up is a start-of-workout thing
  const [warmup] = useState(() => buildWarmup(w.exercises, getExercise, unit));

  // template day targets, to show "3 × 8–12" and drive progression hints
  const { targets, repsMax } = useMemo(() => {
    const t = state.templates.find((x) => x.id === w.templateId);
    const d = t?.days.find((x) => x.id === w.dayId);
    const targets = new Map<string, string>();
    const repsMax = new Map<string, number>();
    for (const te of d?.exercises ?? []) {
      targets.set(
        te.exerciseId,
        `${te.targetSets} × ${te.targetRepsMin}–${te.targetRepsMax}`,
      );
      repsMax.set(te.exerciseId, te.targetRepsMax);
    }
    return { targets, repsMax };
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
      setRest({ endsAt: Date.now() + restSeconds * 1000, total: restSeconds });
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
        const rmax = repsMax.get(we.exerciseId);
        const progressed =
          !prog.target && !!prev && rmax != null && readyToProgress(prev.sets, rmax);
        const progHint = prog.target
          ? `🎯 Aim for ${prog.target} ${unit} — hit it to clear this target`
          : progressed
            ? `💪 +${incrementFor(ex, prog, unit)} ${unit} vs last time — you hit all your reps`
            : null;
        return (
          <div className="exercise-block" key={ei}>
            <div className="row between" style={{ marginBottom: 4 }}>
              <h3 onClick={() => setInfoFor(we.exerciseId)}>
                {ex?.name ?? 'Unknown exercise'} ⓘ
              </h3>
              <div className="row" style={{ gap: 4 }}>
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
              </div>
            </div>
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
          onChange={setRest}
          onSkip={() => setRest(null)}
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
                if (confirm === 'finish') finishWorkout();
                else discardWorkout();
                setConfirm(null);
                onClose();
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
    </div>
  );
}
