import { useRef, useState } from 'react';
import { Modal } from '../components/Modal';
import { useStore } from '../state/store';
import {
  PLAN_FORMAT_EXAMPLE,
  buildFormatInstruction,
  importAIPlan,
} from '../lib/aiPlan';

/**
 * Direct plan import: paste JSON (from any AI, friend or another app) or
 * upload a .json file. The format is shown and copyable so the user can
 * tell any AI "give me the exercises in this format".
 */
export function ImportPlanModal({ onClose }: { onClose: () => void }) {
  const { allExercises, addCustomExercise, saveTemplate } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState('');
  const [copied, setCopied] = useState(false);
  const [showFormat, setShowFormat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; created: string[] } | null>(
    null,
  );

  const copyFormat = async () => {
    try {
      await navigator.clipboard.writeText(buildFormatInstruction());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowFormat(true); // clipboard blocked — show it for manual copy
    }
  };

  const doImport = (text: string) => {
    setError(null);
    const res = importAIPlan(text, allExercises, addCustomExercise);
    if (!res.ok || !res.template) {
      setError(res.error ?? 'Import failed.');
      return;
    }
    saveTemplate(res.template);
    setDone({ name: res.template.name, created: res.createdExercises ?? [] });
  };

  if (done) {
    return (
      <Modal title="Plan imported 🎉" onClose={onClose}>
        <p className="muted">
          “{done.name}” was added to your plans and is ready to start.
        </p>
        {done.created.length > 0 && (
          <p className="faint">
            New custom exercises created: {done.created.join(', ')}
          </p>
        )}
        <button className="btn primary block" onClick={onClose}>
          Done
        </button>
      </Modal>
    );
  }

  return (
    <Modal title="Import a plan" onClose={onClose}>
      <p className="muted">
        Paste a plan as JSON — from any AI, a friend, or another app. Exercise
        names are matched to the database automatically; unknown ones are
        created as custom exercises.
      </p>

      <div className="form-field">
        <label>The format</label>
        <div className="row">
          <button className="btn small grow" onClick={copyFormat}>
            {copied ? '✓ Copied!' : '📋 Copy format (give this to any AI)'}
          </button>
          <button
            className="btn small"
            onClick={() => setShowFormat((s) => !s)}
          >
            {showFormat ? 'Hide' : 'View'}
          </button>
        </div>
        {showFormat && (
          <textarea
            className="code"
            style={{ marginTop: 8 }}
            readOnly
            rows={14}
            value={PLAN_FORMAT_EXAMPLE}
            onFocus={(e) => e.target.select()}
          />
        )}
      </div>

      <div className="form-field">
        <label>Paste your plan</label>
        <textarea
          className="code"
          placeholder='{ "name": "My Plan", "days": [ ... ] }'
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
        />
      </div>

      {error && (
        <p style={{ color: 'var(--red)', fontSize: '0.85rem' }}>{error}</p>
      )}

      <div className="row">
        <button
          className="btn primary grow"
          disabled={!pasted.trim()}
          style={{ opacity: pasted.trim() ? 1 : 0.5 }}
          onClick={() => doImport(pasted)}
        >
          Import plan
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          ⬆ Upload file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.txt,application/json,text/plain"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) doImport(await f.text());
            e.target.value = '';
          }}
        />
      </div>
    </Modal>
  );
}
