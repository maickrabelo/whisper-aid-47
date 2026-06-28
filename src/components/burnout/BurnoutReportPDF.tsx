import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { renderReportLogos } from '@/lib/pdfLogos';
import {
  BurnoutCategory,
  BurnoutRiskLevel,
  BURNOUT_CATEGORY_LABELS,
  BURNOUT_CATEGORY_COLORS,
  BURNOUT_QUESTIONS_SORTED,
  BURNOUT_RISK_LABELS,
  BURNOUT_RISK_COLORS,
  BURNOUT_RISK_RECOMMENDATIONS,
  getBurnoutRiskLevel,
  getQuestionsByCategory
} from '@/data/burnoutQuestions';

interface Response {
  id: string;
  department: string | null;
  total_score: number;
  risk_level: string;
  completed_at: string;
  demographics: Record<string, string> | null;
}

interface DepartmentData {
  department: string;
  responseCount: number;
  avgScore: number;
  riskLevel: BurnoutRiskLevel;
  categories: { category: string; value: number }[];
}

interface CategoryData {
  category: string;
  value: number;
  fill: string;
}

interface BurnoutReportPDFProps {
  assessment: {
    title: string;
    description: string | null;
    companies: { name: string; logo_url: string | null } | null;
  };
  responses: Response[];
  categoryData: CategoryData[];
  departmentData: DepartmentData[];
  avgScore: number;
  overallRiskLevel: BurnoutRiskLevel;
  riskDistribution: { name: string; value: number; color: string }[];
  questionAverages: {
    number: number;
    text: string;
    category: BurnoutCategory;
    avgValue: number;
    percentage: number;
  }[];
  hasDetailedAnswers: boolean;
  sstLogoUrl?: string | null;
}

