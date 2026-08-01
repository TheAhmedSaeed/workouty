import { useState } from 'react';
import { PlanFolder, Template, TemplateDay } from '../types';
import { useStore } from '../state/store';
import { Modal } from '../components/Modal';
import { MuscleBars } from '../components/MuscleBars';
import { templateMuscleSets } from '../lib/stats';
import { formatDate } from '../lib/utils';
import { TemplateEditor } from './TemplateEditor';
import { GeneratorWizard } from './GeneratorWizard';
import { AIImportModal } from './AIImportModal';
import { ImportPlanModal } from './ImportPlanModal';
import { StretchesModal } from './StretchesModal';

export function HomePage({ onOpenWorkout }: { onOpenWorkout: () => void }) {
  const {
    state,
    getExercise,
    startWorkout,
    startEmptyWorkout,
    deleteTemplate,
    moveTemplate,
    setTemplateFolder,
    setTemplateArchived,
    addFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
  } = useStore();
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [editing, setEditing] = useState<Template | 'new' | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [coverageFor, setCoverageFor] = useState<Template | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Template | null>(null);
  const [stretchOpen, setStretchOpen] = useState(false);
  const [folderEdit, setFolderEdit] = useState<'new' | PlanFolder | null>(null);
  const [confirmDeleteFolder, setConfirmDeleteFolder] =
    useState<PlanFolder | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hiddenOpen, setHiddenOpen] = useState(false);

  const folders = state.folders ?? [];
  const folderIds = new Set(folders.map((f) => f.id));
  const visible = state.templates.filter((t) => !t.archived);
  const hidden = state.templates.filter((t) => t.archived);
  const plansOf = (fid: string) => visible.filter((t) => t.folderId === fid);
  const ungrouped = visible.filter(
    (t) => !t.folderId || !folderIds.has(t.folderId),
  );

  const start = (t?: Template, d?: TemplateDay) => {
    if (state.activeWorkout) {
      onOpenWorkout();
      return;
    }
    startWorkout(t, d);
    onOpenWorkout();
  };

  /** "Last done" hint for a template day = most recent finished workout of it. */
  const lastDone = (t: Template, d: TemplateDay): string | null => {
    for (let i = state.workouts.length - 1; i >= 0; i--) {
      const w = state.workouts[i];
      if (w.templateId === t.id && w.dayId === d.id) return formatDate(w.startedAt);
    }
    return null;
  };

  const planCard = (t: Template, group: Template[], i: number) => (
    <PlanCard
      key={t.id}
      t={t}
      folders={folders}
      isFirst={i === 0}
      isLast={i === group.length - 1}
      lastDone={lastDone}
      onStart={start}
      onCoverage={() => setCoverageFor(t)}
      onEdit={() => setEditing(t)}
      onDelete={() => setConfirmDelete(t)}
      onMove={(dir) => moveTemplate(t.id, dir)}
      onSetFolder={(fid) => setTemplateFolder(t.id, fid)}
      onToggleHide={() => setTemplateArchived(t.id, !t.archived)}
    />
  );

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

      <button
        className="btn block"
        style={{ marginTop: 10 }}
        onClick={() => setStretchOpen(true)}
      >
        🧘 Morning stretches
      </button>

      <div className="plans-header">
        <div className="section-title" style={{ margin: 0 }}>
          My plans
        </div>
        {(state.templates.length > 0 || folders.length > 0) && (
          <button className="btn small" onClick={() => setFolderEdit('new')}>
            📁 New folder
          </button>
        )}
      </div>

      {state.templates.length === 0 && folders.length === 0 && (
        <div className="empty">
          <span className="big">📋</span>
          No plans yet. Tap <b>＋ New plan</b> to build one yourself, generate
          one from a few questions, or import one from any AI assistant.
        </div>
      )}

      {folders.map((f, fi) => {
        const plans = plansOf(f.id);
        const open = !collapsed[f.id];
        return (
          <div className="folder" key={f.id}>
            <div className="folder-head">
              <button
                className="folder-toggle"
                onClick={() =>
                  setCollapsed((c) => ({ ...c, [f.id]: !c[f.id] }))
                }
              >
                {open ? '▾' : '▸'} 📁 {f.name}{' '}
                <span className="faint">({plans.length})</span>
              </button>
              <div className="row" style={{ gap: 2 }}>
                <button
                  className="btn small ghost"
                  disabled={fi === 0}
                  onClick={() => moveFolder(f.id, -1)}
                >
                  ↑
                </button>
                <button
                  className="btn small ghost"
                  disabled={fi === folders.length - 1}
                  onClick={() => moveFolder(f.id, 1)}
                >
                  ↓
                </button>
                <button
                  className="btn small ghost"
                  onClick={() => setFolderEdit(f)}
                >
                  ✏️
                </button>
                <button
                  className="btn small danger ghost"
                  onClick={() => setConfirmDeleteFolder(f)}
                >
                  🗑
                </button>
              </div>
            </div>
            {open && (
              <div className="folder-body">
                {plans.length === 0 ? (
                  <div className="faint" style={{ padding: '2px 2px 6px' }}>
                    Empty — use a plan's 📁 menu below to move it here.
                  </div>
                ) : (
                  plans.map((t, i) => planCard(t, plans, i))
                )}
              </div>
            )}
          </div>
        );
      })}

      {ungrouped.length > 0 && folders.length > 0 && (
        <div className="section-title">Ungrouped</div>
      )}
      {ungrouped.map((t, i) => planCard(t, ungrouped, i))}

      {hidden.length > 0 && (
        <div className="folder" style={{ marginTop: 4 }}>
          <div className="folder-head">
            <button
              className="folder-toggle"
              onClick={() => setHiddenOpen((o) => !o)}
            >
              {hiddenOpen ? '▾' : '▸'} 🙈 Hidden plans{' '}
              <span className="faint">({hidden.length})</span>
            </button>
          </div>
          {hiddenOpen && (
            <div className="folder-body">
              {hidden.map((t) => planCard(t, [t], 0))}
            </div>
          )}
        </div>
      )}

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
      {stretchOpen && <StretchesModal onClose={() => setStretchOpen(false)} />}
      {wizardOpen && <GeneratorWizard onClose={() => setWizardOpen(false)} />}
      {aiOpen && <AIImportModal onClose={() => setAiOpen(false)} />}
      {importOpen && <ImportPlanModal onClose={() => setImportOpen(false)} />}

      {folderEdit && (
        <FolderNameModal
          existing={folderEdit === 'new' ? null : folderEdit}
          onClose={() => setFolderEdit(null)}
          onSave={(name) => {
            if (folderEdit === 'new') addFolder(name);
            else renameFolder(folderEdit.id, name);
            setFolderEdit(null);
          }}
        />
      )}

      {confirmDeleteFolder && (
        <Modal
          title="Delete folder?"
          onClose={() => setConfirmDeleteFolder(null)}
        >
          <p className="muted">
            Delete “{confirmDeleteFolder.name}”? The plans inside are kept — they
            just move back to ungrouped.
          </p>
          <div className="row">
            <button
              className="btn danger grow"
              onClick={() => {
                deleteFolder(confirmDeleteFolder.id);
                setConfirmDeleteFolder(null);
              }}
            >
              Delete folder
            </button>
            <button
              className="btn grow"
              onClick={() => setConfirmDeleteFolder(null)}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

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

function PlanCard({
  t,
  folders,
  isFirst,
  isLast,
  lastDone,
  onStart,
  onCoverage,
  onEdit,
  onDelete,
  onMove,
  onSetFolder,
  onToggleHide,
}: {
  t: Template;
  folders: PlanFolder[];
  isFirst: boolean;
  isLast: boolean;
  lastDone: (t: Template, d: TemplateDay) => string | null;
  onStart: (t: Template, d: TemplateDay) => void;
  onCoverage: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onSetFolder: (folderId?: string) => void;
  onToggleHide: () => void;
}) {
  const archived = !!t.archived;
  return (
    <div className="card">
      <div className="row between">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800 }}>{t.name}</div>
          <div className="faint">
            {t.days.length} day{t.days.length === 1 ? '' : 's'} / week
            {t.description ? ` · ${t.description}` : ''}
          </div>
        </div>
        {!archived && (
          <div className="row" style={{ gap: 2, flex: '0 0 auto' }}>
            <button
              className="btn small ghost"
              title="Move up"
              disabled={isFirst}
              onClick={() => onMove(-1)}
            >
              ↑
            </button>
            <button
              className="btn small ghost"
              title="Move down"
              disabled={isLast}
              onClick={() => onMove(1)}
            >
              ↓
            </button>
          </div>
        )}
      </div>
      <div className="divider" />
      {t.days.map((d) => {
        const last = lastDone(t, d);
        return (
          <div className="row between" key={d.id} style={{ marginBottom: 8 }}>
            <div className="grow">
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{d.name}</div>
              <div className="faint">
                {d.exercises.length} exercises
                {last ? ` · last done ${last}` : ' · never done'}
              </div>
            </div>
            <button className="btn small primary" onClick={() => onStart(t, d)}>
              Start
            </button>
          </div>
        );
      })}
      <div className="row wrap" style={{ marginTop: 10 }}>
        <button className="btn small" onClick={onCoverage}>
          🧬 Coverage
        </button>
        <button className="btn small" onClick={onEdit}>
          ✏️ Edit
        </button>
        <button className="btn small ghost" onClick={onToggleHide}>
          {archived ? '👁 Show' : '🙈 Hide'}
        </button>
        <button className="btn small danger ghost" onClick={onDelete}>
          Delete
        </button>
      </div>
      {folders.length > 0 && (
        <div className="row" style={{ marginTop: 8, alignItems: 'center' }}>
          <span className="faint">📁</span>
          <select
            value={t.folderId ?? ''}
            onChange={(e) => onSetFolder(e.target.value || undefined)}
          >
            <option value="">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function FolderNameModal({
  existing,
  onClose,
  onSave,
}: {
  existing: PlanFolder | null;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  return (
    <Modal title={existing ? 'Rename folder' : 'New folder'} onClose={onClose}>
      <div className="form-field">
        <label>Folder name</label>
        <input
          value={name}
          autoFocus
          placeholder="e.g. Bulking, Cutting, Home gym"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <button
        className="btn primary block"
        disabled={!name.trim()}
        style={{ opacity: name.trim() ? 1 : 0.5 }}
        onClick={() => onSave(name)}
      >
        {existing ? 'Rename' : 'Create folder'}
      </button>
    </Modal>
  );
}
