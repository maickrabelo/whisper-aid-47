import { jsPDF } from 'jspdf';
import { installPdfTextSafety } from '@/lib/pdfTextSafety';
import { formatPdfAddress } from '@/lib/pdfDisplayFormat';
import { procedureName } from '@/lib/pcmso/s2220';

const br = (v: unknown) => v ? String(v).slice(0, 10).split('-').reverse().join('/') : 'Não informado';
export function createPcmsoAsoPDF(data: { content: Record<string, any>; hash: string; signature?: Record<string, any> | null }) {
  const pdf = new jsPDF(); installPdfTextSafety(pdf); let y = 22; const c = data.content;
  const line = (t: unknown, bold = false, size = 10) => { pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size); for (const s of pdf.splitTextToSize(String(t ?? ''), 172)) { if (y > 276) { pdf.addPage(); y = 22; } pdf.text(s, 19, y); y += 5.5; } y += 2; };
  if (c.simulation === true) line('SIMULAÇÃO - SEM VALIDADE OCUPACIONAL', true, 14); line('Atestado de Saúde Ocupacional (ASO)', true, 18);
  line(`${c.company?.name ?? 'Empresa'} | CNPJ ${c.company?.cnpj || 'Não informado'}`, true); line(`Endereço: ${formatPdfAddress(c.company?.address) || 'Não informado'}`);
  line(`Trabalhador: ${c.worker?.name ?? ''} | Matrícula: ${c.worker?.registration_number ?? 'Não informada'}`, true);
  line(`Função: ${c.worker?.employment?.role || 'Não informada'} | Setor: ${c.worker?.employment?.sector || 'Não informado'}`);
  line(`Exame: ${c.protocol?.exam_type ?? ''} | Atendimento: ${br(c.exam_date)} | Emissão: ${br(c.issued_on)}`);
  line('Procedimentos', true); for (const p of c.procedures ?? []) line(`- ${br(p.date)}: ${p.code} - ${procedureName(p.code) || p.name}`);
  line(`Conclusão manual do médico: ${c.fitness === 'apto' ? 'APTO' : 'INAPTO'}`, true, 12);
  if (c.program_pending) line('Atenção: PCMSO da empresa ainda não aprovado na data de emissão.', true);
  line(`Médico emitente: ${c.physician?.name ?? ''} | CRM ${c.physician?.crm ?? ''}/${c.physician?.crm_uf ?? ''}`);
  line('Assinatura manual: ___________________________________________');
  line(data.signature ? `Assinatura manual declarada em ${br(data.signature.signed_on)}; referência ${data.signature.reference}. O sistema não verificou a assinatura.` : 'Assinatura manual pendente.');
  line('Não é assinatura digital. Não contém prontuário nem observações clínicas.', false, 8); line(`Integridade: ${data.hash}`, false, 8);
  return pdf;
}