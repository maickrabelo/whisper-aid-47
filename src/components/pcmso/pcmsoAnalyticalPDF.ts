import { jsPDF } from 'jspdf';
import { installPdfTextSafety } from '@/lib/pdfTextSafety';
import { formatPdfAddress, formatPdfSector } from '@/lib/pdfDisplayFormat';
import { safeAnalyticalExport, indicatorLabels, clinicalRates, type AnalyticalContent, type Indicator } from '@/lib/pcmso/analyticalReport';

export function createAnalyticalPDF(content: AnalyticalContent, revision: number, hash: string) {
  const c = safeAnalyticalExport(content), pdf = new jsPDF(); installPdfTextSafety(pdf); let y = 20;
  const line = (text: string, bold = false) => { pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(10); for (const part of pdf.splitTextToSize(text, 172)) { if (y > 275) { pdf.addPage(); y = 20; } pdf.text(part, 19, y); y += 5; } y += 3; };
  line('RELATÓRIO ANALÍTICO PCMSO - SIMULAÇÃO SEM VALIDADE CLÍNICA', true);
  line(`Ano ${c.year} | Revisão ${revision} | ${c.status === 'suprimido' ? 'Dados ocultos' : c.status === 'incompleto' ? 'INCOMPLETO' : 'Preenchido em simulação - homologação pendente'}`, true);
  if (c.status !== 'suprimido') {
    line(`${c.company?.name ?? ''} | CNPJ ${c.company?.cnpj || 'Não informado'}`);
    line(`Endereço: ${formatPdfAddress(c.company?.address) || 'Não informado'}`);
    line(`Período: ${c.period_start} a ${c.period_end}`); line(c.population_definition ?? '');
    for (const g of c.groups) {
      line(`${formatPdfSector(g.sector)} | Função: ${g.role}`, true);
      for (const [key, label] of Object.entries(indicatorLabels)) line(`${label}: ${g[key as Indicator] ?? 'Não informado'}`);
      const r = clinicalRates(g); line(`Resultados alterados/exames complementares: ${r.abnormalPercentage === null ? 'Não calculável' : r.abnormalPercentage.toFixed(2) + '%'}`);
      line(`Incidência declarada/população do grupo: ${r.incidencePercentage === null ? 'Não calculável' : r.incidencePercentage.toFixed(2) + '%'}`);
    }
    for (const [key, title] of [['sources', 'Fontes e limitações'], ['analysis', 'Análise e comparação com o período anterior'], ['recommendations', 'Medidas e plano de acompanhamento'], ['discussion', 'Discussão com a empresa e CIPA']]) { line(title, true); line(c[key] ?? 'Não informado'); }
    line(`Médico responsável: ${c.physician?.name ?? ''} | CRM ${c.physician?.crm ?? ''}/${c.physician?.crm_uf ?? ''}`); line('Assinatura manual: ___________________________________________');
  } else line(c.analysis);
  line('Contagens declaradas pelo médico; ausência não significa zero. Este documento não equivale à homologação médica.', true);
  line(`Integridade da revisão: ${hash}`); return pdf;
}