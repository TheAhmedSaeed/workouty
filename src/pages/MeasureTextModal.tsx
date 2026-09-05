import { useMemo, useState } from 'react';
import { Modal } from '../components/Modal';
import { LengthUnit, Measurement, Unit } from '../types';
import { buildMeasurementsExport } from '../lib/measurementExport';

/** Body measurements as AI-friendly Markdown, with copy + download. */
export function MeasureTextModal({
  measurements,
  unit,
  lenUnit,
  onClose,
}: {
  measurements: Measurement[];
  unit: Unit;
  lenUnit: LengthUnit;
  onClose: () => void;
}) {
  const md = useMemo(
    () =>
      buildMeasurementsExport(
        measurements,
        unit,
        lenUnit,
        new Date().toISOString(),
      ),
    [measurements, unit, lenUnit],
  );
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
    const a = document.createElement('a');
    a.href = url;
    a.download = `workouty-measurements-${new Date()
      .toISOString()
      .slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Modal title="Export measurements" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Your full history and trends as text. Tap <b>📋 Copy</b> and paste it
        into any AI assistant (Claude, ChatGPT…) to analyse your progress — it
        already includes the question to ask.
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
