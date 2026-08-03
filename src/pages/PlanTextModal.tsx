import { useMemo, useState } from 'react';
import { Modal } from '../components/Modal';
import { Exercise, Template } from '../types';
import { planToMarkdown } from '../lib/planText';

/** Shows a plan as editable Markdown, with copy + download. */
export function PlanTextModal({
  plan,
  getExercise,
  onClose,
}: {
  plan: Template;
  getExercise: (id: string) => Exercise | undefined;
  onClose: () => void;
}) {
  const md = useMemo(() => planToMarkdown(plan, getExercise), [plan, getExercise]);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the textarea is selectable for manual copy
    }
  };

  const download = () => {
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const slug =
      (plan.name || 'plan')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'plan';
    const a = document.createElement('a');
    a.href = url;
    a.download = `workouty-${slug}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Modal title="Export plan as text" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Copy or download this — edit it in any notes app, then paste it back via
        <b> New plan → Import</b> to recreate or update it.
      </p>
      <textarea
        className="code"
        rows={14}
        readOnly
        value={md}
        onFocus={(e) => e.target.select()}
      />
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn primary grow" onClick={copy}>
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
        <button className="btn grow" onClick={download}>
          ⬇ Download .md
        </button>
      </div>
    </Modal>
  );
}
