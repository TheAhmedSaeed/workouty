import { useMemo, useState } from 'react';
import { Modal } from '../components/Modal';
import { Exercise } from '../types';
import { exercisesToCsv, exercisesToMarkdown } from '../lib/exerciseExport';

/** Export the given exercises (with target muscles) as text, Markdown or CSV. */
export function ExerciseExportModal({
  exercises,
  onClose,
}: {
  exercises: Exercise[];
  onClose: () => void;
}) {
  const md = useMemo(() => exercisesToMarkdown(exercises), [exercises]);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // textarea is selectable for manual copy
    }
  };

  const download = (content: string, ext: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workouty-exercises.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Modal title={`Export exercises (${exercises.length})`} onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        The exercises you're viewing, with the muscles they target. Copy the
        text, or download it as Markdown or a CSV spreadsheet.
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
        <button
          className="btn grow"
          onClick={() => download(md, 'md', 'text/markdown')}
        >
          ⬇ .md
        </button>
        <button
          className="btn grow"
          onClick={() => download(exercisesToCsv(exercises), 'csv', 'text/csv')}
        >
          ⬇ .csv
        </button>
      </div>
    </Modal>
  );
}
