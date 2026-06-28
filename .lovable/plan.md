# Revisão da Ouvidoria Smart por empresa

Hoje a Ouvidoria Smart é "global" — qualquer gestora habilitada vê um único painel ligado a `profile.company_id`. Vamos transformá-la em uma ouvidoria por empresa, com seletor para a gestora, acesso próprio para cada empresa-cliente, branding por empresa e botão para gerar credenciais.

## 1. Painel da Gestora SST com seletor de empresa

Mudanças em `src/pages/BetaOuvidoriaDashboard.tsx`:

- Carregar todas as empresas da gestora (já temos `company_sst_assignments` + `companies`).
- Filtrar apenas as que têm Ouvidoria Smart habilitada via `company_has_smart_ouvidoria`.
- Adicionar `<Select>` no topo com as empresas habilitadas, persistindo a escolha em `localStorage`.
- Recalcular stats/gráficos/lista de relatos a partir da empresa selecionada (`.eq('company_id', selectedCompanyId)`).
- O botão "Copiar link público" e "Abrir formulário" passam a usar a empresa selecionada (`/ouvidoria-beta/:selectedCompanyId`).
- Se a empresa logada for do tipo "company" (não gestora), pular o seletor e travar na própria empresa.

## 2. Acesso da empresa-cliente

Card "Ouvidoria Smart" no dashboard da empresa (`src/pages/Dashboard.tsx`):
- Aparece quando `company_has_smart_ouvidoria(profile.company_id)` for true.
- Botões: "Abrir painel" (`/ouvidoria-beta/painel`) e "Copiar link público" (`/ouvidoria-beta/{company_id}`).

A página `/ouvidoria-beta/painel` já vai aceitar o usuário company porque vamos forçar `companyId = profile.company_id` quando ele não for gestora — vendo apenas os relatos da própria empresa.

## 3. Botão "Gerar acesso da empresa" na lista de empresas da gestora

Local: gestão de empresas da gestora SST (já existente — usado pelo CompanySelector / gerenciamento).

- Botão "Gerar acesso" por empresa.
- Confirma o e-mail (pré-preenchido com `companies.email`).
- Chama uma nova Edge Function `create-company-access` que:
  1. Verifica se a gestora autenticada é dona daquela empresa.
  2. Cria (ou reutiliza) usuário no Auth com `email_confirm=true` e senha temporária aleatória.
  3. Atribui `role = 'company'` em `user_roles` (sem remover roles existentes).
  4. Cria registro em `profiles` apontando `company_id`.
  5. Marca `must_change_password = true`.
  6. Envia e-mail via Resend com login + senha temporária + link `https://<dominio>/auth`.
  7. Retorna o e-mail e senha para a UI mostrar uma única vez (com botão "Copiar").

## 4. Página pública com branding da empresa

`/ouvidoria-beta/:companyId` (`src/pages/BetaOuvidoriaForm.tsx`):
- Já recebe `companyId` pela URL.
- Buscar `companies` para exibir logo + nome no topo do formulário.
- Usar `companies.brand_color` (ou fallback para verde do tema) na cor primária do form.
- Página de acompanhamento (`/ouvidoria-beta/acompanhar`) também mostra o branding da empresa do relato consultado.

## 5. Backend / segurança

- **RLS**: as policies em `beta_ouvidoria_reports` já filtram por `user_manages_company(auth.uid(), company_id)` e `user_in_company(...)` — confirmar e ajustar se necessário para garantir que:
  - Gestora vê relatos só das suas empresas.
  - Usuário company vê só os da própria empresa.
  - Inserção pública (form anônimo) continua liberada via Edge Function `create-beta-ouvidoria-report` (já existe).
- **`create-company-access`**: nova função registrada no `config.toml` com `verify_jwt = true`; usa `SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY` (já configurados).
- Template de e-mail simples com a logo do Sr.SMS (mesma identidade do welcome).

## Detalhes técnicos

- Arquivos a criar:
  - `supabase/functions/create-company-access/index.ts`
  - Registrar a função em `supabase/config.toml`.
- Arquivos a modificar:
  - `src/pages/BetaOuvidoriaDashboard.tsx` (seletor + scoping correto)
  - `src/pages/BetaOuvidoriaForm.tsx` (branding por empresa)
  - `src/pages/BetaOuvidoriaTrack.tsx` (branding)
  - `src/pages/Dashboard.tsx` (card "Ouvidoria Smart" para company)
  - Componente da listagem de empresas da gestora (provavelmente `src/components/CompanySelector.tsx` ou similar) → adicionar botão "Gerar acesso".
- Remover dependência de `BETA_OUVIDORIA_COMPANY_IDS` (whitelist hardcoded) — usar apenas `company_has_smart_ouvidoria`.
- A função SQL `company_has_smart_ouvidoria` já cobre os planos sr-sms / teste-sms / sst-smart, não precisa de migration.

## Fora do escopo

- Notificação por e-mail à empresa quando um novo relato chegar (pode ser próximo passo).
- Permitir que a empresa-cliente responda relatos (hoje só a gestora responde) — manter como está.

Posso seguir com a implementação?
