import { useEffect, useState } from 'react';
import { Exercise, MUSCLE_LABELS } from '../types';
import { demoFrames, youtubeSearchUrl } from '../data/demos';
import { useStore } from '../state/store';
import { defaultIncrement } from '../lib/progression';

/**
 * Animated how-to demonstration: alternates the start/end position photos
 * so the movement plays like a GIF.
 */
function ExerciseDemo({ exerciseId }: { exerciseId: string }) {
  const frames = demoFrames(exerciseId);
  const [frame, setFrame] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!frames) return;
    const id = setInterval(() => setFrame((f) => 1 - f), 1100);
    return () => clearInterval(id);
    // frames is derived from exerciseId
  }, [exerciseId]);

  if (!frames || failed) return null;
  return (
    <div className="demo">
      {frames.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === 0 ? 'Start position' : 'End position'}
          style={{ opacity: frame === i ? 1 : 0 }}
          onError={() => setFailed(true)}
        />
      ))}
      <span className="demo-badge">▶ demo</span>
    </div>
  );
}

/**
 * Your own persistent note for an exercise (e.g. "machine weight excludes the
 * bar", "use the close grip"). Stored per exercise so it reappears every time
 * you train it. Read-only until you tap to edit.
 */
function ExerciseNote({ exerciseId }: { exerciseId: string }) {
  const { exerciseNote, setExerciseNote } = useStore();
  const saved = exerciseNote(exerciseId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(saved);

  // re-sync the draft when switching to a different exercise
  useEffect(() => {
    setDraft(saved);
    setEditing(false);
  }, [exerciseId]);

  if (!editing) {
    return (
      <div className="ex-note">
        <div className="ex-note-label">📝 My note</div>
        {saved ? (
          <p className="ex-note-text">{saved}</p>
        ) : (
          <p className="faint" style={{ margin: 0 }}>
            No note yet — add a reminder that shows up every time you do this
            exercise.
          </p>
        )}
        <button
          className="btn small ghost"
          style={{ marginTop: 8 }}
          onClick={() => {
            setDraft(saved);
            setEditing(true);
          }}
        >
          {saved ? 'Edit note' : 'Add note'}
        </button>
      </div>
    );
  }

  return (
    <div className="ex-note">
      <div className="ex-note-label">📝 My note</div>
      <textarea
        value={draft}
        autoFocus
        rows={3}
        placeholder="e.g. Weight shown excludes the bar (+20 kg)"
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="row" style={{ marginTop: 8 }}>
        <button
          className="btn small primary grow"
          onClick={() => {
            setExerciseNote(exerciseId, draft);
            setEditing(false);
          }}
        >
          Save
        </button>
        <button
          className="btn small grow"
          onClick={() => {
            setDraft(saved);
            setEditing(false);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * Progressive-overload controls for an exercise: the weight step used when the
 * app auto-suggests a heavier session, plus an optional explicit target weight
 * to chase. Both are stored per exercise and reused every time you train it.
 */
function ProgressionEditor({ exerciseId }: { exerciseId: string }) {
  const { state, getExercise, getProgression, setProgression } = useStore();
  const unit = state.settings.unit;
  const ex = getExercise(exerciseId);
  const prog = getProgression(exerciseId);
  const step = prog.increment || defaultIncrement(ex, unit);
  const [target, setTarget] = useState('');

  useEffect(() => setTarget(''), [exerciseId]);

  return (
    <div className="ex-note">
      <div className="ex-note-label">📈 Progression</div>
      <div className="prog-row">
        <span>Weight step</span>
        <span className="prog-step">
          <input
            type="number"
            inputMode="decimal"
            value={prog.increment ?? ''}
            placeholder={String(defaultIncrement(ex, unit))}
            onChange={(e) =>
              setProgression(exerciseId, {
                increment: Number(e.target.value) || undefined,
              })
            }
          />
          <span className="faint">{unit}</span>
        </span>
      </div>
      <p className="faint" style={{ margin: '4px 0 10px' }}>
        Hit all your reps and the app pre-fills +{step} {unit} next time.
      </p>

      {prog.target ? (
        <div className="prog-target">
          <span>
            🎯 Next-time target: <b>{prog.target} {unit}</b>
          </span>
          <button
            className="btn small ghost"
            onClick={() => setProgression(exerciseId, { target: undefined })}
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="row">
          <input
            type="number"
            inputMode="decimal"
            placeholder={`Set a target to chase (${unit})`}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <button
            className="btn small primary"
            disabled={!(Number(target) > 0)}
            onClick={() => {
              setProgression(exerciseId, { target: Number(target) });
              setTarget('');
            }}
          >
            Set
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Shared exercise detail block: animated demo, what it does, muscles
 * targeted, your own persistent note, progression settings, and a one-tap
 * link to watch a proper video on YouTube.
 */
export function ExerciseInfo({ exercise }: { exercise: Exercise }) {
  return (
    <div>
      <ExerciseDemo exerciseId={exercise.id} />
      <p className="muted">{exercise.description}</p>
      <ExerciseNote exerciseId={exercise.id} />
      <ProgressionEditor exerciseId={exercise.id} />
      <div style={{ marginBottom: 10 }}>
        {exercise.primaryMuscles.map((m) => (
          <span className="chip primary" key={m}>
            {MUSCLE_LABELS[m]}
          </span>
        ))}
        {exercise.secondaryMuscles.map((m) => (
          <span className="chip" key={m}>
            {MUSCLE_LABELS[m]}
          </span>
        ))}
      </div>
      <a
        className="btn block youtube"
        href={youtubeSearchUrl(exercise)}
        target="_blank"
        rel="noopener noreferrer"
      >
        ▶ Watch how-to video on YouTube
      </a>
    </div>
  );
}
