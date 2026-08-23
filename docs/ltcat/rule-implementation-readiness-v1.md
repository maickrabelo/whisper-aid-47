# RULE_IMPLEMENTATION_READINESS — LTCAT PREVIDENCIÁRIO
## Fase 2A.1 — Matriz final de prontidão para parametrização

| Campo | Valor |
|---|---|
| Versão | 1.1 |
| Data | 23/08/2026 |
| Base | `manifesto-regras-juridicas-v2.1.md` (normalização de autoridade) |
| Propósito | Uma linha por regra, com os atributos de autoridade e a decisão `seed_ready` |
| Status | Documento de revisão — **não autoriza seed, migration ou código** |
| Revisão 1.1 | 23/08/2026 — resolução dos 4 mapeamentos parciais da Tabela 24 (RAD_ION, PRESS_HIPER, ASSOC_MIN_SUB_AF/FP) na fonte oficial do eSocial; modelagem condicional 1:N em `agent_mappings` (nota §7.1) |

**Critérios de `seed_ready = YES` (todos obrigatórios):** (1) fonte primária confirmada; (2) artigo/item confirmado; (3) período confirmado; (4) metodologia confirmada quando necessária; (5) consequência definida; (6) nenhum conflito jurídico bloqueante. Qualquer falha → `NO`.

**Nota de materialidade sobre C10 (vigência do Decreto 3.048/99):** quando o conteúdo operativo da regra é idêntico dos dois lados do marco (ex.: ruído 90 dB(A) no Dec. 2.172/97 e no Dec. 3.048/99), a incerteza de ±45 dias não altera a consequência e não bloqueia o seed; C10 permanece aberto no registro de conflitos.

---

## 1. REGRAS GERAIS E TRANSVERSAIS

| rule_key | authority_type | legal_effect_scope | valid_from | valid_to | primary_source | conflicts | automation_level | seed_ready |
|---|---|---|---|---|---|---|---|---|
| GEN_EFFECTIVE_EXPOSURE | LAW (L2) + STF_PRECEDENT (L7) | INSS_ADMINISTRATIVE, JUDICIAL_RECOGNITION | 29/04/1995 | vigente | Lei 8.213/91, art. 57, caput; Tema 555/STF (item I); IN 128/2022, art. 287 | — | SAFE_TO_AUTOMATE (exigir evidência) | **YES** |
| GEN_PERMANENT_EXPOSURE | DECREE (L3) | INSS_ADMINISTRATIVE | 06/05/1999 | vigente | Dec. 3.048/99, art. 65 (literalidade `PENDING`) | — | SAFE_TO_AUTOMATE | NO |
| GEN_TEMPORAL_RULE | STJ_PRECEDENT (L7) + ADMINISTRATIVE_INSTRUCTION (L4) | JUDICIAL_RECOGNITION, INSS_ADMINISTRATIVE | permanente | — | Tema 694/STJ ✅; IN 128/2022, arts. 292/296/299/301 ✅ | — | SAFE_TO_AUTOMATE | **YES** |
| GEN_TECHNICAL_RESPONSIBLE | LAW (L2) | LTCAT_DOCUMENTATION | 06/05/1999 | vigente | Lei 8.213/91, art. 58, §4º (requisito do responsável confirmado; literalidade dos incisos a–h `PENDING` — afeta conteúdo, não este requisito) | — | SAFE_TO_AUTOMATE (bloqueio de publicação) | **YES** |
| GEN_ANNEX_IV_SCOPE | DECREE (L3) | INSS_ADMINISTRATIVE, HISTORICAL_CLASSIFICATION | 06/05/1999 | vigente | Anexo IV, cabeçalhos 1.0.0 e 3.0.0 — transcrição confirmada ✅ | C12 (Tema 534 — não bloqueia a regra administrativa) | SAFE_TO_AUTOMATE (roteamento) | **YES** — status `RULE_WITH_JUDICIAL_EXCEPTION` |
| GEN_EVIDENCE_BY_PERIOD | LAW + DECREE + ADMINISTRATIVE_INSTRUCTION | LTCAT_DOCUMENTATION | vários | — | Atos por período (ato do PPP 2004 `PENDING`) | C7 | SAFE_TO_AUTOMATE | NO |
| GEN_ENV_CHANGE | ADMINISTRATIVE_INSTRUCTION (L4) | LTCAT_DOCUMENTATION | 28/03/2022 | vigente | IN 128/2022 (arts. exatos `PENDING`) | — | SAFE_TO_AUTOMATE | NO |
| CHEM_NR15_ROUTING | DECREE (L3) + TECHNICAL_STANDARD (L6) | TECHNICAL_ASSESSMENT, INSS_ADMINISTRATIVE | 06/05/1999 | vigente | Anexo IV 1.0.0 ✅ + NR-15 Anexos 11/12/13/13-A (existência confirmada; enquadramento por composto `PENDING` para vários) | — | SAFE_TO_AUTOMATE (roteamento) | NO — dados de enquadramento por composto pendentes |
| EPI_EFFECT_REQUIRES_CONTEXT | Regra interna de governança (derivada de STF_PRECEDENT + STJ_PRECEDENT + ADMINISTRATIVE_INSTRUCTION) | LTCAT_DOCUMENTATION, INSS_ADMINISTRATIVE | — | — | Tema 555/STF; Tema 1.090/STJ; IN 128/2022, art. 290 | C3, C11 (são os disparadores, não bloqueiam a regra de roteamento) | SAFE_TO_AUTOMATE (roteamento para humano) | **YES** |

