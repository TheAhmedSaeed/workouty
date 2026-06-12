import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { Modal } from '../components/Modal';
import {
  Exercise,
  ExerciseCategory,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  MuscleGroup,
} from '../types';
import { exerciseHistory, lastPerformance, personalRecord } from '../lib/stats';
import { formatDate } from '../lib/utils';

export function ExercisesPage() {
  const { state, allExercises, addCustomExercise } = useStore();
  const unit = state.settings.unit;
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | ''>('');
  const [open, setOpen] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const n = q.toLowerCase().trim();
    return allExercises.filter((e) => {
      if (n && !e.name.toLowerCase().includes(n)) return false;
      if (
        muscle &&
        !e.primaryMuscles.includes(muscle) &&
        !e.secondaryMuscles.includes(muscle)
      )
        return false;
      return true;
    });
  }, [q, muscle, allExercises]);

  return (
    <div>
      <div className="page-title">
        Exercises
        <button className="btn small" onClick={() => setCreating(true)}>
          ＋ Custom
        </button>
      </div>

      <input
        className="search-input"
        placeholder="Search exercises…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <select
        value={muscle}
        onChange={(e) => setMuscle(e.target.value as MuscleGroup | '')}
        style={{ marginBottom: 12 }}
      >
        <option value="">All muscles</option>
        {MUSCLE_GROUPS.map((m) => (
          <option key={m} value={m}>
            {MUSCLE_LABELS[m]}
          </option>
        ))}
      </select>

      {filtered.map((ex) => (
        <div
          className="card clickable"
          key={ex.id}
          onClick={() => setOpen(ex)}
          style={{ padding: '10px 12px' }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
            {ex.name}
            {ex.isCustom && <span className="chip" style={{ marginLeft: 6 }}>custom</span>}
          </div>
          <div className="faint">
            {ex.primaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ')}
          </div>
        </div>
      ))}

      {open && (
        <Modal title={open.name} onClose={() => setOpen(null)}>
          <p className="muted">{open.description}</p>
          <div style={{ marginBottom: 10 }}>
            {open.primaryMuscles.map((m) => (
              <span className="chip primary" key={m}>
                {MUSCLE_LABELS[m]}
              </span>
            ))}
            {open.secondaryMuscles.map((m) => (
              <span className="chip" key={m}>
                {MUSCLE_LABELS[m]}
              </span>
            ))}
          </div>
          {(() => {
            const pr = personalRecord(state.workouts, open.id);
            const last = lastPerformance(state.workouts, open.id);
            const hist = exerciseHistory(state.workouts, open.id);
            if (!pr && !last)
              return <p className="faint">No logged history yet.</p>;
            return (
              <>
                {pr && (
                  <p className="muted">
                    🏆 Best: {pr.weight} {unit} × {pr.reps} (est. 1RM ≈ {pr.est1RM}{' '}
                    {unit})
                  </p>
                )}
                {last && (
                  <p className="muted">
                    Last time ({formatDate(last.date)}):{' '}
                    {last.sets.map((s) => `${s.weight}×${s.reps}`).join(', ')}
                  </p>
                )}
                <p className="faint">Done in {hist.length} workouts.</p>
              </>
            );
          })()}
        </Modal>
      )}

      {creating && (
        <CustomExerciseModal
          onClose={() => setCreating(false)}
          onCreate={(ex) => {
            addCustomExercise(ex);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function CustomExerciseModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (ex: Omit<Exercise, 'id' | 'isCustom'>) => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('other');
  const [primary, setPrimary] = useState<MuscleGroup[]>([]);
  const [description, setDescription] = useState('');

  const toggle = (m: MuscleGroup) =>
    setPrimary((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));

  return (
    <Modal title="New custom exercise" onClose={onClose}>
      <div className="form-field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="form-field">
        <label>Equipment</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
        >
          {(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other'] as const).map(
            (c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ),
          )}
        </select>
      </div>
      <div className="form-field">
        <label>Primary muscles (tap to toggle)</label>
        <div>
          {MUSCLE_GROUPS.map((m) => (
            <button
              key={m}
              className={`chip${primary.includes(m) ? ' primary' : ''}`}
              onClick={() => toggle(m)}
            >
              {MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>
      <div className="form-field">
        <label>Notes (optional)</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <button
        className="btn primary block"
        disabled={!name.trim()}
        style={{ opacity: name.trim() ? 1 : 0.5 }}
        onClick={() =>
          onCreate({
            name: name.trim(),
            category,
            primaryMuscles: primary,
            secondaryMuscles: [],
            description: description.trim() || 'Custom exercise.',
          })
        }
      >
        Create exercise
      </button>
    </Modal>
  );
}
