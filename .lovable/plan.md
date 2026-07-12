# Fluxo de pagamento em atraso — Planos mensais Hotmart

## Objetivo
Após o vencimento do pagamento mensal, exibir avisos progressivos no dashboard e bloquear o acesso conforme os dias de atraso:

| Dias em atraso | Comportamento |
|---|---|
| 1 a 2 dias | Banner amarelo no topo: "Pagamento em atraso, verifique sua conta da Hotmart." |
| 3 a 6 dias | Banner vermelho no topo: "Regularize o pagamento do seu plano. Seu acesso será congelado em X dias." (contagem regressiva até 7) |
| 7+ dias | Bloqueio total (overlay): "Para reativar sua conta regularize seu pagamento na Hotmart." + botão "Já paguei, atualizar status" |

Trial expirado (fluxo já existente) continua independente — este novo fluxo trata apenas assinaturas `active` cujo `current_period_end` já venceu.

## Detecção do atraso

Fonte da verdade: `subscriptions.current_period_end` da assinatura ativa do usuário (owner_user_id, ou da empresa/gestora SST vinculada).

Cálculo:
```
daysOverdue = floor((now - current_period_end) / 1 dia)
```
- `daysOverdue <= 0` → em dia, nada a exibir
- `1 <= daysOverdue <= 2` → aviso amarelo
- `3 <= daysOverdue <= 6` → aviso vermelho com contagem
- `daysOverdue >= 7` → bloqueio total

A Hotmart normalmente envia webhook `PURCHASE_DELAYED` / `PURCHASE_CANCELED` / `PURCHASE_REFUNDED`. Vamos manter `current_period_end` como fonte principal (já é atualizado a cada renovação paga pelo `hotmart-webhook`). Se o pagamento não renovar, a data simplesmente não avança e o atraso é detectado automaticamente.

## Alterações

### 1. `src/contexts/RealAuthContext.tsx`
Estender o contexto com estado de pagamento:
- `paymentStatus: 'ok' | 'overdue_warning' | 'overdue_critical' | 'blocked'`
- `daysOverdue: number`
- `currentPeriodEnd: string | null`

Nova função `checkPaymentStatus(companyId, sstManagerId)`:
- Busca a subscription `active` mais recente (por `owner_user_id`, `company.parent_subscription_id` ou via gestora SST).
- Calcula `daysOverdue` a partir de `current_period_end`.
- Define `paymentStatus` conforme faixas acima.
- Executa junto com `checkTrialStatus` (mesmo trigger: login, `onAuthStateChange`, `refreshTrialStatus`).

Renomear/expandir `refreshTrialStatus` → `refreshSubscriptionStatus` (mantém alias para compatibilidade) para atualizar ambos.

### 2. Novo componente `src/components/PaymentOverdueBanner.tsx`
Banner fixo no topo do dashboard (acima do conteúdo, abaixo da navbar):
- Amarelo (1–2 dias): mensagem simples.
- Vermelho (3–6 dias): mensagem + "Seu acesso será congelado em {7 - daysOverdue} dia(s)".
- Botão "Já paguei, atualizar status" que chama `refreshSubscriptionStatus`.
- Link "Ir para Hotmart" (URL configurável — reutilizar padrão do `TrialExpiredOverlay`).

Não renderiza quando `paymentStatus === 'ok'` ou `'blocked'`.

### 3. Novo componente `src/components/PaymentBlockedOverlay.tsx`
Overlay full-screen (padrão visual idêntico ao `TrialExpiredOverlay`):
- Título: "Acesso bloqueado por pagamento em atraso"
- Texto: "Para reativar sua conta regularize seu pagamento na Hotmart."
- Botão primário: "Regularizar na Hotmart" (abre link)
- Botão secundário: "Já paguei, atualizar status" (com polling de 15s, igual ao `TrialExpiredOverlay`)
- Botão de logout

### 4. `src/components/TrialGate.tsx`
Já envolve rotas autenticadas para bloqueio de trial. Ampliar para também renderizar:
- `PaymentBlockedOverlay` quando `paymentStatus === 'blocked'`
- `PaymentOverdueBanner` (via slot no topo) quando `overdue_warning`/`overdue_critical`

Precedência: bloqueio de trial > bloqueio de pagamento > banner de atraso.

### 5. Integração nos dashboards
O `TrialGate` já é usado nos dashboards principais (`Dashboard`, `SSTDashboard`, etc.), então o banner e o overlay entram automaticamente. Nenhum dashboard precisa ser editado individualmente.

## Detalhes técnicos

- Consulta em `checkPaymentStatus`:
  ```
  select id, status, current_period_end, subscription_plans(slug)
  from subscriptions
  where status = 'active'
    and (owner_user_id = :userId or id = :company.parent_subscription_id or owner_user_id in (sst_manager owners))
  order by created_at desc
  limit 1
  ```
- Ignorar quando `status != 'active'` (trials seguem o fluxo antigo; canceladas caem em outro cenário fora do escopo).
- Polling: reutilizar o `setInterval(15000)` do `TrialExpiredOverlay` no `PaymentBlockedOverlay`.
- URL da Hotmart: constante `HOTMART_ACCOUNT_URL = 'https://consumer.hotmart.com'` (área do cliente) — usada em banner e overlay.
- Sem novas colunas/migrations. Toda a lógica é derivada de `current_period_end`.

## Arquivos afetados

- `src/contexts/RealAuthContext.tsx` — novo estado + `checkPaymentStatus`
- `src/components/TrialGate.tsx` — passa a renderizar banner/overlay de pagamento
- `src/components/PaymentOverdueBanner.tsx` — novo
- `src/components/PaymentBlockedOverlay.tsx` — novo

Nenhuma alteração no `hotmart-webhook` nem no banco.