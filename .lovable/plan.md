## Objetivo

Criar no painel administrativo master uma área para conciliar manualmente as assinaturas a partir do relatório de vendas da Hotmart (.xls), com prévia, aplicação controlada e histórico de todas as conciliações.

## Como vai funcionar

1. Aba **Conciliação** no Master Dashboard.
2. Você sobe o arquivo (mesma estrutura do enviado: 63 colunas).
3. O sistema lê apenas:
   - **Confirmação do pagamento** (coluna D) → data base de vigência
   - **Valor de compra com impostos** (coluna L) → 9,90 = teste 7 dias; 97,90 = mensal completo
   - **Email do(a) Comprador(a)** (coluna AN) → chave de conciliação
   - **Status da transação** → Reembolsado/Cancelado bloqueia
4. Regras aplicadas por e-mail (considerando a transação **mais recente**):
   - 9,90 e menos de 7 dias desde o pagamento → plano **Teste SMS**, trial ativo até D+7
   - 9,90 e mais de 7 dias → **bloqueado**, com aviso para assinar o mensal
   - 97,90 → plano **Sr.SMS** mensal ativo, vigência até D+30 (renovada a cada novo pagamento na planilha)
   - Reembolsado/Cancelado → assinatura cancelada e acesso bloqueado
   - E-mail sem conta no sistema → listado como "sem conta" (nenhuma ação)
   - Conta ativa no sistema que **não** aparece na planilha → listada como **divergente para revisão** (nenhuma alteração automática)
5. **Prévia**: tabela com e-mail, situação atual, situação proposta e motivo, com contadores por tipo de mudança. Nada é gravado nessa etapa.
6. **Confirmar conciliação**: aplica as mudanças e grava o lote no histórico.
7. **Histórico**: lista de conciliações (data, admin, arquivo, totais) e, ao abrir um lote, todas as linhas alteradas com valor anterior → novo.

## Detalhes técnicos

**Banco (migração)**
- `subscription_reconciliations`: arquivo, data, admin, total de linhas, contadores (ativados / renovados / bloqueados / sem conta / divergentes), status.
- `subscription_reconciliation_items`: e-mail, user_id, ação, plano anterior/novo, status anterior/novo, vigência anterior/nova, motivo.
- RLS: leitura/escrita apenas para `admin` (via `has_role`), + GRANTs para `authenticated` e `service_role`.

**Edge function `reconcile-subscriptions`** (service role, registrada no `config.toml`)
- Modo `preview`: recebe as linhas normalizadas, cruza com `profiles` / `sst_managers` / `companies` / `subscriptions` e devolve o diff — sem gravar.
- Modo `apply`: repete a checagem, atualiza `subscriptions` (status, plan_id, período), `sst_managers`/`companies` (`subscription_status`, `trial_ends_at`) e grava lote + itens.

**Frontend**
- Nova dependência `xlsx` (SheetJS) para ler o .xls no navegador e normalizar as colunas pelo nome do cabeçalho (não pela posição), evitando quebra se a Hotmart mudar a ordem.
- Novo componente `src/components/admin/SubscriptionReconciliationTab.tsx` (upload + prévia + confirmação + histórico), plugado como nova aba em `MasterDashboard.tsx`.
- Bloqueio reaproveita o fluxo já existente (`TrialExpiredOverlay` / `PaymentBlockedOverlay`), sem criar telas novas.
