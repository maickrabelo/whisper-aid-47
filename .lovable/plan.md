# COPSOQ II — Opção Versão Média (76 itens)

## Objetivo

Permitir escolher, ao configurar uma nova avaliação COPSOQ II, entre a **Versão Curta** (atual, 41 questões / 23 dimensões) e a **Versão Média Portuguesa** (76 itens / 29 dimensões, Silva et al. 2011 — conforme PDF anexo). A versão escolhida define o questionário exibido ao respondente, a pontuação, os resultados, os relatórios PDF e as exportações.

## Regras de negócio

- A versão é escolhida **somente na criação** da avaliação e fica **bloqueada na edição** (trocar a versão com respostas existentes corromperia os dados).
- Avaliações existentes continuam como `short` (padrão) — nada muda retroativamente.
- Respondentes anônimos acessam normalmente pelo link público, nas duas versões.

## Dados da Versão Média (extraídos do PDF anexo)

- **76 itens** numerados 1–76, distribuídos em **29 dimensões** (7 novas em relação à versão curta: Recompensas, Apoio Social de Colegas, Confiança Horizontal, Confiança Vertical, Auto-eficácia, Problemas em Dormir, Sintomas Depressivos).
- **Escalas de resposta por bloco**:
  - Itens 1–50 e 65–76: frequência (Nunca/quase nunca … Sempre)
  - Itens 51–60 e 62–64: intensidade (Nada/quase nada … Extremamente)
  - Item 61 (Saúde geral): escala própria **Excelente / Muito boa / Boa / Razoável / Deficitária** (1→5, quanto maior pior)
- **Itens invertidos na correção: 42 e 45** (pontuação corrigida = 6 − resposta).
- **Classificação semáforo por dimensão** (cortes 2,33 e 3,66 sobre a média 1–5): dimensões "quanto maior, pior" vs "quanto maior, melhor" invertem a leitura. Não existe escore total único — interpretação é por dimensão.
- **Períodos de referência exibidos ao respondente**: itens 65–72 (últimas 4 semanas), 73–76 (últimos 12 meses).

## Implementação

### 1. Banco de dados (migração)

- `ALTER TABLE copsoq_assessments ADD COLUMN questionnaire_version TEXT NOT NULL DEFAULT 'short'` com CHECK (`'short' | 'medium'`).
- **Permissões**: verificado — já existe política pública de leitura de avaliações ativas ("Public can view active COPSOQ assessments"), que passa a expor a nova coluna automaticamente, e inserção pública em `copsoq_responses`/`copsoq_answers` ("Anyone can insert…"). `question_number` é inteiro sem limite, então itens 42–76 funcionam sem ajuste. **Nenhuma política nova é necessária**; a migração apenas adiciona a coluna.

### 2. Dados e pontuação (frontend)

- **Novo `src/data/copsoqMediumQuestions.ts`**: as 76 questões com texto fiel ao PDF, união de categorias `COPSOQMediumCategory` (29), labels, escala `health` adicionada, flag `isInverted` por item (normalização para "5 = favorável": itens de dimensões "↑pior" invertem; item 42 e 45 ficam com a inversão líquida correta; item 61 inverte), intros de seção e períodos de referência.
- **`src/lib/copsoqDimensionScoring.ts`**: novo `computeCOPSOQMediumDimensions()` retornando o mesmo formato do curto (category, label, average normalizada, riskLevel) + `getMediumRiskLevel()` com os cortes exatos do PDF (>3,66 favorável / >2,33 intermediário / ≤2,33 risco). Função despachante `computeCOPSOQDimensionsByVersion(version, answers)` para consumo uniforme.

### 3. Configuração da avaliação (`COPSOQManagement.tsx`)

- Seletor de versão (cards ou radio): "Versão Curta — 41 questões / 23 dimensões" e "Versão Média — 76 questões / 29 dimensões (Silva et al., 2011)".
- Salvo em `questionnaire_version` no insert; campo desabilitado ao editar avaliação existente.
- Card "Sobre o COPSOQ II" atualizado conforme a versão escolhida.

### 4. Formulário do respondente (`COPSOQForm.tsx`)

- Lê `questionnaire_version` da avaliação e carrega o conjunto de questões correspondente (paginação automática: 76/7 = 11 páginas).
- `COPSOQ_SCALES` ganha a escala `health`; `QuestionCard` já renderiza por `scaleType` da questão.
- Cabeçalhos de seção com as instruções de período (últimas 4 semanas / últimos 12 meses) e intros ("As questões seguintes referem-se ao seu local de trabalho…", "Em relação à sua chefia direta…" etc.).
- `SoniaFormChat` (modo IA) adaptado para usar as opções por questão em vez de escala única.

### 5. Resultados, relatórios e exportações (branch por versão)

- **`COPSOQResults.tsx`**: carrega a versão da avaliação e usa questões/pontuação da média — cartões de dimensão, mapa de calor por setor, tabela por questão e distribuição de risco.
- **`COPSOQReportPDF.ts` + `COPSOQReportEditor.tsx`**: recebem a versão; novas entradas em `COPSOQ_RECOMMENDATIONS` para as 7 dimensões novas (risco e intermediário); metadados do relatório indicam "Versão Média (76 itens)".
- **`assessmentExport.ts`** (Excel/CSV), **`PrintQuestionnaireButton.tsx`** e **`ImportAssessmentDialog.tsx`** (importação AEP): passam a despachar pela versão.
- **`COPSOQDashboardContent.tsx`**: selo "Versão Média" nos cartões de avaliação.
- Auditoria dos demais consumidores (`RiskInventory.tsx`, `HSEITPGRReportPDF.tsx`) para garantir que só usam a versão curta onde já é o caso hoje.

## Validação

1. Teste unitário rápido da pontuação média (dimensão com item invertido 42/45 e cortes 2,33/3,66).
2. Fluxo E2E no preview: criar avaliação Versão Média → abrir link público anônimo → responder 76 itens → enviar → ver resultados por dimensão/setor → gerar PDF → exportar Excel.
3. Confirmar que avaliações da Versão Curta continuam idênticas.
