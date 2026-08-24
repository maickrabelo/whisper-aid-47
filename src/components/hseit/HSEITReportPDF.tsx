import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { installPdfTextSafety } from '@/lib/pdfTextSafety';
import { renderCoverBackground } from '@/lib/pdfLogos';
import fundoPsico from '@/assets/fundo-psico-v2.jpg.asset.json';
import {
  HSEITCategory,
  HSEIT_CATEGORY_LABELS,
  HSEIT_QUESTIONS,
  getRiskLevel,
  getHealthImpact,
  RISK_LEVEL_LABELS,
  HEALTH_IMPACT_LABELS,
  normalizeScore
} from '@/data/hseitQuestions';

interface Answer {
  questionNumber: number;
  value: number;
}

interface Response {
  id: string;
  department: string | null;
  answers: Answer[];
}

interface HSEITReportPDFProps {
  assessment: {
    title: string;
    companies: { name: string };
  };
  responses: Response[];
  categoryAverages: Record<string, number>;
  overallAverage: number;
  departments: string[];
  questionAverages: {
    number: number;
    text: string;
    category: string;
    average: number;
    riskLevel: string;
    responseCount: number;
  }[];
}

// Recomendações por categoria
const RECOMMENDATIONS: Record<HSEITCategory, Record<'risk' | 'intermediate' | 'favorable', string>> = {
  demands: {
    risk: 'Redistribuir carga de trabalho, revisar prazos, contratar pessoal adicional.',
    intermediate: 'Monitorar prazos e volume de trabalho. Promover pausas regulares.',
    favorable: 'Manter equilíbrio atual de carga de trabalho.'
  },
  control: {
    risk: 'Aumentar autonomia dos colaboradores, implementar flexibilidade de horários.',
    intermediate: 'Avaliar oportunidades de maior autonomia e participação em decisões.',
    favorable: 'Manter práticas de autonomia e participação.'
  },
  managerSupport: {
    risk: 'Treinar gestores em liderança e comunicação. Implementar reuniões 1:1.',
    intermediate: 'Fortalecer comunicação gestor-equipe e feedbacks regulares.',
    favorable: 'Manter práticas de apoio e reconhecimento.'
  },
  peerSupport: {
    risk: 'Promover integração da equipe e atividades de team building.',
    intermediate: 'Incentivar trabalho colaborativo e apoio entre pares.',
    favorable: 'Manter cultura de colaboração.'
  },
  relationships: {
    risk: 'Investigar conflitos, implementar política anti-assédio.',
    intermediate: 'Monitorar relacionamentos e promover respeito mútuo.',
    favorable: 'Manter ambiente respeitoso.'
  },
  role: {
    risk: 'Clarificar descrições de cargo e definir objetivos claros.',
    intermediate: 'Revisar clareza de papéis e responsabilidades.',
    favorable: 'Manter comunicação clara sobre expectativas.'
  },
  change: {
    risk: 'Melhorar comunicação sobre mudanças e envolver equipe no planejamento.',
    intermediate: 'Comunicar antecipadamente e ouvir preocupações da equipe.',
    favorable: 'Manter boa gestão de mudanças.'
  }
};

