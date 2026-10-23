import table24 from './table24.json';
import { eventId, normalizeRegistration, UFS, validCnpj, validCpf, validDate, xmlEscape as esc } from './common';
import type { ExportFile } from './download';

export interface S2240Worker { id: string; full_name: string; cpf: string; registration_number: string | null; admission_date: string | null }
export interface S2240Group { id: string; name: string; sector: string | null; activities_description: string | null; pgr_ghe_workers: S2240Worker[] }
export interface S2240Risk { id: string; ghe_id: string | null; category: string; agent_name: string; esocial_agent_code: string | null; measurement_value: number | null; exposure_limit: number | null; epi_ca: string | null }
export interface AgentDeclaration {
  code: string; description: string; assessment: string; value: string; limit: string; unit: string; technique: string;
  epc: string; epcEffective: string; epi: string; epiEffective: string; documents: string;
  measures: string; functioning: string; continuous: string; validity: string; replacement: string; hygiene: string;
}
export interface S2240Settings {
  environment: '1' | '2'; conditionDate: string; obligationDate: string; establishment: string; local: '1' | '2';
  cpf: string; council: string; councilName: string; councilNumber: string; uf: string; reviewed: boolean;
}
const absence = '09.01.001';
const needsDescription = new Set(['01.01.001','01.02.001','01.03.001','01.04.001','01.05.001','01.06.001','01.07.001','01.08.001','01.09.001','01.10.001','01.12.001','01.13.001','01.14.001','01.15.001','01.16.001','01.17.001','01.18.001','05.01.001']);
const decimal = (s: string) => /^\d{1,6}(\.\d{1,4})?$/.test(s) && Number(s) <= 999999.9999;
const yesNo = (s: string) => ['S','N'].includes(s);
export function seedDeclaration(r: S2240Risk): AgentDeclaration {
  return { code: r.esocial_agent_code ?? '', description: r.agent_name, assessment: '', value: r.measurement_value == null ? '' : String(r.measurement_value), limit: r.exposure_limit == null ? '' : String(r.exposure_limit), unit: '', technique: '', epc: '', epcEffective: '', epi: '', epiEffective: '', documents: r.epi_ca ?? '', measures: '', functioning: '', continuous: '', validity: '', replacement: '', hygiene: '' };
}
export function validateS2240(companyCnpj: string, groups: S2240Group[], risks: S2240Risk[], declarations: Record<string, AgentDeclaration>, s: S2240Settings, now = new Date()): string[] {
  const errors: string[] = [];
  if (!validCnpj(companyCnpj)) errors.push('CNPJ do empregador inválido.');
  if (!validCnpj(s.establishment)) errors.push('CNPJ do estabelecimento inválido.');
  if (s.local === '2' && normalizeRegistration(companyCnpj).slice(0,8) === normalizeRegistration(s.establishment).slice(0,8)) errors.push('Estabelecimento de terceiro deve ter raiz de CNPJ diferente do empregador.');
  if (!validCpf(s.cpf)) errors.push('CPF do responsável técnico inválido.');
  if (!validDate(s.conditionDate)) errors.push('Informe a data real de início da condição.');
  if (!validDate(s.obligationDate) || s.conditionDate < s.obligationDate) errors.push('Início da condição anterior ao início da obrigatoriedade ou obrigatoriedade ausente.');
  const maxDate = new Date(now); maxDate.setUTCDate(maxDate.getUTCDate() + 30);
  if (s.conditionDate > maxDate.toISOString().slice(0,10)) errors.push('Início da condição excede 30 dias no futuro.');
  if (!s.reviewed) errors.push('Confirme a revisão técnica, matrícula, estabelecimento e enquadramento dos agentes.');
  if (!['1','2'].includes(s.environment)) errors.push('Ambiente inválido.');
  if (!['1','4','9'].includes(s.council) || !s.councilNumber.trim() || s.councilNumber.length > 14 || !UFS.some(uf => uf === s.uf)) errors.push('Informe conselho, número de registro (até 14 caracteres) e UF.');
  if (s.council === '9' && (!s.councilName.trim() || s.councilName.length > 20)) errors.push('Informe o nome do conselho (até 20 caracteres).');
  if (!groups.length || groups.length > 1000 || risks.length > 2000) errors.push('Quantidade de GHEs/riscos ausente ou acima do limite desta exportação.');
  const seen = new Set<string>();
  if (risks.some(r => !r.ghe_id && ['fisico','quimico','biologico'].includes(r.category))) errors.push('Há riscos físicos, químicos ou biológicos sem GHE.');
  for (const g of groups) {
    const label = `GHE ${g.name}`;
    if (!(g.sector ?? g.name).trim() || (g.sector ?? g.name).length > 100) errors.push(`${label}: setor obrigatório com até 100 caracteres.`);
    if (!g.activities_description?.trim() || g.activities_description.length > 999) errors.push(`${label}: descrição real das atividades obrigatória (até 999 caracteres).`);
    if (!g.pgr_ghe_workers.length) errors.push(`${label}: nenhum trabalhador cadastrado; não serão criados trabalhadores fictícios.`);
    if (g.pgr_ghe_workers.length > 1000) errors.push(`${label}: excede o limite de trabalhadores desta exportação.`);
    for (const w of g.pgr_ghe_workers) {
      const key = `${w.cpf.replace(/\D/g,'')}|${w.registration_number?.trim()}`;
      if (!validCpf(w.cpf) || !w.registration_number?.trim() || w.registration_number.length > 30) errors.push(`${label}: trabalhador ${w.full_name} com CPF ou matrícula inválidos.`);
      if (!validDate(w.admission_date) || s.conditionDate < w.admission_date) errors.push(`${label}: ${w.full_name} sem admissão válida ou condição anterior à admissão.`);
      if (seen.has(key)) errors.push(`${label}: vínculo repetido em mais de um GHE; revise antes de exportar.`);
      seen.add(key);
    }
    const relevant = risks.filter(r => r.ghe_id === g.id && (r.esocial_agent_code || ['fisico','quimico','biologico'].includes(r.category)));
    if (!relevant.length) errors.push(`${label}: declare explicitamente os agentes ou a ausência técnica no inventário.`);
    if (relevant.length > 999) errors.push(`${label}: mais de 999 agentes.`);
    const codes = relevant.map(r => declarations[r.id]?.code);
    if (new Set(codes).size !== codes.length) errors.push(`${label}: agentes duplicados.`);
    if (codes.includes(absence) && codes.length !== 1) errors.push(`${label}: ausência de agente não pode coexistir com exposição.`);
    for (const r of relevant) {
      const a = declarations[r.id]; const prefix = `${label} / ${r.agent_name}`;
      if (!a || !(table24 as Record<string,string>)[a.code]) { errors.push(`${prefix}: selecione um código da Tabela 24.`); continue; }
      if (a.code === absence) continue;
      if (a.code === '05.01.001') { errors.push(`${prefix}: agente judicial exige fluxo específico ainda não suportado.`); continue; }
      if (needsDescription.has(a.code) && !a.description.trim() || a.description.length > 100) errors.push(`${prefix}: descrição obrigatória com até 100 caracteres.`);
      if (!['1','2'].includes(a.assessment)) errors.push(`${prefix}: informe avaliação quantitativa ou qualitativa.`);
      if (a.assessment === '1') {
        if (!decimal(a.value) || !/^([1-9]|[12]\d|30)$/.test(a.unit) || !a.technique.trim() || a.technique.length > 40) errors.push(`${prefix}: medição, unidade oficial e técnica obrigatórias; até 4 casas decimais.`);
        if (['01.18.001','02.01.014'].includes(a.code) && !decimal(a.limit)) errors.push(`${prefix}: limite de tolerância obrigatório.`);
      }
      if (!['0','1','2'].includes(a.epc) || !['0','1','2'].includes(a.epi)) errors.push(`${prefix}: declare utilização de EPC e EPI.`);
      if (a.epc === '2' && !yesNo(a.epcEffective)) errors.push(`${prefix}: eficácia do EPC obrigatória.`);
      if (a.epi === '2') {
        const documents = a.documents.split(/[,;\n]/).map(v => v.trim()).filter(Boolean);
        if (!yesNo(a.epiEffective) || !documents.length || documents.length > 50 || documents.some(v => v.length > 255)) errors.push(`${prefix}: eficácia e documentos de avaliação dos EPIs obrigatórios.`);
        if (![a.measures,a.functioning,a.continuous,a.validity,a.replacement,a.hygiene].every(yesNo)) errors.push(`${prefix}: responda às seis declarações complementares do EPI.`);
      }
    }
  }
  try { esc(JSON.stringify({ groups, declarations, s })); } catch { errors.push('Há caracteres inválidos para XML nos dados.'); }
  return [...new Set(errors)];
}
export function buildS2240Files(cnpj: string, groups: S2240Group[], risks: S2240Risk[], declarations: Record<string, AgentDeclaration>, s: S2240Settings, now = new Date()): ExportFile[] {
  const errors = validateS2240(cnpj, groups, risks, declarations, s, now);
  if (errors.length) throw new Error(errors.join('\n'));
  const files: ExportFile[] = []; const sequenceBase = Math.floor(Math.random() * 8000000);
  const tag = (name: string, value: unknown) => `<${name}>${esc(value)}</${name}>`;
  for (const g of groups) {
    const relevant = risks.filter(r => r.ghe_id === g.id && (r.esocial_agent_code || ['fisico','quimico','biologico'].includes(r.category)));
    const agents = relevant.map(r => {
      const a = declarations[r.id]; if (!a) throw new Error('Declaração ausente.');
      if (a.code === absence) return `<agNoc>${tag('codAgNoc',a.code)}</agNoc>`;
      const measurement = a.assessment === '1' ? tag('intConc',a.value) + (['01.18.001','02.01.014'].includes(a.code) ? tag('limTol',a.limit) : '') + tag('unMed',a.unit) + tag('tecMedicao',a.technique) : '';
      const epi = a.epi === '2' ? tag('eficEpi',a.epiEffective) + a.documents.split(/[,;\n]/).map(d => d.trim()).filter(Boolean).map(d => `<epi>${tag('docAval',d)}</epi>`).join('') + `<epiCompl>${tag('medProtecao',a.measures)}${tag('condFuncto',a.functioning)}${tag('usoInint',a.continuous)}${tag('przValid',a.validity)}${tag('periodicTroca',a.replacement)}${tag('higienizacao',a.hygiene)}</epiCompl>` : '';
      return `<agNoc>${tag('codAgNoc',a.code)}${a.description.trim() ? tag('dscAgNoc',a.description) : ''}${tag('tpAval',a.assessment)}${measurement}<epcEpi>${tag('utilizEPC',a.epc)}${a.epc === '2' ? tag('eficEpc',a.epcEffective) : ''}${tag('utilizEPI',a.epi)}${epi}</epcEpi></agNoc>`;
    }).join('');
    for (const w of g.pgr_ghe_workers) {
      const id = eventId(cnpj,now,sequenceBase + files.length + 1);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- PREPARAÇÃO SEM ASSINATURA XML. NÃO TRANSMITIDA. AMBIENTE ${s.environment}. -->\n<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_03_00"><evtExpRisco Id="${id}"><ideEvento><indRetif>1</indRetif><tpAmb>${s.environment}</tpAmb><procEmi>1</procEmi><verProc>SRSMS-EXPORT-1</verProc></ideEvento><ideEmpregador><tpInsc>1</tpInsc>${tag('nrInsc',normalizeRegistration(cnpj).slice(0,8))}</ideEmpregador><ideVinculo>${tag('cpfTrab',w.cpf.replace(/\D/g,''))}${tag('matricula',w.registration_number?.trim())}</ideVinculo><infoExpRisco>${tag('dtIniCondicao',s.conditionDate)}<infoAmb>${tag('localAmb',s.local)}${tag('dscSetor',g.sector ?? g.name)}<tpInsc>1</tpInsc>${tag('nrInsc',normalizeRegistration(s.establishment))}</infoAmb><infoAtiv>${tag('dscAtivDes',g.activities_description)}</infoAtiv>${agents}<respReg>${tag('cpfResp',s.cpf.replace(/\D/g,''))}${tag('ideOC',s.council)}${s.council === '9' ? tag('dscOC',s.councilName) : ''}${tag('nrOC',s.councilNumber)}${tag('ufOC',s.uf)}</respReg></infoExpRisco></evtExpRisco></eSocial>\n`;
      files.push({ name: `S2240_${id}.xml`, xml });
    }
  }
  return files;
}