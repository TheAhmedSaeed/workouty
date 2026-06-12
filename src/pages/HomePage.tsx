import { useState } from 'react';
import { Template, TemplateDay } from '../types';
import { useStore } from '../state/store';
import { Modal } from '../components/Modal';
import { MuscleBars } from '../components/MuscleBars';
import { templateMuscleSets, lastPerformance } from '../lib/stats';
import { formatDate } from '../lib/utils';
import { TemplateEditor } from './TemplateEditor';
import { GeneratorWizard } from './GeneratorWizard';
import { AIImportModal } from './AIImportModal';
import { ImportPlanModal } from './ImportPlanModal';

export function HomePage({ onOpenWorkout }: { onOpenWorkout: () => void }) {
  const { state, getExercise, startWorkout, startEmptyWorkout, deleteTemplate } =
    useStore();
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [editing, setEditing] = useState<Template | 'new' | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [coverageFor, setCoverageFor] = useState<Template | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Template | null>(null);

  const start = (t?: Template, d?: TemplateDay) => {
    if (state.activeWorkout) {
      onOpenWorkout();
      return;
    }
    startWorkout(t, d);
    onOpenWorkout();
  };

  /** "Last done" hint for a template day = most recent finished workout of that day. */
  const lastDone = (t: Template, d: TemplateDay): string | null => {
    for (let i = state.workouts.length - 1; i >= 0; i--) {
      const w = state.workouts[i];
      if (w.templateId === t.id && w.dayId === d.id) return formatDate(w.startedAt);
    }
    return null;
  };

  return (
    <div>
      <div className="page-title">
        Workouty
        <button className="btn small primary" onClick={() => setNewPlanOpen(true)}>
          ＋ New plan
        </button>
      </div>

      <button
        className="btn block"
        onClick={() => {
          if (state.activeWorkout) onOpenWorkout();
          else {
            startEmptyWorkout();
            onOpenWorkout();
          }
        }}
      >
        {state.activeWorkout ? '▶ Resume workout' : '🚀 Start empty workout'}
      </button>

      <div className="section-title">My plans</div>

      {state.templates.length === 0 && (
        <div className="empty">
          <span className="big">📋</span>
          No plans yet. Tap <b>＋ New plan</b> to build one yourself, generate
          one from a few questions, or import one from any AI assistant.
        </div>
      )}

      {state.templates.map((t) => (
        <div className="card" key={t.id}>
          <div className="row between">
            <div>
              <div style={{ fontWeight: 800 }}>{t.name}</div>
              <div className="faint">
                {t.days.length} day{t.days.length === 1 ? '' : 's'} / week
                {t.description ? ` · ${t.description}` : ''}
              </div>
            </div>
          </div>
          <div className="divider" />
          {t.days.map((d) => {
            const last = lastDone(t, d);
            return (
              <div className="row between" key={d.id} style={{ marginBottom: 8 }}>
                <div className="grow">
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                    {d.name}
                  </div>
                  <div className="faint">
                    {d.exercises.length} exercises
                    {last ? ` · last done ${last}` : ' · never done'}
                  </div>
                </div>
                <button className="btn small primary" onClick={() => start(t, d)}>
                  Start
                </button>
              </div>
            );
          })}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn small" onClick={() => setCoverageFor(t)}>
              🧬 Coverage
            </button>
            <button className="btn small" onClick={() => setEditing(t)}>
              ✏️ Edit
            </button>
            <button
              className="btn small danger ghost"
              onClick={() => setConfirmDelete(t)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {newPlanOpen && (
        <Modal title="New plan" onClose={() => setNewPlanOpen(false)}>
          <div
            className="card clickable"
            onClick={() => {
              setNewPlanOpen(false);
              setWizardOpen(true);
            }}
          >
            <div style={{ fontWeight: 700 }}>✨ Generate for me</div>
            <div className="muted">
              Answer 3 questions (days per week, goal, experience) and get a
              complete, balanced plan instantly.
            </div>
          </div>
          <div
            className="card clickable"
            onClick={() => {
              setNewPlanOpen(false);
              setAiOpen(true);
            }}
          >
            <div style={{ fontWeight: 700 }}>🤖 Ask an AI / coach</div>
            <div className="muted">
              We write the prompt for you — paste it into Claude, ChatGPT or
              any assistant, then paste the answer back to import the plan.
            </div>
          </div>
          <div
            className="card clickable"
            onClick={() => {
              setNewPlanOpen(false);
              setImportOpen(true);
            }}
          >
            <div style={{ fontWeight: 700 }}>📥 Import / paste JSON</div>
            <div className="muted">
              Already have a plan as JSON? Paste it or upload a file. You can
              copy the format and give it to any AI: “give me the exercises in
              this format”.
            </div>
          </div>
          <div
            className="card clickable"
            onClick={() => {
              setNewPlanOpen(false);
              setEditing('new');
            }}
          >
            <div style={{ fontWeight: 700 }}>🛠️ Build manually</div>
            <div className="muted">
              Create days and pick exercises, sets and rep ranges yourself.
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <TemplateEditor
          template={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {wizardOpen && <GeneratorWizard onClose={() => setWizardOpen(false)} />}
      {aiOpen && <AIImportModal onClose={() => setAiOpen(false)} />}
      {importOpen && <ImportPlanModal onClose={() => setImportOpen(false)} />}

      {coverageFor && (
        <Modal
          title={`${coverageFor.name} — muscle coverage`}
          onClose={() => setCoverageFor(null)}
        >
          <MuscleBars sets={templateMuscleSets(coverageFor, getExercise)} />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete plan?" onClose={() => setConfirmDelete(null)}>
          <p className="muted">
            Delete “{confirmDelete.name}”? Your logged workouts are kept — only
            the plan is removed.
          </p>
          <div className="row">
            <button
              className="btn danger grow"
              onClick={() => {
                deleteTemplate(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </button>
            <button className="btn grow" onClick={() => setConfirmDelete(null)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
