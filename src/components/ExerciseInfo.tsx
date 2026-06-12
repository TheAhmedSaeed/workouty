import { useEffect, useState } from 'react';
import { Exercise, MUSCLE_LABELS } from '../types';
import { demoFrames, youtubeSearchUrl } from '../data/demos';

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
 * Shared exercise detail block: animated demo, what it does, muscles
 * targeted, and a one-tap link to watch a proper video on YouTube.
 */
export function ExerciseInfo({ exercise }: { exercise: Exercise }) {
  return (
    <div>
      <ExerciseDemo exerciseId={exercise.id} />
      <p className="muted">{exercise.description}</p>
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
