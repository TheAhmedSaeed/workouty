import { useState } from 'react';
import { Modal } from '../components/Modal';
import { MuscleBars } from '../components/MuscleBars';
import { useStore } from '../state/store';
import {
  Experience,
  GeneratorOptions,
  Goal,
  generatePlan,
} from '../lib/planGenerator';
import { templateMuscleSets } from '../lib/stats';
import { Template } from '../types';

/** 3-question wizard that produces a complete plan from built-in blueprints. */
export function GeneratorWizard({ onClose }: { onClose: () => void }) {
  const { saveTemplate, getExercise } = useStore();
  const [days, setDays] = useState<GeneratorOptions['daysPerWeek']>(3);
  const [goal, setGoal] = useState<Goal>('hypertrophy');
  const [experience, setExperience] = useState<Experience>('intermediate');
  const [preview, setPreview] = useState<Template | null>(null);

  if (preview) {
    return (
      <Modal title={preview.name} onClose={onClose}>
        <p className="muted">{preview.description}</p>
        {preview.days.map((d) => (
          <div className="card" key={d.id}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{d.name}</div>
            {d.exercises.map((te, i) => (
              <div className="row between" key={i} style={{ marginBottom: 4 }}>
                <span style={{ fontSize: '0.88rem' }}>
                  {getExercise(te.exerciseId)?.name}
                </span>
                <span className="faint">
                  {te.targetSets} × {te.targetRepsMin}–{te.targetRepsMax}
                </span>
              </div>
            ))}
          </div>
        ))}
        <div className="section-title">Muscle coverage</div>
        <MuscleBars sets={templateMuscleSets(preview, getExercise)} />
        <div className="row" style={{ marginTop: 14 }}>
          <button
            className="btn primary grow"
            onClick={() => {
              saveTemplate(preview);
              onClose();
            }}
          >
            ✓ Save this plan
          </button>
          <button className="btn grow" onClick={() => setPreview(null)}>
            ← Change answers
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Generate a plan" onClose={onClose}>
      <div className="form-field">
        <label>How many days a week can you train?</label>
        <div className="option-grid">
          {([2, 3, 4, 5, 6] as const).map((d) => (
            <button
              key={d}
              className={days === d ? 'selected' : ''}
              onClick={() => setDays(d)}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>
      <div className="form-field">
        <label>Main goal</label>
        <div className="option-grid">
          {(
            [
              ['hypertrophy', 'Build muscle'],
              ['strength', 'Get stronger'],
              ['general', 'General fitness'],
            ] as [Goal, string][]
          ).map(([g, label]) => (
            <button
              key={g}
              className={goal === g ? 'selected' : ''}
              onClick={() => setGoal(g)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="form-field">
        <label>Experience</label>
        <div className="option-grid">
          {(
            [
              ['beginner', 'Beginner'],
              ['intermediate', 'Intermediate'],
              ['advanced', 'Advanced'],
            ] as [Experience, string][]
          ).map(([e, label]) => (
            <button
              key={e}
              className={experience === e ? 'selected' : ''}
              onClick={() => setExperience(e)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <button
        className="btn primary block"
        onClick={() =>
          setPreview(generatePlan({ daysPerWeek: days, goal, experience }))
        }
      >
        ✨ Generate plan
      </button>
    </Modal>
  );
}
