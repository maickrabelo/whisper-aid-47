# LTCAT — Beta Privado (plano revisado v3)

Módulo de LTCAT **previdenciário** (Decreto 3.048/99 Anexo IV + eSocial S-2240), visível e utilizável **exclusivamente** por `teste.sst@srsms.app`, sobre motor jurídico versionado e infraestrutura de feature flags reutilizável.

Separação obrigatória de domínios:

- **LTCAT previdenciário (`SOCIAL_SECURITY`)** — única interpretação implementada nesta entrega; base da conclusão do laudo.
- **Insalubridade (NR-15)** e **Periculosidade (NR-16)** — apenas arquitetura preparada (enum de domínio, tabelas genéricas). **Nenhum parecer, cálculo ou PDF NR-15/NR-16 nesta fase.** NR-16 não existe como metodologia de avaliação do LTCAT.

Uma mesma avaliação técnica (evidência) poderá no futuro alimentar outros domínios, mas cada interpretação é registro próprio, com sua própria regra jurídica.

---

## 1. Feature flags e acesso beta (Fase 1)

- `feature_flags` — `feature_key`, `enabled`, `beta`, timestamps. Registro `LTCAT_BETA`.
- `feature_access` — `feature_key`, `user_id`, `company_id?`, `sst_manager_id?`, `plan_id?`, `enabled`, `valid_from timestamptz not null default now()`, `valid_to timestamptz?`, `created_at`, `updated_at` (com trigger). Constraints/índices: `CHECK (valid_to IS NULL OR valid_to >= valid_from)`; índice em `(user_id, feature_key)`; unicidade equivalente para evitar duplicidade de acesso (`user_id, feature_key, company_id` tratando NULL). Único registro: o `user_id` de `teste.sst@srsms.app`.
- `has_feature_access(_feature_key text, _company_id uuid default null) returns boolean` — usuário **sempre** obtido de `auth.uid()` dentro da função, nunca por parâmetro do cliente. `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''`, com todas as referências qualificadas (`public.feature_flags`, `public.feature_access`), sem SQL dinâmico. `EXECUTE` revogado de `PUBLIC`/`anon`, concedido apenas a `authenticated` e `service_role`. Verifica flag habilitada + registro habilitado + vigência.
- Verificação administrativa de outro usuário, se necessária no futuro: função separada `admin_has_feature_access(_user_id, _feature_key)` com `EXECUTE` **apenas** para `service_role` (revogado de `authenticated`, `anon`, `PUBLIC`).
- RLS/exposição: `feature_access` e `feature_flags` **não são consultadas pelo frontend**. O cliente chama apenas a RPC e recebe `true`/`false`. Sem GRANT de SELECT para `authenticated`/`anon` nessas tabelas e sem INSERT/UPDATE/DELETE para qualquer role de cliente; escrita apenas por `service_role`. RLS habilitada nas duas tabelas sem policies permissivas ao cliente.

- Frontend: hook único `useFeatureAccess('LTCAT_BETA')` (via RPC); guarda de rota que decide **antes** de renderizar e antes de qualquer consulta; sem acesso → 404 padrão do projeto. Nenhum e-mail hard-coded, nenhum bypass por perfil admin.

- Nenhuma liberação automática em deploy.

## 2. Profissional técnico e capacidade de assinatura

`technical_professionals` — `full_name`, `cpf`, `profession`, `council` (CREA/CRM/CRQ/outros), `council_number`, `council_uf`, vínculo (`sst_manager_id`/`company_id`), `active`, **`can_sign_ltcat` (boolean, default false)**, `capability_granted_by`, `capability_granted_at`, `capability_note`.

- `can_sign_ltcat` é concedido explicitamente (nunca inferido a partir do conselho, da profissão ou do perfil do usuário).
- O LTCAT referencia `technical_professional_id` como responsável; cada avaliação referencia o profissional que a executou (pode ser outro).
- **Validação bloqueante de publicação**: sem responsável com `can_sign_ltcat = true` e cadastro completo, o documento não conclui nem publica.

## 3. Catálogo interno de agentes e mapeamentos versionados

