import { describe, expect, test } from 'bun:test';
import { blankAnalyticalGroup, clinicalRates, safeAnalyticalExport, type AnalyticalContent } from '../../../src/lib/pcmso/analyticalReport';

const content = (population: number): AnalyticalContent => ({ year: 2026, groups: [{ ...blankAnalyticalGroup(), sector: 'Produção', role: 'Operador', population, clinical_exams: 10, complementary_exams: 10, abnormal_results: 5, occupational_diseases: 0, cat: 0, admission: 5, periodic: 5, return: 0, change_risk: 0, dismissal: 0 }], analysis: 'Informação sensível', recommendations: 'Medidas', sources: 'Fonte fictícia', discussion: 'Discussão fictícia' });
describe('PCMSO anonymity threshold of 5', () => {
  test('4 workers suppress all groups and narrative, including complementary totals', () => { const c = content(4); const result = safeAnalyticalExport(c); expect(result.groups).toEqual([]); expect(result.status).toBe('suprimido'); expect(result.analysis).not.toContain('Informação sensível'); expect(result.sources).toBe(''); });
  test('5 workers can be exported when no positive indicator is below 5', () => { const c = content(5); expect(safeAnalyticalExport(c).groups).toEqual(c.groups); });
  test('a rare indicator of 1 suppresses the entire export to prevent subtraction', () => { const c = content(100); c.groups[0].occupational_diseases = 1; expect(safeAnalyticalExport(c).groups).toEqual([]); });
  test('missing data remains null, never a fabricated zero', () => { const c = content(5); c.groups[0].cat = null; expect(safeAnalyticalExport(c).groups[0].cat).toBeNull(); });
  test('rates use explicit denominators and missing data cannot produce a rate', () => { expect(clinicalRates(content(10).groups[0]).abnormalPercentage).toBe(50); const g = blankAnalyticalGroup(); expect(clinicalRates(g).incidencePercentage).toBeNull(); });
  test('export never rewrites the source snapshot', () => { const c = content(4), original = JSON.stringify(c); safeAnalyticalExport(c); expect(JSON.stringify(c)).toBe(original); });
});