## 2. RUÍDO

| rule_key | authority_type | legal_effect_scope | valid_from | valid_to | primary_source | conflicts | automation_level | seed_ready |
|---|---|---|---|---|---|---|---|---|
| NOISE_V1 | DECREE (L3) | HISTORICAL_CLASSIFICATION | — | 28/04/1995 | Dec. 83.080/79, Anexo I, 1.1.5 (Planalto ✅); Dec. 53.831/64 (cópia de terceiro — item literal `PENDING`; não bloqueia: ruído consta de ambos) | C4 (imaterial para ruído: presente nos dois anexos) | SAFE_TO_AUTOMATE (categoria) | **YES** |
| NOISE_V2A | LAW (L2) + ADMINISTRATIVE_INSTRUCTION (L4) | INSS_ADMINISTRATIVE, HISTORICAL_CLASSIFICATION | 29/04/1995 | 13/10/1996 | Lei 9.032/95 ✅; IN 128/2022, art. 292 ✅ (80 dB(A)) | — | SAFE_TO_AUTOMATE | **YES** |
| NOISE_V2B | LAW + ADMINISTRATIVE_INSTRUCTION | INSS_ADMINISTRATIVE, HISTORICAL_CLASSIFICATION, LTCAT_DOCUMENTATION | 14/10/1996 | 05/03/1997 | IN 128/2022, art. 292 ✅; MP 1.523/96 → Lei 9.528/97 (exigência de laudo; literalidade da conversão `PENDING` — efeito confirmado pela IN) | — | SAFE_TO_AUTOMATE | **YES** |
| NOISE_V3 | DECREE (L3) | INSS_ADMINISTRATIVE, HISTORICAL_CLASSIFICATION | 06/03/1997 | 05/05/1999 | Dec. 2.172/97 ✅ (90 dB(A)); Tema 694/STJ ✅ | — | SAFE_TO_AUTOMATE | **YES** |
| NOISE_V4 | DECREE (L3) | INSS_ADMINISTRATIVE | 06/05/1999 | 18/11/2003 | Dec. 3.048/99, Anexo IV, 2.0.1 ✅ | C10 (imaterial: limite idêntico 90 dB(A) antes e depois do marco) | SAFE_TO_AUTOMATE | **YES** |
| NOISE_V5 | DECREE (L3) | INSS_ADMINISTRATIVE | 19/11/2003 | 16/10/2013 | Dec. 4.882/2003, item 2.0.1 ✅ (85 dB(A)); Tema 694/STJ (sem retroatividade) ✅ | C5 (interno ao período: NR-15 An. 1 é a remissão — q=5; sem conflito operativo) | SAFE_TO_AUTOMATE | **YES** |
| NOISE_V6 | DECREE (L3) + TECHNICAL_STANDARD (L6) | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 17/10/2013 | 27/03/2022 | Dec. 8.123/2013 (literalidade do item 2.0.1 pós-2013 `PENDING`); NHO-01 | C5 | SAFE_TO_AUTOMATE | NO |
| NOISE_V7 | DECREE + ADMINISTRATIVE_INSTRUCTION | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 28/03/2022 | vigente | IN 128/2022, arts. 290/292 ✅; depende da literalidade do Dec. 8.123/2013 (`PENDING`) | C5 | SAFE_TO_AUTOMATE | NO |
| NOISE_PEAK_RULE | STJ_PRECEDENT (L7) | JUDICIAL_RECOGNITION | 2018 | vigente | Tema 1.083/STJ (REsp 1.886.795/RS) — redação literal `PENDING` | — | AUTOMATE_WITH_HUMAN_CONFIRMATION | NO |
| EPI_NOISE_EXCEPTION | STF_PRECEDENT (L7) + ADMINISTRATIVE_INSTRUCTION (L4) | JUDICIAL_RECOGNITION, INSS_ADMINISTRATIVE | 04/12/2014 (aplicada a períodos anteriores) | vigente | Tema 555/STF, item II ✅; IN 128/2022, art. 290, parágrafo único ✅ | — | SAFE_TO_AUTOMATE (ignorar "EPI eficaz" para 2.0.1) | **YES** |
| NOISE_IMPACTO_AUTONOMO | TECHNICAL_STANDARD (L6) | TECHNICAL_ASSESSMENT | — | — | NR-15 An. 2 (sem item próprio no Anexo IV) | — | NOT_PARAMETERIZED | NO — `NOT_PARAMETERIZED` |