- `occupational_agents` — catálogo interno estável com `agent_id` próprio (uuid) + `internal_code` estável, nome, tipo (físico/químico/biológico), sinônimos, `active`. **Esta é a chave canônica usada por exposições, avaliações e regras.**
- `agent_mappings` — mapeamentos versionados do agente interno para domínios externos: `agent_id`, `target_domain` (`ESOCIAL_TABELA_24`, `ANEXO_IV_DEC_3048`, `NR15`, `NR16`, `CAS`, outros), `external_code`, `external_label`, `catalog_version`, `valid_from`, `valid_to?`, `notes`.
- `external_catalog_versions` — versões dos catálogos externos (Tabela 24, Anexo IV), com vigência, permitindo laudos de períodos distintos resolverem o código correto.

Nenhum código de Tabela 24 é usado como identificador do agente; ele é sempre resolvido por mapeamento vigente no período.

## 4. Motor jurídico versionado

- `legal_sources` — norma/fonte (Decreto 3.048/99 Anexo IV, NR-15, NHO-01, NHO-06, Portarias, INs), tipo, número, ementa, link oficial.
- `legal_rules` — `legal_source_id`, `domain` (`SOCIAL_SECURITY` | `NR15_INSALUBRIDADE` | `NR16_PERICULOSIDADE`), `agent_id` (interno), `rule_key`, descrição.
- `legal_rule_versions` — `legal_rule_id`, `valid_from`, `valid_to?`, `criterion` (quantitativo/qualitativo), `threshold_value`, `unit`, `evaluation_basis`, `methodology_id`, `epc_behavior`, `epi_behavior`, `outcome_spec` (jsonb: consequência previdenciária / enquadramento), `citation` (dispositivo legal), `manifest_version`.
- `assessment_methodologies` — NHO-01, NHO-06, avaliação qualitativa e anexos NR-15 aplicáveis, com vigência e domínios permitidos. NR-16 nunca aparece como metodologia LTCAT.

Serviço `resolveLegalRule(agentId, exposurePeriod, methodology, resultContext)`: retorna a versão vigente **no período da exposição** — nunca a regra atual aplicada retroativamente. Sem regra parametrizada → estado `NOT_PARAMETERIZED`, e UI/PDF exibem **"Regra jurídica não parametrizada. Revisão técnica necessária."** Nenhuma conclusão inventada.

**Nenhum seed automático de regras.** Antes da Fase 2 eu entrego, para sua aprovação, um **Manifesto de Regras Jurídicas** contendo, por regra: domínio, agente interno, norma oficial, dispositivo legal, fonte oficial, período de vigência, metodologia exigida, critério (quantitativo/qualitativo), limite e unidade quando aplicável, comportamento de EPC e de EPI, consequência previdenciária e versão. Somente regras aprovadas nominalmente nesse manifesto entram no banco.

## 5. Exposição ocupacional (entidade central, normalizada)

- `occupational_exposures` — empresa, estabelecimento, `ghe_id?` / função / trabalhador, `agent_id` (interno), atividade, frequência, duração/jornada, `valid_from`, `valid_to`, `superseded_by` (histórico encadeado), `status`. **Sem colunas singulares de fonte/EPI/EPC.**
- `hazard_sources` — cadastro de fontes geradoras (máquina/processo/produto/ambiente), com vigência.
- `exposure_hazard_sources` — N:N exposição × fonte geradora, com vigência própria.
- `exposure_epis` — N:N exposição × EPI (CA, tipo, eficácia declarada, evidência, vigência).
- `exposure_epcs` — N:N exposição × EPC (medida, eficácia, evidência, vigência).
- `ltcat_avaliacoes` — **evidência técnica** vinculada à exposição: metodologia, instrumento, data, valor medido, unidade, incerteza, `technical_professional_id`, anexos.
- `ltcat_instrumentos` — equipamento, marca/modelo, nº série, calibração e certificado.
- `exposure_interpretations` — `domain`, `legal_rule_version_id`, resultado, `override` justificado, autor. Nesta entrega só há produção de `SOCIAL_SECURITY`.

Reaproveitamento: EPIs/EPCs e fontes já descritos em `pgr_risks` entram como sugestão de preenchimento dos cadastros, nunca por cópia automática.

Nada é sobrescrito: mudança de máquina, processo, produto, ambiente, jornada, EPC, EPI ou avaliação encerra a condição anterior (`valid_to`) e abre nova, preservando histórico integral.

## 6. Detector de Alterações SST

`sst_change_events` — origem da mudança, entidade afetada, estado anterior (jsonb) e novo, impacto potencial em **LTCAT, PGR, trabalhadores e S-2240**, status (`pending_review`/`confirmed`/`discarded`), autor e data. Fluxo: detecta → preserva estado anterior → abre nova condição → mostra a consequência → exige confirmação explícita → grava histórico. Nenhuma escrita automática em PGR, AEP ou psicossocial.

