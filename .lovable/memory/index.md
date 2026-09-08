# Memory: index.md
Updated: 23/08/2026

# Project Memory

## Core
- **Database/Security**: Supabase w/ RLS & Views (`reports_public`, `companies_public`). Update passwords ONLY via Admin API, never raw SQL.
- **Edge Functions**: Mandatory for sensitive ops (auth, trial seeding). MUST register new functions manually in `supabase/config.toml`.
- **Multi-Tenant**: Multi-company access via `user_companies` and `CompanySelector`. Assessments require strict department segmentation (GHE).
- **Styling**: White-label support (SSTs custom colors injected via CSS vars). Modern tech aesthetic (glassmorphism, blur blobs, staggered fade-ins).

## Memories
- [SOnIA AI Assistant](mem://features/sonia-ai-assistant) — Identity, sidebar UI integration, and conversational assessment collection mode
- [Trial Accounts](mem://features/trial-accounts) — 7-day trial, automatic provisioning with 30 simulated responses, expiration overlay
- [Clima — filtro por setor](mem://features/climate-survey-sector-filter) — Filtro global por setor, agrupamento da lista, Excel por setor e paginação obrigatória (limite de 1.000 linhas)
- [Climate Survey](mem://features/climate-survey-module) — GPTW/SOIA templates, anonymous, segmented by dept
- [HSE-IT Assessment](mem://features/hseit-assessment-module) — 35 questions, 7 dimensions, risk thresholds and semaphores
- [COPSOQ Assessment](mem://features/copsoq-assessment-module) — COPSOQ II short version, 40 questions, 0-100 scale normalization
- [Burnout Assessment](mem://features/burnout-assessment-module) — 20 questions, 3 dimensions, 5 risk levels
- [Psychosocial Hub](mem://features/psychosocial-assessment-hub) — Unified tab-based UI for HSE-IT and COPSOQ II
- [Assessment Cycles](mem://features/psychosocial-assessment-cycles-evolution) — Periodic reassessments (30/90/180/365 days) and historical deltas
- [Psychosocial Tech Details](mem://features/psychosocial-assessment-technical-details) — React.memo optimization, auto-scroll, mandatory fields
- [PDF Report Pattern](mem://features/assessment-pdf-report-pattern) — Edit modal, metadata, pre-filled recommendations for PGR
- [PGR Compliant Reporting](mem://features/pgr-compliant-reporting-model) — NR-1/NR-17 compliance, GHE inventory, matrices, 12-month action plan
- [Demo Report Download](mem://features/demo-report-download) — `/relatoriodemo` simulated HSE-IT report with 45 respondents
- [Department Segmentation](mem://features/department-segmentation) — Mandatory organizational structure for assessments and dashboards
- [HSE-IT Sector Filtering](mem://ui/hseit-results-sector-filtering) — Dynamic loading of department data via dropdown in results
- [Report Enhancements](mem://features/report-enhancements) — Attachments in denunciations, AI workflow, admin panel views
- [Gestão de Empresas SST](mem://features/gestao-empresas-sst) — SST limits (50), initial password from CNPJ, deletion via specific RLS
- [Master Dashboard Controls](mem://admin/master-dashboard-controls) — Admin management of SSTs/companies, reset state dialogs, Excel export
- [Data Privacy Architecture](mem://security/data-privacy-architecture) — LGPD compliance, public views, TLS/AES, no column-level encryption
- [Session Management](mem://auth/session-management) — QueryClient settings, token refresh handling, auto-redirects post-login
- [Multi-Company Access](mem://auth/multi-company-access) — `user_companies` join table, active context in profile, role-based redirects
- [Multi-User Accounts](mem://features/multi-user-accounts) — Convite de colaboradores por e-mail; tabelas `account_invitations` + `user_sst_managers`; rota `/convite/:token`; TeamManagementCard em SSTDashboard e CompanyProfile
- [SST Partner Portal](mem://features/sst-partner-portal) — Central hub for documents/trainings, private bucket, contract lifecycles
- [SST Client Password Reset](mem://features/sst-client-password-reset) — Edge function flow to reset company passwords, copy credentials
- [Company Feature Access](mem://features/company-feature-access) — SST toggles per-company modules (ouvidoria, psicossocial, burnout, clima, treinamentos)
- [Company Direct Tools Access](mem://features/company-direct-tools-access) — Empresas sem gestora SST acessam HSE-IT/COPSOQ/Burnout/Clima diretamente; gated por `company_has_no_sst()` e `useCompanyHasSST`
- [Master User Management](mem://admin/master-user-management) — Admin creation via edge function, clears previous roles, mandatory password change
- [Password Management Constraint](mem://tech/auth-password-management-constraint) — Supabase Admin API mandatory for password updates
- [Edge Function Constraint](mem://tech/edge-function-registration-constraint) — Manual `config.toml` registration required for new functions
- [Access Logs](mem://admin/sistema-logs-acesso-master) — Event tracking (auth, routing, errors) via `log-access` Edge Function
- [Public Access RLS](mem://security/politicas-acesso-publico-rls) — Anon inserts/selects for assessments, report tracking codes
- [Sales Role Access](mem://security/rls-sales-role-access) — RLS policies granting SELECT on all modules for demo accounts
- [Sales Team Role](mem://auth/sales-team-role) — Redirection to SalesDashboard, persistent demo account via `create-sales-demo`
- [Sales CRM Kanban](mem://features/sales-crm-kanban) — Kanban pipeline, mandatory data collection on status changes
- [Affiliate Tracking System](mem://features/affiliate-tracking-system) — `/i/:referralCode`, lead capture, RLS isolation
- [Affiliate Management](mem://admin/affiliate-management) — Admin approval workflow, lead visibility, manual credential generation
- [Affiliate Onboarding](mem://auth/affiliate-onboarding-flow) — Mandatory password change, redirect to `/afiliado/dashboard`
- [White Label Branding](mem://features/white-label-branding) — Custom colors, UI injection, persisting preferences via RLS
- [Branding Assets](mem://style/branding-assets) — `Logo_SOIA.png` and `sonia-avatar.png` paths
- [Dashboard Layout](mem://ui/organizacao-layout-dashboard-sst) — Hero headers, gradations, interactive tool cards
- [Empty State Handling](mem://ui/dashboard-empty-state-handling) — Prevent infinite loops if no `company_id` is linked
- [Long Process Feedback](mem://ux/feedback-processos-longos) — Dynamic progress bars with status indicators
- [Onboarding Tutorial](mem://ux/tutorial-guiado-onboarding-sst) — SST trial product tour, persisted in DB and localStorage
- [Performance Optimization](mem://tech/performance-and-parallelization) — Promise.all for loading, code splitting, skipping checks
- [Pricing Model](mem://product/pricing-model) — Tiered pricing by employee count for feature gating
- [Landing Page Strategy](mem://product/landing-page-strategy) — B2B marketing, IDs anchoring, PJ pricing focus
- [SEO Strategy](mem://product/seo-strategy) — Custom hook, JSON-LD schema, PT-BR indexing
- [Commercial Contacts](mem://product/contatos-comerciais) — Official WhatsApp/phone numbers for conversion
- [Data Export Power BI](mem://features/data-export-powerbi) — Botão de export (Excel multi-aba + CSV long-format) nas páginas de Resultados de HSE-IT/COPSOQ/Burnout/Clima
- [Extra Company Slots](mem://features/extra-company-slots) — Gestoras SST que atingem o limite de empresas podem comprar slots extras a R$19,90/mês via `purchase-extra-company-slot` (Asaas recurring); coluna `sst_managers.extra_company_slots` + tabela `sst_extra_slot_purchases`
- [Planos SMS Hotmart](mem://features/planos-sms-hotmart) — 5 planos hotmart_only (técnico/gestora/empresa SMS) com IA bloqueada, Ouvidoria off, PGR habilitado (`pgr_enabled` em `subscription_plans`); upgrades via `plan_upgrade_pricing` + `purchase-extra-employee-slot`
- [PGR Kanban Board](mem://features/pgr-kanban-board) — Rota `/pgr/:companyId/kanban` com drag-and-drop (@dnd-kit), confirmação ao concluir/cancelar, reusa usePGRDashboardData
- [Conciliação de Assinaturas](mem://features/subscription-reconciliation) — Aba Conciliação no Master: upload planilha Hotmart (9,90 = teste 7d / 97,90 = mensal), prévia, edge function `reconcile-subscriptions`, histórico
- [LTCAT Beta Privado](mem://features/ltcat-beta-module) — Gate LTCAT_BETA (só teste.sst@srsms.app); Fase 1 + 2B.1 prontas; seed das 29 regras BLOQUEADO até aprovação nominal; nunca iniciar fases seguintes sem autorização
- [LTCAT avulso Hotmart](mem://features/ltcat-hotmart-standalone) — Plano Hotmart 1376605 libera LTCAT_BETA no webhook (conta existente só ganha o módulo; conta nova é criada com ele)
