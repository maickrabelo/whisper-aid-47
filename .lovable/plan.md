# LTCAT — Beta Privado (plano revisado)

Módulo de LTCAT **previdenciário** (Decreto 3.048/99 Anexo IV + eSocial S-2240), visível e utilizável **exclusivamente** por `teste.sst@srsms.app`, sobre motor jurídico versionado e infraestrutura de feature flags reutilizável.

Separação obrigatória de domínios:

- **LTCAT previdenciário** — única fonte da conclusão principal do laudo (enquadramento para aposentadoria especial).
- **Insalubridade (NR-15)** — módulo/parecer trabalhista separado, opcional, nunca dentro da conclusão previdenciária.
- **Periculosidade (NR-16)** — módulo/parecer trabalhista separado; NR-16 **não** existe como metodologia de avaliação do LTCAT.

Uma mesma avaliação técnica (evidência) pode alimentar as três interpretações, mas cada interpretação é um registro próprio, com sua própria regra jurídica e conclusão.

---

## 1. Feature flags e acesso beta

- `feature_flags` — `feature_key`, `enabled`, `beta`, timestamps. Registro `LTCAT_BETA`.
- `feature_access` — `feature_key`, `user_id`, `company_id?`, `sst_manager_id?`, `plan_id?`, `enabled`, `valid_from`, `valid_to?`. Único registro: o `user_id` de `teste.sst@srsms.app`.
- `has_feature_access(_user_id, _feature_key)` (security definer) — usada por **todas** as policies e por todo o backend. Sem comparação de e-mail, sem bypass por perfil admin.
- Frontend: hook único `useFeatureAccess('LTCAT_BETA')`; guarda de rota que decide **antes** de renderizar e antes de qualquer consulta; sem acesso → 404 padrão.
- `feature_access` gravável apenas por service role. Nenhuma liberação automática em deploy.

## 2. Profissional técnico (cadastro estruturado)

`technical_professionals` — `full_name`, `cpf`, `profession`, `council` (CREA/CRM/CRQ/outros), `council_number`, `council_uf`, `sst_manager_id`/`company_id` de vínculo, `active`.

O LTCAT referencia `technical_professional_id` (responsável pelo laudo) e cada avaliação referencia o profissional que a realizou. Nada de campo livre "registro/NIT".

## 3. Motor jurídico versionado

- `legal_sources` — norma/fonte (Decreto 3.048/99 Anexo IV, NR-15, NR-16, NHO-01, NHO-06, Portarias, INs), tipo, número, ementa, link.
- `legal_rules` — regra abstrata: `legal_source_id`, `domain` (`SOCIAL_SECURITY` | `NR15_INSALUBRIDADE` | `NR16_PERICULOSIDADE`), `agent_code`, `rule_key`, descrição.
- `legal_rule_versions` — `legal_rule_id`, `valid_from`, `valid_to?`, `threshold_value`, `unit`, `criterion` (quantitativo/qualitativo), `evaluation_basis`, `methodology_id`, `outcome_spec` (jsonb: enquadramento, grau, código eSocial aplicável), `citation`.
- `assessment_methodologies` — NHO-01, NHO-06, NR-15 anexos aplicáveis, avaliação qualitativa, com vigência e domínio permitido. NR-16 não é opção de metodologia LTCAT.
- `esocial_agent_catalog_versions` + `esocial_agents` — catálogo da Tabela 24 versionado (`catalog_version`, `valid_from`, `valid_to`), permitindo laudos de períodos distintos usarem a versão correta.

Serviço `resolveLegalRule(agentCode, exposurePeriod, methodology, resultContext)`:
consulta a versão de regra vigente **no período da exposição**, nunca a regra atual aplicada retroativamente. Sem regra parametrizada → retorna estado `NOT_PARAMETERIZED` e a UI/PDF exibem **"Regra jurídica não parametrizada. Revisão técnica necessária."** Nenhuma conclusão inventada, nenhum fluxo destravado artificialmente.

Seed inicial: apenas regras que eu conseguir parametrizar com citação verificável (ruído, calor, agentes químicos com LT definido, biológicos qualitativos). O restante fica explicitamente não parametrizado.

## 4. Exposição ocupacional (entidade central)

- `hazard_sources` — fontes geradoras: máquina/processo/produto/ambiente, descrição, `valid_from`, `valid_to`.
- `occupational_exposures` — o núcleo: empresa, estabelecimento, `ghe_id?` / função / trabalhador, `agent_code` + versão de catálogo, `hazard_source_id`, atividade, frequência, duração/jornada, `epc` e eficácia, `epi` (CA) e eficácia, `valid_from`, `valid_to`, `superseded_by` (histórico encadeado), `status`.
- `ltcat_avaliacoes` — **evidência técnica** vinculada a uma exposição: metodologia, instrumento, data, valor medido, unidade, incerteza, técnico responsável (`technical_professional_id`), anexos.
- `ltcat_instrumentos` — equipamento, marca/modelo, nº série, calibração e certificado.
- Interpretações separadas por domínio: `exposure_interpretations` com `domain`, `legal_rule_version_id`, resultado, `override` justificado, autor. A conclusão previdenciária do LTCAT lê **somente** `domain = SOCIAL_SECURITY`.