## 3. CALOR

| rule_key | authority_type | legal_effect_scope | valid_from | valid_to | primary_source | conflicts | automation_level | seed_ready |
|---|---|---|---|---|---|---|---|---|
| HEAT_V1 | DECREE (L3) | HISTORICAL_CLASSIFICATION | — | 28/04/1995 | Dec. 83.080/79, Anexo I, 1.1.1 ✅ | C4 (imaterial) | SAFE_TO_AUTOMATE (categoria) | **YES** |
| HEAT_V2 | LAW (L2) | INSS_ADMINISTRATIVE, HISTORICAL_CLASSIFICATION | 29/04/1995 | 05/03/1997 | Lei 9.032/95 ✅ | — | AUTOMATE_WITH_HUMAN_CONFIRMATION | **YES** |
| HEAT_V3 | DECREE (L3) + TECHNICAL_STANDARD (L6) | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT, HISTORICAL_CLASSIFICATION | 06/03/1997 | 05/05/1999 | Dec. 2.172/97 ✅; NR-15 An. 3 (valores confirmados) ✅; TNU PEDIF 0503208-24.2015.4.05.8312 (fonte natural) | C6 | SAFE_TO_AUTOMATE (comparação IBUTG) | **YES** |
| HEAT_V4 | DECREE + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/05/1999 | 16/10/2013 | Dec. 3.048/99, Anexo IV, 2.0.4 ✅ (C1 resolvido); NR-15 An. 3 | C6, C10 (imaterial — regra contínua) | SAFE_TO_AUTOMATE | **YES** — status `RULE_WITH_JUDICIAL_EXCEPTION` (Tema 323/TNU) |
| HEAT_V5 | DECREE + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 17/10/2013 | vigente | Dec. 8.123/2013 (literalidade `PENDING`); NHO-06 | C5, C6 | SAFE_TO_AUTOMATE | NO |

## 4. VIBRAÇÕES

