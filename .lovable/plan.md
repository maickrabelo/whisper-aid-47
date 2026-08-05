# Editar última versão do relatório psicossocial (HSE-IT e COPSOQ)

## Objetivo

Permitir reabrir a última configuração de relatório emitida de uma avaliação, ajustar o que for necessário (resumo executivo, plano de ação, cronograma, dados da empresa/responsável) e reemitir o PDF — sem precisar refazer tudo do zero.

## Como vai funcionar

### HSE-IT (Resultados da avaliação)
- Ao clicar em "Gerar Relatório PGR", o conteúdo continua sendo pré-preenchido automaticamente como hoje **na primeira vez**.
- No momento em que o PDF é emitido, toda a configuração da tela é **salva** vinculada àquela avaliação (resumo executivo, itens do plano de ação com inclusões/edições/remoções, cronograma, CNPJ, endereço, CNAE, grau de risco, CPF e registro do responsável).
- Passa a existir um segundo botão: **"Editar última versão"**, visível apenas quando já existe configuração salva. Ele abre a mesma tela já preenchida com o que foi salvo na última emissão, permite novas alterações e reemite o PDF (atualizando o registro salvo).
- O botão "Gerar Relatório PGR" mantém o comportamento de começar do zero com os padrões sugeridos.

### COPSOQ II (Resultados da avaliação)
Hoje o COPSOQ gera o PDF direto, sem tela de configuração. Será criada a tela equivalente à do HSE-IT:
- Abas: Pré-visualização (resumo dos indicadores), Dados da empresa/responsável, Plano de ação, Cronograma.
- Resumo executivo e plano de ação pré-preenchidos a partir das dimensões em risco/intermediárias (usando as recomendações por dimensão já existentes no gerador).
- Mesmo par de botões: "Gerar Relatório PDF" (padrões) e "Editar última versão" (configuração salva).
- O PDF do COPSOQ passa a usar o resumo executivo, o plano de ação e o cronograma definidos na tela quando fornecidos; sem eles, mantém o conteúdo automático atual.

### Regra de histórico
Guarda apenas **a última** configuração por avaliação — cada emissão sobrescreve a anterior.

## Detalhes técnicos

**Banco**: nova tabela `psychosocial_report_drafts`
- `assessment_type` ('hseit' | 'copsoq'), `assessment_id`, `company_id`, `config jsonb`, `created_by`, timestamps
- `UNIQUE (assessment_type, assessment_id)` + upsert na emissão
- GRANTs para `authenticated`/`service_role` e RLS: acesso a quem já tem acesso à avaliação (mesma lógica de `user_manages_company` / `user_in_company` / `has_role(admin)` usada nas tabelas de assessments)

**Frontend**
- `src/components/hseit/HSEITReportEditor.tsx`: prop `initialConfig`; o `useEffect` de defaults só roda quando não há config inicial; salvar (upsert) o estado dentro de `generatePDF`.
- `src/pages/HSEITResults.tsx`: carregar o rascunho da avaliação, novo botão "Editar última versão" (habilitado só se existir), abrir o editor em modo "edição".
- Novo `src/components/psychosocial/COPSOQReportEditor.tsx` espelhando o editor HSE-IT, reutilizando `HSEITActionPlanEditor`/`HSEITScheduleEditor` (categorias trocadas por dimensões COPSOQ) e chamando `generateCOPSOQReport`.
- `src/components/psychosocial/COPSOQReportPDF.ts`: `COPSOQReportInput` recebe `executiveSummary?`, `actionItems?`, `scheduleItems?`, `companyInfo?`, `responsibleInfo?`; seções 1 e 7 passam a usar esses dados quando presentes, além de nova seção de cronograma.
- `src/pages/COPSOQResults.tsx`: botões "Gerar Relatório PDF" e "Editar última versão" abrindo o novo editor.
