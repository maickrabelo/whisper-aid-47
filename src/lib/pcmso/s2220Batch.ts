import { buildS2220, validateS2220, type S2220Preparation } from './s2220';
import type { ExportFile } from '../esocial/download';

export function originalS2220Asos<T extends { id: string; previous_aso_id?: string | null }>(asos: T[]): T[] {
  const superseded = new Set(asos.map(a => a.previous_aso_id).filter(Boolean));
  return asos.filter(a => !a.previous_aso_id && !superseded.has(a.id));
}

/** Validate the entire selection before releasing any unsigned files. */
export function buildS2220Files(preparations: S2220Preparation[]): ExportFile[] {
  if (!preparations.length) throw new Error('Selecione ao menos um ASO.');
  const ids = new Set<string>();
  const employer = preparations[0]?.payload?.employer_registration;
  const errors: string[] = [];
  preparations.forEach((p, index) => {
    const issues = validateS2220(p);
    if (p?.payload?.employer_registration !== employer) issues.push('O lote deve pertencer ao mesmo empregador.');
    if (ids.has(p?.event_id)) issues.push('Evento repetido no lote.');
    ids.add(p?.event_id);
    errors.push(...issues.map(issue => `ASO ${index + 1}: ${issue}`));
  });
  if (errors.length) throw new Error(errors.join('\n'));
  return preparations.map(p => ({ name: `S2220_SIMULADO_${p.event_id}.xml`, xml: buildS2220(p) }));
}