import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';

import type { ClimateStats } from '@/lib/climateSurveyStats';

type SurveyStats = ClimateStats;

interface ClimateSurveyExportButtonProps {
  surveyTitle: string;
  companyName?: string;
  stats: SurveyStats;
  /** Setor selecionado no dashboard (null = todos). */
  departmentLabel?: string | null;
  /** Taxa de participação real (null quando o nº de colaboradores não está configurado). */
  participationRate?: number | null;
  /** Indicadores calculados para cada setor — usados no Excel por setor. */
  perDepartmentStats?: { department: string; stats: SurveyStats }[];
}

export const ClimateSurveyExportButton: React.FC<ClimateSurveyExportButtonProps> = ({
  surveyTitle,
  companyName,
  stats,
  departmentLabel = null,
  participationRate = null,
  perDepartmentStats = []
}) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const participationLabel = participationRate !== null
    ? `${participationRate}%`
    : `${stats.totalResponses} respostas`;
  const scopeLabel = departmentLabel ? `Setor: ${departmentLabel}` : 'Todos os setores';
  const fileSuffix = departmentLabel
    ? `-${departmentLabel.toLowerCase().replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}`
    : '';

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;

      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(6, 95, 70); // Green color
      pdf.text('Relatório de Pesquisa de Clima', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      pdf.setFontSize(14);
      pdf.setTextColor(100, 100, 100);
      pdf.text(surveyTitle, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      if (companyName) {
        pdf.setFontSize(12);
        pdf.text(companyName, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
      }

      pdf.setFontSize(11);
      pdf.text(scopeLabel, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Divider
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 15;

      // KPIs Section
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Indicadores Principais', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(11);
      const kpis = [
        { label: 'Total de Respostas', value: stats.totalResponses.toString() },
        { label: 'NPS Score', value: stats.npsScore.toString() },
        { label: 'Média Geral', value: `${stats.avgScore.toFixed(1)} / 5.0` },
        { label: 'Taxa de Participação', value: participationLabel }
      ];

      kpis.forEach((kpi, index) => {
        const xPos = 20 + (index % 2) * 90;
        if (index === 2) yPosition += 12;
        pdf.setTextColor(100, 100, 100);
        pdf.text(kpi.label + ':', xPos, yPosition);
        pdf.setTextColor(0, 0, 0);
        pdf.text(kpi.value, xPos + 45, yPosition);
      });
      yPosition += 20;

      // Category Scores Table
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Scores por Categoria', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Categoria', 20, yPosition);
      pdf.text('Score', 120, yPosition);
      yPosition += 5;
      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 7;

      pdf.setTextColor(0, 0, 0);
      stats.categoryScores.forEach(cat => {
        pdf.text(cat.category, 20, yPosition);
        pdf.text(cat.score.toFixed(2), 120, yPosition);
        yPosition += 7;
      });
      yPosition += 10;

      // NPS Distribution Table
      pdf.setFontSize(14);
      pdf.text('Distribuição NPS', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Grupo', 20, yPosition);
      pdf.text('Percentual', 120, yPosition);
      yPosition += 5;
      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 7;

      pdf.setTextColor(0, 0, 0);
      stats.npsDistribution.forEach(item => {
        pdf.text(item.name, 20, yPosition);
        pdf.text(`${item.value}%`, 120, yPosition);
        yPosition += 7;
      });
      yPosition += 10;

      // Department Distribution
      pdf.setFontSize(14);
      pdf.text('Participação por Departamento', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Departamento', 20, yPosition);
      pdf.text('Respostas', 120, yPosition);
      yPosition += 5;
      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 7;

      pdf.setTextColor(0, 0, 0);
      stats.departmentDistribution.forEach(dept => {
        pdf.text(dept.name, 20, yPosition);
        pdf.text(dept.value.toString(), 120, yPosition);
        yPosition += 7;
      });

      // Footer
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pdf.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      const filename = `pesquisa-clima-${surveyTitle.toLowerCase().replace(/\s+/g, '-')}${fileSuffix}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      toast({
        title: "PDF exportado",
        description: "O relatório foi baixado com sucesso!",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar o PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();

      // Sheet 1: Resumo
      const resumoSheet = workbook.addWorksheet('Resumo');
      resumoSheet.addRows([
        ['Relatório de Pesquisa de Clima'],
        [''],
        ['Pesquisa', surveyTitle],
        ['Empresa', companyName || '-'],
        ['Setor', departmentLabel || 'Todos os setores'],
        ['Data do Relatório', new Date().toLocaleDateString('pt-BR')],
        [''],
        ['Indicadores Principais'],
        ['Total de Respostas', stats.totalResponses],
        ['NPS Score', stats.npsScore],
        ['Média Geral', stats.avgScore],
        ['Taxa de Participação', participationLabel]
      ]);

      // Sheet 2: Por Categoria
      const categorySheet = workbook.addWorksheet('Por Categoria');
      categorySheet.addRow(['Categoria', 'Score', 'Máximo']);
      stats.categoryScores.forEach(cat => categorySheet.addRow([cat.category, Number(cat.score.toFixed(2)), cat.fullMark]));

      // Sheet 3: Distribuição NPS
      const npsSheet = workbook.addWorksheet('Distribuição NPS');
      npsSheet.addRow(['Grupo', 'Percentual (%)']);
      stats.npsDistribution.forEach(item => npsSheet.addRow([item.name, item.value]));

      // Sheet 4: Por Departamento
      const deptSheet = workbook.addWorksheet('Por Departamento');
      deptSheet.addRow(['Departamento', 'Respostas']);
      stats.departmentDistribution.forEach(dept => deptSheet.addRow([dept.name, dept.value]));

      // Save Excel
      const filename = `pesquisa-clima-${surveyTitle.toLowerCase().replace(/\s+/g, '-')}${fileSuffix}-${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Excel exportado",
        description: "A planilha foi baixada com sucesso!",
      });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar o Excel.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportByDepartment = async () => {
    if (perDepartmentStats.length === 0) {
      toast({ title: 'Sem setores', description: 'Nenhum setor com respostas para exportar.', variant: 'destructive' });
      return;
    }
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();

      // Aba de comparação entre setores
      const compare = workbook.addWorksheet('Comparativo');
      compare.addRow(['Setor', 'Respostas', 'NPS', 'Média Geral (0-5)']);
      compare.getRow(1).font = { bold: true };
      perDepartmentStats.forEach(({ department, stats: st }) =>
        compare.addRow([department, st.totalResponses, st.npsScore, Number(st.avgScore.toFixed(2))]));
      compare.columns.forEach((c) => { c.width = 28; });

      // Uma aba por setor
      const used = new Set<string>();
      perDepartmentStats.forEach(({ department, stats: st }) => {
        let name = department.replace(/[\\/*?:[\]]/g, '-').slice(0, 28) || 'Setor';
        let i = 2;
        while (used.has(name)) { name = `${name.slice(0, 25)}-${i++}`; }
        used.add(name);

        const sheet = workbook.addWorksheet(name);
        sheet.addRows([
          ['Setor', department],
          ['Pesquisa', surveyTitle],
          ['Empresa', companyName || '-'],
          [''],
          ['Respostas', st.totalResponses],
          ['NPS', st.npsScore],
          ['Média Geral', Number(st.avgScore.toFixed(2))],
          [''],
          ['Categoria', 'Score'],
        ]);
        st.categoryScores.forEach((cat) => sheet.addRow([cat.category, Number(cat.score.toFixed(2))]));
        sheet.addRow(['']);
        sheet.addRow(['Distribuição NPS', 'Percentual (%)']);
        st.npsDistribution.forEach((item) => sheet.addRow([item.name, item.value]));
        sheet.columns.forEach((c) => { c.width = 32; });
      });

      const filename = `pesquisa-clima-por-setor-${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Excel por setor exportado', description: 'Uma aba para cada setor, pronta para os gestores.' });
    } catch (error) {
      console.error('Error exporting by department:', error);
      toast({ title: 'Erro ao exportar', description: 'Não foi possível gerar a planilha por setor.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Exportar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportByDepartment}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel por setor
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