| rule_key | authority_type | legal_effect_scope | valid_from | valid_to | primary_source | conflicts | automation_level | seed_ready |
|---|---|---|---|---|---|---|---|---|
| VIB_V1_QUAL | DECREE (L3) + ADMINISTRATIVE_INSTRUCTION (L4) | HISTORICAL_CLASSIFICATION, INSS_ADMINISTRATIVE | — | 05/03/1997 | IN 128/2022, art. 296, I ✅; Dec. 83.080/79, 1.1.4 ✅ | — | AUTOMATE_WITH_HUMAN_CONFIRMATION | **YES** |
| VIB_V1_QUANT | DECREE + ADMINISTRATIVE_INSTRUCTION | HISTORICAL_CLASSIFICATION, INSS_ADMINISTRATIVE | — | 05/03/1997 | IN 128/2022, art. 296, I ✅ (**120 golpes/min** transcrito na própria IN) | — | SAFE_TO_AUTOMATE | **YES** |
| VIB_V2 | DECREE + TECHNICAL_STANDARD (ISO) | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/03/1997 | 12/08/2014 | IN 128/2022, art. 296, II ✅ (remissão a ISO 2.631/ISO-DIS 5.349); limites numéricos das ISOs não extraídos | — | AUTOMATE_WITH_HUMAN_CONFIRMATION | NO — limites ISO não parametrizados |
| VIB_V3_FACULT | ADMINISTRATIVE_INSTRUCTION + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 10/09/2012 | 12/08/2014 | IN 128/2022, art. 296, III, parte final ✅; NHO-09/10 (limites `PENDING`) | — | AUTOMATE_WITH_HUMAN_CONFIRMATION | NO — limites numéricos pendentes |
| VIB_V4 | ADMINISTRATIVE_INSTRUCTION + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 13/08/2014 | vigente | IN 128/2022, art. 296, III ✅; Portaria MTE 1.297/2014 ✅; Anexo 8 NR-15 (limites numéricos `PENDING`) | C13 | AUTOMATE_WITH_HUMAN_CONFIRMATION | NO — limites numéricos pendentes |
| VIB_QUALIT_PERF | DECREE (L3) | INSS_ADMINISTRATIVE | 06/03/1997 | vigente | Anexo IV, 2.0.2, alínea a ✅ (transcrição literal Planalto: perfuratrizes e marteletes pneumáticos, 25 anos); Tabela 24 02.01.005 ✅ | C13 (não bloqueia o núcleo — perfuratrizes/marteletes) | AUTOMATE_WITH_HUMAN_CONFIRMATION | **YES** — status `RULE_WITH_JUDICIAL_EXCEPTION` |

## 5. AGENTES QUÍMICOS (fichas individuais)

Bloqueios comuns a todas as fichas: códigos individuais da Tabela 24 grupo 01 `PENDING`; Quadro 1 do Anexo 11 da NR-15 por composto `PENDING`; artigos da IN 128/2022 por agente químico (art. 297+) não confirmados individualmente.

