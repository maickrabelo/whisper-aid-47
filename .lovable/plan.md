# Liberação automática da conta após upgrade do trial

## Diagnóstico do fluxo atual

**Backend (`hotmart-webhook`) — funciona corretamente:**
1. Ao receber a compra, cancela subscriptions anteriores (`trial`, `trialing`, `active`) do mesmo usuário.
2. Cria nova subscription com `status: 'active'` e `current_period_end` = +30 dias (mensal).
3. Atualiza `sst_managers` / `companies`:
   - `subscription_status: 'active'`
   - `trial_ends_at` = data futura (30 dias)

**Frontend (`RealAuthContext.checkTrialStatus`) — funciona, mas só reavalia em momentos específicos:**
- O overlay só bloqueia quando `subscription_status ∈ ['trial','trialing']` E `trial_ends_at < now`.
- Como o webhook muda o status para `'active'`, o overlay libera — **porém apenas quando `checkTrialStatus` é executado de novo**.
- Hoje isso só acontece em: login, mudança de sessão (`onAuthStateChange`) ou reload de página.

## Problema

Se o usuário está com o `TrialExpiredOverlay` aberto e paga o plano no Hotmart:
- O webhook atualiza a DB em segundos.
- **A tela do usuário não sabe** — o overlay continua bloqueando.
- Ele só é liberado se recarregar a página ou deslogar e logar novamente.

Não há realtime nem polling que force uma nova checagem.

## Solução proposta

Adicionar um polling leve no `TrialExpiredOverlay` que revalida o status enquanto o overlay está montado:

1. **`TrialExpiredOverlay.tsx`** — dentro de um `useEffect`, disparar `refreshTrialStatus()` a cada 15–20 segundos enquanto o overlay estiver visível. Limpar o interval no unmount.
2. **`RealAuthContext.tsx`** — expor um método público `refreshTrialStatus()` que chama internamente `checkTrialStatus(companyId, sstManagerId)` usando os IDs já carregados no perfil. Ao detectar `subscription_status = 'active'`, o próprio `setIsTrialExpired(false)` desmonta o overlay via `TrialGate`.
3. **Botão "Já paguei / Atualizar status"** no overlay — chama `refreshTrialStatus()` imediatamente, para o usuário que não quer esperar o polling.

Assim, assim que o webhook grava `active`, no máximo em ~15s (ou instantaneamente clicando no botão) o overlay some sozinho, sem precisar de logout/reload.

## Detalhes técnicos

- Polling só ativo enquanto `isTrialExpired === true` (não custa nada quando o overlay não está aberto).
- Nenhuma mudança no `hotmart-webhook` — ele já está correto.
- Nenhuma mudança nas tabelas.
- Reutiliza a função `checkTrialStatus` existente, só adiciona um wrapper exposto no contexto.

## Arquivos a alterar

- `src/contexts/RealAuthContext.tsx` — expor `refreshTrialStatus` no valor do contexto.
- `src/components/TrialExpiredOverlay.tsx` — `useEffect` com `setInterval` (15s) + botão "Já paguei, atualizar".
