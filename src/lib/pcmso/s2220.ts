import procedures from './procedures.json';
import { UFS, validCpf, validDate, xmlEscape } from '../esocial/common';

type Data = Record<string, any>;
export interface S2220Preparation { event_id: string; payload: Data; hash: string; schema_version: string; status: string }
const types: Record<string, string> = { admissional: '0', periodico: '1', retorno: '2', mudanca_risco: '3', demissional: '9' };
const esc = xmlEscape;
export const procedureName = (code: string) => (procedures as Record<string, string>)[code];

export function validateS2220(p: S2220Preparation): string[] {
  if (!p || !p.payload || typeof p.payload !== 'object') return ['Preparação S-2220 ausente.'];
  const d = p.payload, errors: string[] = [];
  if (d.signature_pending !== true || !((d.simulation === true && d.environment === 2) || (d.simulation === false && d.environment === 1))) errors.push('Ambiente incompatível: ASO simulado só em ambiente 2 e ASO real só em ambiente 1, sem assinatura XML.');
  if (!/^ID\d[A-Z0-9]{12}\d{21}$/.test(p.event_id)) errors.push('Identificação do evento inválida.');
  if (!/^[A-Z0-9]{8}$/.test(d.employer_registration ?? '')) errors.push('CNPJ do empregador incompleto.');
  if (!validCpf(String(d.worker?.cpf ?? ''))) errors.push('CPF do trabalhador inválido.');
  if (!String(d.worker?.registration_number ?? '').trim() || String(d.worker?.registration_number ?? '').length > 30) errors.push('Matrícula do trabalhador ausente ou acima de 30 caracteres.');
  if (!types[d.protocol?.exam_type]) errors.push('Tipo de exame sem correspondência no eSocial.');
  if (!['apto', 'inapto'].includes(d.fitness)) errors.push('Resultado manual do ASO ausente.');
  if (!validDate(d.issued_on)) errors.push('Data do ASO inválida.');
  if (!Array.isArray(d.procedures) || d.procedures.length < 1 || d.procedures.length > 99) errors.push('Informe de 1 a 99 procedimentos.');
  for (const item of Array.isArray(d.procedures) ? d.procedures : []) {
    if (!item || typeof item !== 'object') { errors.push('Procedimento inválido.'); continue; }
    if (!procedureName(item.code)) errors.push(`Procedimento ${item.code || 'sem código'} não está na Tabela 27.`);
    if (!validDate(item.date) || item.date > d.issued_on) errors.push('Data de procedimento inválida ou posterior ao ASO.');
    if (String(item.note ?? '').length > 999) errors.push('Observação do procedimento excede 999 caracteres.');
    if (['0583', '0998', '0999', '1128', '1230', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999', '9999'].includes(item.code) && !String(item.note ?? '').trim()) errors.push(`Procedimento ${item.code} exige observação.`);
    if (item.code === '0281' && !['1', '2'].includes(String(item.order))) errors.push('Procedimento 0281 exige ordem inicial ou sequencial.');
    if (item.order != null && item.order !== '' && !['1','2'].includes(String(item.order))) errors.push('Ordem do exame inválida.');
  }
  for (const doctor of [d.physician, ...(d.responsible_physician ? [d.responsible_physician] : [])]) {
    if (!String(doctor?.name ?? '').trim() || String(doctor?.name ?? '').length > 70 || !String(doctor?.crm ?? '').trim() || String(doctor?.crm ?? '').length > 8 || !UFS.some(uf => uf === doctor?.crm_uf)) errors.push('Médico incompleto ou registro/UF inválidos.');
  }
  if (d.transmitted !== false || p.status !== 'preparado_nao_transmitido') errors.push('Estado de transmissão incompatível.');
  try { esc(JSON.stringify(d)); } catch { errors.push('Dados contêm caracteres incompatíveis com XML.'); }
  return [...new Set(errors)];
}

/** Unsigned S-2220 preparation. XMLDSig is intentionally absent, so it is not a transmissible event. */
export function buildS2220(p: S2220Preparation): string {
  const errors = validateS2220(p);
  if (errors.length) throw new Error(errors.join(' '));
  const d = p.payload;
  const exams = d.procedures.map((x: Data) => `<exame><dtExm>${esc(x.date)}</dtExm><procRealizado>${esc(x.code)}</procRealizado>${x.note ? `<obsProc>${esc(x.note)}</obsProc>` : ''}${x.order ? `<ordExame>${esc(x.order)}</ordExame>` : ''}</exame>`).join('');
  const responsible = d.responsible_physician?.crm ? `<respMonit><nmResp>${esc(d.responsible_physician.name)}</nmResp><nrCRM>${esc(d.responsible_physician.crm)}</nrCRM><ufCRM>${esc(d.responsible_physician.crm_uf)}</ufCRM></respMonit>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- PREPARAÇÃO S-2220 NÃO TRANSMITIDA. ${d.environment === 1 ? 'AMBIENTE DE PRODUÇÃO' : 'AMBIENTE DE TESTE'}. ASSINATURA DIGITAL XML AUSENTE. -->\n<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_03_00"><evtMonit Id="${p.event_id}"><ideEvento><indRetif>1</indRetif><tpAmb>${d.environment === 1 ? 1 : 2}</tpAmb><procEmi>1</procEmi><verProc>SRSMS-PCMSO</verProc></ideEvento><ideEmpregador><tpInsc>1</tpInsc><nrInsc>${d.employer_registration}</nrInsc></ideEmpregador><ideVinculo><cpfTrab>${d.worker.cpf}</cpfTrab><matricula>${esc(d.worker.registration_number)}</matricula></ideVinculo><exMedOcup><tpExameOcup>${types[d.protocol.exam_type]}</tpExameOcup><aso><dtAso>${d.issued_on}</dtAso><resAso>${d.fitness === 'apto' ? 1 : 2}</resAso>${exams}<medico><nmMed>${esc(d.physician.name)}</nmMed><nrCRM>${esc(d.physician.crm)}</nrCRM><ufCRM>${esc(d.physician.crm_uf)}</ufCRM></medico></aso>${responsible}</exMedOcup></evtMonit></eSocial>\n`;
}