Nada é sobrescrito: mudança de máquina, processo, produto, ambiente, jornada, EPC, EPI ou avaliação encerra a condição anterior (`valid_to`) e abre uma nova, preservando o histórico integral.

## 5. Detector de Alterações SST

`sst_change_events` — origem da mudança, entidade afetada, estado anterior (jsonb) e novo, impacto potencial calculado em **LTCAT, PGR, trabalhadores e S-2240**, status (`pending_review`/`confirmed`/`discarded`), autor e data.

Fluxo: detecta → preserva estado anterior → abre nova condição → mostra a consequência → exige confirmação explícita → grava histórico. Nenhuma escrita automática em PGR, AEP ou psicossocial.

## 6. Matriz de Coerência PGR × LTCAT × S-2240

Motor de divergências (não comparação simples de agentes), com regras para: agente, valor de avaliação, GHE, EPI/EPC, responsável técnico, fonte geradora, metodologia e vigência. Cada divergência é registrada em `coherence_findings` com severidade, entidades envolvidas e status de tratamento. Não corrige nada automaticamente.

## 7. S-2240 — Pré-validador / Gerador de Estado

Primeira versão explicitamente rotulada **"Pré-validador / Gerador de Estado S-2240"**:

- Monta o estado do evento a partir das exposições vigentes (`s2240_states`), aponta campos faltantes e inconsistências.
- Gera arquivo para inspeção interna, sempre marcado como **não validado contra o leiaute/XSD vigente** e **não apto a transmissão oficial**.
- Sem mensageria, sem assinatura digital, sem envio. Modelagem de dados já preparada para a integração oficial futura.

## 8. Importação do PGR/AEP com triagem obrigatória

Nada é importado direto como agente do LTCAT. O sistema **sugere candidatos** a partir dos riscos do PGR e das AEPs; cada candidato é classificado em `ltcat_candidate_risks` como:

- `LTCAT_APPLICABLE`
- `LTCAT_NOT_APPLICABLE`
- `LTCAT_REVIEW_REQUIRED`

Riscos ergonômicos e psicossociais nunca são promovidos automaticamente a agente previdenciário — entram no máximo como `LTCAT_REVIEW_REQUIRED` com aviso explícito. Só após classificação humana a exposição é criada.

## 9. Compliance validator antes da emissão

`validateLtcatForPublication(documentId)` → `{ blockingErrors, warnings, info, score }`.

Erro bloqueante impede conclusão e publicação **independentemente do score** (ex.: exposição sem avaliação exigida, regra não parametrizada usada em conclusão, profissional técnico incompleto, período sem catálogo eSocial correspondente, divergência crítica na matriz de coerência). Resultado da validação é persistido junto da versão.

## 10. PDFs no beta

Todo PDF do módulo (laudo, pareceres NR-15/NR-16, relatórios de coerência) sai com marcação permanente **"BETA — DOCUMENTO PARA VALIDAÇÃO INTERNA"**: faixa na capa, marca d'água diagonal nas páginas e nota no rodapé. Não será removida sem solicitação explícita futura. Tipografia e capa seguem o padrão já unificado do PGR; assinaturas reaproveitam `reportSignatures` + o cadastro de profissional técnico.

## 11. Versionamento imutável

`ltcat_documents` (rascunho editável) + `ltcat_document_revisions` (snapshot jsonb completo: identificação, exposições, avaliações, interpretações, regras aplicadas com suas versões, validação e hash). Publicar/validar congela a revisão; qualquer alteração posterior cria uma nova revisão preservando integralmente a anterior. Revisões são somente-leitura no banco (sem UPDATE/DELETE via policy).

## 12. Segurança

Toda tabela do módulo com RLS exigindo **simultaneamente**: autenticado + vínculo com o tenant (`user_in_company` / `user_manages_company`, como hoje) + `has_feature_access(auth.uid(), 'LTCAT_BETA')`. A permissão beta não fura isolamento entre organizações. Edge functions `ltcat-*` validam JWT, resolvem o usuário no servidor e checam a flag em todo GET/POST/PUT/PATCH/DELETE, PDF, upload, download, processamento e pré-validação S-2240. Bucket privado `ltcat-anexos` com as mesmas exigências e URLs assinadas emitidas apenas por função autorizada.

`ltcat_audit_log`: criação, alteração, avaliação, conclusão, override, geração de PDF, publicação, divergência, erro, falha de geração e tentativa de acesso não autorizado.
`beta_feedback`: `feature_key`, `user_id`, `page`, `category` (BUG/UX/LEGAL_RULE/PDF/DATA/PERFORMANCE/SUGGESTION), `description`, `severity`, `resolved`, com botão discreto "Enviar feedback do Beta" dentro do módulo.

