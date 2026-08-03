# Ajustes: relatórios psicossociais, AEP, PGR

## 1. Lista de perguntas com pontuação nos PDFs (HSE-IT e COPSOQ)

Hoje o HSE-IT lista apenas as 15 questões mais críticas e o COPSOQ traz médias por dimensão. Passa a existir, nos dois relatórios:

- **Análise geral**: seção nova "Detalhamento de todas as perguntas" com tabela contendo número da pergunta, texto completo (com quebra de linha, sem corte em "..."), dimensão, média e classificação de risco.
- **Por setor**: dentro de cada bloco de setor, a mesma lista completa de perguntas com a média calculada apenas com as respostas daquele setor.
- Ordenação por número da pergunta (mantendo a seção de questões críticas já existente no HSE-IT).
- Tabelas com repetição de cabeçalho a cada quebra de página, respeitando a tipografia padrão já usada nos relatórios.

## 2. AEP — adicionar fatores na aba "Fatores"

- Botão "Adicionar" no topo da aba Fatores, no mesmo padrão da aba Participantes.
- Reaproveita o diálogo de edição de fator já existente, agora em modo criação: seleção do fator no catálogo (categoria/nome), severidade, probabilidade, fonte/causa, grupos expostos, evidência e o bloco/GHE (escopo) ao qual o fator pertence — ou "Geral".
- Disponível apenas quando a AEP está editável (rascunho); em versões assinadas continua bloqueado com a mensagem atual.

## 3. PGR — responsabilidade de implementação da organização

- Novo campo de texto editável na Visão Geral do PGR: "Responsabilidade de implementação (organização)", com botão "Preencher padrão" (texto base citando as responsabilidades do empregador conforme NR-01 item 1.4.1).
- Novos campos de identificação do representante da organização: nome, cargo e CPF.
- No PDF: o texto entra na Parte VI e passa a existir **dois blocos de assinatura** lado a lado — Responsável Técnico (existente) e Representante Legal da Organização (novo), cada um com nome, CPF/registro e função.

## 4. Atualização da base normativa no PDF do PGR

Substituir as citações da Portaria SEPRT nº 6.730/2020 pela redação vigente:

- Rodapé/etiqueta de regulamentação: "NR-01 — Portaria MTE nº 1.419/2024".
- Texto introdutório: NR-01 aprovada pela Portaria nº 3.214/1978, com redação atualizada pelas Portarias MTE nº 342/2024, nº 344/2024 e nº 1.419/2024.
- Texto de responsabilidades: referência à Lei nº 6.514/1977 e às Portarias MTE nº 342/2024, nº 344/2024 e nº 1.419/2024 (NR-01).
- Revisão de todas as demais menções à Portaria 6.730 no gerador para o novo texto.

## Detalhes técnicos

- `src/components/hseit/HSEITReportPDF.tsx` e `src/components/psychosocial/COPSOQReportPDF.ts`: nova função utilitária de tabela de perguntas, reutilizada no consolidado e no loop por setor; médias por setor calculadas a partir das respostas filtradas por departamento.
- `src/pages/AEPDetail.tsx`: `openNewFator()` + botão na aba Fatores; `saveFator()` passa a fazer insert quando não há registro em edição (com `aep_id` e `escopo_ref`).
- Migração em `pgr_documents`: colunas `org_responsibility_text`, `org_responsible_name`, `org_responsible_role`, `org_responsible_cpf`.
- `src/components/pgr/PGROverview.tsx`: campos novos no formulário; `src/components/pgr/PGRReportPDF.ts`: texto, duplo bloco de assinatura e atualização normativa.
