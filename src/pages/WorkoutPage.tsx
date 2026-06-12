import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { ExercisePicker } from '../components/ExercisePicker';
import { Modal } from '../components/Modal';
import { lastPerformance, personalRecord } from '../lib/stats';
import { formatDate } from '../lib/utils';
import { MUSCLE_LABELS } from '../types';

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
    updateActiveWorkout,
    finishWorkout,
    discardWorkout,
  } = useStore();
  const w = state.activeWorkout!;
  const unit = state.settings.unit;
  const elapsed = useElapsed(w.startedAt);
  const [picking, setPicking] = useState(false);
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null);
  const [infoFor, setInfoFor] = useState<string | null>(null);

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
              sets: e.sets.map((s, j) =>
                j === si ? { ...s, [field]: value } : s,
              ),
            }
          : e,
      ),
    }));

  const toggleSet = (ei: number, si: number) =>
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

      {w.exercises.map((we, ei) => {
        const ex = getExercise(we.exerciseId);
        const prev = lastPerformance(state.workouts, we.exerciseId);
        const target = targets.get(we.exerciseId);
        return (
          <div className="exercise-block" key={ei}>
            <div className="row between" style={{ marginBottom: 4 }}>
              <h3 onClick={() => setInfoFor(we.exerciseId)}>
                {ex?.name ?? 'Unknown exercise'} ⓘ
              </h3>
              <button
                className="btn small danger ghost"
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
            <div className="faint" style={{ marginBottom: 10 }}>
              {target ? `Target: ${target}` : ''}
              {target && prev ? ' · ' : ''}
              {prev
                ? `Last time (${formatDate(prev.date)}): ${prev.sets
                    .map((s) => `${s.weight}×${s.reps}`)
                    .join(', ')}`
                : !target
                  ? 'First time doing this exercise'
                  : ''}
            </div>

            <div className="set-grid header">
              <span>Set</span>
              <span style={{ textAlign: 'center' }}>Previous</span>
              <span style={{ textAlign: 'center' }}>{unit}</span>
              <span style={{ textAlign: 'center' }}>Reps</span>
              <span />
            </div>
            {we.sets.map((s, si) => {
              const p = prev?.sets[si];
              return (
                <div className={`set-grid${s.completed ? ' done' : ''}`} key={si}>
                  <span className="set-num">{si + 1}</span>
                  <span className="set-prev">
                    {p ? `${p.weight} ${unit} × ${p.reps}` : '—'}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={s.weight || ''}
                    placeholder={p ? String(p.weight) : '0'}
                    onChange={(e) =>
                      setField(ei, si, 'weight', Number(e.target.value) || 0)
                    }
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={s.reps || ''}
                    placeholder={p ? String(p.reps) : '0'}
                    onChange={(e) =>
                      setField(ei, si, 'reps', Number(e.target.value) || 0)
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
            updateActiveWorkout((wk) => ({
              ...wk,
              exercises: [
                ...wk.exercises,
                {
                  exerciseId: ex.id,
                  sets: Array.from(
                    { length: Math.max(prev?.sets.length ?? 3, 1) },
                    (_, i) => ({
                      weight: prev?.sets[i]?.weight ?? 0,
                      reps: prev?.sets[i]?.reps ?? 0,
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

      {infoExercise && (
        <Modal title={infoExercise.name} onClose={() => setInfoFor(null)}>
          <p className="muted">{infoExercise.description}</p>
          <div>
            {infoExercise.primaryMuscles.map((m) => (
              <span className="chip primary" key={m}>
                {MUSCLE_LABELS[m]}
              </span>
            ))}
            {infoExercise.secondaryMuscles.map((m) => (
              <span className="chip" key={m}>
                {MUSCLE_LABELS[m]}
              </span>
            ))}
          </div>
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