export function HSEITReportPDF({
  assessment,
  responses,
  categoryAverages,
  overallAverage,
  departments,
  questionAverages
}: HSEITReportPDFProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      installPdfTextSafety(pdf);
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
        pdf.setTextColor(0, 66, 128);
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

      const getRiskColor = (level: string): [number, number, number] => {
        switch (level) {
          case 'very_high': return [239, 68, 68];
          case 'high': return [249, 115, 22];
          case 'moderate': return [234, 179, 8];
          case 'low': return [132, 204, 22];
          case 'very_low': return [34, 197, 94];
          default: return [100, 100, 100];
        }
      };

      const getImpactColor = (impact: string): [number, number, number] => {
        switch (impact) {
          case 'risk': return [239, 68, 68];
          case 'intermediate': return [249, 115, 22];
          case 'favorable': return [34, 197, 94];
          default: return [100, 100, 100];
        }
      };

      // Tabela com TODAS as perguntas e suas pontuações (geral ou por setor)
      const addAllQuestionsTable = (answers: Answer[], indent: number = 0) => {
        const tableW = pageWidth - 2 * margin - indent;
        const x0 = margin + indent;
        const colNum = 8;
        const colText = tableW - 8 - 18 - 26;
        const xText = x0 + colNum + 2;
        const xAvg = x0 + colNum + colText + 4;
        const xLevel = xAvg + 18;

        const drawTableHeader = () => {
          addNewPageIfNeeded(12);
          pdf.setFillColor(0, 66, 128);
          pdf.rect(x0, yPos, tableW, 7, 'F');
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(255, 255, 255);
          pdf.text('#', x0 + 2, yPos + 5);
          pdf.text('Pergunta', xText, yPos + 5);
          pdf.text('Média', xAvg, yPos + 5);
          pdf.text('Nível', xLevel, yPos + 5);
          yPos += 9;
        };

        drawTableHeader();

        HSEIT_QUESTIONS.forEach((q, index) => {
          const qAnswers = answers.filter(a => a.questionNumber === q.number);
          const avg = qAnswers.length > 0
            ? qAnswers.reduce((s, a) => s + normalizeScore(a.value, q.isInverted), 0) / qAnswers.length
            : 0;
          const level = getRiskLevel(avg);

          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          const textLines: string[] = pdf.splitTextToSize(q.text, colText - 2);
          const rowH = Math.max(7, textLines.length * 4 + 3);

          if (yPos + rowH > pageHeight - margin) {
            pdf.addPage();
            yPos = margin;
            drawTableHeader();
          }

          const bg = index % 2 === 0 ? 250 : 241;
          pdf.setFillColor(bg, bg, bg);
          pdf.rect(x0, yPos, tableW, rowH, 'F');

          pdf.setTextColor(60, 60, 60);
          pdf.setFont('helvetica', 'normal');
          pdf.text(q.number.toString(), x0 + 2, yPos + 4.5);
          pdf.text(textLines, xText, yPos + 4.5);

          if (qAnswers.length === 0) {
            pdf.setTextColor(130, 130, 130);
            pdf.text('-', xAvg, yPos + 4.5);
            pdf.text('sem dados', xLevel, yPos + 4.5);
          } else {
            pdf.setFont('helvetica', 'bold');
            pdf.text(avg.toFixed(2), xAvg, yPos + 4.5);
            const rc = getRiskColor(level);
            pdf.setTextColor(rc[0], rc[1], rc[2]);
            pdf.text(RISK_LEVEL_LABELS[level as keyof typeof RISK_LEVEL_LABELS] || level, xLevel, yPos + 4.5);
          }

          yPos += rowH;
        });
        pdf.setTextColor(40, 40, 40);
        pdf.setFont('helvetica', 'normal');
        yPos += 4;
      };


      // ========== CAPA ==========
      await renderCoverBackground(pdf, pageWidth, pageHeight, fundoPsico.url);
      
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('RELATÓRIO HSE-IT', pageWidth / 2, 30, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Avaliação de Riscos Psicossociais no Trabalho', pageWidth / 2, 42, { align: 'center' });

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
      pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 50, 3, 3, 'F');
      
      yPos += 12;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 66, 128);
      pdf.text('RESUMO EXECUTIVO', pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      
      const impactOverall = getHealthImpact(overallAverage);
      const criticalCount = Object.values(categoryAverages).filter(avg => getHealthImpact(avg) === 'risk').length;
      const favorableCount = Object.values(categoryAverages).filter(avg => getHealthImpact(avg) === 'favorable').length;

      pdf.text(`Total de Respostas: ${responses.length}`, margin + 10, yPos);
      pdf.text(`Setores Avaliados: ${departments.length || 1}`, pageWidth / 2, yPos);
      yPos += 7;
      pdf.text(`Média Geral: ${overallAverage.toFixed(2)} (${HEALTH_IMPACT_LABELS[impactOverall]})`, margin + 10, yPos);
      yPos += 7;
      pdf.text(`Categorias Críticas: ${criticalCount} | Favoráveis: ${favorableCount}`, margin + 10, yPos);

      yPos += 25;

      // ========== PÁGINA 2: METODOLOGIA ==========
      pdf.addPage();
      yPos = margin;

      addHeader('1. METODOLOGIA HSE-IT', 16);
      yPos += 3;
      
      addText('O HSE-IT (Health and Safety Executive - Indicator Tool) é uma ferramenta validada internacionalmente para avaliação de riscos psicossociais no ambiente de trabalho. O questionário avalia 7 dimensões fundamentais:');
      yPos += 5;

      const categories: HSEITCategory[] = ['demands', 'control', 'managerSupport', 'peerSupport', 'relationships', 'role', 'change'];
      categories.forEach(cat => {
        const questionsCount = HSEIT_QUESTIONS.filter(q => q.category === cat).length;
        addText(`- ${HSEIT_CATEGORY_LABELS[cat]} (${questionsCount} questões)`, 5);
      });

      yPos += 5;
      addText('A escala utilizada é de 1 a 5, onde:');
      addText('1 = Nunca | 2 = Raramente | 3 = Às vezes | 4 = Frequentemente | 5 = Sempre', 5);
      yPos += 5;
      addText('Para questões sobre fatores negativos (ex: demandas excessivas), os valores são invertidos para que pontuações mais altas sempre representem condições mais favoráveis.');

      yPos += 8;
      addSubHeader('Classificação de Risco:');
      addText('- Muito Baixo (acima de 4.20): Condição muito favorável - manter práticas atuais', 5);
      addText('- Baixo (3.41 - 4.20): Condição favorável - monitorar', 5);
      addText('- Moderado (2.61 - 3.40): Atenção necessária - planejar melhorias', 5);
      addText('- Alto (1.81 - 2.60): Intervenção necessária - agir em curto prazo', 5);
      addText('- Muito Alto (< 1.81): Situação crítica - ação imediata requerida', 5);

      // ========== PÁGINA 3: RESULTADOS POR CATEGORIA ==========
      pdf.addPage();
      yPos = margin;

      addHeader('2. RESULTADOS POR CATEGORIA', 16);
      yPos += 3;

      categories.forEach(category => {
        addNewPageIfNeeded(45);
        
        const avg = categoryAverages[category] || 0;
        const riskLevel = getRiskLevel(avg);
        const impact = getHealthImpact(avg);
        const color = getImpactColor(impact);
        
        // Box colorido para a categoria
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.roundedRect(margin, yPos - 2, 5, 35, 1, 1, 'F');
        
        yPos += 2;
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(40, 40, 40);
        pdf.text(HSEIT_CATEGORY_LABELS[category], margin + 10, yPos);
        
        yPos += 7;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Média: ${avg.toFixed(2)}`, margin + 10, yPos);
        pdf.text(`Nível: ${RISK_LEVEL_LABELS[riskLevel]}`, margin + 50, yPos);
        pdf.text(`Impacto: ${HEALTH_IMPACT_LABELS[impact]}`, margin + 100, yPos);
        
        yPos += 8;
        const recommendation = RECOMMENDATIONS[category][impact];
        const recLines = pdf.splitTextToSize(`Recomendação: ${recommendation}`, pageWidth - 2 * margin - 15);
        pdf.setTextColor(80, 80, 80);
        recLines.forEach((line: string) => {
          pdf.text(line, margin + 10, yPos);
          yPos += 5;
        });
        
        yPos += 8;
      });

      // ========== PÁGINA 4: RESULTADOS POR SETOR ==========
      if (departments.length > 0) {
        pdf.addPage();
        yPos = margin;

        addHeader('3. RESULTADOS POR SETOR', 16);
        yPos += 5;

        departments.forEach(dept => {
          addNewPageIfNeeded(60);
          
          const deptResponses = responses.filter(r => r.department === dept);
          const deptAnswers = deptResponses.flatMap(r => r.answers);
          
          addSubHeader(`${dept} (${deptResponses.length} respostas)`);
          
          // Calcular médias por categoria para o setor
          categories.forEach(category => {
            const categoryQuestions = HSEIT_QUESTIONS.filter(q => q.category === category);
            const questionNumbers = categoryQuestions.map(q => q.number);
            const catAnswers = deptAnswers.filter(a => questionNumbers.includes(a.questionNumber));
            
            if (catAnswers.length > 0) {
              const catAvg = catAnswers.reduce((sum, a) => {
                const q = categoryQuestions.find(cq => cq.number === a.questionNumber);
                return sum + (q ? normalizeScore(a.value, q.isInverted) : a.value);
              }, 0) / catAnswers.length;
              
              const impact = getHealthImpact(catAvg);
              const color = getImpactColor(impact);
              
              pdf.setFillColor(color[0], color[1], color[2]);
              pdf.circle(margin + 3, yPos - 1.5, 2, 'F');
              
              pdf.setFontSize(9);
              pdf.setFont('helvetica', 'normal');
              pdf.setTextColor(60, 60, 60);
              pdf.text(`${HSEIT_CATEGORY_LABELS[category]}: ${catAvg.toFixed(2)} (${HEALTH_IMPACT_LABELS[impact]})`, margin + 8, yPos);
              yPos += 5;
            }
          });

          yPos += 4;
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 66, 128);
          addNewPageIfNeeded(14);
          pdf.text(`Pontuação de todas as perguntas — ${dept}`, margin, yPos);
          yPos += 6;
          addAllQuestionsTable(deptAnswers);

          yPos += 6;
        });
      }

      // ========== QUESTÕES CRÍTICAS ==========
      pdf.addPage();
      yPos = margin;

      addHeader('4. QUESTÕES MAIS CRÍTICAS', 16);
      addText('As 15 questões com menor pontuação (maior risco) que requerem atenção prioritária:');
      yPos += 8;


      const criticalQuestions = questionAverages.slice(0, 15);
      
      // Cabeçalho da tabela
      pdf.setFillColor(0, 66, 128);
      pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('#', margin + 2, yPos + 5.5);
      pdf.text('Questão', margin + 12, yPos + 5.5);
      pdf.text('Cat.', margin + 115, yPos + 5.5);
      pdf.text('Média', margin + 140, yPos + 5.5);
      pdf.text('Nível', margin + 160, yPos + 5.5);
      yPos += 10;

      criticalQuestions.forEach((q, index) => {
        addNewPageIfNeeded(12);
        
        const bgColor = index % 2 === 0 ? 250 : 240;
        pdf.setFillColor(bgColor, bgColor, bgColor);
        pdf.rect(margin, yPos - 4, pageWidth - 2 * margin, 10, 'F');
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        
        pdf.text(q.number.toString(), margin + 2, yPos + 2);
        
        const questionText = q.text.length > 65 ? q.text.substring(0, 65) + '...' : q.text;
        pdf.text(questionText, margin + 12, yPos + 2);
        
        const catShort = q.category.substring(0, 12);
        pdf.text(catShort, margin + 115, yPos + 2);
        
        pdf.text(q.average.toFixed(2), margin + 140, yPos + 2);
        
        const riskColor = getRiskColor(q.riskLevel);
        pdf.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
        pdf.setFont('helvetica', 'bold');
        const levelShort = RISK_LEVEL_LABELS[q.riskLevel as keyof typeof RISK_LEVEL_LABELS]?.substring(0, 10) || q.riskLevel;
        pdf.text(levelShort, margin + 160, yPos + 2);
        
        yPos += 10;
      });

      // ========== DETALHAMENTO DE TODAS AS PERGUNTAS (GERAL) ==========
      pdf.addPage();
      yPos = margin;

      addHeader('5. DETALHAMENTO DE TODAS AS PERGUNTAS', 16);
      addText('Pontuação média consolidada (todos os setores) de cada uma das questões do instrumento, em escala normalizada de 1 a 5 — quanto menor a pontuação, maior o risco.');
      yPos += 6;
      addAllQuestionsTable(responses.flatMap(r => r.answers));

      // ========== PLANO DE AÇÃO ==========
      pdf.addPage();
      yPos = margin;

      addHeader('6. PLANO DE AÇÃO RECOMENDADO', 16);

      yPos += 3;

      const criticalCats = categories.filter(cat => getHealthImpact(categoryAverages[cat] || 0) === 'risk');
      const intermediateCats = categories.filter(cat => getHealthImpact(categoryAverages[cat] || 0) === 'intermediate');

      if (criticalCats.length > 0) {
        addSubHeader('Ações Imediatas (Categorias Críticas):');
        yPos += 2;
        criticalCats.forEach((cat, i) => {
          addNewPageIfNeeded(20);
          addText(`${i + 1}. ${HSEIT_CATEGORY_LABELS[cat]}:`, 5);
          addText(RECOMMENDATIONS[cat].risk, 10);
          yPos += 3;
        });
        yPos += 5;
      }

      if (intermediateCats.length > 0) {
        addSubHeader('Ações de Médio Prazo (Categorias em Atenção):');
        yPos += 2;
        intermediateCats.forEach((cat, i) => {
          addNewPageIfNeeded(20);
          addText(`${i + 1}. ${HSEIT_CATEGORY_LABELS[cat]}:`, 5);
          addText(RECOMMENDATIONS[cat].intermediate, 10);
          yPos += 3;
        });
        yPos += 5;
      }

      addSubHeader('Cronograma Sugerido:');
      addText('- Semana 1-2: Comunicar resultados à liderança e equipes', 5);
      addText('- Semana 3-4: Elaborar planos de ação específicos para áreas críticas', 5);
      addText('- Mês 2-3: Implementar primeiras intervenções', 5);
      addText('- Mês 4-6: Monitorar indicadores e ajustar ações', 5);
      addText('- Mês 6: Reaplicar avaliação para medir progresso', 5);


      // Salvar
      const fileName = `Relatorio_HSEIT_${assessment.companies?.name?.replace(/\s+/g, '_') || 'Empresa'}_${new Date().toISOString().split('T')[0]}.pdf`;
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
          Baixar Relatório PDF
        </>
      )}
    </Button>
  );
}

export default HSEITReportPDF;
