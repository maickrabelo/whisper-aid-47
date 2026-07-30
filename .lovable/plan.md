## Diagnóstico (verificado)

O e-mail de convite de colaborador é gerado em `supabase/functions/invite-collaborator/index.ts` com o link **fixo** `https://soia.app.br/convite/{token}` (linha do `acceptUrl`), remetente "SOIA <noreply@soia.app.br>", cabeçalho "SOIA – Sistema de Gestão NR-01" e rodapé "© SOIA · soia.app.br". Por isso os convidados de `fabio.carette@safetyework.com.br` foram parar no site antigo e nunca chegaram à tela `/convite/:token` do Sr.SMS — os três convites (`deise.duarte@sdafetyework.com.br`, `tamires.oliveira@safetyework.com.br` e um de 30/07) continuam com status `pending` no banco, ou seja, nenhum aceite foi concluído e nenhum vínculo/role foi criado.

O mesmo problema de domínio existe em `invite-sector-viewer` (link `https://soia.app.br/convite-setor/{token}`). Consultando `account_invitations`, há **vários outros convites pendentes** de outras contas com o mesmo destino quebrado (ex.: adibsalles, larissacavalcantetst, sandy.gomes, juniormoises414, miguelroaamaral, tanialcrepaldi, nalucristal, antoniocarlos.solucoes, entre outros).

Observação: o e-mail `deise.duarte@sdafetyework.com.br` tem erro de digitação no domínio (`sdafetyework`), então esse convite precisa ser reenviado para o endereço correto.

Também confirmado: hoje o fluxo de aceite (`signup-from-invitation` + `accept-invitation`) **não dispara nenhum e-mail de boas-vindas** — o colaborador cria a senha e fica sem nenhuma confirmação.

## Correções

**1. Link e branding do convite (causa raiz)**
- Em `invite-collaborator`: trocar o domínio fixo por `https://srsms.com.br/convite/{token}` (com override opcional por `APP_PUBLIC_URL`), e refazer o template com identidade Sr.SMS (cabeçalho, cores, rodapé, assunto e remetente `Sr. SMS <noreply@...>`), no mesmo padrão de `_shared/welcome-email.ts`.
- Mesma correção em `invite-sector-viewer` (`/convite-setor/{token}`).
- Centralizar a URL base em um helper compartilhado (`supabase/functions/_shared/app-url.ts`) para não voltar a existir domínio "chumbado" espalhado.
- Retornar o `accept_url` correto para o front, e exibir no diálogo de convite um botão "Copiar link do convite" como plano B caso o e-mail não chegue.

**2. E-mail de boas-vindas para colaborador convidado**
- Após o aceite bem-sucedido (`signup-from-invitation` com `action=signup`, e também `accept-invitation` para quem já tinha conta), disparar o e-mail de boas-vindas usando o utilitário existente `_shared/welcome-email.ts`, com contexto "colaborador convidado", nome da conta, link de login e sem expor senha.

**3. Reenvio dos convites quebrados**
- Criar uma ação de "Reenviar convite" no `TeamManagementCard` (chamando `invite-collaborator` com reenvio, renovando `expires_at` em vez de bloquear com "já existe convite pendente").
- Reenviar imediatamente, com o link correto, os convites pendentes de Fábio (`tamires.oliveira@safetyework.com.br` e o de 30/07) e reenviar o de Deise para o e-mail corrigido `deise.duarte@safetyework.com.br` (confirmar o endereço com o cliente antes).
- Fazer uma varredura dos demais convites `pending` criados antes desta correção e reenviá-los com o link novo (via função pontual de reenvio em lote), evitando os já expirados sem interesse.

**4. Verificação pós-correção**
- Após o aceite de um convite de teste, confirmar no banco que o usuário recebeu a role correta e o vínculo em `user_sst_managers` / `user_companies`, e que ele cai no dashboard certo.

## Detalhes técnicos

Arquivos afetados: `supabase/functions/invite-collaborator/index.ts`, `supabase/functions/invite-sector-viewer/index.ts`, `supabase/functions/signup-from-invitation/index.ts`, `supabase/functions/accept-invitation/index.ts`, novo `supabase/functions/_shared/app-url.ts`, `src/components/collaborators/InviteCollaboratorDialog.tsx` e `src/components/collaborators/TeamManagementCard.tsx`. Sem alteração de schema; apenas atualização de `expires_at`/`token` nos reenvios.
