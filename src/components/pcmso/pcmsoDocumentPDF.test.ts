import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createPcmsoPDF, type PcmsoDocumentPayload } from './pcmsoDocumentPDF';

describe('PCMSO frozen document content', () => {
  test('renderer never changes the approved evidence passed to it', () => {
    const payload: PcmsoDocumentPayload = {
      kind: 'aprovado', hash: 'frozen-test-hash', physician: { name: 'Médico fictício', crm: '000', crm_uf: 'SP' }, approved_at: '2026-10-23',
      content: { program: { id: 'fictitious', title: 'PCMSO original', revision_number: 1 }, company: { name: 'Empresa original', address: 'RUA DO SESMT, SP' }, document_settings: { objectives: 'Objetivo original' }, inventory: [], protocols: [], actions: [{ title: 'Ação original', responsible: 'SST', status: 'planejada' }] },
    };
    const original = JSON.stringify(payload);
    const pdf = createPcmsoPDF(payload);
    assert.equal(JSON.stringify(payload), original);
    assert.ok(pdf.output().includes('PCMSO original'));
    assert.ok(pdf.output().includes('frozen-test-hash'));
  });
});