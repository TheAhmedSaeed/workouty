import { useState } from 'react';
import { Modal } from '../components/Modal';
import { useStore } from '../state/store';
import { buildAIPrompt, importAIPlan } from '../lib/aiPlan';

/**
 * "Ask an AI" flow: copy a ready-made prompt → paste it into any AI
 * assistant → paste the JSON answer back here → plan is imported.
 */
export function AIImportModal({ onClose }: { onClose: () => void }) {
  const { allExercises, addCustomExercise, saveTemplate } = useStore();
  const [wishes, setWishes] = useState('');
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; created: string[] } | null>(
    null,
  );

  const prompt = buildAIPrompt(allExercises, wishes);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the textarea below still allows manual copy
    }
  };

  const doImport = () => {
    setError(null);
    const res = importAIPlan(pasted, allExercises, addCustomExercise);
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
    <Modal title="Ask an AI for a plan" onClose={onClose}>
      <div className="form-field">
        <label>1 · What do you want? (in your own words)</label>
        <textarea
          rows={3}
          placeholder="e.g. 4 days a week, upper/lower, focus on chest and arms, I have access to a full gym"
          value={wishes}
          onChange={(e) => setWishes(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label>2 · Copy this prompt into Claude, ChatGPT, or any AI</label>
        <button className="btn block" onClick={copy}>
          {copied ? '✓ Copied!' : '📋 Copy prompt'}
        </button>
        <textarea
          className="code"
          style={{ marginTop: 8 }}
          readOnly
          value={prompt}
          onFocus={(e) => e.target.select()}
        />
      </div>

      <div className="form-field">
        <label>3 · Paste the AI's answer here</label>
        <textarea
          className="code"
          placeholder='Paste the JSON answer (it starts with { "name": ... )'
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
        />
      </div>

      {error && (
        <p style={{ color: 'var(--red)', fontSize: '0.85rem' }}>{error}</p>
      )}

      <button
        className="btn primary block"
        disabled={!pasted.trim()}
        style={{ opacity: pasted.trim() ? 1 : 0.5 }}
        onClick={doImport}
      >
        Import plan
      </button>
    </Modal>
  );
}
