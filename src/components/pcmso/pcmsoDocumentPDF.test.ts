import { describe, expect, test } from 'bun:test';
import { createPcmsoPDF, type PcmsoDocumentPayload } from './pcmsoDocumentPDF';

describe('PCMSO frozen document content', () => {
  test('renderer never changes the approved evidence passed to it', () => {
    const payload: PcmsoDocumentPayload = {
      kind: 'aprovado', hash: 'frozen-test-hash', physician: { name: 'Médico fictício', crm: '000', crm_uf: 'SP' }, approved_at: '2026-10-23',
      content: { program: { id: 'fictitious', title: 'PCMSO original', revision_number: 1 }, company: { name: 'Empresa original', address: 'RUA DO SESMT, SP' }, document_settings: { objectives: 'Objetivo original' }, inventory: [], protocols: [], actions: [{ title: 'Ação original', responsible: 'SST', status: 'planejada' }] },
    };
    const original = JSON.stringify(payload);
    const pdf = createPcmsoPDF(payload);
    expect(JSON.stringify(payload)).toBe(original);
    expect(pdf.output()).toContain('PCMSO original');
    expect(pdf.output()).toContain('frozen-test-hash');
  });
});