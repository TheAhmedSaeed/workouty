import { LengthUnit, Measurement, Unit } from '../types';
import {
  MEASURE_FIELDS,
  fieldTrend,
  measureUnitLabel,
  sortedMeasurements,
} from './measurements';

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const sign = (n: number) => `${n > 0 ? '+' : ''}${n}`;

/**
 * Build a self-contained, AI-friendly Markdown export of body measurements:
 * a per-field trend summary plus the full dated history. Units are spelled out
 * so it reads without any app context — paste into any assistant for analysis.
 */
export function buildMeasurementsExport(
  measurements: Measurement[],
  unit: Unit,
  lenUnit: LengthUnit,
  exportedAt: string,
): string {
  const rows = sortedMeasurements(measurements); // oldest → newest
  const exported = new Date(exportedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const lines: string[] = [];
  lines.push('# Workouty — Body Measurements');
  lines.push('');
  lines.push(`Exported: ${exported}`);
  lines.push(`Weight unit: ${unit} · Length unit: ${lenUnit}`);
  lines.push(`Entries: ${rows.length}`);
  lines.push('');

  if (rows.length === 0) {
    lines.push('_No measurements logged yet._');
    lines.push('');
    return lines.join('\n');
  }

  // Only include fields that were actually recorded at least once.
  const usedFields = MEASURE_FIELDS.filter((f) =>
    rows.some((m) => typeof m[f.key] === 'number'),
  );

  // ── Framing for an AI assistant ──────────────────────────────────────────
  lines.push(
    'These are my body measurements over time. Please analyse the trends: ' +
      'what is improving, what is stalling or going the wrong way, and what ' +
      'it suggests about fat loss vs. muscle gain. Then tell me what to focus ' +
      'on next. Lower waist/hips/body-fat is progress; higher chest, shoulders, ' +
      'arms, thighs and calves is progress.',
  );
  lines.push('');

  // ── Trend summary ────────────────────────────────────────────────────────
  lines.push('## Latest & change over time');
  lines.push('');
  lines.push('| Measurement | Latest | Since last | All-time | Entries |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const f of usedFields) {
    const t = fieldTrend(measurements, f.key);
    if (!t) continue;
    const ul = measureUnitLabel(f.kind, unit, lenUnit);
    const last = t.sincePrev === null ? '—' : `${sign(t.sincePrev)} ${ul}`;
    const all = t.count > 1 ? `${sign(t.sinceFirst)} ${ul}` : '—';
    lines.push(
      `| ${f.label} | ${t.latest} ${ul} | ${last} | ${all} | ${t.count} |`,
    );
  }
  lines.push('');

  // ── Full history ─────────────────────────────────────────────────────────
  lines.push('## History (oldest → newest)');
  lines.push('');
  const header = [
    'Date',
    ...usedFields.map(
      (f) => `${f.label} (${measureUnitLabel(f.kind, unit, lenUnit)})`,
    ),
  ];
  lines.push(`| ${header.join(' | ')} |`);
  lines.push(`| ${header.map(() => '---').join(' | ')} |`);
  for (const m of rows) {
    const cells = [
      fmtDate(m.date),
      ...usedFields.map((f) => {
        const v = m[f.key];
        return typeof v === 'number' ? String(v) : '';
      }),
    ];
    lines.push(`| ${cells.join(' | ')} |`);
  }
  lines.push('');

  // ── Any notes attached to entries ────────────────────────────────────────
  const withNotes = rows.filter((m) => m.notes?.trim());
  if (withNotes.length > 0) {
    lines.push('## Notes');
    lines.push('');
    for (const m of withNotes) lines.push(`- **${fmtDate(m.date)}:** ${m.notes!.trim()}`);
    lines.push('');
  }

  return lines.join('\n');
}