## 7. Matriz de Coerência PGR × LTCAT × S-2240

Motor de divergências com regras para agente, valor de avaliação, GHE, EPI/EPC, responsável técnico, fonte geradora, metodologia e vigência. Cada divergência vai para `coherence_findings` com severidade, entidades envolvidas e status de tratamento. Não corrige nada automaticamente.

## 8. S-2240 — Pré-validador / Gerador de Estado

Rotulado **"Pré-validador / Gerador de Estado S-2240"**: monta `s2240_states` a partir das exposições vigentes, aponta campos faltantes e inconsistências, gera arquivo apenas para inspeção interna, sempre marcado como **não validado contra o leiaute/XSD vigente** e **não apto a transmissão oficial**. Sem mensageria e sem assinatura digital; modelagem já preparada para integração futura.

## 9. Triagem de riscos do PGR/AEP

Nada é importado direto como agente. O sistema **sugere candidatos** a partir de `pgr_risks` e das AEPs; cada candidato é classificado em `ltcat_candidate_risks` como `LTCAT_APPLICABLE`, `LTCAT_NOT_APPLICABLE` ou `LTCAT_REVIEW_REQUIRED`. Riscos ergonômicos e psicossociais nunca são promovidos automaticamente a agente previdenciário. A exposição só é criada após classificação humana e vinculação a um `agent_id` interno.

## 10. Compliance validator antes da emissão

`validateLtcatForPublication(documentId)` → `{ blockingErrors, warnings, info, score }`. Erro bloqueante impede conclusão e publicação **independentemente do score**. Bloqueantes previstos: responsável sem `can_sign_ltcat`, cadastro profissional incompleto, exposição sem avaliação exigida pela metodologia, regra não parametrizada usada em conclusão, período sem mapeamento de catálogo externo, divergência crítica na matriz de coerência. Resultado persistido junto da revisão.

## 11. PDFs no beta