Nenhuma policy, hook ou rota dos módulos existentes (PGR, AEP, psicossocial, ouvidoria, clima, treinamentos) é alterada.

---

## Relações principais

```text
companies ─┬─ ltcat_documents ── ltcat_document_revisions (imutáveis)
           │        │
           │        └── technical_professionals (responsável técnico)
           │
           ├─ occupational_exposures ──┬── hazard_sources
           │   (GHE/função/trabalhador │
           │    + agente + vigência)   ├── ltcat_avaliacoes ── ltcat_instrumentos / ltcat_anexos
           │                           │
           │                           └── exposure_interpretations
           │                                 (SOCIAL_SECURITY | NR15 | NR16)
           │                                        │
           │                                        └── legal_rule_versions ── legal_rules ── legal_sources
           │                                                  └── assessment_methodologies
           │
           ├─ ltcat_candidate_risks (triagem PGR/AEP)
           ├─ sst_change_events (detector de alterações)
           ├─ coherence_findings (PGR × LTCAT × S-2240)
           └─ s2240_states (pré-validador)

esocial_agent_catalog_versions ── esocial_agents  (referenciado por exposição e regra)
feature_flags / feature_access ── has_feature_access()  (gate de tudo acima)
```

## Reaproveitamento do sistema existente

- Empresas, `user_companies`, `company_sst_assignments`, `profiles`, funções `user_in_company` / `user_manages_company` / `has_role`.
- GHEs e riscos do PGR (`pgr_ghe`, `pgr_ghe_workers`, `pgr_risks`) e AEPs — apenas como **origem de sugestão**, via triagem.
- `esocial_agents_catalog` atual como base do catálogo versionado.
- Padrões de PDF do PGR (tipografia, justificação, capa com fundo), `src/lib/pdfTextSafety.ts`, `src/lib/pdfLogos.ts`, `src/lib/reportSignatures.ts` e `SignatureSettingsDialog`.
- Padrões de UI: `PGRHub` para seleção de empresa, layout de abas do `PGRDashboard`, `ImportGHEFromAEPDialog` como referência de fluxo de importação com confirmação.
- Padrão de edge function autenticada e de export XML já usado no `ESocialExportDialog`.

## Fases de implementação

1. **Fundação de acesso** — `feature_flags`, `feature_access`, `has_feature_access`, hook, guarda de rota, `ltcat_audit_log`, `beta_feedback`, rota `/ltcat` com selo BETA.
2. **Motor jurídico** — `legal_sources`, `legal_rules`, `legal_rule_versions`, `assessment_methodologies`, catálogo eSocial versionado, `resolveLegalRule` + seed com citações.
3. **Profissional técnico e documento** — `technical_professionals`, `ltcat_documents`, hub/dashboard, CRUD, abas base.
4. **Exposições e evidências** — `hazard_sources`, `occupational_exposures` com histórico, `ltcat_avaliacoes`, `ltcat_instrumentos`, anexos em bucket privado.
5. **Interpretações separadas** — `exposure_interpretations` para previdenciário; pareceres NR-15 e NR-16 como trilhas independentes.
6. **Triagem PGR/AEP** — `ltcat_candidate_risks` e fluxo de classificação.
7. **Detector de alterações + matriz de coerência** — `sst_change_events`, `coherence_findings`.
8. **Validator + versionamento imutável** — `validateLtcatForPublication`, `ltcat_document_revisions`, publicação bloqueada por erro bloqueante.
9. **PDFs com marcação BETA** — laudo previdenciário, pareceres separados, relatório de coerência.
10. **Pré-validador S-2240** — `s2240_states`, checagens e arquivo de inspeção rotulado.
11. **Testes dos 10 cenários beta** e ajustes.

## Estimativa de créditos

| Fase | Créditos |
|---|---|
| 1 — Fundação de acesso | 8 – 12 |
| 2 — Motor jurídico versionado + seed | 18 – 26 |
| 3 — Profissional técnico + documento + hub | 10 – 15 |
| 4 — Exposições, evidências, instrumentos, anexos | 18 – 26 |
| 5 — Interpretações + NR-15/NR-16 separados | 12 – 18 |
| 6 — Triagem PGR/AEP | 8 – 12 |
| 7 — Detector de alterações + matriz de coerência | 14 – 20 |
| 8 — Validator + versionamento imutável | 12 – 18 |
| 9 — PDFs com marcação BETA | 14 – 20 |
| 10 — Pré-validador S-2240 | 10 – 16 |
| 11 — Testes beta e ajustes | 6 – 10 |

**Total estimado: 130 – 193 créditos** (faixa provável ~155). Rodadas de ajuste de regra jurídica, layout de PDF ou escopo novo pedidas durante o caminho ficam fora dessa faixa, tipicamente 2 – 6 créditos cada.

Nada é implementado até sua aprovação deste plano revisado.