| rule_key | authority_type | legal_effect_scope | valid_from | valid_to | primary_source | conflicts | automation_level | seed_ready |
|---|---|---|---|---|---|---|---|---|
| CHEM_ARSENIO | DECREE + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/05/1999 | vigente | Anexo IV, 1.0.1 ✅ | C11 (EPI×IARC 1) | PARTIALLY_PARAMETERIZABLE | NO |
| CHEM_ASBESTO | DECREE + STF_PRECEDENT | INSS_ADMINISTRATIVE, JUDICIAL_RECOGNITION | 06/05/1999 | vigente | Anexo IV, 1.0.2 ✅; ADI 3.406/3.470/STF ✅ | **C11 (bloqueante)** | HUMAN_REVIEW_REQUIRED | NO — `LEGAL_CONFLICT_REQUIRES_REVIEW` |
| CHEM_BENZENO | DECREE + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/05/1999 | vigente | Anexo IV, 1.0.3 ✅; NR-15 An. 13-A ✅; Fundacentro Despacho 24/2020/PRES | **C11 (bloqueante)** | HUMAN_REVIEW_REQUIRED | NO — `LEGAL_CONFLICT_REQUIRES_REVIEW` |
| CHEM_BERILIO | DECREE + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/05/1999 | vigente | Anexo IV, 1.0.4 ✅; enquadramento NR-15 An. 13 `PENDING` | C11 | PARTIALLY_PARAMETERIZABLE | NO |
| CHEM_BROMO | DECREE | INSS_ADMINISTRATIVE | 06/05/1999 | vigente | Anexo IV, 1.0.5 ✅; roteamento NR-15 `PENDING` | — | PARTIALLY_PARAMETERIZABLE | NO |
| CHEM_CADMIO | DECREE + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/05/1999 | vigente | Anexo IV, 1.0.6 ✅; item no Quadro 1 `PENDING` | C11 (IARC 1) | PARTIALLY_PARAMETERIZABLE | NO |
| CHEM_CARVAO_HPA | DECREE | INSS_ADMINISTRATIVE | 06/05/1999 | vigente | Anexo IV, 1.0.7 ✅ | **C11 (bloqueante)** | HUMAN_REVIEW_REQUIRED | NO — `LEGAL_CONFLICT_REQUIRES_REVIEW` |
| CHEM_CHUMBO | DECREE + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/05/1999 | vigente | Anexo IV, 1.0.8 ✅; plumbemia NR-7 por período `PENDING` | — | PARTIALLY_PARAMETERIZABLE | NO |
| CHEM_CLORO_ORG | DECREE | INSS_ADMINISTRATIVE | 06/05/1999 | vigente | Anexo IV, 1.0.9 ✅ | C11 (cloreto de vinila IARC 1) | HUMAN_REVIEW_REQUIRED | NO |
| CHEM_CROMO | DECREE + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/05/1999 | vigente | Anexo IV, 1.0.10 ✅; enquadramento por valência `PENDING` | C11 (Cr VI) | HUMAN_REVIEW_REQUIRED | NO |
| CHEM_CS2 | DECREE + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/05/1999 | vigente | Anexo IV, 1.0.11 ✅; valor do LT (Quadro 1) `PENDING` | — | PARAMETERIZABLE (após limite) | NO — valor numérico pendente |
| CHEM_FOSFORO | DECREE + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/05/1999 | vigente | Anexo IV, 1.0.12 ✅; valor `PENDING` | — | PARTIALLY_PARAMETERIZABLE | NO |
| CHEM_IODO | DECREE + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/05/1999 | vigente | Anexo IV, 1.0.13 ✅; valor `PENDING` | — | PARAMETERIZABLE (após limite) | NO — valor numérico pendente |
| CHEM_MANGANES | DECREE + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/05/1999 | vigente | Anexo IV, 1.0.14 ✅; valor `PENDING` | — | PARTIALLY_PARAMETERIZABLE | NO |
| CHEM_MERCURIO | DECREE + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/05/1999 | vigente | Anexo IV, 1.0.15 ✅; valor `PENDING` | — | PARTIALLY_PARAMETERIZABLE | NO |
| CHEM_NIQUEL | DECREE + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/05/1999 | vigente | Anexo IV, 1.0.16 ✅; forma química `PENDING` | C11 (IARC 1) | HUMAN_REVIEW_REQUIRED | NO |
| CHEM_PETROLEO_HPA | DECREE | INSS_ADMINISTRATIVE | 06/05/1999 | vigente | Anexo IV, 1.0.17 ✅ | **C11 (bloqueante)** | HUMAN_REVIEW_REQUIRED | NO — `LEGAL_CONFLICT_REQUIRES_REVIEW` |
| CHEM_SILICA | DECREE + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/05/1999 | vigente | Anexo IV, 1.0.18 ✅; NR-15 An. 12 (fórmula %SiO₂) ✅ | tensão fibrogênico × IARC 1 `PENDING` | PARTIALLY_PARAMETERIZABLE | NO |
| CHEM_OUTROS_G1 | DECREE + TECHNICAL_STANDARD | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/05/1999 | vigente | Anexo IV, 1.0.19 Grupo I ✅; Quadro 1 por substância `PENDING` | — | PARTIALLY_PARAMETERIZABLE | NO |
| CHEM_OUTROS_G2 | DECREE | INSS_ADMINISTRATIVE, JUDICIAL_RECOGNITION | 06/05/1999 | vigente | Anexo IV, 1.0.19 Grupo II ✅; LINACH (Portaria Interm. 9/2014) ✅ | **C11 (bloqueante)** | HUMAN_REVIEW_REQUIRED | NO — `LEGAL_CONFLICT_REQUIRES_REVIEW` |
| CHEM_GENERIC_UNIDENTIFIED | — | — | — | — | Regra GEN-005: sem substância/CAS identificada | — | NOT_PARAMETERIZED | NO — `NOT_PARAMETERIZED` |

## 6. AGENTES BIOLÓGICOS

| rule_key | authority_type | legal_effect_scope | valid_from | valid_to | primary_source | conflicts | automation_level | seed_ready |
|---|---|---|---|---|---|---|---|---|
| BIO_V1 | DECREE + ADMINISTRATIVE_INSTRUCTION | HISTORICAL_CLASSIFICATION, INSS_ADMINISTRATIVE | — | 05/03/1997 | IN 128/2022, art. 299, I ✅ (presunção para qualquer estabelecimento) | — | AUTOMATE_WITH_HUMAN_CONFIRMATION | **YES** |
| BIO_V2 | DECREE (L3) | INSS_ADMINISTRATIVE | 06/03/1997 | vigente | Anexo IV, 3.0.1 (alíneas a–g) ✅; Tabela 24 03.01.001–007 ✅ | C14 (aberto — afeta apenas atividades **fora** do rol; dentro do rol a consequência está definida) | PARTIALLY_PARAMETERIZABLE | **YES** — status `RULE_WITH_JUDICIAL_EXCEPTION`; fora do rol → `REQUIRES_LEGAL_REVIEW` |

