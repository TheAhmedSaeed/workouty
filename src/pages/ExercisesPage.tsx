import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { Modal } from '../components/Modal';
import { ExerciseInfo } from '../components/ExerciseInfo';
import { ExerciseHistory } from '../components/ExerciseHistory';
import { ExerciseExportModal } from './ExerciseExportModal';
import {
  Exercise,
  ExerciseCategory,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  MuscleGroup,
} from '../types';
import { findSimilarExercises } from '../lib/aiPlan';

export function ExercisesPage() {
  const { state, allExercises, addCustomExercise, updateCustomExercise } =
    useStore();
  const unit = state.settings.unit;
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | ''>('');
  const [open, setOpen] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

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
        <div className="row" style={{ gap: 6 }}>
          <button
            className="btn small"
            disabled={filtered.length === 0}
            onClick={() => setExportOpen(true)}
          >
            ⤓ Export
          </button>
          <button className="btn small" onClick={() => setCreating(true)}>
            ＋ Custom
          </button>
        </div>
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
          {open.isCustom && (
            <button
              className="btn small block"
              style={{ marginBottom: 12 }}
              onClick={() => {
                setEditing(open);
                setOpen(null);
              }}
            >
              ✏️ Edit exercise
            </button>
          )}
          <ExerciseInfo exercise={open} />
          <ExerciseHistory
            workouts={state.workouts}
            exerciseId={open.id}
            unit={unit}
          />
        </Modal>
      )}

      {exportOpen && (
        <ExerciseExportModal
          exercises={filtered}
          onClose={() => setExportOpen(false)}
        />
      )}

      {creating && (
        <CustomExerciseModal
          onClose={() => setCreating(false)}
          onSubmit={(vals) => {
            addCustomExercise({ ...vals, secondaryMuscles: [] });
            setCreating(false);
          }}
        />
      )}

      {editing && (
        <CustomExerciseModal
          existing={editing}
          onClose={() => setEditing(null)}
          onSubmit={(vals) => {
            updateCustomExercise(editing.id, vals);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

interface ExerciseForm {
  name: string;
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  description: string;
}

function CustomExerciseModal({
  existing,
  onClose,
  onSubmit,
}: {
  existing?: Exercise;
  onClose: () => void;
  onSubmit: (vals: ExerciseForm) => void;
}) {
  const { allExercises } = useStore();
  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<ExerciseCategory>(
    existing?.category ?? 'other',
  );
  const [primary, setPrimary] = useState<MuscleGroup[]>(
    existing?.primaryMuscles ?? [],
  );
  const [description, setDescription] = useState(
    existing && existing.description !== 'Custom exercise.'
      ? existing.description
      : '',
  );

  // live duplicate check — exclude the exercise being edited from the pool
  const dup = useMemo(() => {
    const pool = existing
      ? allExercises.filter((e) => e.id !== existing.id)
      : allExercises;
    return findSimilarExercises(name, pool);
  }, [name, allExercises, existing]);

  const toggle = (m: MuscleGroup) =>
    setPrimary((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));

  return (
    <Modal
      title={existing ? 'Edit exercise' : 'New custom exercise'}
      onClose={onClose}
    >
      <div className="form-field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        {dup.exact && (
          <p style={{ color: 'var(--red)', fontSize: '0.82rem', margin: '8px 0 0' }}>
            ⚠ “{dup.exact.name}” already exists — no need to create it again.
          </p>
        )}
        {!dup.exact && dup.similar.length > 0 && (
          <p className="faint" style={{ margin: '8px 0 0' }}>
            Similar exercises already in the database:{' '}
            {dup.similar.map((e) => e.name).join(' · ')}. Create yours only if
            it's really different.
          </p>
        )}
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
        disabled={!name.trim() || !!dup.exact}
        style={{ opacity: name.trim() && !dup.exact ? 1 : 0.5 }}
        onClick={() =>
          onSubmit({
            name: name.trim(),
            category,
            primaryMuscles: primary,
            description: description.trim() || 'Custom exercise.',
          })
        }
      >
        {existing ? 'Save changes' : 'Create exercise'}
      </button>
    </Modal>
  );
}
