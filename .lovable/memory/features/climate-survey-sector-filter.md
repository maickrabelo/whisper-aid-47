---
name: Pesquisa de Clima — filtro por setor e paginação de respostas
description: Filtro global por setor no ClimateSurveyDashboard, agrupamento da lista, Excel por setor e correção do limite de 1.000 linhas nas consultas
type: feature
---

# Pesquisa de Clima — segmentação por setor

- `src/lib/climateSurveyStats.ts`: `computeClimateStats`, `averageLikert`, `fetchAllRows`
  (paginação obrigatória — PostgREST devolve no máximo 1.000 linhas por consulta).
  Bug histórico: pesquisa com 175 envios / 7.436 respostas mostrava envios em branco
  e KPIs errados porque `survey_answers` era buscado sem paginação.
- Respostas do questionário são buscadas em lotes de 100 `response_id`, cada lote paginado.
- `ClimateSurveyDashboard`: estado `selectedDepartment` filtra KPIs, radar de categorias,
  distribuição NPS e a lista. O gráfico "Participação por Departamento" sempre mostra
  todos os setores, destacando o selecionado.
- Lista "Respostas Completas": busca por texto, ordenação (data/setor), "Agrupar por setor"
  (com contagem e média do setor) e Expandir/Recolher tudo (`Accordion type="multiple"`).
- `ClimateSurveyExportButton`: props `departmentLabel`, `participationRate`,
  `perDepartmentStats`; nova opção "Excel por setor" (aba comparativa + uma aba por setor).
- Taxa de participação usa `companies.employee_count` (`useCompanyEmployeeCount`);
  sem esse número, o card mostra a contagem de respostas em vez de percentual.
- Componente reutilizável de envio individual: `src/components/climate-survey/ClimateResponseItem.tsx`.
