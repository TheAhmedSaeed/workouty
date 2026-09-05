import { describe, expect, it } from 'vitest';
import { Measurement } from '../types';
import { buildMeasurementsExport } from '../lib/measurementExport';

const at = '2026-09-05T12:00:00Z';

const list: Measurement[] = [
  { id: 'a', date: '2026-08-01', weight: 80, waist: 90, chest: 100 },
  { id: 'b', date: '2026-09-01', weight: 78, waist: 88, notes: 'felt lean' },
];

describe('buildMeasurementsExport', () => {
  it('handles an empty history', () => {
    const md = buildMeasurementsExport([], 'kg', 'cm', at);
    expect(md).toContain('No measurements logged yet');
    expect(md).toContain('Entries: 0');
  });

  it('includes header, units and entry count', () => {
    const md = buildMeasurementsExport(list, 'kg', 'cm', at);
    expect(md).toContain('# Workouty — Body Measurements');
    expect(md).toContain('Weight unit: kg · Length unit: cm');
    expect(md).toContain('Entries: 2');
  });

  it('summarises trends with signed deltas', () => {
    const md = buildMeasurementsExport(list, 'kg', 'cm', at);
    // weight went 80 → 78, so "since last" is -2 kg
    expect(md).toMatch(/\| Weight \| 78 kg \| -2 kg \| -2 kg \| 2 \|/);
  });

  it('only shows columns for fields that were recorded', () => {
    const md = buildMeasurementsExport(list, 'kg', 'cm', at);
    expect(md).toContain('Weight (kg)');
    expect(md).toContain('Waist (cm)');
    expect(md).toContain('Chest (cm)');
    // no one logged hips → no such column
    expect(md).not.toContain('Hips (cm)');
  });

  it('lists the full history oldest → newest', () => {
    const md = buildMeasurementsExport(list, 'kg', 'cm', at);
    // the older Aug entry's weight (80) appears before the Sep entry's (78)
    const augIdx = md.indexOf('| 80 |');
    const sepIdx = md.indexOf('| 78 |');
    expect(augIdx).toBeGreaterThan(-1);
    expect(sepIdx).toBeGreaterThan(augIdx);
  });

  it('collects per-entry notes', () => {
    const md = buildMeasurementsExport(list, 'kg', 'cm', at);
    expect(md).toContain('## Notes');
    expect(md).toContain('felt lean');
  });

  it('includes an AI analysis prompt', () => {
    const md = buildMeasurementsExport(list, 'kg', 'cm', at);
    expect(md.toLowerCase()).toContain('analyse the trends');
  });
});
