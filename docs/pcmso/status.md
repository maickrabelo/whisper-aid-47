# PCMSO — Status

Atualizado: 14/10/2026

| Fase | Descrição | Release | Status |
|---|---|---|---|
| 0 | Diagnóstico e plano | — | Concluída |
| 1 | Acesso e estrutura | A | Concluída (flag desligada em produção) |
| 2 | Cadastros e migração | A | Pendente |
| 3 | Programa e inventário | A | Pendente |
| 4 | Protocolos e revisão médica | A | Pendente |
| 5 | Documento e ações | A | Pendente |
| 6 | Solicitações e vencimentos | B | Pendente |
| 7 | Controles clínicos e ASO | B/C | Pendente |
| 8 | Relatório analítico | C | Pendente |
| 9 | eSocial S-2220 (export) | D | Pendente |
| 10 | Integrações complementares | D | Pendente |
| 11 | Homologação e piloto | — | Pendente |

## Dúvidas abertas
1. Conferir migrações do repositório contra o banco real antes da Fase 1.
2. Qualidade dos dados de `pgr_ghe_workers` (CPF, matrícula, duplicidades) — diagnóstico agregado na Fase 2.
3. Médico responsável e empresa piloto.
4. Fluxo de assinatura do ASO (Release C) e provedor eSocial (Release D).
5. Planos comerciais que incluirão o PCMSO.
6. Limiar de anonimato dos agregados (sugestão inicial: 5).
7. Política de retenção e base legal (com responsável de privacidade).

## Fase 1 — entregue
- Flag `PCMSO_BETA` criada **desligada** (global). Liberar exige: ligar a flag e conceder `feature_access` ao usuário.
- Política de flag desligada: todas as leituras e escritas do módulo retornam vazio/negado; dados preservados.
- Tabelas: `pcmso_professional_assignments`, `pcmso_programs`, `pcmso_audit_events`.
- Funções: `pcmso_can(company, permissão)`, `pcmso_accessible_companies()`, `pcmso_has_clinical_assignment`.
- Admin gerencia atribuições, mas não ganha acesso clínico; SST prepara, não aprova.
- Rotas: `/pcmso` (FeatureGuard) e `/pcmso/empresa/:companyId` (404 sem `program.view`). Atalho no painel SST só com flag liberada.

## Correção pós-GitHub (21/10/2026)
- `usePcmsoCan` voltou a usar `pcmso_can` (a `pcmso_permissions` ficou vazia e bloqueava todos).
- Policies de `pcmso_programs`/`pcmso_audit_events` passaram a usar `pcmso_can` (inclui Gestora SST e médico; respeita a flag). Sem DELETE.
- `pcmso_permissions` e `pcmso_has_permission` marcadas DEPRECATED.
