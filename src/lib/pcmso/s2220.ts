import procedures from './procedures.json';

type Data = Record<string, any>;
export interface S2220Preparation { event_id: string; payload: Data; hash: string; schema_version: string; status: string }
const types: Record<string, string> = { admissional: '0', periodico: '1', retorno: '2', mudanca_risco: '3', demissional: '9' };
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
export const procedureName = (code: string) => (procedures as Record<string, string>)[code];

export function validateS2220(p: S2220Preparation): string[] {
  const d = p.payload, errors: string[] = [];
  if (!/^ID\d[A-Z0-9]{12}\d{21}$/.test(p.event_id)) errors.push('Identificação do evento inválida.');
  if (!/^[A-Z0-9]{8}$/.test(d.employer_registration ?? '')) errors.push('CNPJ do empregador incompleto.');
  if (!/^\d{11}$/.test(d.worker?.cpf ?? '')) errors.push('CPF do trabalhador incompleto.');
  if (!String(d.worker?.registration_number ?? '').trim()) errors.push('Matrícula do trabalhador ausente.');
  if (!types[d.protocol?.exam_type]) errors.push('Tipo de exame sem correspondência no eSocial.');
  if (!['apto', 'inapto'].includes(d.fitness)) errors.push('Resultado manual do ASO ausente.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.issued_on ?? '')) errors.push('Data do ASO ausente.');
  if (!Array.isArray(d.procedures) || d.procedures.length < 1 || d.procedures.length > 99) errors.push('Informe de 1 a 99 procedimentos.');
  for (const item of d.procedures ?? []) {
    if (!procedureName(item.code)) errors.push(`Procedimento ${item.code || 'sem código'} não está na Tabela 27.`);
    if (!item.date || item.date > d.issued_on) errors.push('Data de procedimento posterior ao ASO.');
    if (['0583', '0998', '0999', '1128', '1230', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999', '9999'].includes(item.code) && !item.note) errors.push(`Procedimento ${item.code} exige observação.`);
    if (item.code === '0281' && !['1', '2'].includes(String(item.order))) errors.push('Procedimento 0281 exige ordem inicial ou sequencial.');
  }
  if (!d.physician?.name || !d.physician?.crm || !/^[A-Z]{2}$/.test(d.physician?.crm_uf ?? '')) errors.push('Médico emitente incompleto.');
  if (d.transmitted !== false || p.status !== 'preparado_nao_transmitido') errors.push('Estado de transmissão incompatível.');
  return [...new Set(errors)];
}

/** Unsigned S-2220 preparation. XMLDSig is intentionally absent, so it is not a transmissible event. */
export function buildS2220(p: S2220Preparation): string {
  const errors = validateS2220(p);
  if (errors.length) throw new Error(errors.join(' '));
  const d = p.payload;
  const exams = d.procedures.map((x: Data) => `<exame><dtExm>${x.date}</dtExm><procRealizado>${x.code}</procRealizado>${x.note ? `<obsProc>${esc(x.note)}</obsProc>` : ''}${x.order ? `<ordExame>${x.order}</ordExame>` : ''}</exame>`).join('');
  const responsible = d.responsible_physician?.crm ? `<respMonit><nmResp>${esc(d.responsible_physician.name)}</nmResp><nrCRM>${esc(d.responsible_physician.crm)}</nrCRM><ufCRM>${esc(d.responsible_physician.crm_uf)}</ufCRM></respMonit>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- PREPARAÇÃO S-2220 NÃO TRANSMITIDA. AMBIENTE DE TESTE. ASSINATURA DIGITAL XML AUSENTE. -->\n<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_03_00"><evtMonit Id="${p.event_id}"><ideEvento><indRetif>1</indRetif><tpAmb>2</tpAmb><procEmi>1</procEmi><verProc>SRSMS-PCMSO-PILOTO</verProc></ideEvento><ideEmpregador><tpInsc>1</tpInsc><nrInsc>${d.employer_registration}</nrInsc></ideEmpregador><ideVinculo><cpfTrab>${d.worker.cpf}</cpfTrab><matricula>${esc(d.worker.registration_number)}</matricula></ideVinculo><exMedOcup><tpExameOcup>${types[d.protocol.exam_type]}</tpExameOcup><aso><dtAso>${d.issued_on}</dtAso><resAso>${d.fitness === 'apto' ? 1 : 2}</resAso>${exams}<medico><nmMed>${esc(d.physician.name)}</nmMed><nrCRM>${esc(d.physician.crm)}</nrCRM><ufCRM>${esc(d.physician.crm_uf)}</ufCRM></medico></aso>${responsible}</exMedOcup></evtMonit></eSocial>\n`;
}