export function BurnoutReportPDF({
  assessment,
  responses,
  categoryData,
  departmentData,
  avgScore,
  overallRiskLevel,
  riskDistribution,
  questionAverages,
  hasDetailedAnswers,
  sstLogoUrl
}: BurnoutReportPDFProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      const addNewPageIfNeeded = (neededSpace: number) => {
        if (yPos + neededSpace > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      const addHeader = (text: string, size: number = 16) => {
        addNewPageIfNeeded(15);
        pdf.setFontSize(size);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(127, 29, 29); // Dark red for burnout theme
        pdf.text(text, margin, yPos);
        yPos += size / 2 + 4;
      };

      const addSubHeader = (text: string) => {
        addNewPageIfNeeded(12);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(60, 60, 60);
        pdf.text(text, margin, yPos);
        yPos += 8;
      };

      const addText = (text: string, indent: number = 0) => {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(40, 40, 40);
        const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin - indent);
        lines.forEach((line: string) => {
          addNewPageIfNeeded(6);
          pdf.text(line, margin + indent, yPos);
          yPos += 5;
        });
      };

      const addSeparator = () => {
        yPos += 3;
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;
      };

      const getRiskColor = (level: BurnoutRiskLevel): [number, number, number] => {
        const colors: Record<BurnoutRiskLevel, [number, number, number]> = {
          sem_indicio: [34, 197, 94],
          risco_desenvolvimento: [234, 179, 8],
          fase_inicial: [249, 115, 22],
          condicao_estabelecida: [239, 68, 68],
          estagio_avancado: [127, 29, 29]
        };
        return colors[level] || [100, 100, 100];
      };

      // ========== CAPA ==========
      // Header gradient-like effect
      pdf.setFillColor(127, 29, 29); // Dark red
      pdf.rect(0, 0, pageWidth, 60, 'F');
      
      // Logos: SST manager (left) + Company (right)
      await renderReportLogos(pdf, pageWidth, {
        sstLogoUrl,
        companyLogoUrl: assessment.companies?.logo_url || null,
        topY: 8,
        maxHeight: 28,
        maxWidth: 45,
      });
      
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('RELATÓRIO DE BURNOUT', pageWidth / 2, 30, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Avaliação de Síndrome de Burnout - LBQ/MBI', pageWidth / 2, 42, { align: 'center' });

      yPos = 80;
      
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(40, 40, 40);
      pdf.text(assessment.companies?.name || 'Empresa', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(assessment.title, pageWidth / 2, yPos, { align: 'center' });
      yPos += 20;

      // Resumo executivo na capa
      pdf.setFillColor(245, 245, 245);
      pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 60, 3, 3, 'F');
      
      yPos += 12;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(127, 29, 29);
      pdf.text('RESUMO EXECUTIVO', pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      
      const departments = [...new Set(responses.filter(r => r.department).map(r => r.department!))];
      const criticalCount = riskDistribution.filter(r => 
        r.name === BURNOUT_RISK_LABELS.condicao_estabelecida || 
        r.name === BURNOUT_RISK_LABELS.estagio_avancado
      ).reduce((sum, r) => sum + r.value, 0);
      const healthyCount = riskDistribution.filter(r => 
        r.name === BURNOUT_RISK_LABELS.sem_indicio
      ).reduce((sum, r) => sum + r.value, 0);

      pdf.text(`Total de Respostas: ${responses.length}`, margin + 10, yPos);
      pdf.text(`Setores Avaliados: ${departments.length || 1}`, pageWidth / 2, yPos);
      yPos += 7;
      pdf.text(`Pontuação Média: ${avgScore} pontos`, margin + 10, yPos);
      pdf.text(`Nível Geral: ${BURNOUT_RISK_LABELS[overallRiskLevel]}`, pageWidth / 2, yPos);
      yPos += 7;
      pdf.text(`Casos Críticos: ${criticalCount} (${responses.length > 0 ? Math.round(criticalCount / responses.length * 100) : 0}%)`, margin + 10, yPos);
      pdf.text(`Sem Indício: ${healthyCount} (${responses.length > 0 ? Math.round(healthyCount / responses.length * 100) : 0}%)`, pageWidth / 2, yPos);

      yPos += 35;
      
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' });

      // ========== PÁGINA 2: METODOLOGIA ==========
      pdf.addPage();
      yPos = margin;

      addHeader('1. METODOLOGIA', 16);
      yPos += 3;
      
      addText('Esta avaliação utiliza instrumentos validados cientificamente (LBQ - Link Burnout Questionnaire e MBI - Maslach Burnout Inventory) para mensurar a Síndrome de Burnout através de três dimensões principais:');
      yPos += 5;

      const categories: BurnoutCategory[] = ['exaustao', 'despersonalizacao', 'desmotivacao'];
      categories.forEach(cat => {
        const questionsCount = getQuestionsByCategory(cat).length;
        addText(`• ${BURNOUT_CATEGORY_LABELS[cat]} (${questionsCount} questões)`, 5);
      });

      yPos += 5;
      addText('A escala utilizada é de 1 a 6, onde:');
      addText('1 = Nunca | 2 = Raramente | 3 = Uma ou mais vezes por mês', 5);
      addText('4 = Mais ou menos toda semana | 5 = Várias vezes por semana | 6 = Todos os dias', 5);
      yPos += 5;
      addText('A pontuação total varia de 20 a 120 pontos, sendo que quanto maior a pontuação, maior o nível de burnout.');

      yPos += 8;
      addSubHeader('Classificação de Risco:');
      addText('• Sem Indício (≤ 20 pts): Não há sinais de burnout', 5);
      addText('• Risco de Desenvolver (21-40 pts): Atenção preventiva necessária', 5);
      addText('• Fase Inicial (41-60 pts): Intervenção preventiva recomendada', 5);
      addText('• Condição Estabelecida (61-80 pts): Tratamento necessário', 5);
      addText('• Estágio Avançado (> 80 pts): Intervenção urgente requerida', 5);

      // ========== PÁGINA 3: DISTRIBUIÇÃO DE RISCO ==========
      pdf.addPage();
      yPos = margin;

      addHeader('2. DISTRIBUIÇÃO DE NÍVEIS DE RISCO', 16);
      yPos += 5;

      addText('Análise da distribuição dos colaboradores por nível de risco de burnout:');
      yPos += 10;

      // Tabela de distribuição
      pdf.setFillColor(127, 29, 29);
      pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Nível de Risco', margin + 5, yPos + 5.5);
      pdf.text('Quantidade', margin + 80, yPos + 5.5);
      pdf.text('Percentual', margin + 120, yPos + 5.5);
      pdf.text('Ação Recomendada', margin + 150, yPos + 5.5);
      yPos += 10;

      const allRiskLevels: BurnoutRiskLevel[] = ['sem_indicio', 'risco_desenvolvimento', 'fase_inicial', 'condicao_estabelecida', 'estagio_avancado'];
      
      allRiskLevels.forEach((level, index) => {
        const data = riskDistribution.find(r => r.name === BURNOUT_RISK_LABELS[level]);
        const count = data?.value || 0;
        const percentage = responses.length > 0 ? Math.round(count / responses.length * 100) : 0;
        
        const bgColor = index % 2 === 0 ? 250 : 240;
        pdf.setFillColor(bgColor, bgColor, bgColor);
        pdf.rect(margin, yPos - 4, pageWidth - 2 * margin, 10, 'F');
        
        // Color indicator
        const color = getRiskColor(level);
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.circle(margin + 3, yPos, 2, 'F');
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        pdf.text(BURNOUT_RISK_LABELS[level], margin + 8, yPos + 1);
        pdf.text(count.toString(), margin + 85, yPos + 1);
        pdf.text(`${percentage}%`, margin + 125, yPos + 1);
        
        const actions: Record<BurnoutRiskLevel, string> = {
          sem_indicio: 'Manter',
          risco_desenvolvimento: 'Prevenir',
          fase_inicial: 'Intervir',
          condicao_estabelecida: 'Tratar',
          estagio_avancado: 'Urgente'
        };
        pdf.text(actions[level], margin + 155, yPos + 1);
        
        yPos += 10;
      });

      // ========== PÁGINA 4: ANÁLISE POR CATEGORIA ==========
      pdf.addPage();
      yPos = margin;

      addHeader('3. ANÁLISE POR CATEGORIA', 16);
      yPos += 5;

      addText('Percentual médio de sintomas por categoria de burnout:');
      yPos += 10;

      categoryData.forEach((cat, index) => {
        addNewPageIfNeeded(25);
        
        // Box colorido para a categoria
        pdf.setFillColor(
          parseInt(cat.fill.slice(1, 3), 16),
          parseInt(cat.fill.slice(3, 5), 16),
          parseInt(cat.fill.slice(5, 7), 16)
        );
        pdf.roundedRect(margin, yPos - 2, 5, 25, 1, 1, 'F');
        
        yPos += 2;
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(40, 40, 40);
        pdf.text(cat.category, margin + 10, yPos);
        
        yPos += 7;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Percentual médio: ${cat.value.toFixed(1)}%`, margin + 10, yPos);
        
        // Progress bar visual
        yPos += 5;
        pdf.setFillColor(230, 230, 230);
        pdf.roundedRect(margin + 10, yPos, 100, 5, 2, 2, 'F');
        pdf.setFillColor(
          parseInt(cat.fill.slice(1, 3), 16),
          parseInt(cat.fill.slice(3, 5), 16),
          parseInt(cat.fill.slice(5, 7), 16)
        );
        pdf.roundedRect(margin + 10, yPos, Math.min(100, cat.value), 5, 2, 2, 'F');
        
        yPos += 15;
      });

      // ========== PÁGINA 5: ANÁLISE POR SETOR ==========
      if (departmentData.length > 0) {
        pdf.addPage();
        yPos = margin;

        addHeader('4. ANÁLISE POR SETOR', 16);
        yPos += 5;

        departmentData.forEach(dept => {
          addNewPageIfNeeded(50);
          
          const color = getRiskColor(dept.riskLevel);
          
          // Box colorido para o setor
          pdf.setFillColor(color[0], color[1], color[2]);
          pdf.roundedRect(margin, yPos - 2, 5, 40, 1, 1, 'F');
          
          yPos += 2;
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(40, 40, 40);
          pdf.text(dept.department, margin + 10, yPos);
          
          yPos += 7;
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Respostas: ${dept.responseCount}`, margin + 10, yPos);
          pdf.text(`Pontuação média: ${dept.avgScore} pts`, margin + 60, yPos);
          pdf.text(`Nível: ${BURNOUT_RISK_LABELS[dept.riskLevel]}`, margin + 120, yPos);
          
          yPos += 8;
          pdf.setFontSize(9);
          pdf.setTextColor(80, 80, 80);
          dept.categories.forEach((cat, i) => {
            pdf.text(`${cat.category}: ${cat.value.toFixed(1)}%`, margin + 10 + (i * 55), yPos);
          });
          
          yPos += 15;
        });
      }

      // ========== PÁGINA 6: QUESTÕES CRÍTICAS (se houver respostas detalhadas) ==========
      if (hasDetailedAnswers && questionAverages.length > 0) {
        pdf.addPage();
        yPos = margin;

        addHeader('5. QUESTÕES MAIS CRÍTICAS', 16);
        addText('As 10 questões com maior pontuação média (maior incidência de sintomas):');
        yPos += 8;

        const topQuestions = questionAverages.slice(0, 10);
        
        // Cabeçalho da tabela
        pdf.setFillColor(127, 29, 29);
        pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text('#', margin + 2, yPos + 5.5);
        pdf.text('Questão', margin + 10, yPos + 5.5);
        pdf.text('Cat.', margin + 120, yPos + 5.5);
        pdf.text('Média', margin + 145, yPos + 5.5);
        pdf.text('%', margin + 165, yPos + 5.5);
        yPos += 10;

        topQuestions.forEach((q, index) => {
          addNewPageIfNeeded(12);
          
          const bgColor = index % 2 === 0 ? 250 : 240;
          pdf.setFillColor(bgColor, bgColor, bgColor);
          pdf.rect(margin, yPos - 4, pageWidth - 2 * margin, 10, 'F');
          
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(60, 60, 60);
          
          pdf.text(q.number.toString(), margin + 2, yPos + 2);
          
          const questionText = q.text.length > 55 ? q.text.substring(0, 55) + '...' : q.text;
          pdf.text(questionText, margin + 10, yPos + 2);
          
          const catShort = BURNOUT_CATEGORY_LABELS[q.category].substring(0, 10);
          pdf.text(catShort, margin + 120, yPos + 2);
          
          pdf.text(q.avgValue.toFixed(2), margin + 145, yPos + 2);
          pdf.text(`${q.percentage.toFixed(0)}%`, margin + 165, yPos + 2);
          
          yPos += 10;
        });
      }

      // ========== PÁGINA: RECOMENDAÇÕES ==========
      pdf.addPage();
      yPos = margin;

      addHeader(hasDetailedAnswers ? '6. RECOMENDAÇÕES' : '5. RECOMENDAÇÕES', 16);
      yPos += 3;

      addSubHeader(`Conduta recomendada para nível "${BURNOUT_RISK_LABELS[overallRiskLevel]}":`);
      yPos += 2;
      
      const riskColor = getRiskColor(overallRiskLevel);
      pdf.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
      pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 3, 3, 'F');
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      const condutaLines = pdf.splitTextToSize(BURNOUT_RISK_RECOMMENDATIONS[overallRiskLevel].conduta, pageWidth - 2 * margin - 10);
      condutaLines.forEach((line: string, i: number) => {
        pdf.text(line, margin + 5, yPos + 8 + (i * 5));
      });
      yPos += 30;

      addSubHeader('Ações Sugeridas:');
      yPos += 2;
      
      BURNOUT_RISK_RECOMMENDATIONS[overallRiskLevel].acoes.forEach((acao, i) => {
        addNewPageIfNeeded(8);
        addText(`${i + 1}. ${acao}`, 5);
      });

      yPos += 10;
      addSubHeader('Cronograma Sugerido:');
      addText('• Semana 1-2: Comunicar resultados à liderança e RH', 5);
      addText('• Semana 3-4: Identificar casos críticos para acompanhamento individual', 5);
      addText('• Mês 2: Implementar ações preventivas por setor', 5);
      addText('• Mês 3-4: Monitorar indicadores e ajustar intervenções', 5);
      addText('• Mês 6: Reaplicar avaliação para medir efetividade', 5);

      // ========== PÁGINA: CONSIDERAÇÕES FINAIS ==========
      pdf.addPage();
      yPos = margin;

      addHeader(hasDetailedAnswers ? '7. CONSIDERAÇÕES FINAIS' : '6. CONSIDERAÇÕES FINAIS', 16);
      yPos += 5;

      addText('Este relatório apresenta os resultados da avaliação de Síndrome de Burnout realizada na organização. Os dados coletados fornecem uma visão abrangente do estado de saúde mental ocupacional dos colaboradores.');
      yPos += 5;

      addText('É importante ressaltar que:');
      yPos += 3;
      addText('• Os resultados são confidenciais e devem ser tratados com sigilo', 5);
      addText('• Casos individuais críticos devem receber atenção especializada', 5);
      addText('• A prevenção é mais eficaz e menos custosa que o tratamento', 5);
      addText('• O acompanhamento contínuo é fundamental para resultados duradouros', 5);
      addText('• Mudanças organizacionais podem ser necessárias para reduzir fatores de risco', 5);

      yPos += 10;
      addText('A Síndrome de Burnout, quando não tratada, pode evoluir para quadros mais graves de saúde mental e física, além de impactar significativamente a produtividade e o clima organizacional.');

      yPos += 10;
      pdf.setFillColor(245, 245, 245);
      pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 20, 3, 3, 'F');
      yPos += 12;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(80, 80, 80);
      pdf.text('Este relatório foi gerado automaticamente pelo Sistema SOIA.', pageWidth / 2, yPos, { align: 'center' });

      // ========== RODAPÉ EM TODAS AS PÁGINAS ==========
      const totalPages = (pdf as any).internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        pdf.text('Relatório de Burnout - Confidencial', margin, pageHeight - 8);
        pdf.text(assessment.companies?.name || '', pageWidth - margin, pageHeight - 8, { align: 'right' });
      }

      // Salvar
      const fileName = `Relatorio_Burnout_${assessment.companies?.name?.replace(/\s+/g, '_') || 'Empresa'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'Relatório gerado com sucesso!',
        description: `O arquivo ${fileName} foi baixado.`,
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Erro ao gerar relatório',
        description: 'Não foi possível gerar o PDF. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      onClick={generatePDF} 
      disabled={isGenerating}
      variant="outline"
      className="gap-2"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Gerando PDF...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          Exportar PDF
        </>
      )}
    </Button>
  );
}