## 7. DEMAIS AGENTES DO ANEXO IV

| rule_key | authority_type | legal_effect_scope | valid_from | valid_to | primary_source | conflicts | automation_level | seed_ready |
|---|---|---|---|---|---|---|---|---|
| RAD_ION_RULE | DECREE + TECHNICAL_STANDARD (CNEN) | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | 06/05/1999 | vigente | Anexo IV, 2.0.3 ✅ (rol de atividades); dosimetria CNEN; Tabela 24 02.01.006–013 ✅ (condicional 1:N — ver nota §7.1) | — | PARTIALLY_PARAMETERIZABLE | **YES** |
| PRESS_HIPER_RULE | DECREE | INSS_ADMINISTRATIVE | 06/05/1999 | vigente | Anexo IV, 2.0.5 ✅ (3 atividades); Tabela 24 02.01.015–018 ✅ (condicional 1:N — ver nota §7.1) | — | PARTIALLY_PARAMETERIZABLE | **YES** |
| ASSOC_GENERAL | DECREE | INSS_ADMINISTRATIVE | 19/11/2003 | vigente | Dec. 4.882/2003, item 4.0.0 ✅ (menor tempo) | — | AUTOMATE_WITH_HUMAN_CONFIRMATION | **YES** |
| ASSOC_MIN_SUB_AF | DECREE | INSS_ADMINISTRATIVE | 06/05/1999 | vigente | Anexo IV, 4.0.1 ✅ (**20 anos**); Tabela 24 04.01.001 ✅ | — | PARTIALLY_PARAMETERIZABLE | **YES** |
| ASSOC_MIN_SUB_FP | DECREE | INSS_ADMINISTRATIVE | 06/05/1999 | vigente | Anexo IV, 4.0.2 ✅ (**15 anos**); Tabela 24 04.01.002 ✅ | — | PARTIALLY_PARAMETERIZABLE | **YES** |

**§7.1 — Mapeamentos Tabela 24 resolvidos (revisão 1.1, 23/08/2026):** os 4 mapeamentos antes classificados como parciais foram confirmados na consulta pública oficial das Tabelas do eSocial (DTINICIO 01/01/2014, sem data-fim). `RAD_ION_RULE` e `PRESS_HIPER_RULE` adotam **mapeamento condicional 1:N** (`mapping_condition` por atividade/cenário): RAD_ION → 02.01.006–013 (8 códigos; o genérico 02.01.006 nunca é selecionado silenciosamente) e PRESS_HIPER → 02.01.016/017/018 por atividade + 02.01.015 genérico (sempre com confirmação humana). `ASSOC_MIN_SUB_AF` → 04.01.001 e `ASSOC_MIN_SUB_FP` → 04.01.002 (1:1 confirmados). Detalhamento completo em `seed-ready-rules-review-v1.md` (revisão 1.1). **Não resta nenhum `PARTIAL_ESOCIAL_MAPPING` nesta matriz.**

## 8. AGENTES HISTÓRICOS FORA DO ANEXO IV E EXCEÇÕES JUDICIAIS

