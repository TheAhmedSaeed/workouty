import { useState } from 'react';
import { Template, TemplateDay } from '../types';
import { useStore } from '../state/store';
import { Modal } from '../components/Modal';
import { ExercisePicker } from '../components/ExercisePicker';
import { NumberInput } from '../components/NumberInput';
import { uid } from '../lib/utils';

/** Create or edit a plan: days, exercises, target sets and rep ranges. */
export function TemplateEditor({
  template,
  onClose,
}: {
  template: Template | null;
  onClose: () => void;
}) {
  const { saveTemplate, getExercise } = useStore();
  const [draft, setDraft] = useState<Template>(
    () =>
      template ?? {
        id: uid(),
        name: '',
        days: [{ id: uid(), name: 'Day 1', exercises: [] }],
        createdAt: new Date().toISOString(),
      },
  );
  const [pickingForDay, setPickingForDay] = useState<string | null>(null);

  const updateDay = (dayId: string, fn: (d: TemplateDay) => TemplateDay) =>
    setDraft((t) => ({
      ...t,
      days: t.days.map((d) => (d.id === dayId ? fn(d) : d)),
    }));

  // reorder an exercise within its day
  const moveExercise = (dayId: string, i: number, dir: -1 | 1) =>
    updateDay(dayId, (d) => {
      const j = i + dir;
      if (j < 0 || j >= d.exercises.length) return d;
      const exercises = [...d.exercises];
      [exercises[i], exercises[j]] = [exercises[j], exercises[i]];
      return { ...d, exercises };
    });

  const save = () => {
    if (!draft.name.trim()) return;
    saveTemplate({
      ...draft,
      name: draft.name.trim(),
      days: draft.days.filter((d) => d.exercises.length > 0 || d.name.trim()),
    });
    onClose();
  };

  return (
    <Modal title={template ? 'Edit plan' : 'New plan'} onClose={onClose}>
      <div className="form-field">
        <label>Plan name</label>
        <input
          placeholder="e.g. Push Pull Legs"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </div>
      <div className="form-field">
        <label>Description (optional)</label>
        <input
          placeholder="e.g. 6 days/week hypertrophy block"
          value={draft.description ?? ''}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </div>

      {draft.days.map((day, di) => (
        <div className="card" key={day.id}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <input
              style={{ fontWeight: 700 }}
              value={day.name}
              onChange={(e) =>
                updateDay(day.id, (d) => ({ ...d, name: e.target.value }))
              }
            />
            <button
              className="btn small danger ghost"
              onClick={() =>
                setDraft((t) => ({
                  ...t,
                  days: t.days.filter((d) => d.id !== day.id),
                }))
              }
            >
              ✕
            </button>
          </div>

          {day.exercises.map((te, i) => {
            const ex = getExercise(te.exerciseId);
            return (
              <div key={i} className="te-exercise">
                <div className="row between" style={{ marginBottom: 6 }}>
                  <div
                    className="grow"
                    style={{
                      minWidth: 0,
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ex?.name ?? 'Unknown exercise'}
                  </div>
                  <div className="row" style={{ gap: 2, flex: '0 0 auto' }}>
                    <button
                      className="btn small ghost"
                      title="Move up"
                      disabled={i === 0}
                      onClick={() => moveExercise(day.id, i, -1)}
                    >
                      ↑
                    </button>
                    <button
                      className="btn small ghost"
                      title="Move down"
                      disabled={i === day.exercises.length - 1}
                      onClick={() => moveExercise(day.id, i, 1)}
                    >
                      ↓
                    </button>
                    <button
                      className="btn small danger ghost"
                      title="Remove"
                      onClick={() =>
                        updateDay(day.id, (d) => ({
                          ...d,
                          exercises: d.exercises.filter((_, xi) => xi !== i),
                        }))
                      }
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <NumberInput
                    decimal={false}
                    style={{ width: 52, textAlign: 'center' }}
                    value={te.targetSets}
                    onValue={(n) =>
                      updateDay(day.id, (d) => ({
                        ...d,
                        exercises: d.exercises.map((x, xi) =>
                          xi === i ? { ...x, targetSets: n || 1 } : x,
                        ),
                      }))
                    }
                  />
                  <span className="faint">×</span>
                  <NumberInput
                    decimal={false}
                    style={{ width: 48, textAlign: 'center' }}
                    value={te.targetRepsMin}
                    onValue={(n) =>
                      updateDay(day.id, (d) => ({
                        ...d,
                        exercises: d.exercises.map((x, xi) =>
                          xi === i ? { ...x, targetRepsMin: n || 1 } : x,
                        ),
                      }))
                    }
                  />
                  <span className="faint">–</span>
                  <NumberInput
                    decimal={false}
                    style={{ width: 48, textAlign: 'center' }}
                    value={te.targetRepsMax}
                    onValue={(n) =>
                      updateDay(day.id, (d) => ({
                        ...d,
                        exercises: d.exercises.map((x, xi) =>
                          xi === i ? { ...x, targetRepsMax: n || 1 } : x,
                        ),
                      }))
                    }
                  />
                  <span className="faint" style={{ fontSize: '0.75rem' }}>
                    sets × reps
                  </span>
                </div>
              </div>
            );
          })}

          <button
            className="btn small block"
            onClick={() => setPickingForDay(day.id)}
          >
            ＋ Add exercise
          </button>
        </div>
      ))}

      <button
        className="btn block"
        style={{ marginBottom: 12 }}
        onClick={() =>
          setDraft((t) => ({
            ...t,
            days: [
              ...t.days,
              { id: uid(), name: `Day ${t.days.length + 1}`, exercises: [] },
            ],
          }))
        }
      >
        ＋ Add day
      </button>

      <button
        className="btn primary block"
        disabled={!draft.name.trim()}
        style={{ opacity: draft.name.trim() ? 1 : 0.5 }}
        onClick={save}
      >
        Save plan
      </button>

      {pickingForDay && (
        <ExercisePicker
          onClose={() => setPickingForDay(null)}
          onPick={(ex) => {
            updateDay(pickingForDay, (d) => ({
              ...d,
              exercises: [
                ...d.exercises,
                {
                  exerciseId: ex.id,
                  targetSets: 3,
                  targetRepsMin: 8,
                  targetRepsMax: 12,
                },
              ],
            }));
            setPickingForDay(null);
          }}
        />
      )}
    </Modal>
  );
}
