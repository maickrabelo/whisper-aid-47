# Pesquisa de Clima — filtro por setor, agrupamento e correção das respostas em branco

## O problema das respostas em branco (causa confirmada)

Na pesquisa "Índice de Percepção de Liderança" existem 175 envios e 7.436 respostas
gravadas no banco. A tela busca essas respostas de uma vez e o serviço de dados
devolve no máximo 1.000 registros por consulta. Resultado: só os primeiros envios
aparecem preenchidos e todos os demais abrem mostrando apenas os dados
demográficos — exatamente o que o cliente relatou (o caso da UTI).

Efeito colateral importante: os cards do topo (NPS, Média Geral) e o gráfico de
categorias hoje também são calculados sobre esse pedaço truncado, ou seja, os
números atuais estão incorretos nas pesquisas grandes.

## O que será entregue

### 1. Carregamento completo dos dados
Buscar as respostas em blocos, até trazer todos os registros da pesquisa
selecionada. Com isso, cada envio passa a abrir com o questionário inteiro e os
indicadores passam a refletir 100% dos participantes.

### 2. Filtro por Setor no topo da página
Novo seletor "Setor" ao lado dos filtros de empresa e pesquisa, listando os
setores que realmente têm respostas (UTI, Centro Cirúrgico, Direção, Nutrição…)
com a quantidade de envios ao lado. Ao escolher um setor, são recalculados:

- Respostas, NPS, Média Geral e Taxa de Participação
- Scores por Categoria (radar)
- Distribuição NPS
- Lista de Respostas Completas

O gráfico "Participação por Departamento" continua mostrando o panorama de todos
os setores (serve de comparação) e destaca o setor selecionado.

### 3. Lista de respostas agrupada por setor
Na seção "Respostas Completas":

- Busca por texto (setor, cargo) e ordenação por setor ou por data
- Alternância "Agrupar por setor": os envios passam a ser exibidos em blocos por
  setor, com contagem e média do setor no cabeçalho de cada bloco
- Botão "Expandir/Recolher tudo" para leitura em reunião

### 4. Exportação por setor
- O PDF e o Excel passam a respeitar o filtro de setor, com o nome do setor no
  título do relatório
- Nova opção "Excel por setor": uma aba por setor com os indicadores daquele
  grupo, mais uma aba de comparação entre setores — pronta para entregar a cada
  gestor

### 5. Taxa de Participação
Hoje o percentual é uma conta improvisada (respostas ÷ 2). Passa a usar o número
de colaboradores cadastrado para a empresa; quando esse número não existir, o
card mostra apenas a quantidade de respostas em vez de um percentual inventado.

## Detalhes técnicos

- `src/pages/ClimateSurveyDashboard.tsx`
  - paginação das consultas a `survey_responses` e `survey_answers` (blocos de
    1.000 via `.range()`, laço até esgotar) e busca de respostas em lotes de
    `response_id` para evitar URLs longas
  - refatorar o cálculo para uma função pura `computeStats(responses, answers,
    questionMap)` reutilizada no consolidado e no setor filtrado
  - novo estado `selectedDepartment`, derivação `filteredResponses` via `useMemo`
  - seção de respostas: estados de busca, ordenação e `groupByDepartment`;
    `Accordion type="multiple"` para permitir expandir vários
- `src/components/climate-survey/ClimateSurveyExportButton.tsx`
  - aceitar `departmentLabel` e `perDepartmentStats` opcionais; nova entrada no
    menu para o Excel multi-aba por setor
- Taxa de participação: reutilizar `src/hooks/useCompanyEmployeeCount.ts`
- Nenhuma mudança de banco de dados é necessária; `survey_responses.department`
  já traz o setor de cada envio
