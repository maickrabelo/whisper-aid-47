## O que será feito

### 1. Botão em destaque para avançar o status (AEPDetail)
Fluxo de status a seguir (na ordem): **Rascunho → Em andamento → Em revisão → Concluída → Revisada**.

- Adicionar, ao lado do seletor de status atual, um botão primário destacado (cor de destaque, com ícone de seta) chamado, por exemplo:
  - "Avançar para: Em andamento" (quando em Rascunho)
  - "Avançar para: Em revisão" (quando em Em andamento)
  - "Avançar para: Concluída" (quando em Em revisão)
  - "Avançar para: Revisada" (quando em Concluída)
- Ao clicar, atualiza o status para o próximo do fluxo (mantém `signed_at` sendo gravado quando entra em Concluída/Revisada, como já existe).
- Se já estiver em **Revisada** o botão de avanço some (mostra apenas o seletor manual).
- O seletor manual atual continua, para casos de correção pontual.

### 2. Envio em lote ao PGR (AEPDashboard)
Adicionar botão **"Enviar todas ao PGR"** no cabeçalho da tela AEPDashboard, ao lado do "AEP Consolidado (PDF)".

Ao clicar, abrir um popup **BulkSendToPGRDialog** com:

- **Verificação de PGR ativo**: se a empresa não tem documento PGR, mostra aviso com botão para criar/abrir o PGR (mesma lógica do `SendToInventoryDialog` atual).
- **Lista com todas as AEPs da empresa**, agrupadas em duas seções:
  - **Prontas para envio** (status `completed` ou `revised`): já marcadas por padrão, checkbox permite desmarcar.
  - **Não concluídas** (status `draft`, `in_progress`, `in_review`): checkbox por AEP com o texto "Marcar como Concluída e enviar". Se marcada, ao confirmar o sistema promove a AEP para `completed` (gravando `signed_at`) e em seguida envia os fatores.
- Cada linha mostra: setor, função, versão, status atual (badge), número de fatores.
- Rodapé com contador: "X AEPs serão enviadas • Y fatores gerarão riscos no PGR".
- Botão **Confirmar envio em lote** dispara, sequencialmente para cada AEP marcada:
  1. Se necessário, `UPDATE aep_avaliacoes` para `status = 'completed'` + `signed_at = now()`.
  2. Reaproveita a mesma lógica de `SendToInventoryDialog`: insere/atualiza registros em `pgr_risks` e cria vínculos em `aep_pgr_vinculo`, respeitando a política de "não duplicar fator já vinculado".
- Barra de progresso durante o processamento; toast final com resumo (`N AEPs enviadas, M riscos criados/atualizados`).

### 3. Card AEP na home do Dashboard da empresa
Em `src/pages/Dashboard.tsx`, dentro da grade "Suas Ferramentas" (mesma que já mostra Riscos Psicossociais, Burnout, Clima, Pulse, Ouvidoria Smart), adicionar um novo card:

- **Título**: "AEP — Avaliação Ergonômica"
- **Subtítulo**: "NR-17 · Alimenta o PGR"
- **Ícone**: `ClipboardCheck` (ou similar) em destaque
- **onClick**: `navigate(`/aep/${companyId}`)`
- Visibilidade condicionada ao hook existente `useAEPBetaAccess` (mantém o gating atual: liberado apenas para o usuário de teste enquanto estiver em beta). Se depois o AEP virar geral, basta remover o gate.

## Detalhes técnicos

- Arquivos editados:
  - `src/pages/AEPDetail.tsx` — botão de próximo status ao lado do seletor.
  - `src/pages/AEPDashboard.tsx` — botão "Enviar todas ao PGR" e integração com o novo dialog.
  - `src/pages/Dashboard.tsx` — novo card AEP na grade de ferramentas da empresa.
- Arquivo novo:
  - `src/components/aep/BulkSendToPGRDialog.tsx` — dialog em lote. Reaproveita as funções de mapeamento fator→risco já usadas em `SendToInventoryDialog.tsx` (extrair para helper compartilhado `src/components/aep/sendToInventory.ts` se necessário).
- Sem alterações de schema. Nenhuma nova coluna, tabela ou RLS.
- Fluxo de status permanece o mesmo já validado (draft/in_progress/in_review/completed/revised). O trigger `aep_fatores_clamp` e demais validações não são afetados.

## Fora do escopo (não farei nesta rodada)

- Notificação por e-mail ao concluir envio em lote.
- Undo/rollback de envio em lote.
- Aprovação com múltiplas assinaturas.
- Auto-avanço de status por ações do sistema (permanece manual).