| rule_key | authority_type | legal_effect_scope | valid_from | valid_to | primary_source | conflicts | automation_level | seed_ready |
|---|---|---|---|---|---|---|---|---|
| HIST_FRIO | DECREE + ADMINISTRATIVE_INSTRUCTION | HISTORICAL_CLASSIFICATION | — | 05/03/1997 (Zonas A/B) | Dec. 83.080/79, 1.1.2 ✅ (câmaras frigoríficas); IN 128/2022, art. 301 ✅ | C4 | PARTIALLY_PARAMETERIZABLE (Zonas A/B) | **YES** (Zonas A/B); Zona C sempre `EXCEPTIONAL_LEGAL_OVERRIDE` |
| HIST_UMIDADE | DECREE + ADMINISTRATIVE_INSTRUCTION | HISTORICAL_CLASSIFICATION | — | 05/03/1997 | Dec. 53.831/64, 1.1.3 (**cópia de terceiro — literal `PENDING`**); art. 301 IN 128 ✅ | C4; nenhum precedente pós-97 localizado | HUMAN_REVIEW_REQUIRED | NO |
| HIST_ELETRICIDADE | DECREE + TNU_PRECEDENT | HISTORICAL_CLASSIFICATION, JUDICIAL_RECOGNITION | — | 05/03/1997 (Zonas A/B) | Dec. 53.831/64, 1.1.8 (**literal `PENDING`**); art. 301 IN 128 ✅ | C15 (Tema 159 literal) | HUMAN_REVIEW_REQUIRED | NO |
| HIST_RAD_NION | DECREE + OTHER_JUDICIAL_PRECEDENT | HISTORICAL_CLASSIFICATION, JUDICIAL_RECOGNITION | — | 05/03/1997 (Zonas A/B) | Dec. 53.831/64, 1.1.4 (**literal `PENDING`**); art. 301 IN 128 ✅ | C4; TRF4 disperso `PENDING` | HUMAN_REVIEW_REQUIRED | NO |
| HIST_INFRA_ULTRA | — | — | — | — | Ausente do Anexo IV; Tabela 23 (NR-9), não 24 | — | NOT_PARAMETERIZED | NO — `NOT_PARAMETERIZED` |
| EXCEPTIONAL_LEGAL_OVERRIDE | ESOCIAL_RULE (L5) + ADMINISTRATIVE_INSTRUCTION (L4) | ESOCIAL_VALIDATION, JUDICIAL_RECOGNITION | 06/03/1997 | vigente | Tabela 24, 05.01.001 ✅ (processo obrigatório no S-2240); IN 128/2022, art. 301 ✅ | — | HUMAN_DECISION_REQUIRED (sempre) | **YES** (estrutura da regra; cada aplicação é validada por humano) |
| ELEC_TNU_159 | TNU_PRECEDENT (L7) | JUDICIAL_RECOGNITION (**somente**) | 06/03/1997 | vigente | TNU Tema 159 — possibilidade de reconhecimento de especialidade por eletricidade >250 V após o Dec. 2.172/97 (**inteiro teor `PENDING`** — C15) | C15 | NOT aplicável a automação | NO |
| ELEC_TNU_210 | TNU_PRECEDENT (L7) | JUDICIAL_RECOGNITION (**somente**) | dez/2019 | vigente | TNU Tema 210 — PEDILEF 0501567-42.2017.4.05.8405/RN, inteiro teor ✅ (habitualidade por probabilidade da exposição e indissociabilidade; sem tempo mínimo por jornada) | — | NOT aplicável a automação (documenta exceção) | **YES** (como exceção judicial documentada — nunca como regra administrativa) |

## 9. REGRAS DE EPI/EPC (camadas separadas — ver §5 do manifesto v2.1)

| rule_key | authority_type | legal_effect_scope | valid_from | valid_to | primary_source | conflicts | automation_level | seed_ready |
|---|---|---|---|---|---|---|---|---|
| EPI_TEMA_555_GENERAL | STF_PRECEDENT (L7) | JUDICIAL_RECOGNITION | 04/12/2014 | vigente | Tema 555/STF, item I (redação literal no portal STF `PENDING`) | C3 | AUTOMATE_WITH_HUMAN_CONFIRMATION | NO |
| EPI_TEMA_1090 | STJ_PRECEDENT (L7) | JUDICIAL_RECOGNITION | 29/04/2025 | vigente | Tema 1.090/STJ (tese literal e alcance exatos `PENDING`) | **C11 (bloqueante)** | NOT aplicável enquanto C11 aberto | NO — `LEGAL_CONFLICT_REQUIRES_REVIEW` |
| EPI_CANCERIGENOS | STF_PRECEDENT + STJ_PRECEDENT + TECHNICAL_STANDARD (Fundacentro) | JUDICIAL_RECOGNITION, TECHNICAL_ASSESSMENT | — | — | Tema 555 × Tema 1.090 × Despacho Fundacentro 24/2020/PRES × TRF2/LINACH | **C11, C3 (bloqueantes)** | HUMAN_DECISION_REQUIRED | NO — `LEGAL_CONFLICT_REQUIRES_REVIEW` |
| EPI_BIOLOGICOS | TNU_PRECEDENT (em formação) | JUDICIAL_RECOGNITION | — | — | Debate TNU em curso (2026) — sem tese firmada | **bloqueante (não pacificado)** | HUMAN_DECISION_REQUIRED | NO — `LEGAL_CONFLICT_REQUIRES_REVIEW` |
| EPC_GENERAL_RULE | LAW + ADMINISTRATIVE_INSTRUCTION | INSS_ADMINISTRATIVE, TECHNICAL_ASSESSMENT | — | vigente | Eficácia de EPC (eliminação/neutralização); dispositivo exato na IN 128 `PENDING` | — | AUTOMATE_WITH_HUMAN_CONFIRMATION | NO |