Todo PDF do módulo sai com marcação permanente **"BETA — DOCUMENTO PARA VALIDAÇÃO INTERNA"** (faixa na capa, marca d'água diagonal e nota de rodapé), não removida sem solicitação explícita futura. Tipografia e capa seguem o padrão já unificado do PGR; assinaturas usam `reportSignatures` + cadastro de profissional técnico. **Nenhum PDF NR-15/NR-16 nesta fase.**

## 12. Versionamento imutável

`ltcat_documents` (rascunho editável) + `ltcat_document_revisions` (snapshot jsonb completo: identificação, exposições, avaliações, interpretações, regras aplicadas com suas versões, mapeamentos usados, validação e hash). Publicar/validar congela a revisão; alteração posterior cria nova revisão preservando integralmente a anterior. Revisões são somente-leitura no banco (sem policy de UPDATE/DELETE).

## 13. Segurança

Toda tabela do módulo com RLS exigindo **simultaneamente**: autenticado + vínculo com o tenant (`user_in_company` / `user_manages_company`) + `has_feature_access(auth.uid(), 'LTCAT_BETA')`. A permissão beta não fura isolamento entre organizações. Edge functions `ltcat-*` validam JWT, resolvem o usuário no servidor e checam a flag em todo GET/POST/PUT/PATCH/DELETE, PDF, upload, download, processamento e pré-validação S-2240. Bucket privado `ltcat-anexos` com as mesmas exigências e URLs assinadas emitidas apenas por função autorizada.

`ltcat_audit_log`: criação, alteração, avaliação, conclusão, override, geração de PDF, publicação, divergência, erro, falha de geração e tentativa de acesso não autorizado.
`beta_feedback`: `feature_key`, `user_id`, `page`, `category` (BUG/UX/LEGAL_RULE/PDF/DATA/PERFORMANCE/SUGGESTION), `description`, `severity`, `resolved`, com botão discreto "Enviar feedback do Beta".

Nenhuma policy, hook ou rota dos módulos existentes (PGR, AEP, psicossocial, ouvidoria, clima, treinamentos) é alterada.

---

## Relações principais

```text
occupational_agents (agent_id canônico)
   └── agent_mappings ── external_catalog_versions   (Tabela 24, Anexo IV, NR-15...)

companies ─┬─ ltcat_documents ── ltcat_document_revisions (imutáveis)
           │        └── technical_professionals (can_sign_ltcat)
           │
           ├─ occupational_exposures (agent_id + vigência)
           │     ├── exposure_hazard_sources ── hazard_sources
           │     ├── exposure_epis
           │     ├── exposure_epcs
           │     ├── ltcat_avaliacoes ── ltcat_instrumentos / ltcat_anexos
           │     └── exposure_interpretations (SOCIAL_SECURITY agora)
           │              └── legal_rule_versions ── legal_rules ── legal_sources
           │                        └── assessment_methodologies
           │
           ├─ ltcat_candidate_risks (triagem PGR/AEP)
           ├─ sst_change_events
           ├─ coherence_findings
           └─ s2240_states

feature_flags / feature_access ── has_feature_access()  (gate de tudo acima)
```

## Reaproveitamento do sistema existente

- Empresas, `user_companies`, `company_sst_assignments`, `profiles`, funções `user_in_company` / `user_manages_company` / `has_role`.
- GHEs e riscos do PGR (`pgr_ghe`, `pgr_ghe_workers`, `pgr_risks`) e AEPs — apenas como origem de sugestão, via triagem.
- `esocial_agents_catalog` atual como insumo para popular `agent_mappings` (não como chave do agente).
- Padrões de PDF do PGR, `pdfTextSafety`, `pdfLogos`, `reportSignatures`, `SignatureSettingsDialog`.
- Padrões de UI: `PGRHub`, layout de abas do `PGRDashboard`, `ImportGHEFromAEPDialog` como referência de importação com confirmação.
- Padrão de edge function autenticada e de export XML do `ESocialExportDialog`.

## Fases

1. **Fundação de Acesso** — `feature_flags`, `feature_access`, `has_feature_access` (search_path fixo, EXECUTE mínimo), RLS sem escrita pelo cliente, hook `useFeatureAccess`, guarda de rota, rota `/ltcat` com selo BETA, `ltcat_audit_log`, `beta_feedback`.
2. **Manifesto de Regras Jurídicas para aprovação** e, só após aprovação, motor jurídico (`legal_*`, `assessment_methodologies`, `occupational_agents`, `agent_mappings`, `external_catalog_versions`, `resolveLegalRule`).
3. Profissional técnico (com `can_sign_ltcat`) + `ltcat_documents` + hub/dashboard.
4. Exposições normalizadas (fontes, EPIs, EPCs), avaliações, instrumentos, anexos.
5. Interpretação `SOCIAL_SECURITY` e conclusão previdenciária.
6. Triagem PGR/AEP (`ltcat_candidate_risks`).
7. Detector de alterações + matriz de coerência.
8. Compliance validator + versionamento imutável.
9. PDF do laudo com marcação BETA.
10. Pré-validador S-2240.
11. Testes dos 10 cenários beta e ajustes.

**Execução: somente a Fase 1 agora.** Ao concluir, eu paro e entrego: migrations criadas; tabelas/funções/policies criadas; arquivos frontend alterados; rotas criadas; testes executados e seus resultados; resultado dos testes de acesso; confirmação de que nenhum módulo existente foi alterado ou quebrado; confirmação de que somente `teste.sst@srsms.app` acessa `/ltcat`. Nenhuma fase seguinte começa sem sua autorização explícita.

## Estimativa de créditos

| Fase | Créditos |
|---|---|
| 1 — Fundação de Acesso | 8 – 12 |
| 2 — Manifesto + motor jurídico + catálogo interno e mapeamentos | 22 – 32 |
| 3 — Profissional técnico + documento + hub | 10 – 15 |
| 4 — Exposições normalizadas, evidências, instrumentos, anexos | 22 – 30 |
| 5 — Interpretação previdenciária | 8 – 12 |
| 6 — Triagem PGR/AEP | 8 – 12 |
| 7 — Detector de alterações + matriz de coerência | 14 – 20 |
| 8 — Validator + versionamento imutável | 12 – 18 |
| 9 — PDF do laudo com marcação BETA | 12 – 18 |
| 10 — Pré-validador S-2240 | 10 – 16 |
| 11 — Testes beta e ajustes | 6 – 10 |

**Total estimado: 132 – 195 créditos** (faixa provável ~160). Rodadas de ajuste de regra jurídica, layout de PDF ou escopo novo ficam fora dessa faixa, tipicamente 2 – 6 créditos cada. A Fase 1, isolada, custa 8 – 12.
