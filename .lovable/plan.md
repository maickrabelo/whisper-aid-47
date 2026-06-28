## Objetivo
Quando chegar `PURCHASE_APPROVED` do Hotmart e o e-mail do comprador já existir no sistema (qualquer conta: teste SMS, conta antiga, gestora, empresa), **NÃO criar duplicata**. Reaproveitar o usuário existente, resetar a senha e ativar o plano comprado, preservando todos os dados.

## Onde mexer
Apenas em `supabase/functions/hotmart-webhook/index.ts`.

Hoje o webhook só faz "upgrade in-place" quando há uma assinatura SMS trial ativa (linhas ~373–520). Em todos os outros casos com e-mail existente ele cai no bloco "Bloqueio: e-mail já cadastrado" (linhas 522–541) e manda o e-mail de aviso, sem ativar nada. É isso que gera a percepção de duplicata quando o admin tenta resolver manualmente.

## Mudança principal
Substituir o bloco de bloqueio (e a checagem de race em `createUser`) por um **fluxo único de upgrade in-place** que roda sempre que existir `existingAuthUser` OU `existingCompany` OU `existingManager` com user vinculado.

Passos do novo fluxo (executado quando o e-mail já existe):

1. **Localizar o `user_id`**: usa `existingAuthUser` se houver; senão pega via `profiles` a partir do `existingCompany.id` / `existingManager.id`. Se ainda não houver um auth user mas a entidade existir, cria o auth user vinculado àquela entidade (caso de borda raro).
2. **Resetar senha**: gera nova senha provisória, `auth.admin.updateUserById({ password, email_confirm: true })` e marca `profiles.must_change_password = true`.
3. **Cancelar assinaturas Hotmart anteriores do mesmo usuário** (`status='canceled'` em todas as `subscriptions` com `owner_user_id = userId` que estejam `trial/trialing/active` — independentemente de serem SMS ou não, para evitar múltiplas ativas).
4. **Inserir a nova `subscriptions`** vinculada ao `userId` existente, com o `plan_id` do produto Hotmart comprado, `status='active'` (ou `trial` se o plano tiver `trial_days`), `provider='hotmart'`, `hotmart_transaction_id`, `hotmart_subscriber_code`, ciclo conforme `recurrency_period`, `metadata.upgraded_from_existing_account=true` e `previous_subscription_ids`.
5. **Garantir o `user_roles`** correto para a categoria do plano (`sst` para `manager/sst`, `company` para `company`), via upsert (sem deletar roles existentes — já corrigido em incidente anterior).
6. **Reaproveitar entidade existente**:
   - Se plano é `manager/sst`:
     - Se `profile.sst_manager_id` existir → `update` em `sst_managers` (`subscription_status='active'`, `trial_ends_at=null`, `max_companies`, `pgr_module_enabled` conforme plano). Mantém empresas, dados, tudo.
     - Senão → criar `sst_managers` e linkar no `profile`.
   - Se plano é `company`:
     - Se `profile.company_id` existir → `update` em `companies` (`subscription_status='active'`, `trial_ends_at=null`, `parent_subscription_id=novaSub.id`, `max_employees=plan.max_employees`) e upsert em `company_feature_access`. Mantém colaboradores, avaliações etc.
     - Senão → criar `companies` + `user_companies` + `profiles.company_id`.
7. **Enviar e-mail via Resend** com a nova senha provisória (reusa `sendCredentialsEmail` com `isExistingUser=false`, pois agora estamos de fato enviando senha provisória válida).
8. Retornar `{ ok:true, upgraded_existing:true, user_id, subscription_id, email_sent }` e logar no `webhook_logs` com tag `upgraded_existing_account`.

## Limpar/ajustar código antigo
- Remover o bloco "Bloqueio: e-mail já cadastrado fora do fluxo de upgrade SMS" (linhas 522–541) — substituído pelo fluxo acima.
- Remover/ajustar o tratamento de race condition em `createUser` (linhas 554–572) para também cair no fluxo de upgrade em vez de bloquear.
- Manter a função `sendBlockedPurchaseEmail` no arquivo (caso volte a ser útil), mas não chamada.
- Manter intacto o caminho "novo usuário" (a partir da linha 544) — só roda quando o e-mail realmente não existe em lugar nenhum.
- O fluxo SMS-trial atual (linhas 373–520) vira um caso particular do novo fluxo genérico — pode ser deletado para evitar duplicação de código.

## Idempotência
Antes de fazer qualquer coisa, verificar se já existe `subscriptions` com o mesmo `hotmart_transaction_id`. Se sim, retornar 200 sem reprocessar (evita re-resetar senha quando a Hotmart reenvia o webhook).

## Sem efeitos colaterais
- Não toca em `auth.users` além de `updateUserById` (senha + email_confirm).
- Não apaga nenhum dado de empresa, avaliação, PGR, ouvidoria ou role.
- Todas as operações usam `upsert`/`update` com chaves existentes.

## Teste após implementação
Buscar no banco um caso real (ex.: um trial SMS recente) e simular um `PURCHASE_APPROVED` via `test-hotmart-webhook` confirmando: assinatura nova ativa, trial cancelada, senha resetada, e-mail enviado, dados preservados, nenhum usuário duplicado em `auth.users`.