---

## 10. CONSOLIDAÇÃO

| Categoria | Regras | Quantidade |
|---|---|---|
| **SEED_READY** | GEN_EFFECTIVE_EXPOSURE, GEN_TEMPORAL_RULE, GEN_TECHNICAL_RESPONSIBLE, GEN_ANNEX_IV_SCOPE, EPI_EFFECT_REQUIRES_CONTEXT, EPI_NOISE_EXCEPTION, NOISE_V1, NOISE_V2A, NOISE_V2B, NOISE_V3, NOISE_V4, NOISE_V5, HEAT_V1, HEAT_V2, HEAT_V3, HEAT_V4, VIB_V1_QUAL, VIB_V1_QUANT, VIB_QUALIT_PERF, BIO_V1, BIO_V2, RAD_ION_RULE, PRESS_HIPER_RULE, ASSOC_GENERAL, ASSOC_MIN_SUB_AF, ASSOC_MIN_SUB_FP, HIST_FRIO, EXCEPTIONAL_LEGAL_OVERRIDE, ELEC_TNU_210 | **29** |
| **HUMAN_REVIEW** (seed_ready=NO, sem conflito bloqueante) | GEN_PERMANENT_EXPOSURE, GEN_EVIDENCE_BY_PERIOD, GEN_ENV_CHANGE, CHEM_NR15_ROUTING, NOISE_V6, NOISE_V7, NOISE_PEAK_RULE, HEAT_V5, VIB_V2, VIB_V3_FACULT, VIB_V4, CHEM_ARSENIO, CHEM_BERILIO, CHEM_BROMO, CHEM_CADMIO, CHEM_CHUMBO, CHEM_CLORO_ORG, CHEM_CROMO, CHEM_CS2, CHEM_FOSFORO, CHEM_IODO, CHEM_MANGANES, CHEM_MERCURIO, CHEM_NIQUEL, CHEM_SILICA, CHEM_OUTROS_G1, HIST_UMIDADE, HIST_ELETRICIDADE, HIST_RAD_NION, ELEC_TNU_159, EPI_TEMA_555_GENERAL, EPC_GENERAL_RULE | **32** |
| **BLOCKED_BY_LEGAL_CONFLICT** | EPI_TEMA_1090 (C11), EPI_CANCERIGENOS (C11/C3), EPI_BIOLOGICOS (não pacificado), CHEM_ASBESTO (C11), CHEM_BENZENO (C11), CHEM_CARVAO_HPA (C11), CHEM_PETROLEO_HPA (C11), CHEM_OUTROS_G2 (C11) | **8** |
| **NOT_PARAMETERIZED** | NOISE_IMPACTO_AUTONOMO, HIST_INFRA_ULTRA, CHEM_GENERIC_UNIDENTIFIED | **3** |
| **Total de regras na matriz** | | **72** |

**Observações finais:**
1. Dentre as 29 SEED_READY, 4 carregam status `RULE_WITH_JUDICIAL_EXCEPTION` (GEN_ANNEX_IV_SCOPE, HEAT_V4, VIB_QUALIT_PERF, BIO_V2) e 1 é uma exceção judicial documentada (ELEC_TNU_210) — o seed dessas regras deve incluir o registro da exceção e o desvio obrigatório para revisão humana nos casos da órbita da exceção.
2. Nenhuma regra de EPI para cancerígenos ou biológicos é automatizável enquanto C11 e o debate TNU permanecerem abertos.
3. (Revisão 1.1) Os 4 mapeamentos parciais da Tabela 24 foram resolvidos na fonte oficial — ver nota §7.1. **Zero** ocorrências de `PARTIAL_ESOCIAL_MAPPING`. A estrutura futura `agent_mappings` deverá suportar `mapping_condition` (1 agente interno → N códigos externos condicionados por atividade, processo, cenário, vigência e evidência).
4. Esta matriz **não autoriza seed**. A Fase 2B permanece bloqueada até aprovação nominal do manifesto v2.1 + desta matriz.
