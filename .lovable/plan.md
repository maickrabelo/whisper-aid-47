## Objetivo
A oferta da Hotmart de **R$ 9,90** (offer code `zwf07kdh`, product `7952854`) deve provisionar **conta de teste de 7 dias** (plano `teste-sms`), e não a conta paga `sr-sms`. Quando o mesmo comprador depois adquirir a oferta de **R$ 97,90** (offer code `cxxuc6kw`), o webhook converte o trial em assinatura ativa mensal, **mantendo todos os dados**.

Hoje o mapeamento em `hotmart_product_plans` é só por `hotmart_product_id`, e ambas as ofertas (9,90 e 97,90) compartilham o mesmo product_id `7952854` → toda compra cai no `sr-sms`.

## O que mudar

### 1. Mapeamento por oferta (Hotmart `offer.code`)
- Migration: adicionar coluna `hotmart_offer_code text` em `hotmart_product_plans` (nullable). Índice em `(hotmart_product_id, hotmart_offer_code)`.
- Inserir nova linha mapeando `product 7952854 + offer zwf07kdh → plano teste-sms` (com nota "Oferta R$ 9,90 – trial 7 dias").
- Atualizar a linha existente do `7952854` para gravar `hotmart_offer_code='cxxuc6kw'` (oferta R$ 97,90 → `sr-sms`).
- A linha do offer ID `1341462` (legacy) também ganha `hotmart_offer_code='cxxuc6kw'`.

### 2. `supabase/functions/hotmart-webhook/index.ts`
No bloco de lookup (linhas ~538-545):
- Extrair `offerCode = payload.data.purchase.offer?.code`.
- Buscar primeiro por `(hotmart_product_id IN lookupIds AND hotmart_offer_code = offerCode)`.
- Fallback: linha com `hotmart_offer_code IS NULL` e product id batendo (compatível com mapeamentos antigos).
- Quando o plano resolvido for `teste-sms` (ou qualquer plano com `trial_days > 0`):
  - Criar `subscriptions.status = 'trial'`, `current_period_end = now() + trial_days`, `amount_cents = 0`, `metadata.hotmart_offer_code`.
  - Marcar `sst_managers.subscription_status = 'trialing'` e `trial_ends_at = end`.
  - E-mail Resend usa o mesmo template de boas-vindas, mencionando "teste de 7 dias".
- Quando o plano resolvido for `sr-sms` (97,90) e já existir conta/assinatura ativa para o e-mail (trial `teste-sms` ou qualquer outro): cair no fluxo `upgradeExistingAccount` já existente — cancela a sub antiga, cria nova `sr-sms` `active`, mantém empresas/avaliações/PGR. Apenas garantir que esse fluxo também limpa `sst_managers.trial_ends_at` e seta `subscription_status='active'`.

### 3. Correção retroativa
Identificar usuários criados pelo offer `zwf07kdh` como `sr-sms` por engano (consulta por `subscriptions.plan_id = sr-sms` + e-mails que aparecem nos webhook_logs com offer `zwf07kdh`) e mover para `teste-sms` trial de 7 dias contados da data da compra (ou prorrogar a partir de hoje se já expirou — confirmar com você antes de aplicar). Atualizar `sst_managers` correspondentes.

### 4. Teste
Disparar `test-hotmart-webhook` simulando:
- `PURCHASE_APPROVED` com offer `zwf07kdh` e e-mail novo → conta criada como `teste-sms`, 7 dias, e-mail enviado.
- `PURCHASE_APPROVED` com offer `cxxuc6kw` para o mesmo e-mail → upgrade in-place: assinatura vira `sr-sms active`, trial cancelado, dados preservados, e-mail com nova senha enviado.

## Perguntas antes de implementar
1. Para os usuários que já foram criados como `sr-sms` pela oferta de 9,90 (ex.: contas recentes com offer `zwf07kdh` nos webhook_logs), eu **(a)** reseto trial de 7 dias contados de **hoje**, **(b)** conto a partir da data original da compra (pode já estar expirado), ou **(c)** deixo como está e só corrijo daqui pra frente?
