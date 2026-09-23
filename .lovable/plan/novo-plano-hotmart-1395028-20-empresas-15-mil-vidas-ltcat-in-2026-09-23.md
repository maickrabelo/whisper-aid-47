# Novo plano Hotmart 1395028 (20 empresas / 15 mil vidas / LTCAT incluso)

## O que será feito

1. **Criar o plano** "Sr.SMS 15 Mil Vidas" na base de planos:
   - 20 empresas
   - 15.000 vidas
   - PGR habilitado
   - LTCAT incluso
   - Sem período de teste (assinatura paga mensal)
   - Preço mensal: deixado em zero por enquanto; o valor cobrado na Hotmart é usado para registrar o pagamento. Se você me passar o valor, eu preencho.

2. **Mapear o código Hotmart 1395028** para esse plano, para que a compra seja reconhecida automaticamente.

3. **Liberação imediata ao chegar o webhook**:
   - Conta nova: é criada já com o plano, os limites (20 empresas / 15 mil vidas) e o módulo LTCAT liberado, com e-mail de boas-vindas.
   - Conta que já existe: a assinatura é atualizada para esse plano (limites novos) **e** o LTCAT é liberado na mesma hora — diferente da venda avulsa de LTCAT, que só libera o módulo sem mexer no plano.
   - Cancelamento, reembolso ou chargeback desse código remove o acesso ao LTCAT, como já acontece nos demais.

## Detalhes técnicos

- Migração: novo registro em `subscription_plans` (slug `sr-sms-15k-vidas`, `category = manager`, `max_companies = 20`, `max_employees = 15000`, `pgr_enabled = true`) e registro em `hotmart_product_plans` com `hotmart_product_id = '1395028'`.
- `supabase/functions/hotmart-webhook/index.ts`: novo conjunto `LTCAT_INCLUDED_PLAN_IDS = {'1395028'}`, separado de `LTCAT_HOTMART_PLAN_IDS` (que faz o atalho "só libera módulo"). Esse novo conjunto:
  - não interrompe o fluxo de provisionamento/upgrade;
  - após provisionar (conta nova) ou fazer upgrade in-place (conta existente), chama `setLtcatAccess(..., true, ...)`;
  - entra também no tratamento dos eventos de cancelamento/reembolso para revogar `LTCAT_BETA`.
- Sem alteração de limites hardcoded: o webhook continua usando os valores do plano cadastrado.
