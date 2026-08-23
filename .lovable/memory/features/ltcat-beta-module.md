---
name: LTCAT Beta Privado — Motor Jurídico
description: Módulo LTCAT em beta privado (só teste.sst@srsms.app via flag LTCAT_BETA); Fase 1 e Fase 2B.1 concluídas; seed das 29 regras BLOQUEADO até aprovação nominal
type: feature
---

# LTCAT Beta Privado

## Gate de acesso
- Flag `LTCAT_BETA` em `feature_flags`; RPC `public.has_feature_access('LTCAT_BETA')` resolve usuário via `auth.uid()`.
- Único usuário autorizado: `teste.sst@srsms.app` (id 4b69c13a-70ae-45ce-8b18-20a3b922fcee).
- Frontend: `useFeatureAccess` + `FeatureGuard`; rota `/ltcat` (LTCATHub). Sem bypass admin.
- Beta = USO do motor, nunca administração de legislação. Escrita jurídica só via service_role/migration.

## Estado das fases
- **Fase 1 (Fundação de Acesso)**: CONCLUÍDA — feature_flags/feature_access, ltcat_audit_log, beta_feedback, guarda de rota.
- **Fase 2A/2A.1 (Manifesto de Regras)**: APROVADA — docs em `docs/ltcat/` (manifesto v2.1, readiness v1, seed-ready review rev 1.1). 29 regras: 28 APPROVE_FOR_SEED + 1 REFERENCE_ONLY. Mapeamentos Tabela 24 (S-1.3) duplamente verificados — RAD_ION 02.01.006–013, PRESS_HIPER 02.01.015–018, ASSOC_MIN_SUB_AF 04.01.001, ASSOC_MIN_SUB_FP 04.01.002.
- **Fase 2B.1 (Schema, sem seed)**: CONCLUÍDA — 11 tabelas: occupational_agents, external_catalog_versions, agent_mappings (1:N condicional), legal_sources, assessment_methodologies, legal_rules, legal_rule_versions, legal_rule_source_links, legal_conflicts, legal_rule_conflicts, legal_rule_audit_log. Funções: legal_checksum (sha256 de jsonb::text), build_legal_rule_canonical_payload (SECURITY INVOKER), triggers de overlap (só versões aprovadas), imutabilidade (production_approved) e auditoria.
- **Auditoria de integridade 2B.1 (23/08/2026)**: todos os testes comportamentais PASS (checksum determinístico, imutabilidade, overlap, RLS, banco vazio). 3 pendências reportadas aguardando decisão antes da 2B.2: (1) falta coluna/constante `canonical_schema_version` ('CANONICAL_SET_V1') e nada popula canonical_payload/rule_checksum; (2) UPDATE silencioso possível em legal_sources/methodologies/agents/mappings/conflicts referenciados por versão aprovada (DELETE já bloqueado por FK RESTRICT); (3) audit_log sem coluna `origin` e `changed_by` nulo em seeds via service_role.
- **Fases 2B.2 (seed), 3+ (profissional técnico, exposições, PDF etc.)**: BLOQUEADAS — exigem autorização explícita do usuário. NUNCA iniciar seed automaticamente.

## Regras invioláveis
- Versão `production_approved` é imutável (trigger bloqueia UPDATE/DELETE); correção = nova versão.
- FKs jurídicas com ON DELETE RESTRICT (sem cascade); histórico nunca é apagado (active/valid_to/archived).
- Checksum cobre SOMENTE canonical_payload (exclui created_at, UUIDs de auditoria); mapeamentos no payload apenas dos domínios jurídicos (Anexo IV, decretos históricos) — Tabela 24 fica fora (entidade externa versionada).
- NR-15/NR-16 existem apenas como valores de enum; nenhum parecer/cálculo/PDF desses domínios.
- Domínio implementado: SOMENTE SOCIAL_SECURITY (previdenciário).
