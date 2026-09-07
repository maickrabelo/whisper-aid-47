# LTCAT — Ajustes na tela de Nova Exposição

## O que muda para quem usa

1. **Escolha do agente em duas etapas**
   - Primeiro um campo **Tipo de agente**: Físico, Químico, Biológico (e Associação/Outros, que já existem no catálogo).
   - Depois a lista de **Agente** já filtrada por esse tipo, mostrando código e nome (ex.: Ruído, Calor, Vibração para Físico).
   - Abaixo da lista, uma linha de ajuda com os agentes mais usados de cada tipo (Ruído e Temperatura em Físico; descrição livre em Químico e Biológico).

2. **Campo "Houve exposição?" (Sim / Não)**
   - Muitos ambientes administrativos não têm exposição; ao marcar **Não**, os campos de valor medido e unidade ficam ocultos e a exposição é registrada como "sem exposição".
   - Ao marcar **Não**, o sistema já preenche a conclusão como *Não reconhecido* com a fundamentação padrão, sem precisar passar pelo motor jurídico.

3. **Atalho "Sem exposição (Químico e Biológico)"**
   - Um botão no topo da aba Exposições cria, de uma vez, para o GHE escolhido, os dois registros de ausência (químico e biológico) com o texto padrão:
   - > "No local não há agentes químicos pertencentes ao Anexo IV do Decreto 3.048 de 06 de maio de 1.999, regulamentada pela Instrução Normativa 77/2015 alterada em 26/04/2016."
   - Versão equivalente para biológicos ("não há agentes biológicos pertencentes ao Anexo IV...").
   - O texto vem pré-preenchido e continua editável antes de salvar.

4. **Reflexo no PDF**
   - Cada exposição passa a mostrar "Exposição: Sim/Não"; quando "Não", o bloco exibe a fundamentação de ausência de agentes do Anexo IV em vez de valores medidos.
   - A validação de publicação deixa de exigir consulta ao motor jurídico para registros sem exposição (o aviso atual não aparece mais nesses casos).

## Detalhes técnicos

- **Banco (migração):**
  - `ltcat_exposures`: nova coluna `exposure_present boolean not null default true`.
  - `occupational_agents`: inclusão de entradas genéricas de catálogo para uso declaratório — `QUIM_GENERICO` (CHEMICAL), `QUIM_AUSENCIA_ANEXO_IV` (CHEMICAL), `BIO_AUSENCIA_ANEXO_IV` (BIOLOGICAL). São apenas itens de catálogo interno; nenhuma regra jurídica (`legal_rules` / `legal_rule_versions`) é criada ou alterada — a Fase 2B.2 (seed de regras) permanece bloqueada.
- **Frontend:**
  - `src/lib/ltcatEngine.ts`: expor `category` já retornado e adicionar rótulos PT-BR das categorias.
  - `src/components/ltcat/LtcatExposuresPanel.tsx`: filtro por categoria, campo Sim/Não, textos padrão de ausência, botão de atalho para o par químico/biológico, ocultar campos de medição quando não houver exposição.
  - `src/pages/LTCATDetail.tsx`: adicionar `exposure_present` à interface `LtcatExposure`.
  - `src/components/ltcat/LTCATReportPDF.ts`: linha "Exposição" e bloco de fundamentação de ausência.
  - `src/lib/ltcatValidation.ts`: ignorar exigência de consulta ao motor quando `exposure_present` for falso.
