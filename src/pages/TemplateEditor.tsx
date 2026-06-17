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
              <div key={i} className="row" style={{ marginBottom: 8 }}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ex?.name ?? 'Unknown exercise'}
                  </div>
                </div>
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
                <button
                  className="btn small danger ghost"
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
            );
          })}
          {day.exercises.length > 0 && (
            <div className="faint" style={{ marginBottom: 8 }}>
              sets × rep range
            </div>
          )}

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
