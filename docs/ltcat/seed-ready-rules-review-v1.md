# SEED-READY RULES — REVISÃO NOMINAL PARA APROVAÇÃO
## Fase 2A.2 — Aprovação nominal das regras `seed_ready = YES` (v1)

| Campo | Valor |
|---|---|
| Versão | 1.0 |
| Data | 23/08/2026 |
| Base | `manifesto-regras-juridicas-v2.1.md` (normalização) + `rule-implementation-readiness-v1.md` (matriz de prontidão) |
| Escopo | Somente as **29 regras** classificadas `seed_ready = YES` na matriz v1 |
| Status | Documento de revisão nominal — **NÃO autoriza seed, migration, tabela, código, `resolveLegalRule` ou alteração de frontend** |

---

## 0. AVISOS VINCULANTES DESTA REVISÃO

### 0.1 `seed_ready` ≠ decisão automática

> `seed_ready = YES` significa **apenas** que a regra pode ser **armazenada de forma confiável** no banco (fonte primária, dispositivo, período, metodologia quando exigida e consequência confirmados; sem conflito jurídico bloqueante).
>
> **Não significa** que a regra esteja liberada para decisão automática. Uma regra pode ter `seed_ready = YES` e, simultaneamente, `automation_level = HUMAN_DECISION_REQUIRED`.

### 0.2 Vocabulário de resultados do motor (futuro)

| Resultado | Significado |
|---|---|
| `RULE_MATCHED` | A regra foi localizada e seus critérios estruturais foram satisfeitos. **Nunca é sinônimo automático de aposentadoria especial.** |
| `THRESHOLD_EXCEEDED` | Parâmetro medido supera o limite da regra aplicável (mesma unidade e metodologia). |
| `THRESHOLD_NOT_EXCEEDED` | Parâmetro medido não supera o limite. |
| `REQUIRES_HUMAN_CONFIRMATION` | O resultado depende de confirmação humana antes de qualquer uso. |
| `RULE_WITH_JUDICIAL_EXCEPTION` | Regra ordinária válida, mas o caso está na órbita de exceção jurisprudencial documentada → desvio obrigatório para humano. |
| `LEGAL_CONFLICT_REQUIRES_REVIEW` | Conflito jurídico aberto incide sobre o caso → revisão jurídica obrigatória. |
| `INCONCLUSIVE` | Dados insuficientes ou incompatíveis para aplicar a regra. |

**Vedação permanente:** `RULE_MATCHED` e `THRESHOLD_EXCEEDED` jamais geram, isoladamente, conclusão de "tempo especial reconhecido". A conclusão final de qualquer documento é sempre `HUMAN_DECISION_REQUIRED`.

### 0.3 Checksum jurídico — conjunto canônico (`CANONICAL_SET_V1`)

Cada regra declara, ao final, sua **representação canônica**. O hash futuro será calculado sobre JSON canônico (chaves ordenadas alfabeticamente, datas ISO `YYYY-MM-DD`, texto Unicode NFC, campos inaplicáveis como `null`), contendo obrigatoriamente:

```
rule_key · rule_version · domain · internal_agent_code ·
authority_type · authority_level · legal_effect_scope[] ·
valid_from · valid_to · temporal_change_type[] ·
primary_source{norm, device, url} · complementary_source{ref, device} ·
judicial_precedent{ref, scope, status} ·
criterion · evaluation_type · methodology · parameter · operator · threshold · unit ·
epc_behavior · epi_behavior · outcome_spec ·
mappings[]{anexo_iv_code, table24_code, valid_from, valid_to}
```

Qualquer alteração de campo do conjunto gera **nova versão da regra** (`rule_version + 1`), nunca sobrescrita da versão anterior. Campos fora do conjunto (notas editoriais, exemplos) não afetam o hash.

### 0.4 Marcadores utilizados

- `NOT_APPLICABLE` — campo estruturalmente inaplicável à regra (nunca deixado vazio).
- `LITERALIDADE_PENDENTE` — artigo/dispositivo **confirmado** em fonte primária, mas sem transcrição literal nesta rodada; a literalidade será registrada na entrada do seed, sem alterar o fundamento.
- `PENDING` (em mapeamentos) — código não extraído da fonte oficial; mapeamento é **externo e versionado**, não identidade do agente; não bloqueia a regra quando assim registrado na matriz.

---
---

# REGRAS GERAIS E TRANSVERSAIS (R01–R06)

---

## R01 — GEN_EFFECTIVE_EXPOSURE

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `GEN_EFFECTIVE_EXPOSURE` |
| internal_agent_code | `GEN_CORE` (transversal — não é agente) |
| Nome | Exposição efetiva como pressuposto da atividade especial |
| Categoria | REGRA_GERAL |
| authority_type | `LAW` + `STF_PRECEDENT` |
| authority_level | `L2_LAW` (âncora normativa) · `L7_JUDICIAL_BINDING` (confirmação interpretativa) |
| legal_effect_scope | `INSS_ADMINISTRATIVE`, `JUDICIAL_RECOGNITION` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1995-04-29 |
| valid_to | vigente (sem termo final) |
| temporal_change_type | `CLASSIFICATION_RULE_CHANGE` |
| Justificativa do marco inicial | Lei 9.032/1995 extingue o enquadramento por categoria profissional e passa a exigir comprovação da **efetiva exposição** ao agente nocivo |
| Justificativa do marco final | Paradigma vigente; nenhuma norma posterior restituiu presunção por categoria |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Lei 8.213/1991 |
| Dispositivo exato | Art. 57, caput |
| Transcrição literal (trecho indispensável) | "A aposentadoria especial será devida (...) ao segurado que tiver trabalhado sujeito a condições especiais que prejudiquem a saúde ou a integridade física, durante 15 (quinze), 20 (vinte) ou 25 (vinte e cinco) anos, conforme dispuser a lei." (caput — redação corrente no Planalto) |
| URL oficial | https://www.planalto.gov.br/ccivil_03/leis/l8213cons.htm |
| Norma complementar | IN PRES/INSS 128/2022, art. 287 (critérios qualitativo/quantitativo) — https://www.in.gov.br (DOU edição 60, Seção 1, p. 132, 29/03/2022) |
| Precedente judicial | Tema 555/STF (RE 664.335/SC), item I — efetiva exposição (literalidade no portal STF: `LITERALIDADE_PENDENTE`) |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: EVIDENCE_OF_EFFECTIVE_EXPOSURE
evaluation_type: DOCUMENTAL
methodology: NOT_APPLICABLE
parameter: effective_exposure_evidence   # LTCAT/PPP com agente identificado nominalmente
operator: REQUIRES_PRESENT
threshold: NOT_APPLICABLE
unit: NOT_APPLICABLE
epc_behavior: NOT_APPLICABLE
epi_behavior: NOT_APPLICABLE
outcome_spec: evidência presente e nominal -> RULE_MATCHED (habilita resolução da regra do agente); ausente ou genérica -> INCONCLUSIVE
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `GEN_CORE` |
| Código Anexo IV | NOT_APPLICABLE |
| Descrição Anexo IV | NOT_APPLICABLE |
| Código Tabela 24 | NOT_APPLICABLE |
| Descrição oficial Tabela 24 | NOT_APPLICABLE |
| Vigências dos mapeamentos | NOT_APPLICABLE |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: SAFE_TO_AUTOMATE          # verificação de presença de evidência
human_confirmation_required: NO             # para a verificação estrutural; o mérito do agente segue a regra própria
judicial_exception: NO
legal_conflict: NONE
engine_allowed_actions: [verificar presença de evidência nominal de exposição, bloquear documento sem evidência, rotear para a regra do agente]
engine_forbidden_actions: [presumir exposição por categoria/ambiente (pós-29/04/1995), concluir especialidade, equiparar RULE_MATCHED a aposentadoria especial]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` · `INCONCLUSIVE` · `REQUIRES_HUMAN_CONFIRMATION` (evidência ambígua/divergente)

### EXEMPLOS
- **Caso positivo:** LTCAT de 2010 identifica "ruído contínuo — NEN 88 dB(A)" com responsável técnico → regra localizada → `RULE_MATCHED` → motor prossegue para `NOISE_V5`.
- **Caso negativo:** Período 1998–2002 sem qualquer documento de comprovação de exposição → `INCONCLUSIVE` (bloqueio por ausência de evidência).
- **Caso limítrofe:** PPP declara genericamente "exposto a agentes químicos" sem substância/CAS → `REQUIRES_HUMAN_CONFIRMATION` (evidência não nominal — ver GEN-005).

### CHECKSUM JURÍDICO
```
GEN_EFFECTIVE_EXPOSURE|v1|SOCIAL_SECURITY|GEN_CORE|LAW+STF_PRECEDENT|L2+L7|INSS_ADMINISTRATIVE+JUDICIAL_RECOGNITION|1995-04-29|null|CLASSIFICATION_RULE_CHANGE|Lei 8.213/1991#art.57-caput#planalto.gov.br/ccivil_03/leis/l8213cons.htm|IN 128/2022#art.287|Tema 555/STF#item-I#CONFIRMED_CONTENT|EVIDENCE_OF_EFFECTIVE_EXPOSURE|DOCUMENTAL|null|effective_exposure_evidence|REQUIRES_PRESENT|null|null|null|null|evidence->RULE_MATCHED
```
Campos: `CANONICAL_SET_V1` (§0.3).

---

## R02 — GEN_TEMPORAL_RULE

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `GEN_TEMPORAL_RULE` |
| internal_agent_code | `GEN_CORE` (transversal) |
| Nome | Regra temporal (tempus regit actum) — legislação da época da exposição |
| Categoria | REGRA_GERAL |
| authority_type | `STJ_PRECEDENT` + `ADMINISTRATIVE_INSTRUCTION` |
| authority_level | `L7_JUDICIAL_BINDING` · `L4_ADMINISTRATIVE` |
| legal_effect_scope | `JUDICIAL_RECOGNITION`, `INSS_ADMINISTRATIVE` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | permanente (sem marco inicial — princípio) |
| valid_to | vigente |
| temporal_change_type | `JUDICIAL_INTERPRETATION_CHANGE` (consagração repetitiva em 14/05/2014 — Tema 694/STJ) |
| Justificativa do marco inicial | Princípio permanente do Direito Previdenciário; consagrado repetitivo pelo Tema 694/STJ |
| Justificativa do marco final | Sem termo; reafirmado administrativamente pelos sub-períodos expressos da IN 128/2022 |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Tema 694/STJ (repetitivo) |
| Dispositivo exato | Tese repetitiva do Tema 694 |
| Transcrição literal | `LITERALIDADE_PENDENTE` — conteúdo confirmado: na aposentadoria especial, aplica-se a legislação vigente **na data da prestação do serviço** (vedada a aplicação retroativa de limite posterior — ex.: 85 dB(A)) |
| URL oficial | https://scon.stj.jus.br (Repetitivos — Tema 694) |
| Norma complementar | IN PRES/INSS 128/2022, arts. 292, 296, 299 e 301 (sub-períodos expressos = confirmação administrativa do princípio) |
| Precedente judicial | O próprio fundamento (Tema 694/STJ) |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: DATE_BASED_RULE_RESOLUTION
evaluation_type: TEMPORAL_RESOLUTION
methodology: NOT_APPLICABLE
parameter: exposure_period              # intervalo de datas da exposição
operator: BETWEEN                        # valid_from <= exposição <= valid_to
threshold: NOT_APPLICABLE
unit: date (ISO)
epc_behavior: NOT_APPLICABLE
epi_behavior: NOT_APPLICABLE
outcome_spec: período contido em uma versão de regra -> RULE_MATCHED (roteamento); lacuna/sobreposição de vigência -> INCONCLUSIVE
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `GEN_CORE` |
| Código Anexo IV | NOT_APPLICABLE |
| Descrição Anexo IV | NOT_APPLICABLE |
| Código Tabela 24 | NOT_APPLICABLE |
| Descrição oficial Tabela 24 | NOT_APPLICABLE |
| Vigências dos mapeamentos | NOT_APPLICABLE |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: SAFE_TO_AUTOMATE
human_confirmation_required: NO
judicial_exception: NO
legal_conflict: NONE
engine_allowed_actions: [selecionar a versão da regra pela data da exposição, rejeitar aplicação retroativa, sinalizar lacunas de vigência]
engine_forbidden_actions: [aplicar regra atual a período histórico, interpolar limites entre versões, presumir vigência não documentada]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` (roteamento) · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** Exposição a ruído em 2000 → motor seleciona `NOISE_V4` (90 dB(A)) → `RULE_MATCHED` (roteamento temporal).
- **Caso negativo:** Tentativa de aplicar 85 dB(A) a exposição de 2000 → resolução impede: regra do período é 90 dB(A) → `RULE_MATCHED` para `NOISE_V4`; resultado de comparação segue `NOISE_V4` (Tema 694/STJ).
- **Caso limítrofe:** Período cruza 19/11/2003 (marco 90→85) sem data exata de medição → `INCONCLUSIVE` (segmentar o período ou obter data).

### CHECKSUM JURÍDICO
```
GEN_TEMPORAL_RULE|v1|SOCIAL_SECURITY|GEN_CORE|STJ_PRECEDENT+ADMINISTRATIVE_INSTRUCTION|L7+L4|JUDICIAL_RECOGNITION+INSS_ADMINISTRATIVE|null|null|JUDICIAL_INTERPRETATION_CHANGE|Tema 694/STJ#tese#scon.stj.jus.br|IN 128/2022#arts.292,296,299,301|null|DATE_BASED_RULE_RESOLUTION|TEMPORAL_RESOLUTION|null|exposure_period|BETWEEN|null|date|null|null|period->RULE_MATCHED(routing)
```

---

## R03 — GEN_TECHNICAL_RESPONSIBLE

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `GEN_TECHNICAL_RESPONSIBLE` |
| internal_agent_code | `GEN_CORE` (transversal) |
| Nome | Responsável técnico habilitado no LTCAT (médico do trabalho ou engenheiro de segurança do trabalho) |
| Categoria | REGRA_GERAL — DOCUMENTAÇÃO |
| authority_type | `LAW` |
| authority_level | `L2_LAW` |
| legal_effect_scope | `LTCAT_DOCUMENTATION` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1999-05-06 |
| valid_to | vigente |
| temporal_change_type | `DOCUMENTATION_REQUIREMENT_CHANGE` |
| Justificativa do marco inicial | Marco convencionado na matriz (consolidação do RPS — Dec. 3.048/99); o requisito material existe desde a Lei 8.213/1991, art. 58 |
| Justificativa do marco final | Requisito vigente sem revogação |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Lei 8.213/1991 |
| Dispositivo exato | Art. 58, §4º |
| Transcrição literal | `LITERALIDADE_PENDENTE` (incisos a–h) — requisito do responsável (médico do trabalho ou engenheiro de segurança do trabalho) **confirmado** |
| URL oficial | https://www.planalto.gov.br/ccivil_03/leis/l8213cons.htm |
| Norma complementar | IN PRES/INSS 128/2022 (capítulo da atividade especial, arts. 260–302) |
| Precedente judicial | NOT_APPLICABLE |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: MANDATORY_TECHNICAL_RESPONSIBLE
evaluation_type: DOCUMENTAL
methodology: NOT_APPLICABLE
parameter: technical_responsible        # {nome, CPF, conselho, numero_registro, habilitacao}
operator: PRESENT_AND_VALID
threshold: NOT_APPLICABLE
unit: NOT_APPLICABLE
epc_behavior: NOT_APPLICABLE
epi_behavior: NOT_APPLICABLE
outcome_spec: responsável completo e habilitado -> RULE_MATCHED; ausente/incompleto -> INCONCLUSIVE com bloqueio de publicação
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `GEN_CORE` |
| Código Anexo IV | NOT_APPLICABLE |
| Descrição Anexo IV | NOT_APPLICABLE |
| Código Tabela 24 | NOT_APPLICABLE |
| Descrição oficial Tabela 24 | NOT_APPLICABLE |
| Vigências dos mapeamentos | NOT_APPLICABLE |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: SAFE_TO_AUTOMATE        # bloqueio de publicação
human_confirmation_required: NO
judicial_exception: NO
legal_conflict: NONE
engine_allowed_actions: [verificar presença e completude do responsável técnico, bloquear publicação do documento]
engine_forbidden_actions: [validar mérito da habilitação junto a conselhos, aceitar responsável sem identificação completa, concluir especialidade]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` · `INCONCLUSIVE` (com bloqueio) · `REQUIRES_HUMAN_CONFIRMATION` (dados divergentes)

### EXEMPLOS
- **Caso positivo:** LTCAT assinado por engenheiro de segurança com nome, CPF e nº de registro → `RULE_MATCHED` → documento apto a prosseguir.
- **Caso negativo:** LTCAT sem identificação de responsável → `INCONCLUSIVE` → **bloqueio de publicação**.
- **Caso limítrofe:** Responsável identificado, mas conselho/registro divergentes entre LTCAT e PPP → `REQUIRES_HUMAN_CONFIRMATION`.

### CHECKSUM JURÍDICO
```
GEN_TECHNICAL_RESPONSIBLE|v1|SOCIAL_SECURITY|GEN_CORE|LAW|L2|LTCAT_DOCUMENTATION|1999-05-06|null|DOCUMENTATION_REQUIREMENT_CHANGE|Lei 8.213/1991#art.58-§4º#planalto.gov.br/ccivil_03/leis/l8213cons.htm|IN 128/2022#arts.260-302|null|MANDATORY_TECHNICAL_RESPONSIBLE|DOCUMENTAL|null|technical_responsible|PRESENT_AND_VALID|null|null|null|null|complete->RULE_MATCHED;missing->BLOCKED
```

---

## R04 — GEN_ANNEX_IV_SCOPE

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `GEN_ANNEX_IV_SCOPE` |
| internal_agent_code | `GEN_CORE` (transversal) |
| Nome | Rol de agentes do Anexo IV exaustivo; atividades exemplificativas (químicos) / fechadas na letra (biológicos) |
| Categoria | REGRA_GERAL — CLASSIFICAÇÃO |
| authority_type | `DECREE` |
| authority_level | `L3_DECREE` |
| legal_effect_scope | `INSS_ADMINISTRATIVE`, `HISTORICAL_CLASSIFICATION` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1999-05-06 |
| valid_to | vigente |
| temporal_change_type | `CLASSIFICATION_RULE_CHANGE`, `AGENT_LIST_CHANGE` |
| Justificativa do marco inicial | Decreto 3.048/1999 institui o Anexo IV unificado com rol exaustivo de agentes (início exato de vigência registrado no conflito C10 — ±45 dias, imaterial para esta regra) |
| Justificativa do marco final | Estrutura vigente (com alterações posteriores mapeadas item a item) |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Decreto 3.048/1999 (RPS), Anexo IV |
| Dispositivo exato | Cabeçalhos 1.0.0 e 3.0.0 |
| Transcrição literal (trecho indispensável) | Cabeçalho 1.0.0: "O que determina o direito ao benefício é a exposição do trabalhador ao agente nocivo presente no ambiente de trabalho e no processo produtivo, em nível de concentração superior aos limites de tolerância estabelecidos. O rol de agentes nocivos é exaustivo, enquanto que as atividades listadas, nas quais pode haver a exposição, é exemplificativa." · Cabeçalho 3.0.0: exposição "unicamente nas atividades relacionadas" |
| URL oficial | https://www.planalto.gov.br/ccivil_03/decreto/d3048compilado.htm |
| Norma complementar | Decreto 3.265/1999 (redação do cabeçalho transcrita) |
| Precedente judicial | Tema 534/STJ (rol exemplificativo) — existência confirmada; texto integral/processo de origem `PENDING` (conflito C12 — **não bloqueia** a regra administrativa) |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: AGENT_IN_ANNEX_IV
evaluation_type: CLASSIFICATION_ROUTING
methodology: NOT_APPLICABLE
parameter: agent_identity               # substância/agente nominado (nome/CAS)
operator: LISTED_IN                      # rol exaustivo do Anexo IV
threshold: NOT_APPLICABLE
unit: NOT_APPLICABLE
epc_behavior: NOT_APPLICABLE
epi_behavior: NOT_APPLICABLE
outcome_spec: agente constante do Anexo IV -> RULE_MATCHED (roteamento para a regra do agente); agente ausente e sem composição comprovada -> NOT_PARAMETERIZED (fora do vocabulário de resultados; rota de revisão) / INCONCLUSIVE
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `GEN_CORE` |
| Código Anexo IV | Cabeçalhos 1.0.0 e 3.0.0 |
| Descrição Anexo IV | "Regras de enquadramento — agentes químicos (1.0.0) e biológicos (3.0.0)" |
| Código Tabela 24 | NOT_APPLICABLE |
| Descrição oficial Tabela 24 | NOT_APPLICABLE |
| Vigências dos mapeamentos | Anexo IV: 1999-05-06 → vigente |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: SAFE_TO_AUTOMATE        # roteamento
human_confirmation_required: NO           # para roteamento; enquadramento fora do rol exige humano
judicial_exception: YES                   # status RULE_WITH_JUDICIAL_EXCEPTION (Tema 534/STJ — C12 aberto, não bloqueante)
legal_conflict: NONE_BLOCKING             # C12 registrado, não bloqueia
engine_allowed_actions: [verificar se o agente consta do Anexo IV, rotear para a regra do agente, recusar enquadramento de agente genérico não identificado]
engine_forbidden_actions: [criar enquadramento para agente fora do Anexo IV, tratar atividade exemplificativa como limitante para químicos, aplicar Tema 534/STJ automaticamente como regra administrativa]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` (roteamento) · `INCONCLUSIVE` · `RULE_WITH_JUDICIAL_EXCEPTION` (órbita do Tema 534) · `REQUIRES_HUMAN_CONFIRMATION`

### EXEMPLOS
- **Caso positivo:** LTCAT cita "benzeno" (CAS 71-43-2) → agente consta do Anexo IV (1.0.3) → `RULE_MATCHED` → roteamento para ficha `CHEM_BENZENO`.
- **Caso negativo:** LTCAT cita "solvente orgânico" sem composto nominado → não resolve para item do Anexo IV → `INCONCLUSIVE`/`NOT_PARAMETERIZED` (GEN-005) — sem enquadramento.
- **Caso limítrofe:** Atividade análoga às listadas para biológicos, fora das alíneas a–g, com evidência de contato → `RULE_WITH_JUDICIAL_EXCEPTION`/`REQUIRES_HUMAN_CONFIRMATION` (C14; Tema 534 citado como paradigma).

### CHECKSUM JURÍDICO
```
GEN_ANNEX_IV_SCOPE|v1|SOCIAL_SECURITY|GEN_CORE|DECREE|L3|INSS_ADMINISTRATIVE+HISTORICAL_CLASSIFICATION|1999-05-06|null|CLASSIFICATION_RULE_CHANGE+AGENT_LIST_CHANGE|Dec. 3.048/1999#AnexoIV-cab1.0.0,3.0.0#planalto.gov.br/ccivil_03/decreto/d3048compilado.htm|Dec. 3.265/1999#cabecalho|Tema 534/STJ#PENDING(C12)|AGENT_IN_ANNEX_IV|CLASSIFICATION_ROUTING|null|agent_identity|LISTED_IN|null|null|null|null|listed->RULE_MATCHED(routing)
```

---

## R05 — EPI_EFFECT_REQUIRES_CONTEXT

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `EPI_EFFECT_REQUIRES_CONTEXT` |
| internal_agent_code | `GOV_EPI` (transversal — governança) |
| Nome | Efeito de EPI exige contexto — regra interna de governança (roteamento para humano) |
| Categoria | REGRA_GERAL — GOVERNANÇA EPI |
| authority_type | `INTERNAL_GOVERNANCE_RULE` (derivada de `STF_PRECEDENT` + `STJ_PRECEDENT` + `ADMINISTRATIVE_INSTRUCTION`) |
| authority_level | `ENGINE_RULE` (regra do motor — não é fonte jurídica) |
| legal_effect_scope | `LTCAT_DOCUMENTATION`, `INSS_ADMINISTRATIVE` (roteamento) |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | NOT_APPLICABLE (regra do motor; vigência contínua desde a sua criação) |
| valid_to | vigente |
| temporal_change_type | `EPI_RULE_CHANGE` (governança derivada dos marcos J1 e J5) |
| Justificativa do marco inicial | Conflitos documentados C3/C11 e marcos J1 (Tema 555/STF, 04/12/2014) e J5 (Tema 1.090/STJ, 29/04/2025) impõem desvio obrigatório |
| Justificativa do marco final | Vigente enquanto houver camadas EPI não pacificadas |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Regra interna de governança — derivada de: Tema 555/STF; Tema 1.090/STJ; IN 128/2022, art. 290 |
| Dispositivo exato | Disparadores 1–4 (abaixo) |
| Transcrição literal | NOT_APPLICABLE (regra do motor); fundamentos: Tema 555/STF (`LITERALIDADE_PENDENTE` no portal STF), Tema 1.090/STJ (tese literal `PENDING`), IN 128/2022 art. 290 (parágrafo único confirmado ✅) |
| URL oficial | https://www.stf.jus.br · https://scon.stj.jus.br · https://www.in.gov.br (IN 128/2022) |
| Norma complementar | IN PRES/INSS 128/2022, art. 290 |
| Precedente judicial | Tema 555/STF (04/12/2014); Tema 1.090/STJ (29/04/2025 — alcance exato `PENDING`, C11 aberto) |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: EPI_CONTEXT_TRIGGERS
evaluation_type: ROUTING
methodology: NOT_APPLICABLE
parameter: epi_context_flags            # [agente_com_excecao_judicial, duvida_eficacia_epi, conflito_ppp_x_evidencias, cancerigeno_ou_controvertido]
operator: ANY_TRUE
threshold: NOT_APPLICABLE
unit: NOT_APPLICABLE
epc_behavior: NOT_APPLICABLE
epi_behavior: NEVER_AUTO_DISQUALIFIES   # proibido concluir descaracterização por EPI automaticamente nos disparadores
outcome_spec: qualquer disparador verdadeiro -> REQUIRES_HUMAN_CONFIRMATION (com exposição das 4 camadas EPI ao revisor)
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `GOV_EPI` |
| Código Anexo IV | NOT_APPLICABLE |
| Descrição Anexo IV | NOT_APPLICABLE |
| Código Tabela 24 | NOT_APPLICABLE |
| Descrição oficial Tabela 24 | NOT_APPLICABLE |
| Vigências dos mapeamentos | NOT_APPLICABLE |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: SAFE_TO_AUTOMATE            # o ROTEAMENTO é automático; a decisão é sempre humana
human_confirmation_required: YES              # sempre, quando disparada
judicial_exception: NO                        # a regra existe justamente por causa das exceções
legal_conflict: NONE_BLOCKING                 # C3/C11 são disparadores, não bloqueiam a regra de roteamento
engine_allowed_actions: [detectar disparadores, desviar para fila humana, apresentar as 4 camadas EPI (technical/administrative/judicial/esocial)]
engine_forbidden_actions: [concluir descaracterização por EPI sozinho, generalizar "EPI eficaz -> NOT_CHARACTERIZED", estender Tema 1.090/STJ a cancerígenos sem limiar (C11)]
```

### RESULTADOS DO MOTOR
`REQUIRES_HUMAN_CONFIRMATION` (resultado nominal) · `LEGAL_CONFLICT_REQUIRES_REVIEW` (cancerígenos — C11) · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo (de roteamento):** PPP de soldador declara "EPI eficaz" para fumos de cromo e laudo mede Cr VI acima do LT → disparador 3 (conflito PPP × evidências) → `REQUIRES_HUMAN_CONFIRMATION` com as 4 camadas apresentadas.
- **Caso negativo:** Exposição a ruído com EPI declarado → disparadores não necessários: aplica-se diretamente `EPI_NOISE_EXCEPTION` (EPI ignorado) — esta regra não é acionada.
- **Caso limítrofe:** PPP anota "EPI eficaz" para benzeno (cancerígeno sem limiar) → disparador 4 + C11 aberto → `LEGAL_CONFLICT_REQUIRES_REVIEW`.

### CHECKSUM JURÍDICO
```
EPI_EFFECT_REQUIRES_CONTEXT|v1|SOCIAL_SECURITY|GOV_EPI|INTERNAL_GOVERNANCE_RULE|ENGINE_RULE|LTCAT_DOCUMENTATION+INSS_ADMINISTRATIVE|null|null|EPI_RULE_CHANGE|Tema555/STF+Tema1090/STJ+IN128/2022-art.290#disparadores1-4#stf.jus.br,scon.stj.jus.br,in.gov.br|IN 128/2022#art.290|Tema 1.090/STJ#PENDING(C11)|EPI_CONTEXT_TRIGGERS|ROUTING|null|epi_context_flags|ANY_TRUE|null|null|null|NEVER_AUTO_DISQUALIFIES|trigger->REQUIRES_HUMAN_CONFIRMATION
```

---

## R06 — EPI_NOISE_EXCEPTION

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `EPI_NOISE_EXCEPTION` |
| internal_agent_code | `PHYS_RUIDO` |
| Nome | Exceção absoluta: EPI nunca descaracteriza exposição a ruído (2.0.1) |
| Categoria | REGRA_DE_EPI — FÍSICO (RUÍDO) |
| authority_type | `STF_PRECEDENT` + `ADMINISTRATIVE_INSTRUCTION` |
| authority_level | `L7_JUDICIAL_BINDING` · `L4_ADMINISTRATIVE` (o efeito administrativo deriva da IN, não do precedente) |
| legal_effect_scope | `JUDICIAL_RECOGNITION`, `INSS_ADMINISTRATIVE` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 2014-12-04 (Tema 555/STF) — aplicada a períodos anteriores; âncora administrativa: 2022-03-28 (IN 128/2022) |
| valid_to | vigente |
| temporal_change_type | `EPI_RULE_CHANGE`, `JUDICIAL_INTERPRETATION_CHANGE` |
| Justificativa do marco inicial | Tema 555/STF, item II (RE 664.335/SC, j. 04/12/2014): para ruído, a eficácia do EPI é irrelevante à descaracterização |
| Justificativa do marco final | Recepcionado administrativamente pelo art. 290, parágrafo único, da IN 128/2022 — sem revogação |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | IN PRES/INSS 128/2022 (efeito administrativo) |
| Dispositivo exato | Art. 290, parágrafo único |
| Transcrição literal | `LITERALIDADE_PENDENTE` — conteúdo confirmado ✅: declaração de EPI eficaz **não** descaracteriza a exposição a ruído |
| URL oficial | https://www.in.gov.br (DOU edição 60, Seção 1, p. 132, 29/03/2022) |
| Norma complementar | NOT_APPLICABLE |
| Precedente judicial | Tema 555/STF, item II (04/12/2014) — `LITERALIDADE_PENDENTE` no portal STF |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: EPI_NEVER_DISQUALIFIES_NOISE
evaluation_type: DECLARATION_OVERRIDE
methodology: NOT_APPLICABLE
parameter: epi_effective_declared        # declaração de eficácia de protetor auricular
operator: IGNORE                         # o campo é ignorado para 2.0.1
threshold: NOT_APPLICABLE
unit: NOT_APPLICABLE
epc_behavior: EPC_MAY_REDUCE_MEASUREMENT # EPC que reduza o NEN <= limite descaracteriza pela medição
epi_behavior: NEVER_DISQUALIFIES         # exceção absoluta para ruído
outcome_spec: PPP/LTCAT com "EPI eficaz" para ruído -> RULE_MATCHED com epi_override=IGNORED_NOISE; mérito segue a regra de ruído do período
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `PHYS_RUIDO` |
| Código Anexo IV | 2.0.1 |
| Descrição Anexo IV | "Ruído contínuo ou intermitente" |
| Código Tabela 24 | 02.01.001 |
| Descrição oficial Tabela 24 | "Ruído contínuo ou intermitente" |
| Vigências dos mapeamentos | Anexo IV 2.0.1: 1999-05-06 → vigente · Tabela 24 02.01.001: leiaute S-1.3 (S-2240, jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: SAFE_TO_AUTOMATE        # ignorar "EPI eficaz" para 2.0.1
human_confirmation_required: NO
judicial_exception: NO                    # a própria regra É a exceção consolidada (judicial + administrativa)
legal_conflict: NONE
engine_allowed_actions: [ignorar declaração de EPI eficaz para ruído, registrar epi_override=IGNORED_NOISE, prosseguir para a regra de ruído do período]
engine_forbidden_actions: [descaracterizar ruído por EPI, tratar a exceção como extensível a outros agentes, suprimir do S-2240 o registro do EPI fornecido]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` (com `EPI_OVERRIDE=IGNORED_NOISE`) · `REQUIRES_HUMAN_CONFIRMATION` (documento internamente contraditório)

### EXEMPLOS
- **Caso positivo:** 2015, NEN 92 dB(A), PPP anota "protetor auricular eficaz" → `RULE_MATCHED` → EPI ignorado → mérito por `NOISE_V6` (92 > 85 → `THRESHOLD_EXCEEDED`).
- **Caso negativo:** 2015, NEN 82 dB(A) com EPI "eficaz" → EPI ignorado → `THRESHOLD_NOT_EXCEEDED` (o EPI não teria efeito de qualquer forma).
- **Caso limítrofe:** LTCAT de 2010 declara "EPI eficaz" **e** EPC com medição pós-implantação de 84 dB(A) → EPI ignorado; EPC afeta a **medição** → `REQUIRES_HUMAN_CONFIRMATION` (verificar coerência medição × período × C5).

### CHECKSUM JURÍDICO
```
EPI_NOISE_EXCEPTION|v1|SOCIAL_SECURITY|PHYS_RUIDO|STF_PRECEDENT+ADMINISTRATIVE_INSTRUCTION|L7+L4|JUDICIAL_RECOGNITION+INSS_ADMINISTRATIVE|2014-12-04|null|EPI_RULE_CHANGE+JUDICIAL_INTERPRETATION_CHANGE|IN 128/2022#art.290-paragrafo-unico#in.gov.br|null|Tema 555/STF#item-II#CONFIRMED_CONTENT|EPI_NEVER_DISQUALIFIES_NOISE|DECLARATION_OVERRIDE|null|epi_effective_declared|IGNORE|null|null|EPC_MAY_REDUCE_MEASUREMENT|NEVER_DISQUALIFIES|declared->RULE_MATCHED(IGNORED_NOISE)
```

---
---

# RUÍDO (R07–R12)

**Agente interno:** `PHYS_RUIDO` · Categoria: Físico · **Anexo IV:** 2.0.1 ("Ruído contínuo ou intermitente") · **Tabela 24:** 02.01.001 · **Tempo previdenciário:** 25 anos.

---

## R07 — NOISE_V1

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `NOISE_V1` |
| internal_agent_code | `PHYS_RUIDO` |
| Nome | Ruído — regime de categoria profissional (regulamentos antigos) |
| Categoria | FÍSICO — HISTÓRICO |
| authority_type | `DECREE` |
| authority_level | `L3_DECREE` |
| legal_effect_scope | `HISTORICAL_CLASSIFICATION` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | NOT_APPLICABLE (regime anterior à codificação — cobre até o marco final) |
| valid_to | 1995-04-28 |
| temporal_change_type | `CLASSIFICATION_RULE_CHANGE` |
| Justificativa do marco inicial | Regime de enquadramento por categoria profissional (Quadro Anexo), vigente desde os Decretos 53.831/64 e 83.080/79 |
| Justificativa do marco final | Lei 9.032/1995 (29/04/1995) extingue o enquadramento por categoria profissional |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Decreto 83.080/1979 (convivendo com Decreto 53.831/1964 — C4) |
| Dispositivo exato | Dec. 83.080/79, Anexo I, item 1.1.5 · Dec. 53.831/64, Quadro Anexo (ruído) |
| Transcrição literal | Item 1.1.5 do Dec. 83.080/79 confirmado no Planalto ✅; item do Dec. 53.831/64: `LITERALIDADE_PENDENTE` (cópia de terceiro) — **imaterial para ruído**: o agente consta de ambos os anexos |
| URL oficial | https://www.planalto.gov.br/ccivil_03/decreto/d83080.htm |
| Norma complementar | Decreto 53.831/1964 — https://www.planalto.gov.br/ccivil_03/decreto/d53831.htm |
| Precedente judicial | NOT_APPLICABLE |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: CATEGORY_CLASSIFICATION
evaluation_type: QUALITATIVE_BY_CATEGORY
methodology: NOT_APPLICABLE
parameter: professional_category         # categoria constante da CTPS/registro
operator: LISTED_IN                      # Quadro Anexo (53.831/64) / Anexo I (83.080/79)
threshold: NOT_APPLICABLE
unit: NOT_APPLICABLE
epc_behavior: NOT_APPLICABLE
epi_behavior: NOT_APPLICABLE
outcome_spec: categoria enquadrada no período -> RULE_MATCHED (classificação histórica); categoria ausente -> THRESHOLD_NOT_EXCEEDED equivalente -> não enquadrado por esta regra
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `PHYS_RUIDO` |
| Código Anexo IV | NOT_APPLICABLE (Anexo IV vigora a partir de 06/05/1999) |
| Descrição Anexo IV | NOT_APPLICABLE |
| Código Tabela 24 | 02.01.001 |
| Descrição oficial Tabela 24 | "Ruído contínuo ou intermitente" |
| Vigências dos mapeamentos | Tabela 24 02.01.001: leiaute S-1.3 (S-2240, jan/2023 → vigente) — aplicável também a períodos históricos reportados eletronicamente |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: SAFE_TO_AUTOMATE        # classificação por categoria
human_confirmation_required: NO
judicial_exception: NO
legal_conflict: NONE_BLOCKING             # C4 aberto — imaterial para ruído (presente nos dois anexos)
engine_allowed_actions: [enquadrar categoria histórica, exigir evidência registral (CTPS), rotear ZONE_A]
engine_forbidden_actions: [estender categoria a períodos >= 29/04/1995, escolher entre 53.831/64 e 83.080/79 sem registrar C4, concluir especialidade sem evidência registral]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` · `THRESHOLD_NOT_EXCEEDED` (categoria não enquadrada) · `REQUIRES_HUMAN_CONFIRMATION` (C4 — divergência entre anexos)

### EXEMPLOS
- **Caso positivo:** CTPS registra "caldeireiro" em 1988 (categoria com exposição a ruído no Quadro Anexo) → `RULE_MATCHED` (classificação histórica).
- **Caso negativo:** Categoria sem previsão de ruído nos anexos históricos (ex.: escriturário) em 1990 → não enquadrado por esta regra.
- **Caso limítrofe:** Categoria diverge entre os dois decretos (C4) → `REQUIRES_HUMAN_CONFIRMATION` (regra do anexo mais favorável exige revisão).

### CHECKSUM JURÍDICO
```
NOISE_V1|v1|SOCIAL_SECURITY|PHYS_RUIDO|DECREE|L3|HISTORICAL_CLASSIFICATION|null|1995-04-28|CLASSIFICATION_RULE_CHANGE|Dec. 83.080/1979#AnexoI-1.1.5#planalto.gov.br/ccivil_03/decreto/d83080.htm|Dec. 53.831/1964#QuadroAnexo-ruido(LITERALIDADE_PENDENTE)|null|CATEGORY_CLASSIFICATION|QUALITATIVE_BY_CATEGORY|null|professional_category|LISTED_IN|null|null|null|null|listed->RULE_MATCHED(historical)
```

---

## R08 — NOISE_V2A

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `NOISE_V2A` |
| internal_agent_code | `PHYS_RUIDO` |
| Nome | Ruído — interregno pós-categoria, pré-laudo (80 dB(A)) |
| Categoria | FÍSICO |
| authority_type | `LAW` + `ADMINISTRATIVE_INSTRUCTION` |
| authority_level | `L2_LAW` · `L4_ADMINISTRATIVE` |
| legal_effect_scope | `INSS_ADMINISTRATIVE`, `HISTORICAL_CLASSIFICATION` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1995-04-29 |
| valid_to | 1996-10-13 |
| temporal_change_type | `CLASSIFICATION_RULE_CHANGE` |
| Justificativa do marco inicial | Lei 9.032/1995: fim da categoria; exigência de comprovação da exposição habitual e permanente |
| Justificativa do marco final | MP 1.523/1996 (14/10/1996): laudo técnico passa a ser meio de prova exigido — abre `NOISE_V2B` |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Lei 9.032/1995 |
| Dispositivo exato | Alterações nos arts. 57/58 da Lei 8.213/91 (fim da categoria profissional) |
| Transcrição literal | `LITERALIDADE_PENDENTE` — efeito confirmado em fonte primária; limite de 80 dB(A) confirmado pelo art. 292 da IN 128/2022 (com Dec. 53.831/64 como parâmetro administrativo) |
| URL oficial | https://www.planalto.gov.br/ccivil_03/leis/l9032.htm |
| Norma complementar | IN PRES/INSS 128/2022, art. 292 ✅ (sub-período 80 dB(A)) |
| Precedente judicial | NOT_APPLICABLE |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: NOISE_LEVEL_LIMIT
evaluation_type: QUANTITATIVE + DOCUMENTAL
methodology: NOT_NORMATIVIZED            # medição sem metodologia normatizada no período
parameter: noise_level                   # nível de pressão sonora medido
operator: GT
threshold: 80
unit: dB(A)
epc_behavior: EPC_MAY_REDUCE_MEASUREMENT
epi_behavior: NEVER_DISQUALIFIES         # por EPI_NOISE_EXCEPTION (Tema 555 II / art. 290 p.u.)
outcome_spec: nível > 80 dB(A) com exposição comprovada -> THRESHOLD_EXCEEDED; <= 80 -> THRESHOLD_NOT_EXCEEDED; sem comprovação documental -> INCONCLUSIVE
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `PHYS_RUIDO` |
| Código Anexo IV | NOT_APPLICABLE no período (Anexo IV inicia 06/05/1999); agente mapeado para 2.0.1 na consolidação |
| Descrição Anexo IV | "Ruído contínuo ou intermitente" |
| Código Tabela 24 | 02.01.001 |
| Descrição oficial Tabela 24 | "Ruído contínuo ou intermitente" |
| Vigências dos mapeamentos | Tabela 24 02.01.001: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: SAFE_TO_AUTOMATE
human_confirmation_required: NO
judicial_exception: NO
legal_conflict: NONE
engine_allowed_actions: [comparar nível medido com 80 dB(A), verificar comprovação de habitualidade/permanência]
engine_forbidden_actions: [exigir laudo técnico neste sub-período (exigência inicia em 14/10/1996), aplicar limite de outro período, descaracterizar por EPI]
```

### RESULTADOS DO MOTOR
`THRESHOLD_EXCEEDED` · `THRESHOLD_NOT_EXCEEDED` · `INCONCLUSIVE` · `RULE_MATCHED` (roteamento)

### EXEMPLOS
- **Caso positivo:** Medição 82 dB(A) em 1995 (pós-29/04), habitualidade comprovada por formulário/outros meios → `THRESHOLD_EXCEEDED` (82 > 80).
- **Caso negativo:** Medição 78 dB(A) em 1996 (pré-14/10) → `THRESHOLD_NOT_EXCEEDED`.
- **Caso limítrofe:** Exposição em 1996 sem data que discrimine antes/depois de 14/10 → `INCONCLUSIVE` (segmentar período) / `REQUIRES_HUMAN_CONFIRMATION`.

### CHECKSUM JURÍDICO
```
NOISE_V2A|v1|SOCIAL_SECURITY|PHYS_RUIDO|LAW+ADMINISTRATIVE_INSTRUCTION|L2+L4|INSS_ADMINISTRATIVE+HISTORICAL_CLASSIFICATION|1995-04-29|1996-10-13|CLASSIFICATION_RULE_CHANGE|Lei 9.032/1995#arts.57/58#planalto.gov.br/ccivil_03/leis/l9032.htm|IN 128/2022#art.292|null|NOISE_LEVEL_LIMIT|QUANTITATIVE+DOCUMENTAL|NOT_NORMATIVIZED|noise_level|GT|80|dB(A)|EPC_MAY_REDUCE_MEASUREMENT|NEVER_DISQUALIFIES|>80->THRESHOLD_EXCEEDED
```

---

## R09 — NOISE_V2B

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `NOISE_V2B` |
| internal_agent_code | `PHYS_RUIDO` |
| Nome | Ruído — interregno com laudo técnico exigido (80 dB(A)) |
| Categoria | FÍSICO |
| authority_type | `LAW` + `ADMINISTRATIVE_INSTRUCTION` |
| authority_level | `L2_LAW` (MP com força de lei → Lei 9.528/97) · `L4_ADMINISTRATIVE` |
| legal_effect_scope | `INSS_ADMINISTRATIVE`, `HISTORICAL_CLASSIFICATION`, `LTCAT_DOCUMENTATION` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1996-10-14 |
| valid_to | 1997-03-05 |
| temporal_change_type | `DOCUMENTATION_REQUIREMENT_CHANGE` |
| Justificativa do marco inicial | MP 1.523/1996 (14/10/1996): laudo técnico passa a lastrear o formulário de comprovação — afeta **todos** os agentes, não apenas ruído |
| Justificativa do marco final | Decreto 2.172/1997 (06/03/1997): novo regulamento, novo limite (90 dB(A)) |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | MP 1.523/1996 (convertida na Lei 9.528/1997) |
| Dispositivo exato | MP 1.523/96 (exigência de laudo); IN 128/2022, art. 292 (sub-período) |
| Transcrição literal | `LITERALIDADE_PENDENTE` (redação da conversão) — efeito confirmado pela IN 128/2022, art. 292 ✅ |
| URL oficial | https://www.planalto.gov.br/ccivil_03/mpv/antiga/1523.htm · https://www.planalto.gov.br/ccivil_03/leis/l9528.htm |
| Norma complementar | IN PRES/INSS 128/2022, art. 292 |
| Precedente judicial | NOT_APPLICABLE |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: NOISE_LEVEL_LIMIT + TECHNICAL_REPORT_REQUIRED
evaluation_type: QUANTITATIVE + DOCUMENTAL
methodology: NOT_NORMATIVIZED
parameter: noise_level
operator: GT
threshold: 80
unit: dB(A)
epc_behavior: EPC_MAY_REDUCE_MEASUREMENT
epi_behavior: NEVER_DISQUALIFIES
outcome_spec: nível > 80 dB(A) E laudo técnico presente -> THRESHOLD_EXCEEDED; > 80 sem laudo -> INCONCLUSIVE (prova insuficiente); <= 80 -> THRESHOLD_NOT_EXCEEDED
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `PHYS_RUIDO` |
| Código Anexo IV | NOT_APPLICABLE no período; consolidação em 2.0.1 |
| Descrição Anexo IV | "Ruído contínuo ou intermitente" |
| Código Tabela 24 | 02.01.001 |
| Descrição oficial Tabela 24 | "Ruído contínuo ou intermitente" |
| Vigências dos mapeamentos | Tabela 24 02.01.001: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: SAFE_TO_AUTOMATE
human_confirmation_required: NO
judicial_exception: NO
legal_conflict: NONE
engine_allowed_actions: [comparar nível com 80 dB(A), verificar presença de laudo técnico, bloquear prova insuficiente]
engine_forbidden_actions: [prescindir do laudo neste sub-período, aceitar laudo extemporâneo sem sinalização (REQUIRES_LEGAL_REVIEW), descaracterizar por EPI]
```

### RESULTADOS DO MOTOR
`THRESHOLD_EXCEEDED` · `THRESHOLD_NOT_EXCEEDED` · `INCONCLUSIVE` · `REQUIRES_HUMAN_CONFIRMATION` (laudo extemporâneo)

### EXEMPLOS
- **Caso positivo:** Medição 82 dB(A) em 1996 (pós-14/10) **com laudo técnico** → `THRESHOLD_EXCEEDED` (82 > 80).
- **Caso negativo:** Medição 79 dB(A) com laudo em 01/1997 → `THRESHOLD_NOT_EXCEEDED`.
- **Caso limítrofe:** Medição 83 dB(A) em 1997 com formulário **sem laudo** → `INCONCLUSIVE` (prova insuficiente para o sub-período).

### CHECKSUM JURÍDICO
```
NOISE_V2B|v1|SOCIAL_SECURITY|PHYS_RUIDO|LAW+ADMINISTRATIVE_INSTRUCTION|L2+L4|INSS_ADMINISTRATIVE+HISTORICAL_CLASSIFICATION+LTCAT_DOCUMENTATION|1996-10-14|1997-03-05|DOCUMENTATION_REQUIREMENT_CHANGE|MP 1.523/1996->Lei 9.528/1997#laudo-tecnico#planalto.gov.br|IN 128/2022#art.292|null|NOISE_LEVEL_LIMIT+TECHNICAL_REPORT_REQUIRED|QUANTITATIVE+DOCUMENTAL|NOT_NORMATIVIZED|noise_level|GT|80|dB(A)|EPC_MAY_REDUCE_MEASUREMENT|NEVER_DISQUALIFIES|>80+laudo->THRESHOLD_EXCEEDED
```

---

## R10 — NOISE_V3

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `NOISE_V3` |
| internal_agent_code | `PHYS_RUIDO` |
| Nome | Ruído — Decreto 2.172/1997 (90 dB(A)) |
| Categoria | FÍSICO |
| authority_type | `DECREE` |
| authority_level | `L3_DECREE` |
| legal_effect_scope | `INSS_ADMINISTRATIVE`, `HISTORICAL_CLASSIFICATION` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1997-03-06 |
| valid_to | 1999-05-05 |
| temporal_change_type | `EXPOSURE_THRESHOLD_CHANGE` (80 → 90 dB(A)) |
| Justificativa do marco inicial | Decreto 2.172/1997: novo regulamento; Anexo próprio com ruído a 90 dB(A) |
| Justificativa do marco final | Decreto 3.048/1999 (06/05/1999): Anexo IV unificado (C10 ±45 dias imaterial — limite idêntico dos dois lados) |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Decreto 2.172/1997 |
| Dispositivo exato | Anexo do regulamento — item de ruído (90 dB(A)) |
| Transcrição literal | `LITERALIDADE_PENDENTE` — limite de 90 dB(A) confirmado ✅ |
| URL oficial | https://www.planalto.gov.br/ccivil_03/decreto/d2172.htm |
| Norma complementar | NOT_APPLICABLE |
| Precedente judicial | Tema 694/STJ (vedação de retroatividade de limites posteriores) |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: NOISE_LEVEL_LIMIT
evaluation_type: QUANTITATIVE
methodology: TECHNICAL_MEASUREMENT       # medição técnica (metodologia não normatizada expressamente)
parameter: noise_level
operator: GT
threshold: 90
unit: dB(A)
epc_behavior: EPC_MAY_REDUCE_MEASUREMENT
epi_behavior: NEVER_DISQUALIFIES
outcome_spec: nível > 90 dB(A) -> THRESHOLD_EXCEEDED; <= 90 -> THRESHOLD_NOT_EXCEEDED
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `PHYS_RUIDO` |
| Código Anexo IV | NOT_APPLICABLE no período (anexo próprio do Dec. 2.172/97); consolidação em 2.0.1 |
| Descrição Anexo IV | "Ruído contínuo ou intermitente" |
| Código Tabela 24 | 02.01.001 |
| Descrição oficial Tabela 24 | "Ruído contínuo ou intermitente" |
| Vigências dos mapeamentos | Tabela 24 02.01.001: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: SAFE_TO_AUTOMATE
human_confirmation_required: NO
judicial_exception: NO
legal_conflict: NONE
engine_allowed_actions: [comparar nível medido com 90 dB(A)]
engine_forbidden_actions: [aplicar 85 dB(A) retroativamente (Tema 694/STJ), aplicar 80 dB(A) do interregno, descaracterizar por EPI]
```

### RESULTADOS DO MOTOR
`THRESHOLD_EXCEEDED` · `THRESHOLD_NOT_EXCEEDED` · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** Medição 91 dB(A) em 1998 → `THRESHOLD_EXCEEDED` (91 > 90).
- **Caso negativo:** Medição 88 dB(A) em 1998 → `THRESHOLD_NOT_EXCEEDED` (mesmo sendo > 85, o limite do período é 90 — Tema 694/STJ).
- **Caso limítrofe:** Exposição a cavalo de 06/03/1997 sem data de medição → `INCONCLUSIVE` (segmentar período).

### CHECKSUM JURÍDICO
```
NOISE_V3|v1|SOCIAL_SECURITY|PHYS_RUIDO|DECREE|L3|INSS_ADMINISTRATIVE+HISTORICAL_CLASSIFICATION|1997-03-06|1999-05-05|EXPOSURE_THRESHOLD_CHANGE|Dec. 2.172/1997#anexo-ruido-90dB(A)#planalto.gov.br/ccivil_03/decreto/d2172.htm|null|Tema 694/STJ#CONFIRMED_CONTENT|NOISE_LEVEL_LIMIT|QUANTITATIVE|TECHNICAL_MEASUREMENT|noise_level|GT|90|dB(A)|EPC_MAY_REDUCE_MEASUREMENT|NEVER_DISQUALIFIES|>90->THRESHOLD_EXCEEDED
```

---

## R11 — NOISE_V4

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `NOISE_V4` |
| internal_agent_code | `PHYS_RUIDO` |
| Nome | Ruído — Decreto 3.048/1999, redação original (90 dB(A)) |
| Categoria | FÍSICO |
| authority_type | `DECREE` |
| authority_level | `L3_DECREE` |
| legal_effect_scope | `INSS_ADMINISTRATIVE` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1999-05-06 |
| valid_to | 2003-11-18 |
| temporal_change_type | `AGENT_LIST_CHANGE`, `CLASSIFICATION_RULE_CHANGE` (consolidação do Anexo IV — limite inalterado) |
| Justificativa do marco inicial | Decreto 3.048/1999: Anexo IV unificado, item 2.0.1 (ruído 90 dB(A)); conflito C10 (±45 dias) **imaterial** — limite idêntico antes e depois do marco |
| Justificativa do marco final | Decreto 4.882/2003 (19/11/2003): redução para 85 dB(A), sem retroatividade (Tema 694/STJ) |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Decreto 3.048/1999 |
| Dispositivo exato | Anexo IV, item 2.0.1 (redação original) |
| Transcrição literal | `LITERALIDADE_PENDENTE` — item e limite (90 dB(A)) confirmados ✅ |
| URL oficial | https://www.planalto.gov.br/ccivil_03/decreto/d3048compilado.htm |
| Norma complementar | NOT_APPLICABLE |
| Precedente judicial | Tema 694/STJ (tempus regit actum) |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: NOISE_LEVEL_LIMIT
evaluation_type: QUANTITATIVE
methodology: TECHNICAL_MEASUREMENT
parameter: noise_level
operator: GT
threshold: 90
unit: dB(A)
epc_behavior: EPC_MAY_REDUCE_MEASUREMENT
epi_behavior: NEVER_DISQUALIFIES
outcome_spec: nível > 90 dB(A) -> THRESHOLD_EXCEEDED; <= 90 -> THRESHOLD_NOT_EXCEEDED
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `PHYS_RUIDO` |
| Código Anexo IV | 2.0.1 |
| Descrição Anexo IV | "Ruído contínuo ou intermitente" |
| Código Tabela 24 | 02.01.001 |
| Descrição oficial Tabela 24 | "Ruído contínuo ou intermitente" |
| Vigências dos mapeamentos | Anexo IV 2.0.1: 1999-05-06 → vigente · Tabela 24 02.01.001: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: SAFE_TO_AUTOMATE
human_confirmation_required: NO
judicial_exception: NO
legal_conflict: NONE_BLOCKING             # C10 aberto — imaterial (limite idêntico dos dois lados do marco)
engine_allowed_actions: [comparar nível medido com 90 dB(A)]
engine_forbidden_actions: [aplicar 85 dB(A) a este período, descaracterizar por EPI, tratar a incerteza de C10 como mudança de limite]
```

### RESULTADOS DO MOTOR
`THRESHOLD_EXCEEDED` · `THRESHOLD_NOT_EXCEEDED` · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** Medição 92 dB(A) em 2001 → `THRESHOLD_EXCEEDED`.
- **Caso negativo:** NEN 88 dB(A) em 2000 → `THRESHOLD_NOT_EXCEEDED` (vedação de retroatividade do limite de 85 — Tema 694/STJ).
- **Caso limítrofe:** Exposição exatamente no marco de vigência do Dec. 3.048/99 (C10) → resultado **idêntico** nas duas hipóteses → segue processamento normal (registrar nota C10).

### CHECKSUM JURÍDICO
```
NOISE_V4|v1|SOCIAL_SECURITY|PHYS_RUIDO|DECREE|L3|INSS_ADMINISTRATIVE|1999-05-06|2003-11-18|AGENT_LIST_CHANGE+CLASSIFICATION_RULE_CHANGE|Dec. 3.048/1999#AnexoIV-2.0.1#planalto.gov.br/ccivil_03/decreto/d3048compilado.htm|null|Tema 694/STJ#CONFIRMED_CONTENT|NOISE_LEVEL_LIMIT|QUANTITATIVE|TECHNICAL_MEASUREMENT|noise_level|GT|90|dB(A)|EPC_MAY_REDUCE_MEASUREMENT|NEVER_DISQUALIFIES|>90->THRESHOLD_EXCEEDED
```

---

## R12 — NOISE_V5

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `NOISE_V5` |
| internal_agent_code | `PHYS_RUIDO` |
| Nome | Ruído — Decreto 4.882/2003 (85 dB(A)) |
| Categoria | FÍSICO |
| authority_type | `DECREE` |
| authority_level | `L3_DECREE` |
| legal_effect_scope | `INSS_ADMINISTRATIVE` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 2003-11-19 |
| valid_to | 2013-10-16 |
| temporal_change_type | `EXPOSURE_THRESHOLD_CHANGE` (90 → 85 dB(A)) |
| Justificativa do marco inicial | Decreto 4.882/2003 altera o item 2.0.1 — redução do limite para 85 dB(A) **sem retroatividade** (Tema 694/STJ) |
| Justificativa do marco final | Decreto 8.123/2013 (17/10/2013): exigência metodológica NHO-01 (abre `NOISE_V6` — fora desta lista de seed) |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Decreto 4.882/2003 |
| Dispositivo exato | Item 2.0.1 (nova redação) |
| Transcrição literal | `LITERALIDADE_PENDENTE` (remissão aos limites da legislação trabalhista) — limite de 85 dB(A) confirmado ✅ |
| URL oficial | https://www.planalto.gov.br/ccivil_03/decreto/2003/d4882.htm |
| Norma complementar | NR-15, Anexo 1 (referência técnica — q=5); conflito C5 (q=3 × q=5) interno ao período, sem conflito operativo |
| Precedente judicial | Tema 694/STJ (sem retroatividade) |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: NOISE_LEVEL_LIMIT
evaluation_type: QUANTITATIVE
methodology: NR15_AN1_REFERENCE           # remissão à legislação trabalhista (NR-15 An. 1); conflito q=5 x q=3 registrado (C5)
parameter: noise_level
operator: GT
threshold: 85
unit: dB(A)
epc_behavior: EPC_MAY_REDUCE_MEASUREMENT
epi_behavior: NEVER_DISQUALIFIES
outcome_spec: nível > 85 dB(A) -> THRESHOLD_EXCEEDED; <= 85 -> THRESHOLD_NOT_EXCEEDED; critério q não declarado -> REQUIRES_HUMAN_CONFIRMATION (C5)
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `PHYS_RUIDO` |
| Código Anexo IV | 2.0.1 |
| Descrição Anexo IV | "Ruído contínuo ou intermitente" |
| Código Tabela 24 | 02.01.001 |
| Descrição oficial Tabela 24 | "Ruído contínuo ou intermitente" |
| Vigências dos mapeamentos | Anexo IV 2.0.1: 1999-05-06 → vigente · Tabela 24 02.01.001: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: SAFE_TO_AUTOMATE
human_confirmation_required: NO           # para a comparação; divergência de critério (C5) desvia para humano
judicial_exception: NO
legal_conflict: NONE_BLOCKING             # C5 aberto — interno ao período, sem conflito operativo sobre o limite
engine_allowed_actions: [comparar nível medido com 85 dB(A), sinalizar critério de duplicação de decibel (q) não declarado]
engine_forbidden_actions: [converter silenciosamente entre q=3 e q=5, aplicar NHO-01 a este período como exigência, descaracterizar por EPI]
```

### RESULTADOS DO MOTOR
`THRESHOLD_EXCEEDED` · `THRESHOLD_NOT_EXCEEDED` · `REQUIRES_HUMAN_CONFIRMATION` (C5) · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** NEN 88 dB(A), exposição em 2010 → `THRESHOLD_EXCEEDED` (88 > 85).
- **Caso negativo:** NEN 84 dB(A) em 2010 → `THRESHOLD_NOT_EXCEEDED`.
- **Caso limítrofe:** Dose de 2012 informada sem declarar critério (q=3 × q=5), com valor próximo ao limite → `REQUIRES_HUMAN_CONFIRMATION` (C5 — resultado pode mudar conforme o critério).

### CHECKSUM JURÍDICO
```
NOISE_V5|v1|SOCIAL_SECURITY|PHYS_RUIDO|DECREE|L3|INSS_ADMINISTRATIVE|2003-11-19|2013-10-16|EXPOSURE_THRESHOLD_CHANGE|Dec. 4.882/2003#item-2.0.1#planalto.gov.br/ccivil_03/decreto/2003/d4882.htm|NR-15#Anexo1(C5)|Tema 694/STJ#CONFIRMED_CONTENT|NOISE_LEVEL_LIMIT|QUANTITATIVE|NR15_AN1_REFERENCE|noise_level|GT|85|dB(A)|EPC_MAY_REDUCE_MEASUREMENT|NEVER_DISQUALIFIES|>85->THRESHOLD_EXCEEDED
```

---
---

# CALOR (R13–R16)

**Agente interno:** `PHYS_CALOR` · Categoria: Físico · **Anexo IV:** 2.0.4 ("Temperaturas Anormais" — calor; não inclui frio) · **Tabela 24:** 02.01.014 (remete à NR-15) · **Tempo previdenciário:** 25 anos.

---

## R13 — HEAT_V1

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `HEAT_V1` |
| internal_agent_code | `PHYS_CALOR` |
| Nome | Calor — regime de categoria profissional |
| Categoria | FÍSICO — HISTÓRICO |
| authority_type | `DECREE` |
| authority_level | `L3_DECREE` |
| legal_effect_scope | `HISTORICAL_CLASSIFICATION` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | NOT_APPLICABLE (regime anterior à codificação) |
| valid_to | 1995-04-28 |
| temporal_change_type | `CLASSIFICATION_RULE_CHANGE` |
| Justificativa do marco inicial | Enquadramento por categoria profissional (Anexo I, 1.1.1, Dec. 83.080/79) |
| Justificativa do marco final | Lei 9.032/1995 extingue o enquadramento por categoria |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Decreto 83.080/1979 |
| Dispositivo exato | Anexo I, item 1.1.1 |
| Transcrição literal | Confirmada no Planalto ✅ |
| URL oficial | https://www.planalto.gov.br/ccivil_03/decreto/d83080.htm |
| Norma complementar | Decreto 53.831/1964 (convivência — C4, imaterial) |
| Precedente judicial | NOT_APPLICABLE |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: CATEGORY_CLASSIFICATION
evaluation_type: QUALITATIVE_BY_CATEGORY
methodology: NOT_APPLICABLE
parameter: professional_category
operator: LISTED_IN
threshold: NOT_APPLICABLE
unit: NOT_APPLICABLE
epc_behavior: NOT_APPLICABLE
epi_behavior: NOT_APPLICABLE
outcome_spec: categoria enquadrada -> RULE_MATCHED (classificação histórica); ausente -> não enquadrado por esta regra
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `PHYS_CALOR` |
| Código Anexo IV | NOT_APPLICABLE (Anexo IV inicia 06/05/1999) |
| Descrição Anexo IV | NOT_APPLICABLE |
| Código Tabela 24 | 02.01.014 |
| Descrição oficial Tabela 24 | Calor — exposição a temperaturas anormais (descrição remete à NR-15) |
| Vigências dos mapeamentos | Tabela 24 02.01.014: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: SAFE_TO_AUTOMATE        # categoria
human_confirmation_required: NO
judicial_exception: NO
legal_conflict: NONE_BLOCKING             # C4 imaterial
engine_allowed_actions: [enquadrar categoria histórica, exigir evidência registral]
engine_forbidden_actions: [estender categoria a períodos >= 29/04/1995, concluir especialidade sem evidência registral]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` · `INCONCLUSIVE` · `REQUIRES_HUMAN_CONFIRMATION` (C4)

### EXEMPLOS
- **Caso positivo:** CTPS "fundidor" em 1985 (categoria com calor) → `RULE_MATCHED` (classificação histórica).
- **Caso negativo:** Categoria sem calor nos anexos históricos em 1990 → não enquadrado.
- **Caso limítrofe:** Categoria divergente entre os dois decretos → `REQUIRES_HUMAN_CONFIRMATION` (C4).

### CHECKSUM JURÍDICO
```
HEAT_V1|v1|SOCIAL_SECURITY|PHYS_CALOR|DECREE|L3|HISTORICAL_CLASSIFICATION|null|1995-04-28|CLASSIFICATION_RULE_CHANGE|Dec. 83.080/1979#AnexoI-1.1.1#planalto.gov.br/ccivil_03/decreto/d83080.htm|Dec. 53.831/1964(C4)|null|CATEGORY_CLASSIFICATION|QUALITATIVE_BY_CATEGORY|null|professional_category|LISTED_IN|null|null|null|null|listed->RULE_MATCHED(historical)
```

---

## R14 — HEAT_V2

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `HEAT_V2` |
| internal_agent_code | `PHYS_CALOR` |
| Nome | Calor — exposição efetiva sem limite regulamentar próprio (interregno) |
| Categoria | FÍSICO |
| authority_type | `LAW` |
| authority_level | `L2_LAW` |
| legal_effect_scope | `INSS_ADMINISTRATIVE`, `HISTORICAL_CLASSIFICATION` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1995-04-29 |
| valid_to | 1997-03-05 |
| temporal_change_type | `CLASSIFICATION_RULE_CHANGE` |
| Justificativa do marco inicial | Lei 9.032/1995: comprovação da exposição efetiva, habitual e permanente (sem limite regulamentar próprio para calor no período) |
| Justificativa do marco final | Decreto 2.172/1997 (06/03/1997): remissão ao Anexo 3 da NR-15 |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Lei 9.032/1995 |
| Dispositivo exato | Alterações nos arts. 57/58 da Lei 8.213/91 |
| Transcrição literal | `LITERALIDADE_PENDENTE` — efeito confirmado |
| URL oficial | https://www.planalto.gov.br/ccivil_03/leis/l9032.htm |
| Norma complementar | MP 1.523/1996 (laudo técnico a partir de 14/10/1996 — `DOCUMENTATION_REQUIREMENT_CHANGE`) |
| Precedente judicial | NOT_APPLICABLE |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: EFFECTIVE_EXPOSURE_NO_OWN_LIMIT
evaluation_type: DOCUMENTAL
methodology: NOT_NORMATIVIZED
parameter: heat_exposure_evidence        # descrição de exposição a temperaturas anormais + habitualidade
operator: REQUIRES_PRESENT
threshold: NOT_APPLICABLE                # sem limite regulamentar próprio no período
unit: NOT_APPLICABLE
epc_behavior: EPC_MAY_DISQUALIFY         # eliminação/neutralização da fonte afasta a exposição
epi_behavior: NOT_APPLICABLE
outcome_spec: exposição efetiva comprovada (formulário; laudo a partir de 14/10/1996) -> RULE_MATCHED; ausência de comprovação -> INCONCLUSIVE
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `PHYS_CALOR` |
| Código Anexo IV | NOT_APPLICABLE no período |
| Descrição Anexo IV | NOT_APPLICABLE |
| Código Tabela 24 | 02.01.014 |
| Descrição oficial Tabela 24 | Calor — exposição a temperaturas anormais (remete à NR-15) |
| Vigências dos mapeamentos | Tabela 24 02.01.014: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: AUTOMATE_WITH_HUMAN_CONFIRMATION
human_confirmation_required: YES          # período sem limite parametrizado exige confirmação do conjunto probatório
judicial_exception: NO
legal_conflict: NONE
engine_allowed_actions: [verificar comprovação de exposição e habitualidade, exigir laudo a partir de 14/10/1996, rotear para confirmação humana]
engine_forbidden_actions: [aplicar limites IBUTG da NR-15 retroativamente como exigência deste período, concluir especialidade automaticamente]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` · `REQUIRES_HUMAN_CONFIRMATION` · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** Formulário de 1996 descrevendo trabalho habitual em frente a forno industrial → `RULE_MATCHED` → confirmação humana do conjunto probatório.
- **Caso negativo:** Período 1995–1997 sem qualquer documento → `INCONCLUSIVE`.
- **Caso limítrofe:** Documento de 10/1996 sem discriminar data (pré/pós 14/10) → `REQUIRES_HUMAN_CONFIRMATION` (exigência de laudo depende do sub-período).

### CHECKSUM JURÍDICO
```
HEAT_V2|v1|SOCIAL_SECURITY|PHYS_CALOR|LAW|L2|INSS_ADMINISTRATIVE+HISTORICAL_CLASSIFICATION|1995-04-29|1997-03-05|CLASSIFICATION_RULE_CHANGE|Lei 9.032/1995#arts.57/58#planalto.gov.br/ccivil_03/leis/l9032.htm|MP 1.523/1996#laudo(a partir de 14/10/1996)|null|EFFECTIVE_EXPOSURE_NO_OWN_LIMIT|DOCUMENTAL|NOT_NORMATIVIZED|heat_exposure_evidence|REQUIRES_PRESENT|null|null|EPC_MAY_DISQUALIFY|null|evidence->RULE_MATCHED
```

---

## R15 — HEAT_V3

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `HEAT_V3` |
| internal_agent_code | `PHYS_CALOR` |
| Nome | Calor — Decreto 2.172/1997 com remissão ao Anexo 3 da NR-15 |
| Categoria | FÍSICO |
| authority_type | `DECREE` + `TECHNICAL_STANDARD` |
| authority_level | `L3_DECREE` · `L6_TECHNICAL` (critério técnico por remissão) |
| legal_effect_scope | `INSS_ADMINISTRATIVE`, `TECHNICAL_ASSESSMENT`, `HISTORICAL_CLASSIFICATION` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1997-03-06 |
| valid_to | 1999-05-05 |
| temporal_change_type | `METHODOLOGY_CHANGE` (remissão NR-15 An. 3) |
| Justificativa do marco inicial | Decreto 2.172/1997: calor passa a ser avaliado por remissão ao Anexo 3 da NR-15 (IBUTG × taxa metabólica × regime) |
| Justificativa do marco final | Decreto 3.048/1999 (06/05/1999): Anexo IV unificado (regra contínua — C10 imaterial) |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Decreto 2.172/1997 |
| Dispositivo exato | Anexo do regulamento — item de temperaturas anormais (remissão NR-15) |
| Transcrição literal | `LITERALIDADE_PENDENTE` — remissão e limites do Anexo 3 da NR-15 confirmados ✅ |
| URL oficial | https://www.planalto.gov.br/ccivil_03/decreto/d2172.htm |
| Norma complementar | NR-15, Anexo 3 (Portaria 3.214/1978) — https://www.gov.br/trabalho-e-emprego |
| Precedente judicial | TNU, PEDIF 0503208-24.2015.4.05.8312 — **calor de fonte natural enquadrável desde 06/03/1997** |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: IBUTG_LIMIT_TABLE
evaluation_type: QUANTITATIVE
methodology: NR15_AN3                    # IBUTG x taxa metabolica x regime trabalho/descanso
parameter: ibutg
operator: GT                             # IBUTG medido > limite(regime, taxa)
threshold: LOOKUP_TABLE                  # continuo: leve 30.0 / moderada 26.7 / pesada 25.0; 75%T: 30.6/28.0/25.9; 50%T: 31.4/29.4/27.9; 25%T: 32.2/31.1/30.0
unit: °C (IBUTG)
epc_behavior: EPC_MAY_REDUCE_MEASUREMENT
epi_behavior: INDIRECT_ONLY              # efeito via medição, nunca declaratório
outcome_spec: IBUTG > limite(regime,taxa) -> THRESHOLD_EXCEEDED; <= limite -> THRESHOLD_NOT_EXCEEDED; sem taxa/regime -> INCONCLUSIVE
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `PHYS_CALOR` |
| Código Anexo IV | NOT_APPLICABLE no período; consolidação em 2.0.4 |
| Descrição Anexo IV | "Temperaturas Anormais" (calor) |
| Código Tabela 24 | 02.01.014 |
| Descrição oficial Tabela 24 | Calor — exposição a temperaturas anormais (remete à NR-15) |
| Vigências dos mapeamentos | Tabela 24 02.01.014: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: SAFE_TO_AUTOMATE        # comparacao IBUTG
human_confirmation_required: NO
judicial_exception: NO                    # fonte natural e enquadravel por padrao desde este marco (TNU)
legal_conflict: NONE_BLOCKING             # C6 (Tema 323/TNU) aberto — afeta requisitos de PPP, nao este periodo
engine_allowed_actions: [consultar tabela de limites por regime/taxa, comparar IBUTG, exigir taxa metabolica e regime declarados]
engine_forbidden_actions: [aplicar NHO-06 retroativamente como exigencia, descaracterizar por EPI declaratorio, comparar sem regime/taxa identificados]
```

### RESULTADOS DO MOTOR
`THRESHOLD_EXCEEDED` · `THRESHOLD_NOT_EXCEEDED` · `INCONCLUSIVE` · `RULE_WITH_JUDICIAL_EXCEPTION` (fonte natural — órbita TNU)

### EXEMPLOS
- **Caso positivo:** Fundição, atividade moderada, regime 50%T/50%D, IBUTG 30,0 °C em 1998 → limite 29,4 → `THRESHOLD_EXCEEDED`.
- **Caso negativo:** Mesmo cenário com IBUTG 29,0 °C → `THRESHOLD_NOT_EXCEEDED`.
- **Caso limítrofe:** IBUTG declarado sem taxa metabólica/regime → `INCONCLUSIVE`.

### CHECKSUM JURÍDICO
```
HEAT_V3|v1|SOCIAL_SECURITY|PHYS_CALOR|DECREE+TECHNICAL_STANDARD|L3+L6|INSS_ADMINISTRATIVE+TECHNICAL_ASSESSMENT+HISTORICAL_CLASSIFICATION|1997-03-06|1999-05-05|METHODOLOGY_CHANGE|Dec. 2.172/1997#anexo-calor#planalto.gov.br/ccivil_03/decreto/d2172.htm|NR-15#Anexo3|TNU PEDIF 0503208-24.2015.4.05.8312#fonte-natural#CONFIRMED_CONTENT|IBUTG_LIMIT_TABLE|QUANTITATIVE|NR15_AN3|ibutg|GT|LOOKUP_TABLE|°C(IBUTG)|EPC_MAY_REDUCE_MEASUREMENT|INDIRECT_ONLY|>limite->THRESHOLD_EXCEEDED
```

---

## R16 — HEAT_V4

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `HEAT_V4` |
| internal_agent_code | `PHYS_CALOR` |
| Nome | Calor — Decreto 3.048/1999, Anexo IV 2.0.4 (remissão NR-15 An. 3) |
| Categoria | FÍSICO |
| authority_type | `DECREE` + `TECHNICAL_STANDARD` |
| authority_level | `L3_DECREE` · `L6_TECHNICAL` |
| legal_effect_scope | `INSS_ADMINISTRATIVE`, `TECHNICAL_ASSESSMENT` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1999-05-06 |
| valid_to | 2013-10-16 |
| temporal_change_type | `AGENT_LIST_CHANGE` (consolidação Anexo IV — regra de calor contínua) |
| Justificativa do marco inicial | Decreto 3.048/1999: Anexo IV, item 2.0.4 "Temperaturas Anormais" (C1 resolvido por transcrição literal — calor é 2.0.4; 1.0.4 é berílio) |
| Justificativa do marco final | Decreto 8.123/2013 (17/10/2013): exigência de NHO-06 (abre `HEAT_V5` — fora desta lista) |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Decreto 3.048/1999 |
| Dispositivo exato | Anexo IV, item 2.0.4 |
| Transcrição literal | Seção 2.0.x transcrita do Planalto ✅ — "2.0.4 TEMPERATURAS ANORMAIS" (calor; não inclui frio) |
| URL oficial | https://www.planalto.gov.br/ccivil_03/decreto/d3048compilado.htm |
| Norma complementar | NR-15, Anexo 3 |
| Precedente judicial | **Tema 323/TNU (19/11/2025)** — requisitos técnicos do PPP para calor; íntegra `PENDING` (C6) → status `RULE_WITH_JUDICIAL_EXCEPTION` |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: IBUTG_LIMIT_TABLE
evaluation_type: QUANTITATIVE
methodology: NR15_AN3
parameter: ibutg
operator: GT
threshold: LOOKUP_TABLE                  # mesma tabela de R15
unit: °C (IBUTG)
epc_behavior: EPC_MAY_REDUCE_MEASUREMENT
epi_behavior: INDIRECT_ONLY
outcome_spec: IBUTG > limite(regime,taxa) -> THRESHOLD_EXCEEDED; <= limite -> THRESHOLD_NOT_EXCEEDED; caso na orbita do Tema 323/TNU -> RULE_WITH_JUDICIAL_EXCEPTION
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `PHYS_CALOR` |
| Código Anexo IV | 2.0.4 |
| Descrição Anexo IV | "Temperaturas Anormais" (calor) |
| Código Tabela 24 | 02.01.014 |
| Descrição oficial Tabela 24 | Calor — exposição a temperaturas anormais (remete à NR-15) |
| Vigências dos mapeamentos | Anexo IV 2.0.4: 1999-05-06 → vigente · Tabela 24 02.01.014: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: SAFE_TO_AUTOMATE
human_confirmation_required: NO
judicial_exception: YES                   # Tema 323/TNU (C6 aberto) — desvio quando na orbita da excecao
legal_conflict: NONE_BLOCKING             # C6 e C10 abertos — nao bloqueiam a regra ordinaria
engine_allowed_actions: [comparar IBUTG com a tabela, sinalizar casos na orbita do Tema 323/TNU]
engine_forbidden_actions: [aplicar o Tema 323/TNU automaticamente como regra, exigir NHO-06 antes de 17/10/2013, descaracterizar por EPI declaratorio]
```

### RESULTADOS DO MOTOR
`THRESHOLD_EXCEEDED` · `THRESHOLD_NOT_EXCEEDED` · `RULE_WITH_JUDICIAL_EXCEPTION` · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** IBUTG 31,0 °C, moderada, 50%T, 2005 → limite 29,4 → `THRESHOLD_EXCEEDED`.
- **Caso negativo:** IBUTG 28,5 °C no mesmo regime → `THRESHOLD_NOT_EXCEEDED`.
- **Caso limítrofe:** Calor de fonte natural (trabalho rural a céu aberto) em 2010 com PPP técnico discutível → `RULE_WITH_JUDICIAL_EXCEPTION` (Tema 323/TNU — íntegra pendente, C6) → revisão humana.

### CHECKSUM JURÍDICO
```
HEAT_V4|v1|SOCIAL_SECURITY|PHYS_CALOR|DECREE+TECHNICAL_STANDARD|L3+L6|INSS_ADMINISTRATIVE+TECHNICAL_ASSESSMENT|1999-05-06|2013-10-16|AGENT_LIST_CHANGE|Dec. 3.048/1999#AnexoIV-2.0.4#planalto.gov.br/ccivil_03/decreto/d3048compilado.htm|NR-15#Anexo3|Tema 323/TNU#PENDING(C6)|IBUTG_LIMIT_TABLE|QUANTITATIVE|NR15_AN3|ibutg|GT|LOOKUP_TABLE|°C(IBUTG)|EPC_MAY_REDUCE_MEASUREMENT|INDIRECT_ONLY|>limite->THRESHOLD_EXCEEDED
```

---
---

# VIBRAÇÕES (R17–R19)

**Agentes internos:** `PHYS_VIBR_MB` · `PHYS_VIBR_CI` · `PHYS_VIBR_PERF` · **Anexo IV:** 2.0.2 · **Tabela 24:** 02.01.002–005 · **Tempo previdenciário:** 25 anos.

---

## R17 — VIB_V1_QUAL

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `VIB_V1_QUAL` |
| internal_agent_code | `PHYS_VIBR_MB` / `PHYS_VIBR_CI` (conforme atividade) |
| Nome | Vibrações — enquadramento qualitativo histórico (até 05/03/1997) |
| Categoria | FÍSICO — HISTÓRICO |
| authority_type | `DECREE` + `ADMINISTRATIVE_INSTRUCTION` |
| authority_level | `L3_DECREE` · `L4_ADMINISTRATIVE` |
| legal_effect_scope | `HISTORICAL_CLASSIFICATION`, `INSS_ADMINISTRATIVE` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | NOT_APPLICABLE (regime anterior à codificação) |
| valid_to | 1997-03-05 |
| temporal_change_type | `CLASSIFICATION_RULE_CHANGE` |
| Justificativa do marco inicial | Atividades descritas no código 1.1.4 do Anexo I do Dec. 83.080/79 |
| Justificativa do marco final | Decreto 2.172/1997 (06/03/1997): vibrações passam a critério quantitativo por ISO |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | IN PRES/INSS 128/2022 |
| Dispositivo exato | Art. 296, I |
| Transcrição literal (trecho indispensável) | "I – até 5 de março de 1997, véspera da publicação do Decreto nº 2.172, de 1997, poderá ser qualitativa, nas atividades descritas com o código 1.1.4 no Anexo I do Decreto nº 83.080, de 1979, ou quantitativa, quando a vibração for medida em golpes por minuto (limite de tolerância de 120/min), de acordo com o código 1.1.5 do Quadro Anexo do Decreto nº 53.831, de 1964" |
| URL oficial | https://www.in.gov.br (DOU edição 60, Seção 1, p. 132, 29/03/2022 — íntegra conferida) |
| Norma complementar | Decreto 83.080/1979, Anexo I, 1.1.4 — https://www.planalto.gov.br/ccivil_03/decreto/d83080.htm |
| Precedente judicial | NOT_APPLICABLE |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: QUALITATIVE_ACTIVITY_LIST
evaluation_type: QUALITATIVE
methodology: MET_QUALIT
parameter: activity_description          # atividade descrita no cod. 1.1.4 do Anexo I (Dec. 83.080/79)
operator: LISTED_IN
threshold: NOT_APPLICABLE
unit: NOT_APPLICABLE
epc_behavior: NOT_APPLICABLE
epi_behavior: NOT_APPLICABLE
outcome_spec: atividade listada + habitualidade -> RULE_MATCHED com confirmacao humana; fora da lista -> INCONCLUSIVE
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `PHYS_VIBR_MB` / `PHYS_VIBR_CI` |
| Código Anexo IV | NOT_APPLICABLE no período (1.1.4 Dec. 83.080/79); consolidação em 2.0.2 |
| Descrição Anexo IV | "Vibrações" |
| Código Tabela 24 | 02.01.002 (mão-braço) · 02.01.003/004 (corpo inteiro) |
| Descrição oficial Tabela 24 | Vibrações localizadas (mãos-braços) / Vibrações de corpo inteiro (aren · VDVR) |
| Vigências dos mapeamentos | Tabela 24 02.01.002–004: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: AUTOMATE_WITH_HUMAN_CONFIRMATION
human_confirmation_required: YES
judicial_exception: NO
legal_conflict: NONE
engine_allowed_actions: [verificar atividade contra a lista historica, exigir evidencia do periodo]
engine_forbidden_actions: [aplicar limites ISO/NHO a este periodo, concluir sem confirmacao humana]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` · `REQUIRES_HUMAN_CONFIRMATION` · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** Registro de operador de equipamento vibratório listado em 1.1.4, labor até 1995 → `RULE_MATCHED` → confirmação humana.
- **Caso negativo:** Atividade sem relação com a lista histórica em 1990 → `INCONCLUSIVE` para esta regra (avaliar outras trilhas).
- **Caso limítrofe:** Atividade parcialmente descrita, sem período discriminado → `REQUIRES_HUMAN_CONFIRMATION`.

### CHECKSUM JURÍDICO
```
VIB_V1_QUAL|v1|SOCIAL_SECURITY|PHYS_VIBR_MB,PHYS_VIBR_CI|DECREE+ADMINISTRATIVE_INSTRUCTION|L3+L4|HISTORICAL_CLASSIFICATION+INSS_ADMINISTRATIVE|null|1997-03-05|CLASSIFICATION_RULE_CHANGE|IN 128/2022#art.296-I#in.gov.br|Dec. 83.080/1979#AnexoI-1.1.4|null|QUALITATIVE_ACTIVITY_LIST|QUALITATIVE|MET_QUALIT|activity_description|LISTED_IN|null|null|null|null|listed->RULE_MATCHED(+human)
```

---

## R18 — VIB_V1_QUANT

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `VIB_V1_QUANT` |
| internal_agent_code | `PHYS_VIBR_MB` / `PHYS_VIBR_CI` |
| Nome | Vibrações — limite histórico quantitativo de 120 golpes/min (até 05/03/1997) |
| Categoria | FÍSICO — HISTÓRICO |
| authority_type | `DECREE` + `ADMINISTRATIVE_INSTRUCTION` |
| authority_level | `L3_DECREE` · `L4_ADMINISTRATIVE` |
| legal_effect_scope | `HISTORICAL_CLASSIFICATION`, `INSS_ADMINISTRATIVE` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | NOT_APPLICABLE (regime anterior à codificação) |
| valid_to | 1997-03-05 |
| temporal_change_type | `CLASSIFICATION_RULE_CHANGE` |
| Justificativa do marco inicial | Código 1.1.5 do Quadro Anexo do Dec. 53.831/64 — vibração medida em golpes/min |
| Justificativa do marco final | Decreto 2.172/1997: critério quantitativo passa às normas ISO |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | IN PRES/INSS 128/2022 |
| Dispositivo exato | Art. 296, I (limite transcrito na própria IN: **120 golpes/min** ✅) |
| Transcrição literal | Idem R17 — "(...) quantitativa, quando a vibração for medida em golpes por minuto (limite de tolerância de 120/min), de acordo com o código 1.1.5 do Quadro Anexo do Decreto nº 53.831, de 1964" |
| URL oficial | https://www.in.gov.br (DOU edição 60, Seção 1, p. 132, 29/03/2022) |
| Norma complementar | Decreto 53.831/1964, Quadro Anexo, 1.1.5 |
| Precedente judicial | NOT_APPLICABLE |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: IMPACT_RATE_LIMIT
evaluation_type: QUANTITATIVE
methodology: MET_GOLPES                  # medicao em golpes por minuto
parameter: impact_rate
operator: GT
threshold: 120
unit: golpes/min
epc_behavior: NOT_APPLICABLE
epi_behavior: NOT_APPLICABLE
outcome_spec: golpes/min > 120 -> THRESHOLD_EXCEEDED; <= 120 -> THRESHOLD_NOT_EXCEEDED
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `PHYS_VIBR_MB` / `PHYS_VIBR_CI` |
| Código Anexo IV | NOT_APPLICABLE no período; consolidação em 2.0.2 |
| Descrição Anexo IV | "Vibrações" |
| Código Tabela 24 | 02.01.002–004 |
| Descrição oficial Tabela 24 | Vibrações localizadas / corpo inteiro (aren · VDVR) |
| Vigências dos mapeamentos | Tabela 24 02.01.002–004: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: SAFE_TO_AUTOMATE
human_confirmation_required: NO
judicial_exception: NO
legal_conflict: NONE
engine_allowed_actions: [comparar golpes/min com 120]
engine_forbidden_actions: [converter golpes/min para aren/VDVR, aplicar o limite a periodos >= 06/03/1997]
```

### RESULTADOS DO MOTOR
`THRESHOLD_EXCEEDED` · `THRESHOLD_NOT_EXCEEDED` · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** Medição de 150 golpes/min em 1994 → `THRESHOLD_EXCEEDED` (150 > 120).
- **Caso negativo:** 110 golpes/min em 1996 → `THRESHOLD_NOT_EXCEEDED`.
- **Caso limítrofe:** Medição em unidade diversa (m/s²) para período pré-1997 → `INCONCLUSIVE` (metodologias incompatíveis — sem conversão silenciosa).

### CHECKSUM JURÍDICO
```
VIB_V1_QUANT|v1|SOCIAL_SECURITY|PHYS_VIBR_MB,PHYS_VIBR_CI|DECREE+ADMINISTRATIVE_INSTRUCTION|L3+L4|HISTORICAL_CLASSIFICATION+INSS_ADMINISTRATIVE|null|1997-03-05|CLASSIFICATION_RULE_CHANGE|IN 128/2022#art.296-I#in.gov.br|Dec. 53.831/1964#QuadroAnexo-1.1.5|null|IMPACT_RATE_LIMIT|QUANTITATIVE|MET_GOLPES|impact_rate|GT|120|golpes/min|null|null|>120->THRESHOLD_EXCEEDED
```

---

## R19 — VIB_QUALIT_PERF

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `VIB_QUALIT_PERF` |
| internal_agent_code | `PHYS_VIBR_PERF` |
| Nome | Vibrações — trabalhos com perfuratrizes e marteletes pneumáticos (qualitativo, 25 anos) |
| Categoria | FÍSICO |
| authority_type | `DECREE` |
| authority_level | `L3_DECREE` |
| legal_effect_scope | `INSS_ADMINISTRATIVE` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1997-03-06 |
| valid_to | vigente |
| temporal_change_type | `AGENT_LIST_CHANGE` (consolidação no Anexo IV, 06/05/1999 — regra contínua) |
| Justificativa do marco inicial | Decreto 2.172/1997: atividade de perfuratrizes/marteletes mantida com enquadramento qualitativo |
| Justificativa do marco final | Item vigente no Anexo IV (2.0.2, alínea a) — sem revogação |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Decreto 3.048/1999, Anexo IV |
| Dispositivo exato | Item 2.0.2, alínea a |
| Transcrição literal (trecho indispensável) | "2.0.2 VIBRAÇÕES — a) trabalhos com perfuratrizes e marteletes pneumáticos. — 25 ANOS" (transcrição literal Planalto ✅) |
| URL oficial | https://www.planalto.gov.br/ccivil_03/decreto/d3048compilado.htm |
| Norma complementar | NOT_APPLICABLE |
| Precedente judicial | Teses TNU de vibrações (21/10/2025 × anterior restritiva) — **C13 aberto**: alcance do qualitativo (perfuratrizes × outras funções, ex.: motorista) `PENDING` → status `RULE_WITH_JUDICIAL_EXCEPTION` |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: QUALITATIVE_ACTIVITY_DIRECT
evaluation_type: QUALITATIVE
methodology: MET_QUALIT
parameter: activity_description          # trabalho com perfuratriz e/ou martelete pneumatico
operator: LISTED_IN                      # alinea a do item 2.0.2
threshold: NOT_APPLICABLE
unit: NOT_APPLICABLE
epc_behavior: NOT_APPLICABLE
epi_behavior: NOT_APPLICABLE
outcome_spec: atividade = perfuratriz/martelete pneumatico -> RULE_MATCHED com confirmacao humana; outras funcoes com vibracao -> REQUIRES_HUMAN_CONFIRMATION (orbita C13)
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `PHYS_VIBR_PERF` |
| Código Anexo IV | 2.0.2, alínea a |
| Descrição Anexo IV | "Vibrações — trabalhos com perfuratrizes e marteletes pneumáticos" |
| Código Tabela 24 | 02.01.005 |
| Descrição oficial Tabela 24 | Vibrações — perfuratrizes e marteletes pneumáticos |
| Vigências dos mapeamentos | Anexo IV 2.0.2: 1999-05-06 → vigente · Tabela 24 02.01.005: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: AUTOMATE_WITH_HUMAN_CONFIRMATION
human_confirmation_required: YES
judicial_exception: YES                   # C13 — extensoes/restricoes jurisprudenciais pendentes
legal_conflict: NONE_BLOCKING             # C13 nao bloqueia o nucleo (perfuratrizes/marteletes)
engine_allowed_actions: [detectar mencao a perfuratriz/martelete pneumatico, rotear para a trilha qualitativa 02.01.005]
engine_forbidden_actions: [estender o qualitativo por analogia a outras funcoes (C13), exigir aren/VDVR para esta trilha, concluir sem confirmacao humana]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` · `REQUIRES_HUMAN_CONFIRMATION` · `RULE_WITH_JUDICIAL_EXCEPTION` (C13) · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** LTCAT de 2018: "operador de martelete pneumático em obra de demolição, jornada habitual" → `RULE_MATCHED` (trilha qualitativa) → confirmação humana.
- **Caso negativo:** Operador de britadeira **elétrica** (não pneumática) → fora da literalidade da alínea → `REQUIRES_HUMAN_CONFIRMATION`.
- **Caso limítrofe:** Motorista de ônibus urbano alegando vibração de corpo inteiro sem laudo, invocando tese TNU de 2025 → `RULE_WITH_JUDICIAL_EXCEPTION` (C13 aberto) → revisão humana.

### CHECKSUM JURÍDICO
```
VIB_QUALIT_PERF|v1|SOCIAL_SECURITY|PHYS_VIBR_PERF|DECREE|L3|INSS_ADMINISTRATIVE|1997-03-06|null|AGENT_LIST_CHANGE|Dec. 3.048/1999#AnexoIV-2.0.2-alinea-a#planalto.gov.br/ccivil_03/decreto/d3048compilado.htm|null|Teses TNU vibracoes#PENDING(C13)|QUALITATIVE_ACTIVITY_DIRECT|QUALITATIVE|MET_QUALIT|activity_description|LISTED_IN|null|null|null|null|perfuratriz->RULE_MATCHED(+human)
```

---
---

# AGENTES BIOLÓGICOS (R20–R21)

**Agente interno:** `BIO_MICROORG` · **Anexo IV:** 3.0.1 (cabeçalho 3.0.0: exposição "unicamente nas atividades relacionadas") · **Tabela 24:** 03.01.001–007 · **Tempo previdenciário:** 25 anos.

---

## R20 — BIO_V1

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `BIO_V1` |
| internal_agent_code | `BIO_MICROORG` |
| Nome | Biológicos — enquadramento por presunção (até 05/03/1997) |
| Categoria | BIOLÓGICO — HISTÓRICO |
| authority_type | `DECREE` + `ADMINISTRATIVE_INSTRUCTION` |
| authority_level | `L3_DECREE` · `L4_ADMINISTRATIVE` |
| legal_effect_scope | `HISTORICAL_CLASSIFICATION`, `INSS_ADMINISTRATIVE` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | NOT_APPLICABLE (regime anterior à codificação) |
| valid_to | 1997-03-05 |
| temporal_change_type | `CLASSIFICATION_RULE_CHANGE` |
| Justificativa do marco inicial | Regime anterior ao Decreto 2.172/1997 |
| Justificativa do marco final | Decreto 2.172/1997: rol de atividades passa a disciplinar o enquadramento |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | IN PRES/INSS 128/2022 |
| Dispositivo exato | Art. 299, I |
| Transcrição literal | `LITERALIDADE_PENDENTE` — conteúdo confirmado ✅: para períodos até 05/03/1997, admite-se enquadramento por presunção para **qualquer estabelecimento** |
| URL oficial | https://www.in.gov.br (DOU edição 60, Seção 1, p. 132, 29/03/2022) |
| Norma complementar | Decretos 53.831/1964 e 83.080/1979 (rol histórico) |
| Precedente judicial | NOT_APPLICABLE |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: PRESUMPTION_BY_ESTABLISHMENT
evaluation_type: QUALITATIVE
methodology: MET_QUALIT
parameter: establishment_type            # estabelecimento com risco biologico (qualquer, no periodo)
operator: REQUIRES_PRESENT
threshold: NOT_APPLICABLE
unit: NOT_APPLICABLE
epc_behavior: NOT_APPLICABLE
epi_behavior: NOT_APPLICABLE
outcome_spec: periodo <= 05/03/1997 + estabelecimento/atividade com risco biologico -> RULE_MATCHED com confirmacao humana
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `BIO_MICROORG` |
| Código Anexo IV | NOT_APPLICABLE no período; consolidação em 3.0.1 |
| Descrição Anexo IV | "Microorganismos e parasitas infecto-contagiosos vivos e suas toxinas" |
| Código Tabela 24 | 03.01.001–007 |
| Descrição oficial Tabela 24 | Atividades com exposição a agentes biológicos (7 situações) |
| Vigências dos mapeamentos | Tabela 24 03.01.001–007: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: AUTOMATE_WITH_HUMAN_CONFIRMATION
human_confirmation_required: YES
judicial_exception: NO
legal_conflict: NONE
engine_allowed_actions: [verificar periodo <= 05/03/1997 e natureza do estabelecimento, rotear para confirmacao humana]
engine_forbidden_actions: [aplicar presumcao a periodos >= 06/03/1997, concluir sem confirmacao humana]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` · `REQUIRES_HUMAN_CONFIRMATION` · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** Auxiliar de limpeza em hospital, 1990–1996 → presunção aplicável ao período → `RULE_MATCHED` → confirmação humana.
- **Caso negativo:** Mesma função a partir de 1998 → fora da vigência → resolver por `BIO_V2`.
- **Caso limítrofe:** Vínculo 1995–1999 sem segregação de período → `INCONCLUSIVE` (segmentar; pós-1997 exige rol de `BIO_V2`).

### CHECKSUM JURÍDICO
```
BIO_V1|v1|SOCIAL_SECURITY|BIO_MICROORG|DECREE+ADMINISTRATIVE_INSTRUCTION|L3+L4|HISTORICAL_CLASSIFICATION+INSS_ADMINISTRATIVE|null|1997-03-05|CLASSIFICATION_RULE_CHANGE|IN 128/2022#art.299-I#in.gov.br|Dec. 53.831/1964+83.080/1979#rol-historico|null|PRESUMPTION_BY_ESTABLISHMENT|QUALITATIVE|MET_QUALIT|establishment_type|REQUIRES_PRESENT|null|null|null|null|presuncao->RULE_MATCHED(+human)
```

---

## R21 — BIO_V2

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `BIO_V2` |
| internal_agent_code | `BIO_MICROORG` |
| Nome | Biológicos — rol das 7 alíneas (a–g) com comprovação de contato |
| Categoria | BIOLÓGICO |
| authority_type | `DECREE` |
| authority_level | `L3_DECREE` |
| legal_effect_scope | `INSS_ADMINISTRATIVE` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1997-03-06 |
| valid_to | vigente |
| temporal_change_type | `AGENT_LIST_CHANGE` (consolidação no Anexo IV em 06/05/1999; redação alterada pelo Dec. 4.882/2003) |
| Justificativa do marco inicial | Decreto 2.172/1997: rol de atividades disciplina o enquadramento |
| Justificativa do marco final | Item vigente no Anexo IV (3.0.1) |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Decreto 3.048/1999, Anexo IV |
| Dispositivo exato | Item 3.0.1, alíneas a–g |
| Transcrição literal | `LITERALIDADE_PENDENTE` (alíneas) — rol confirmado ✅: (a) estabelecimentos de saúde com contato com pacientes infecto-contagiosos ou materiais contaminados; (b) animais infectados para tratamento/preparo de soro e vacinas; (c) laboratórios de autópsia, anatomia e anátomo-histologia; (d) exumação de corpos e manipulação de resíduos de animais deteriorados; (e) galerias, fossas e tanques de esgoto; (f) esvaziamento de biodigestores; (g) coleta e industrialização do lixo |
| URL oficial | https://www.planalto.gov.br/ccivil_03/decreto/d3048compilado.htm |
| Norma complementar | IN PRES/INSS 128/2022, art. 299 ✅ |
| Precedente judicial | Jurisprudência STJ/TNU trata o rol como **exemplificativo** — **C14 aberto** → status `RULE_WITH_JUDICIAL_EXCEPTION` |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: QUALITATIVE_ACTIVITY_LIST
evaluation_type: QUALITATIVE
methodology: MET_QUALIT                  # avaliacao qualitativa circunstanciada
parameter: activity_description          # funcao compativel com alineas a-g + contato efetivo
operator: LISTED_IN
threshold: NOT_APPLICABLE
unit: NOT_APPLICABLE
epc_behavior: NOT_AUTO_DISQUALIFY
epi_behavior: NOT_AUTO_DISQUALIFY        # EPI x biologicos nao pacificado (debate TNU) -> sempre revisao
outcome_spec: atividade dentro do rol + 5 exigencias minimas (contato efetivo, funcao compativel, setor coerente, habitualidade, PPP/LTCAT com 03.01.xxx e responsavel tecnico) -> RULE_MATCHED com confirmacao humana; fora do rol com evidencia -> RULE_WITH_JUDICIAL_EXCEPTION (C14)
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `BIO_MICROORG` |
| Código Anexo IV | 3.0.1 (alíneas a–g) |
| Descrição Anexo IV | "Microorganismos e parasitas infecto-contagiosos vivos e suas toxinas — exposição unicamente nas atividades relacionadas" |
| Código Tabela 24 | 03.01.001–007 |
| Descrição oficial Tabela 24 | Agentes biológicos — 7 situações de exposição |
| Vigências dos mapeamentos | Anexo IV 3.0.1: 1999-05-06 → vigente · Tabela 24 03.01.001–007: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: PARTIALLY_PARAMETERIZABLE
human_confirmation_required: YES
judicial_exception: YES                   # C14 — rol taxativo (letra) x exemplificativo (jurisprudencia)
legal_conflict: NONE_BLOCKING             # C14 aberto — afeta apenas atividades FORA do rol
engine_allowed_actions: [verificar compatibilidade com as 7 alineas, checar as 5 exigencias minimas, sinalizar EPI declarado para revisao]
engine_forbidden_actions: [interpretar "trabalha em hospital" como enquadramento automatico, rejeitar automaticamente atividade fora do rol (C14 -> revisao juridica), descaracterizar por EPI (debate TNU em curso)]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` · `REQUIRES_HUMAN_CONFIRMATION` · `RULE_WITH_JUDICIAL_EXCEPTION` (fora do rol — C14) · `LEGAL_CONFLICT_REQUIRES_REVIEW` (EPI × biológicos) · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** Técnico de enfermagem em hospital, contato com pacientes infecto-contagiosos, PPP 03.01.001, 2015 → dentro do rol (alínea a) + exigências mínimas → `RULE_MATCHED` → confirmação humana.
- **Caso negativo:** Administrativo hospitalar sem contato com pacientes/materiais → fora das condições → `INCONCLUSIVE` (sem contato efetivo).
- **Caso limítrofe:** Trabalhador de necrotério municipal (atividade fora das alíneas, com evidência robusta de contato) → `RULE_WITH_JUDICIAL_EXCEPTION` (C14) → revisão jurídica — **não** rejeição automática.

### CHECKSUM JURÍDICO
```
BIO_V2|v1|SOCIAL_SECURITY|BIO_MICROORG|DECREE|L3|INSS_ADMINISTRATIVE|1997-03-06|null|AGENT_LIST_CHANGE|Dec. 3.048/1999#AnexoIV-3.0.1-a-g#planalto.gov.br/ccivil_03/decreto/d3048compilado.htm|IN 128/2022#art.299|STJ/TNU rol exemplificativo#OPEN(C14)|QUALITATIVE_ACTIVITY_LIST|QUALITATIVE|MET_QUALIT|activity_description|LISTED_IN|null|null|NOT_AUTO_DISQUALIFY|NOT_AUTO_DISQUALIFY|rol->RULE_MATCHED(+human);fora->JUDICIAL_EXCEPTION
```

---
---

# DEMAIS AGENTES DO ANEXO IV (R22–R26)

---

## R22 — RAD_ION_RULE

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `RAD_ION_RULE` |
| internal_agent_code | `PHYS_RAD_ION` |
| Nome | Radiações ionizantes — rol de atividades + dosimetria CNEN |
| Categoria | FÍSICO |
| authority_type | `DECREE` + `TECHNICAL_STANDARD` (CNEN) |
| authority_level | `L3_DECREE` · `L6_TECHNICAL` |
| legal_effect_scope | `INSS_ADMINISTRATIVE`, `TECHNICAL_ASSESSMENT` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1999-05-06 |
| valid_to | vigente |
| temporal_change_type | `AGENT_LIST_CHANGE` (consolidação Anexo IV) |
| Justificativa do marco inicial | Decreto 3.048/1999: Anexo IV, item 2.0.3 — rol de atividades com radiações ionizantes |
| Justificativa do marco final | Item vigente sem revogação |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Decreto 3.048/1999, Anexo IV |
| Dispositivo exato | Item 2.0.3 (rol de atividades — 7 alíneas) |
| Transcrição literal | `LITERALIDADE_PENDENTE` (alíneas) — item e rol confirmados ✅ |
| URL oficial | https://www.planalto.gov.br/ccivil_03/decreto/d3048compilado.htm |
| Norma complementar | Dosimetria individual — CNEN NN 3.01 (https://www.cnen.gov.br) |
| Precedente judicial | NOT_APPLICABLE |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: QUALITATIVE_ACTIVITY_LIST + DOSIMETRY_SUPPORT
evaluation_type: QUALITATIVE             # com evidencia dosimetrica de suporte
methodology: MET_DOSIM_CNEN
parameter: activity_description          # rol de atividades do 2.0.3
operator: LISTED_IN
threshold: NOT_APPLICABLE                # enquadramento por atividade; dose e evidencia, nao gatilho autonomo
unit: mSv (dosimetria)
epc_behavior: EVIDENCE_SUPPORT           # blindagem/distancia/tempo documentados
epi_behavior: NOT_CENTRAL                # EPI nao e o eixo do enquadramento
outcome_spec: atividade no rol + dosimetria/laudo de radioprotecao -> RULE_MATCHED com confirmacao humana; sem dosimetria/laudo ou fora das alineas -> INCONCLUSIVE
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `PHYS_RAD_ION` |
| Código Anexo IV | 2.0.3 |
| Descrição Anexo IV | "Radiações Ionizantes" |
| Código Tabela 24 | **RESOLVIDO ✅ (23/08/2026)** — mapeamento condicional 1:N confirmado na fonte oficial (ver tabela abaixo) |
| Vigências dos mapeamentos | Anexo IV 2.0.3: 1999-05-06 → vigente · Tabela 24 (conteúdo de Agentes Nocivos): DTINICIO 01/01/2014, sem data-fim → vigente |

**Mapeamento condicional `PHYS_RAD_ION` → Tabela 24** (1 agente interno → N códigos externos, resolvidos pela atividade/cenário de exposição; descrições transcritas literalmente da consulta pública oficial das Tabelas do eSocial, acessada em 23/08/2026 — ver §"Nota de proveniência Tabela 24" no final deste documento):

| mapping_condition (atividade/cenário) | table24_code | Descrição oficial (literal) |
|---|---|---|
| Exposição a radiações ionizantes sem atividade específica identificada | `02.01.006` | "Radiações ionizantes" |
| Extração/beneficiamento de minerais radioativos | `02.01.007` | "Extração e beneficiamento de minerais radioativos" |
| Minerações com exposição ao radônio | `02.01.008` | "Atividades em minerações com exposição ao radônio" |
| Manutenção/supervisão em unidades de minerais radioativos | `02.01.009` | "Realização de manutenção e supervisão em unidades de extração, tratamento e beneficiamento de minerais radioativos com exposição às radiações ionizantes" |
| Reatores nucleares ou fontes radioativas | `02.01.010` | "Operações com reatores nucleares ou com fontes radioativas" |
| Exposição a raios Alfa/Beta/Gama/X, nêutrons e substâncias radioativas (fins industriais, terapêuticos, diagnósticos) | `02.01.011` | "Trabalhos realizados com exposição aos raios Alfa, Beta, Gama e X, aos nêutrons e às substâncias radioativas para fins industriais, terapêuticos e diagnósticos" |
| Fabricação/manipulação de produtos radioativos | `02.01.012` | "Fabricação e manipulação de produtos radioativos" |
| Pesquisas e estudos com radiações ionizantes | `02.01.013` | "Pesquisas e estudos com radiações ionizantes em laboratórios" |

**Regra de seleção:** a atividade concreta determina o código mais específico. Quando a informação for insuficiente para selecionar um código, o motor **não escolhe silenciosamente** (nem mesmo o genérico 02.01.006) → `REQUIRES_HUMAN_CONFIRMATION` com a lista de candidatos.

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: PARTIALLY_PARAMETERIZABLE
human_confirmation_required: YES
judicial_exception: NO
legal_conflict: NONE
engine_allowed_actions: [verificar atividade contra o rol 2.0.3, exigir evidencia dosimetrica, sugerir codigo Tabela 24 pelo mapping_condition, rotear para confirmacao humana]
engine_forbidden_actions: [enquadrar fora do rol sem revisao, inferir dose sem dosimetria, selecionar silenciosamente codigo Tabela 24 (inclusive o generico 02.01.006) sem confirmacao humana]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` · `REQUIRES_HUMAN_CONFIRMATION` · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** Técnico em radiologia com dosimetria individual e laudo de radioproteção, 2016 → atividade no rol + evidência → `RULE_MATCHED` → confirmação humana.
- **Caso negativo:** Função administrativa em clínica radiológica, sem dosímetro e fora das alíneas → `INCONCLUSIVE`.
- **Caso limítrofe:** Atividade no rol, mas sem dosimetria no período alegado → `INCONCLUSIVE` (evidência insuficiente).

### CHECKSUM JURÍDICO
```
RAD_ION_RULE|v1|SOCIAL_SECURITY|PHYS_RAD_ION|DECREE+TECHNICAL_STANDARD|L3+L6|INSS_ADMINISTRATIVE+TECHNICAL_ASSESSMENT|1999-05-06|null|AGENT_LIST_CHANGE|Dec. 3.048/1999#AnexoIV-2.0.3#planalto.gov.br/ccivil_03/decreto/d3048compilado.htm|CNEN NN 3.01#dosimetria|null|QUALITATIVE_ACTIVITY_LIST+DOSIMETRY_SUPPORT|QUALITATIVE|MET_DOSIM_CNEN|activity_description|LISTED_IN|null|mSv|EVIDENCE_SUPPORT|NOT_CENTRAL|rol+dosimetria->RULE_MATCHED(+human)|mappings:[AnexoIV:2.0.3;T24:02.01.006-013#condicional_por_atividade#confirmado_oficial_2026-08-23#DTINICIO:2014-01-01]
```

---

## R23 — PRESS_HIPER_RULE

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `PRESS_HIPER_RULE` |
| internal_agent_code | `PHYS_PRESS_HIPER` |
| Nome | Pressões atmosféricas anormais (hiperbáricas) — 3 atividades |
| Categoria | FÍSICO |
| authority_type | `DECREE` |
| authority_level | `L3_DECREE` |
| legal_effect_scope | `INSS_ADMINISTRATIVE` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1999-05-06 |
| valid_to | vigente |
| temporal_change_type | `AGENT_LIST_CHANGE` (consolidação Anexo IV) |
| Justificativa do marco inicial | Decreto 3.048/1999: Anexo IV, item 2.0.5 |
| Justificativa do marco final | Item vigente sem revogação |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Decreto 3.048/1999, Anexo IV |
| Dispositivo exato | Item 2.0.5 (3 atividades: mergulho; tubulões/túneis; caixões/câmaras hiperbáricas) |
| Transcrição literal | `LITERALIDADE_PENDENTE` — item e as 3 atividades confirmados ✅ |
| URL oficial | https://www.planalto.gov.br/ccivil_03/decreto/d3048compilado.htm |
| Norma complementar | NOT_APPLICABLE |
| Precedente judicial | NOT_APPLICABLE |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: QUALITATIVE_ACTIVITY_LIST
evaluation_type: QUALITATIVE
methodology: MET_QUALIT
parameter: activity_description          # mergulho / tubuloes e tuneis / caixoes e camaras hiperbaricas
operator: LISTED_IN
threshold: NOT_APPLICABLE
unit: NOT_APPLICABLE
epc_behavior: NOT_APPLICABLE             # condicao de trabalho
epi_behavior: NOT_APPLICABLE
outcome_spec: funcao dentro das 3 atividades -> RULE_MATCHED com confirmacao humana; fora das 3 alineas -> INCONCLUSIVE
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `PHYS_PRESS_HIPER` |
| Código Anexo IV | 2.0.5 |
| Descrição Anexo IV | "Pressão Atmosférica Anormal" (hiperbárica) |
| Código Tabela 24 | **RESOLVIDO ✅ (23/08/2026)** — mapeamento condicional 1:N confirmado na fonte oficial (ver tabela abaixo) |
| Vigências dos mapeamentos | Anexo IV 2.0.5: 1999-05-06 → vigente · Tabela 24 (conteúdo de Agentes Nocivos): DTINICIO 01/01/2014, sem data-fim → vigente |

**Mapeamento condicional `PHYS_PRESS_HIPER` → Tabela 24** (1 agente interno → N códigos externos, resolvidos pela atividade; descrições literais da consulta pública oficial, 23/08/2026):

| mapping_condition (atividade) | table24_code | Descrição oficial (literal) | Correspondência Anexo IV 2.0.5 |
|---|---|---|---|
| Trabalho em caixões ou câmaras hiperbáricas | `02.01.016` | "Trabalhos em caixões ou câmaras hiperbáricas" | atividade "caixões/câmaras hiperbáricas" |
| Trabalho em tubulões ou túneis sob ar comprimido | `02.01.017` | "Trabalhos em tubulões ou túneis sob ar comprimido" | atividade "tubulões/túneis sob ar comprimido" |
| Operações de mergulho | `02.01.018` | "Operações de mergulho com o uso de escafandros ou outros equipamentos" | atividade "mergulho" |
| Pressão atmosférica anormal sem atividade específica identificada | `02.01.015` | "Pressão atmosférica anormal" | genérico — somente com confirmação humana |

**Regra de seleção:** as 3 atividades do rol do item 2.0.5 resolvem diretamente para 02.01.016/017/018. O código genérico 02.01.015 **nunca é selecionado silenciosamente** → informação insuficiente implica `REQUIRES_HUMAN_CONFIRMATION` com a lista de candidatos.

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: PARTIALLY_PARAMETERIZABLE
human_confirmation_required: YES
judicial_exception: NO
legal_conflict: NONE
engine_allowed_actions: [verificar funcao contra as 3 atividades, sugerir codigo Tabela 24 pelo mapping_condition, rotear para confirmacao humana]
engine_forbidden_actions: [estender o rol por analogia, enquadrar sem confirmacao humana, selecionar silenciosamente o generico 02.01.015]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` · `REQUIRES_HUMAN_CONFIRMATION` · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** Mergulhador de manutenção portuária, 2012, com LTCAT descritivo → `RULE_MATCHED` → confirmação humana.
- **Caso negativo:** Operador de guindaste em estaleiro (sem trabalho hiperbárico) → `INCONCLUSIVE` para esta regra.
- **Caso limítrofe:** Trabalho eventual em tubulão sem habitualidade comprovada → `REQUIRES_HUMAN_CONFIRMATION`.

### CHECKSUM JURÍDICO
```
PRESS_HIPER_RULE|v1|SOCIAL_SECURITY|PHYS_PRESS_HIPER|DECREE|L3|INSS_ADMINISTRATIVE|1999-05-06|null|AGENT_LIST_CHANGE|Dec. 3.048/1999#AnexoIV-2.0.5#planalto.gov.br/ccivil_03/decreto/d3048compilado.htm|null|null|QUALITATIVE_ACTIVITY_LIST|QUALITATIVE|MET_QUALIT|activity_description|LISTED_IN|null|null|null|null|3atividades->RULE_MATCHED(+human)|mappings:[AnexoIV:2.0.5;T24:02.01.016+02.01.017+02.01.018#por_atividade;02.01.015#generico_so_com_humano#confirmado_oficial_2026-08-23#DTINICIO:2014-01-01]
```

---

## R24 — ASSOC_GENERAL

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `ASSOC_GENERAL` |
| internal_agent_code | `ASSOC_GENERAL` |
| Nome | Associação de agentes — enquadramento pelo agente que exigir menor tempo |
| Categoria | ASSOCIAÇÃO — REGRA DE COMPOSIÇÃO |
| authority_type | `DECREE` |
| authority_level | `L3_DECREE` |
| legal_effect_scope | `INSS_ADMINISTRATIVE` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 2003-11-19 |
| valid_to | vigente |
| temporal_change_type | `CLASSIFICATION_RULE_CHANGE` |
| Justificativa do marco inicial | Decreto 4.882/2003 inclui o item 4.0.0 (associações) |
| Justificativa do marco final | Item vigente sem revogação |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Decreto 4.882/2003 |
| Dispositivo exato | Anexo IV, item 4.0.0 |
| Transcrição literal (trecho indispensável) | "Nas associações de agentes acima do nível de tolerância, considera-se o enquadramento do que exigir menor tempo" ✅ |
| URL oficial | https://www.planalto.gov.br/ccivil_03/decreto/2003/d4882.htm |
| Norma complementar | Decreto 3.048/1999, Anexo IV (compilado) |
| Precedente judicial | NOT_APPLICABLE |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: ASSOCIATION_MIN_TIME
evaluation_type: COMPOSITION
methodology: NOT_APPLICABLE
parameter: concurrent_agents             # conjunto de agentes simultaneos acima do nivel de tolerancia
operator: MIN_TIME_WINS                  # menor tempo exigido entre os agentes presentes
threshold: NOT_APPLICABLE
unit: anos (tempo exigido)
epc_behavior: PER_AGENT                  # efeitos de EPC/EPI avaliados agente a agente
epi_behavior: PER_AGENT
outcome_spec: >= 2 agentes acima do nivel de tolerancia -> RULE_MATCHED (menor tempo) com confirmacao humana; 1 agente -> regra propria do agente
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `ASSOC_GENERAL` |
| Código Anexo IV | 4.0.0 |
| Descrição Anexo IV | "Associação de agentes nocivos" |
| Código Tabela 24 | NOT_APPLICABLE (a associação não tem código próprio — reportam-se os agentes individuais) |
| Descrição oficial Tabela 24 | NOT_APPLICABLE |
| Vigências dos mapeamentos | Anexo IV 4.0.0: 2003-11-19 → vigente |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: AUTOMATE_WITH_HUMAN_CONFIRMATION
human_confirmation_required: YES          # regra de composicao — sempre com revisao
judicial_exception: NO
legal_conflict: NONE
engine_allowed_actions: [detectar agentes concorrentes acima do nivel de tolerancia, sugerir o menor tempo, rotear para revisao humana]
engine_forbidden_actions: [somar exposicoes de agentes sem superacao individual, aplicar a regra a periodos < 19/11/2003, concluir sem revisao humana]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` · `REQUIRES_HUMAN_CONFIRMATION` · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** Ruído 88 dB(A) (2005 — acima de 85) + calor acima do limite no mesmo período → `RULE_MATCHED` (composição; ambos 25 anos) → revisão humana.
- **Caso negativo:** Apenas ruído acima do limite → regra de associação não se aplica → segue `NOISE_V5`.
- **Caso limítrofe:** Dois agentes, um acima e outro sem medição → `REQUIRES_HUMAN_CONFIRMATION` (composição não demonstrada).

### CHECKSUM JURÍDICO
```
ASSOC_GENERAL|v1|SOCIAL_SECURITY|ASSOC_GENERAL|DECREE|L3|INSS_ADMINISTRATIVE|2003-11-19|null|CLASSIFICATION_RULE_CHANGE|Dec. 4.882/2003#item-4.0.0#planalto.gov.br/ccivil_03/decreto/2003/d4882.htm|Dec. 3.048/1999#AnexoIV|null|ASSOCIATION_MIN_TIME|COMPOSITION|null|concurrent_agents|MIN_TIME_WINS|null|anos|PER_AGENT|PER_AGENT|>=2agentes->RULE_MATCHED(+human)
```

---

## R25 — ASSOC_MIN_SUB_AF

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `ASSOC_MIN_SUB_AF` |
| internal_agent_code | `ASSOC_MIN_SUB_AF` |
| Nome | Mineração subterrânea afastada da frente de produção — 20 anos |
| Categoria | ASSOCIAÇÃO — MINERAÇÃO |
| authority_type | `DECREE` |
| authority_level | `L3_DECREE` |
| legal_effect_scope | `INSS_ADMINISTRATIVE` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1999-05-06 |
| valid_to | vigente |
| temporal_change_type | `AGENT_LIST_CHANGE` (consolidação Anexo IV) |
| Justificativa do marco inicial | Decreto 3.048/1999: Anexo IV, item 4.0.1 |
| Justificativa do marco final | Item vigente sem revogação |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Decreto 3.048/1999, Anexo IV |
| Dispositivo exato | Item 4.0.1 |
| Transcrição literal | `LITERALIDADE_PENDENTE` — item e tempo de **20 anos** confirmados ✅ |
| URL oficial | https://www.planalto.gov.br/ccivil_03/decreto/d3048compilado.htm |
| Norma complementar | NOT_APPLICABLE |
| Precedente judicial | NOT_APPLICABLE |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: QUALITATIVE_FUNCTION_LOCATION
evaluation_type: QUALITATIVE
methodology: MET_QUALIT
parameter: function_location             # mineracao subterranea, afastada da frente de producao
operator: LISTED_IN
threshold: 20                            # tempo previdenciario exigido
unit: anos
epc_behavior: NOT_APPLICABLE
epi_behavior: NOT_APPLICABLE
outcome_spec: funcao + local compativel -> RULE_MATCHED (tempo exigido = 20 anos) com confirmacao humana
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `ASSOC_MIN_SUB_AF` |
| Código Anexo IV | 4.0.1 |
| Descrição Anexo IV | "Mineração subterrânea afastada da frente de produção" |
| Código Tabela 24 | `04.01.001` — **CONFIRMADO ✅ (23/08/2026, fonte oficial)** |
| Descrição oficial Tabela 24 | "Mineração subterrânea cujas atividades sejam exercidas afastadas das frentes de produção" (literal) |
| Vigências dos mapeamentos | Anexo IV 4.0.1: 1999-05-06 → vigente · Tabela 24 04.01.001: DTINICIO 01/01/2014, sem data-fim → vigente |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: PARTIALLY_PARAMETERIZABLE
human_confirmation_required: YES
judicial_exception: NO
legal_conflict: NONE
engine_allowed_actions: [verificar funcao e local (afastado da frente), aplicar tempo exigido de 20 anos, rotear para confirmacao]
engine_forbidden_actions: [confundir com frente de producao (15 anos), enquadrar mineracao de superficie]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` · `REQUIRES_HUMAN_CONFIRMATION` · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** Eletricista de manutenção em mina subterrânea (afastado da frente), 2005–2020 → `RULE_MATCHED` (20 anos) → confirmação humana.
- **Caso negativo:** Trabalhador de mineração a céu aberto → `INCONCLUSIVE` para esta regra.
- **Caso limítrofe:** Função com deslocamento alternado entre frente e retaguarda → `REQUIRES_HUMAN_CONFIRMATION` (apropriar períodos).

### CHECKSUM JURÍDICO
```
ASSOC_MIN_SUB_AF|v1|SOCIAL_SECURITY|ASSOC_MIN_SUB_AF|DECREE|L3|INSS_ADMINISTRATIVE|1999-05-06|null|AGENT_LIST_CHANGE|Dec. 3.048/1999#AnexoIV-4.0.1#planalto.gov.br/ccivil_03/decreto/d3048compilado.htm|null|null|QUALITATIVE_FUNCTION_LOCATION|QUALITATIVE|MET_QUALIT|function_location|LISTED_IN|20|anos|null|null|afastado->RULE_MATCHED(20anos,+human)|mappings:[AnexoIV:4.0.1;T24:04.01.001#1:1#confirmado_oficial_2026-08-23#DTINICIO:2014-01-01]
```

---

## R26 — ASSOC_MIN_SUB_FP

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `ASSOC_MIN_SUB_FP` |
| internal_agent_code | `ASSOC_MIN_SUB_FP` |
| Nome | Mineração subterrânea em frente de produção — 15 anos |
| Categoria | ASSOCIAÇÃO — MINERAÇÃO |
| authority_type | `DECREE` |
| authority_level | `L3_DECREE` |
| legal_effect_scope | `INSS_ADMINISTRATIVE` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1999-05-06 |
| valid_to | vigente |
| temporal_change_type | `AGENT_LIST_CHANGE` (consolidação Anexo IV) |
| Justificativa do marco inicial | Decreto 3.048/1999: Anexo IV, item 4.0.2 |
| Justificativa do marco final | Item vigente sem revogação |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Decreto 3.048/1999, Anexo IV |
| Dispositivo exato | Item 4.0.2 |
| Transcrição literal | `LITERALIDADE_PENDENTE` — item e tempo de **15 anos** confirmados ✅ |
| URL oficial | https://www.planalto.gov.br/ccivil_03/decreto/d3048compilado.htm |
| Norma complementar | NOT_APPLICABLE |
| Precedente judicial | NOT_APPLICABLE |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: QUALITATIVE_FUNCTION_LOCATION
evaluation_type: QUALITATIVE
methodology: MET_QUALIT
parameter: function_location             # mineracao subterranea, frente de producao
operator: LISTED_IN
threshold: 15
unit: anos
epc_behavior: NOT_APPLICABLE
epi_behavior: NOT_APPLICABLE
outcome_spec: funcao + local compativel (frente de producao) -> RULE_MATCHED (tempo exigido = 15 anos) com confirmacao humana
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `ASSOC_MIN_SUB_FP` |
| Código Anexo IV | 4.0.2 |
| Descrição Anexo IV | "Mineração subterrânea em frente de produção" |
| Código Tabela 24 | `04.01.002` — **CONFIRMADO ✅ (23/08/2026, fonte oficial)** |
| Descrição oficial Tabela 24 | "Trabalhos em atividades permanentes no subsolo de minerações subterrâneas em frente de produção" (literal) |
| Vigências dos mapeamentos | Anexo IV 4.0.2: 1999-05-06 → vigente · Tabela 24 04.01.002: DTINICIO 01/01/2014, sem data-fim → vigente |

### AUTOMAÇÃO
```yaml
seed_ready: YES
automation_level: PARTIALLY_PARAMETERIZABLE
human_confirmation_required: YES
judicial_exception: NO
legal_conflict: NONE
engine_allowed_actions: [verificar funcao e local (frente de producao), aplicar tempo exigido de 15 anos, rotear para confirmacao]
engine_forbidden_actions: [confundir com area afastada (20 anos), enquadrar sem evidencia de local de trabalho]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` · `REQUIRES_HUMAN_CONFIRMATION` · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** Perfurador em frente de lavra subterrânea, 2001–2018 → `RULE_MATCHED` (15 anos) → confirmação humana.
- **Caso negativo:** Superfície/brita → `INCONCLUSIVE`.
- **Caso limítrofe:** Alternância frente × retaguarda sem períodos discriminados → `REQUIRES_HUMAN_CONFIRMATION`.

### CHECKSUM JURÍDICO
```
ASSOC_MIN_SUB_FP|v1|SOCIAL_SECURITY|ASSOC_MIN_SUB_FP|DECREE|L3|INSS_ADMINISTRATIVE|1999-05-06|null|AGENT_LIST_CHANGE|Dec. 3.048/1999#AnexoIV-4.0.2#planalto.gov.br/ccivil_03/decreto/d3048compilado.htm|null|null|QUALITATIVE_FUNCTION_LOCATION|QUALITATIVE|MET_QUALIT|function_location|LISTED_IN|15|anos|null|null|frente->RULE_MATCHED(15anos,+human)|mappings:[AnexoIV:4.0.2;T24:04.01.002#1:1#confirmado_oficial_2026-08-23#DTINICIO:2014-01-01]
```

---
---

# AGENTES HISTÓRICOS E EXCEÇÕES (R27–R29)

---

## R27 — HIST_FRIO

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `HIST_FRIO` |
| internal_agent_code | `HIST_FRIO` |
| Nome | Frio — enquadramento histórico (Zonas A/B) |
| Categoria | FÍSICO — HISTÓRICO (fora do Anexo IV vigente) |
| authority_type | `DECREE` + `ADMINISTRATIVE_INSTRUCTION` |
| authority_level | `L3_DECREE` · `L4_ADMINISTRATIVE` |
| legal_effect_scope | `HISTORICAL_CLASSIFICATION` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | NOT_APPLICABLE (regime anterior à codificação) |
| valid_to | 1997-03-05 (Zonas A/B) |
| temporal_change_type | `AGENT_LIST_CHANGE` (exclusão do rol pelo Dec. 2.172/1997) |
| Justificativa do marco inicial | Frio previsto no Dec. 53.831/64 (1.1.2) e no Dec. 83.080/79 (1.1.2 — câmaras frigoríficas) |
| Justificativa do marco final | Decreto 2.172/1997 revoga ambos e o frio não consta do novo rol; IN 128/2022, art. 301 limita o enquadramento a períodos anteriores a 06/03/1997 |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | Decreto 83.080/1979 |
| Dispositivo exato | Anexo I, item 1.1.2 (câmaras frigoríficas) |
| Transcrição literal | Confirmada no Planalto ✅ |
| URL oficial | https://www.planalto.gov.br/ccivil_03/decreto/d83080.htm |
| Norma complementar | IN PRES/INSS 128/2022, art. 301 ✅ (limitação temporal) |
| Precedente judicial | NOT_APPLICABLE para Zonas A/B (pós-1997: sem precedente qualificado localizado → trilha `EXCEPTIONAL_LEGAL_OVERRIDE`) |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: HISTORICAL_ZONES
evaluation_type: QUALITATIVE_BY_ZONE
methodology: MET_QUALIT
parameter: exposure_period_zone          # ZONE_A (<= 28/04/1995: categoria) / ZONE_B (29/04/1995-05/03/1997: comprovacao)
operator: ZONE_ROUTING
threshold: NOT_APPLICABLE
unit: NOT_APPLICABLE
epc_behavior: NOT_APPLICABLE
epi_behavior: NOT_APPLICABLE
outcome_spec: ZONE_A -> categoria (CTPS); ZONE_B -> comprovacao de exposicao (laudo a partir de 14/10/1996); ZONE_C (>= 06/03/1997) -> sempre EXCEPTIONAL_LEGAL_OVERRIDE
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `HIST_FRIO` |
| Código Anexo IV | Ausente do Anexo IV vigente ✅ (transcrição Planalto) |
| Descrição Anexo IV | NOT_APPLICABLE |
| Código Tabela 24 | Sem código autônomo ✅; `05.01.001` quando excepcional (Zona C, com processo) |
| Descrição oficial Tabela 24 | 05.01.001 — "agentes nocivos não constantes do Anexo IV, incluídos por decisão judicial/administrativa" |
| Vigências dos mapeamentos | Tabela 24 05.01.001: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES                           # Zonas A/B
automation_level: PARTIALLY_PARAMETERIZABLE
human_confirmation_required: YES
judicial_exception: NO                    # Zonas A/B; Zona C e integralmente excepcional
legal_conflict: NONE_BLOCKING             # C4 aberto (anexo mais favoravel) — revisao por caso
engine_allowed_actions: [rotear a zona temporal, exigir evidencia propria de cada zona, desviar Zona C para EXCEPTIONAL_LEGAL_OVERRIDE]
engine_forbidden_actions: [enquadrar frio em periodo >= 06/03/1997 por via ordinaria, presumir exposicao sem documento na Zona B]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` (Zonas A/B) · `REQUIRES_HUMAN_CONFIRMATION` · `INCONCLUSIVE` · Zona C → trilha `EXCEPTIONAL_LEGAL_OVERRIDE` (nunca `RULE_MATCHED` ordinário)

### EXEMPLOS
- **Caso positivo:** Trabalhador de câmara frigorífica, CTPS 1988 (Zona A) → `RULE_MATCHED` (categoria).
- **Caso negativo:** Exposição a frio em 2010 sem decisão judicial/administrativa → sem enquadramento ordinário → trilha de exceção (sem decisão = não enquadrável).
- **Caso limítrofe:** Frio em 1996 (Zona B) com formulário, mas sem laudo após 14/10/1996 → `REQUIRES_HUMAN_CONFIRMATION` (exigência documental do sub-período).

### CHECKSUM JURÍDICO
```
HIST_FRIO|v1|SOCIAL_SECURITY|HIST_FRIO|DECREE+ADMINISTRATIVE_INSTRUCTION|L3+L4|HISTORICAL_CLASSIFICATION|null|1997-03-05|AGENT_LIST_CHANGE|Dec. 83.080/1979#AnexoI-1.1.2#planalto.gov.br/ccivil_03/decreto/d83080.htm|IN 128/2022#art.301|null|HISTORICAL_ZONES|QUALITATIVE_BY_ZONE|MET_QUALIT|exposure_period_zone|ZONE_ROUTING|null|null|null|null|ZonaAB->RULE_MATCHED(+human);ZonaC->EXCEPTIONAL_LEGAL_OVERRIDE
```

---

## R28 — EXCEPTIONAL_LEGAL_OVERRIDE

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `EXCEPTIONAL_LEGAL_OVERRIDE` |
| internal_agent_code | `GOV_EXCEPTION` (governança) — agentes: `HIST_FRIO`, `HIST_UMIDADE`, `HIST_ELETRICIDADE`, `HIST_RAD_NION`, `OUTRO` |
| Nome | Enquadramento excepcional de agente fora do Anexo IV por decisão judicial/administrativa |
| Categoria | REGRA_DE_EXCEÇÃO — GOVERNANÇA |
| authority_type | `ESOCIAL_RULE` + `ADMINISTRATIVE_INSTRUCTION` |
| authority_level | `L5_ESOCIAL` · `L4_ADMINISTRATIVE` |
| legal_effect_scope | `ESOCIAL_VALIDATION`, `JUDICIAL_RECOGNITION` |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 1997-03-06 |
| valid_to | vigente |
| temporal_change_type | `AGENT_LIST_CHANGE` (rol exaustivo a partir do Dec. 2.172/1997), `ESOCIAL_MAPPING_CHANGE` |
| Justificativa do marco inicial | A partir do Decreto 2.172/1997 os agentes históricos fora do rol só são reconhecíveis por decisão específica |
| Justificativa do marco final | Canal oficial vigente: Tabela 24, código 05.01.001, com processo obrigatório no S-2240 |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | eSocial — Tabela 24 (leiaute S-1.3) |
| Dispositivo exato | Código 05.01.001; S-2240 exige número do processo judicial/administrativo |
| Transcrição literal | `LITERALIDADE_PENDENTE` — descrição oficial confirmada ✅: "agentes nocivos não constantes do Anexo IV do Decreto 3.048/1999, incluídos por força de decisão judicial ou administrativa" |
| URL oficial | https://www.gov.br/esocial (Tabela 24, leiaute S-1.3) |
| Norma complementar | IN PRES/INSS 128/2022, art. 301 ✅ |
| Precedente judicial | Precedentes anexáveis conforme o caso (ex.: Tema 210/TNU — eletricidade; Tema 159/TNU — ver correção C15 abaixo) |

### REGRA PARAMETRIZÁVEL (estrutura — cada aplicação é validada por humano)
```yaml
criterion: DOCUMENTED_DECISION_REQUIRED
evaluation_type: DOCUMENTAL
methodology: NOT_APPLICABLE
parameter: exceptional_record            # {decision_type, decision_scope, process_number, issuing_body, tema_number, transito_em_julgado, period_start/end, worker_id, employer_cnpj, supporting_document, legal_basis_summary, human_validation, status}
operator: REQUIRES_VALIDATED             # status = VALIDATED exige human_validation.validated = true + documento anexado
threshold: NOT_APPLICABLE
unit: NOT_APPLICABLE
epc_behavior: NOT_APPLICABLE
epi_behavior: NOT_APPLICABLE
outcome_spec: registro VALIDATED -> RULE_MATCHED (com processo reportado no S-2240 via 05.01.001); PENDING_LEGAL_VALIDATION -> REQUIRES_HUMAN_CONFIRMATION; sem decisao -> INCONCLUSIVE (nao enquadra)
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `GOV_EXCEPTION` |
| Código Anexo IV | NOT_APPLICABLE (por definição — agente fora do Anexo IV) |
| Descrição Anexo IV | NOT_APPLICABLE |
| Código Tabela 24 | 05.01.001 (fixo) |
| Descrição oficial Tabela 24 | "Agentes nocivos não constantes do Anexo IV do Decreto 3.048/1999, incluídos por força de decisão judicial ou administrativa" |
| Vigências dos mapeamentos | Tabela 24 05.01.001: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES                           # estrutura da regra; cada aplicacao e validada por humano
automation_level: HUMAN_DECISION_REQUIRED # sempre
human_confirmation_required: YES          # sempre
judicial_exception: NOT_APPLICABLE        # a propria regra E a trilha de excecao
legal_conflict: NONE
engine_allowed_actions: [validar completude do registro de decisao, exigir numero de processo, gerar 05.01.001 no S-2240 somente apos VALIDATED, manter trilha de auditoria]
engine_forbidden_actions: [enquadrar agente fora do Anexo IV sem decisao documentada, aplicar tese vinculante como regra geral sem vinculo derivado por segurado, usar PARADIGMA_NAO_VINCULANTE sem revisao especifica]
```

### RESULTADOS DO MOTOR
`RULE_MATCHED` (apenas com `VALIDATED` humano) · `REQUIRES_HUMAN_CONFIRMATION` · `INCONCLUSIVE`

### EXEMPLOS
- **Caso positivo:** Eletricidade >250V em 2010 com decisão judicial transitada anexada (PEDILEF + trânsito) → registro validado por humano → `RULE_MATCHED` → S-2240 com 05.01.001 + número do processo.
- **Caso negativo:** Umidade em 2005, sem decisão → `INCONCLUSIVE` (não enquadrável por via ordinária).
- **Caso limítrofe:** Decisão de primeira instância sem trânsito, ou paradigma não vinculante citado → `REQUIRES_HUMAN_CONFIRMATION` (permanece `PENDING_LEGAL_VALIDATION`).

### CHECKSUM JURÍDICO
```
EXCEPTIONAL_LEGAL_OVERRIDE|v1|SOCIAL_SECURITY|GOV_EXCEPTION|ESOCIAL_RULE+ADMINISTRATIVE_INSTRUCTION|L5+L4|ESOCIAL_VALIDATION+JUDICIAL_RECOGNITION|1997-03-06|null|AGENT_LIST_CHANGE+ESOCIAL_MAPPING_CHANGE|eSocial Tabela 24#05.01.001#gov.br/esocial|IN 128/2022#art.301|conforme-caso(anexavel)|DOCUMENTED_DECISION_REQUIRED|DOCUMENTAL|null|exceptional_record|REQUIRES_VALIDATED|null|null|null|null|VALIDATED->RULE_MATCHED(05.01.001+processo)
```

---

## R29 — ELEC_TNU_210

### IDENTIFICAÇÃO
| Campo | Valor |
|---|---|
| rule_key | `ELEC_TNU_210` |
| internal_agent_code | `HIST_ELETRICIDADE` |
| Nome | Eletricidade >250V — critério de habitualidade/permanência (TNU Tema 210) — **exceção judicial documentada** |
| Categoria | FÍSICO — EXCEÇÃO JUDICIAL (referência) |
| authority_type | `TNU_PRECEDENT` |
| authority_level | `L7_JUDICIAL_BINDING` |
| legal_effect_scope | `JUDICIAL_RECOGNITION` (**somente**) |

### VIGÊNCIA
| Campo | Valor |
|---|---|
| valid_from | 2019-12 (dezembro/2019 — julgamento do tema) |
| valid_to | vigente |
| temporal_change_type | `JUDICIAL_INTERPRETATION_CHANGE` |
| Justificativa do marco inicial | Julgamento do Tema 210/TNU (PEDILEF 0501567-42.2017.4.05.8405/RN) |
| Justificativa do marco final | Tema vinculante vigente |

### FUNDAMENTO
| Campo | Valor |
|---|---|
| Norma principal | TNU — Tema 210 |
| Dispositivo exato | PEDILEF 0501567-42.2017.4.05.8405/RN (inteiro teor ✅) |
| Transcrição literal | `LITERALIDADE_PENDENTE` (tese) — conteúdo confirmado em inteiro teor ✅: habitualidade/permanência interpretadas pela **probabilidade da exposição** e pelo **caráter indissociável** do processo/serviço, **sem exigência de tempo mínimo de exposição na jornada** (não se exige exposição ininterrupta) |
| URL oficial | https://www.cjf.jus.br/publico/pdfs/05015674220174058405.pdf |
| Norma complementar | NOT_APPLICABLE |
| Precedente judicial | A própria regra (TNU Tema 210) |

### REGRA PARAMETRIZÁVEL
```yaml
criterion: JUDICIAL_HABITUALITY_CRITERION
evaluation_type: REFERENCE_ONLY          # documenta excecao; nao e regra administrativa
methodology: NOT_APPLICABLE
parameter: NOT_APPLICABLE
operator: NOT_APPLICABLE
threshold: NOT_APPLICABLE
unit: NOT_APPLICABLE
epc_behavior: NOT_APPLICABLE
epi_behavior: NOT_APPLICABLE
outcome_spec: NOT_APPLICABLE             # sem resultado operacional proprio; alimenta a trilha EXCEPTIONAL_LEGAL_OVERRIDE como precedente anexavel (decision_scope=TNU_TEMA_VINCULANTE, tema_number=210)
```

### MAPEAMENTOS
| Campo | Valor |
|---|---|
| Código interno | `HIST_ELETRICIDADE` |
| Código Anexo IV | Ausente ✅ (agente fora do Anexo IV vigente) |
| Descrição Anexo IV | NOT_APPLICABLE |
| Código Tabela 24 | Sem código autônomo; 05.01.001 via `EXCEPTIONAL_LEGAL_OVERRIDE` |
| Descrição oficial Tabela 24 | 05.01.001 — decisão judicial/administrativa (com processo) |
| Vigências dos mapeamentos | Tabela 24 05.01.001: S-1.3 (jan/2023 → vigente) |

### AUTOMAÇÃO
```yaml
seed_ready: YES                           # como excecao judicial documentada — nunca como regra administrativa
automation_level: NOT_APPLICABLE          # nao automatizavel; referencia para revisao humana
human_confirmation_required: YES          # sempre
judicial_exception: NOT_APPLICABLE        # a propria regra E a excecao
legal_conflict: NONE
engine_allowed_actions: [anexar o precedente a trilha EXCEPTIONAL_LEGAL_OVERRIDE, apresentar o criterio de habitualidade ao revisor humano]
engine_forbidden_actions: [converter o tema em regra INSS_ADMINISTRATIVE, aplicar o criterio automaticamente a outros agentes, reconhecer especialidade sem decisao humana]
```

### RESULTADOS DO MOTOR
Nenhum resultado operacional próprio. Nas trilhas que o invocam: `REQUIRES_HUMAN_CONFIRMATION` (sempre) · `RULE_WITH_JUDICIAL_EXCEPTION` (registro da órbita)

### EXEMPLOS
- **Caso positivo (de referência):** Eletricista de manutenção de subestação (>250V), exposição não diária mas inerente à rotina, 2015 → caso desviado à trilha de exceção com Tema 210 anexado → decisão humana.
- **Caso negativo:** Exposição eventual a baixa tensão (<250V) → fora da órbita do tema → `INCONCLUSIVE` para a exceção.
- **Caso limítrofe:** Eletricidade >250V pós-1997 **sem** decisão judicial individual e sem vínculo derivado documentado → `REQUIRES_HUMAN_CONFIRMATION` (o tema não gera enquadramento automático).

### CHECKSUM JURÍDICO
```
ELEC_TNU_210|v1|SOCIAL_SECURITY|HIST_ELETRICIDADE|TNU_PRECEDENT|L7|JUDICIAL_RECOGNITION|2019-12-01|null|JUDICIAL_INTERPRETATION_CHANGE|TNU Tema 210#PEDILEF 0501567-42.2017.4.05.8405/RN#cjf.jus.br/publico/pdfs/05015674220174058405.pdf|null|null|JUDICIAL_HABITUALITY_CRITERION|REFERENCE_ONLY|null|null|null|null|null|null|null|sem resultado operacional proprio
```

---
---

# CORREÇÃO C15 — TEMA 159/TNU (desmembramento)

O conflito **C15** ("TNU Tema 159 — inteiro teor não conferido em fonte primária") é desmembrado em:

## C15A — Existência e tese central do Tema 159 → **RESOLVIDO ✅**

Conferido em **23/08/2026** na página oficial do CJF/TNU (questão submetida, tese, processo, julgamento e trânsito verificados):

| Campo | Valor conferido |
|---|---|
| Situação do tema | **Julgado** |
| Ramo do direito | Direito Previdenciário |
| Questão submetida a julgamento | "Saber se é possível reconhecer a especialidade de período laborado com exposição ao agente nocivo eletricidade acima de 250 volts, apesar de não haver previsão no Decreto 2.172/97." |
| Tese firmada | "É possível o reconhecimento como especial de período laborado com exposição ao agente energia elétrica, após o Decreto 2.172/97, para fins de concessão de aposentadoria especial." |
| Processo | PEDILEF 5001238-34.2012.4.04.7102/RS |
| Decisão de afetação | 13/06/2014 |
| Relator(a) | Juiz Federal Bruno Leonardo Câmara Carra |
| Julgado em | 06/08/2014 |
| Acórdão publicado em | 26/09/2014 |
| Trânsito em julgado | 13/10/2014 |
| URL oficial | https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/turma-nacional-de-uniformizacao/temas-representativos/tema-159 |

**Vedação mantida:** o Tema 159 **não** é automatizado como regra administrativa ordinária. Ele alimenta exclusivamente a trilha `EXCEPTIONAL_LEGAL_OVERRIDE` como precedente anexável (`decision_scope=TNU_TEMA_VINCULANTE`, `tema_number=159`). A regra `ELEC_TNU_159` permanece fora da lista de seed (não aplicável a automação), agora com existência/tese confirmadas — seu status passa de "inteiro teor pendente" para "tese confirmada; nuances pendentes (C15B)".

## C15B — Nuances do inteiro teor → **PERMANECE PENDENTE**

Permanecem `PENDING_LEGAL_VALIDATION` as nuances do inteiro teor necessárias a interpretação ou automatização (ex.: tensão mínima exata na ratio decidendi — "250 volts" na questão × redação genérica da tese; requisitos probatórios discutidos no acórdão). C15B **não** fundamenta automação e não bloqueia nenhuma das 29 regras desta lista.

---
---

# SEED_APPROVAL_CHECKLIST

| rule_key | source_confirmed | dates_confirmed | methodology_confirmed | mappings_confirmed | conflict_blocking | seed_ready | automation_level | recommended_action |
|---|---|---|---|---|---|---|---|---|
| GEN_EFFECTIVE_EXPOSURE | YES | YES | NOT_APPLICABLE | NOT_APPLICABLE | NO | YES | SAFE_TO_AUTOMATE | **APPROVE_FOR_SEED** |
| GEN_TEMPORAL_RULE | YES | YES | NOT_APPLICABLE | NOT_APPLICABLE | NO | YES | SAFE_TO_AUTOMATE | **APPROVE_FOR_SEED** |
| GEN_TECHNICAL_RESPONSIBLE | YES | YES | NOT_APPLICABLE | NOT_APPLICABLE | NO | YES | SAFE_TO_AUTOMATE | **APPROVE_FOR_SEED** |
| GEN_ANNEX_IV_SCOPE | YES | YES | NOT_APPLICABLE | YES | NO (C12 não bloqueia) | YES | SAFE_TO_AUTOMATE (roteamento) | **APPROVE_FOR_SEED** |
| EPI_EFFECT_REQUIRES_CONTEXT | YES | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NO | YES | HUMAN_DECISION_REQUIRED (roteamento automático) | **APPROVE_FOR_SEED** |
| EPI_NOISE_EXCEPTION | YES | YES | NOT_APPLICABLE | YES | NO | YES | SAFE_TO_AUTOMATE | **APPROVE_FOR_SEED** |
| NOISE_V1 | YES | YES | NOT_APPLICABLE | YES | NO (C4 imaterial) | YES | SAFE_TO_AUTOMATE (categoria) | **APPROVE_FOR_SEED** |
| NOISE_V2A | YES | YES | NOT_APPLICABLE (não normatizada) | YES | NO | YES | SAFE_TO_AUTOMATE | **APPROVE_FOR_SEED** |
| NOISE_V2B | YES | YES | NOT_APPLICABLE (não normatizada) | YES | NO | YES | SAFE_TO_AUTOMATE | **APPROVE_FOR_SEED** |
| NOISE_V3 | YES | YES | YES | YES | NO | YES | SAFE_TO_AUTOMATE | **APPROVE_FOR_SEED** |
| NOISE_V4 | YES | YES | YES | YES | NO (C10 imaterial) | YES | SAFE_TO_AUTOMATE | **APPROVE_FOR_SEED** |
| NOISE_V5 | YES | YES | YES (remissão NR-15; C5 interno) | YES | NO | YES | SAFE_TO_AUTOMATE | **APPROVE_FOR_SEED** |
| HEAT_V1 | YES | YES | NOT_APPLICABLE | YES | NO (C4 imaterial) | YES | SAFE_TO_AUTOMATE (categoria) | **APPROVE_FOR_SEED** |
| HEAT_V2 | YES | YES | NOT_APPLICABLE | YES | NO | YES | AUTOMATE_WITH_HUMAN_CONFIRMATION | **APPROVE_FOR_SEED** |
| HEAT_V3 | YES | YES | YES (NR-15 An. 3 — valores confirmados) | YES | NO (C6 não bloqueia) | YES | SAFE_TO_AUTOMATE (comparação IBUTG) | **APPROVE_FOR_SEED** |
| HEAT_V4 | YES | YES | YES | YES | NO (C6, C10 não bloqueiam) | YES | SAFE_TO_AUTOMATE | **APPROVE_FOR_SEED** (com `judicial_exception` Tema 323/TNU) |
| VIB_V1_QUAL | YES | YES | NOT_APPLICABLE | YES | NO | YES | AUTOMATE_WITH_HUMAN_CONFIRMATION | **APPROVE_FOR_SEED** |
| VIB_V1_QUANT | YES | YES | YES (120 golpes/min literal na IN) | YES | NO | YES | SAFE_TO_AUTOMATE | **APPROVE_FOR_SEED** |
| VIB_QUALIT_PERF | YES | YES | NOT_APPLICABLE | YES | NO (C13 não bloqueia o núcleo) | YES | AUTOMATE_WITH_HUMAN_CONFIRMATION | **APPROVE_FOR_SEED** (com `judicial_exception` C13) |
| BIO_V1 | YES | YES | NOT_APPLICABLE | YES | NO | YES | AUTOMATE_WITH_HUMAN_CONFIRMATION | **APPROVE_FOR_SEED** |
| BIO_V2 | YES | YES | YES (qualitativa circunstanciada) | YES | NO (C14 — só fora do rol) | YES | PARTIALLY_PARAMETERIZABLE | **APPROVE_FOR_SEED** (com `judicial_exception` C14) |
| RAD_ION_RULE | YES | YES | YES (dosimetria CNEN) | YES (02.01.006–013 confirmados ✅ — condicional 1:N por atividade; genérico 02.01.006 só com humano) | NO | YES | PARTIALLY_PARAMETERIZABLE | **APPROVE_FOR_SEED** |
| PRESS_HIPER_RULE | YES | YES | YES | YES (02.01.015–018 confirmados ✅ — condicional 1:N por atividade; genérico 02.01.015 só com humano) | NO | YES | PARTIALLY_PARAMETERIZABLE | **APPROVE_FOR_SEED** |
| ASSOC_GENERAL | YES | YES | NOT_APPLICABLE | NOT_APPLICABLE | NO | YES | AUTOMATE_WITH_HUMAN_CONFIRMATION | **APPROVE_FOR_SEED** |
| ASSOC_MIN_SUB_AF | YES | YES | NOT_APPLICABLE | YES (04.01.001 confirmado ✅) | NO | YES | PARTIALLY_PARAMETERIZABLE | **APPROVE_FOR_SEED** |
| ASSOC_MIN_SUB_FP | YES | YES | NOT_APPLICABLE | YES (04.01.002 confirmado ✅) | NO | YES | PARTIALLY_PARAMETERIZABLE | **APPROVE_FOR_SEED** |
| HIST_FRIO | YES | YES | NOT_APPLICABLE | YES (sem código autônomo; 05.01.001 na Zona C) | NO (C4) | YES | PARTIALLY_PARAMETERIZABLE (Zonas A/B) | **APPROVE_FOR_SEED** |
| EXCEPTIONAL_LEGAL_OVERRIDE | YES | YES | NOT_APPLICABLE | YES (05.01.001) | NO | YES | HUMAN_DECISION_REQUIRED (sempre) | **APPROVE_FOR_SEED** |
| ELEC_TNU_210 | YES | YES | NOT_APPLICABLE | NOT_APPLICABLE | NO | YES | NOT_APPLICABLE (referência) | **APPROVE_AS_REFERENCE_ONLY** |

## Consolidação final

| recommended_action | Quantidade | Regras |
|---|---|---|
| **APPROVE_FOR_SEED** | **28** | Todas, exceto ELEC_TNU_210 |
| **APPROVE_AS_REFERENCE_ONLY** | **1** | ELEC_TNU_210 (exceção judicial documentada — nunca regra administrativa) |
| **RETURN_FOR_CORRECTION** | **0** | — |
| **Total** | **29** | |

**Observações finais:**
1. As 4 regras com `judicial_exception` (GEN_ANNEX_IV_SCOPE/C12, HEAT_V4/C6, VIB_QUALIT_PERF/C13, BIO_V2/C14) entram no seed **com o registro obrigatório da exceção** e desvio para revisão humana nos casos da órbita.
2. As 4 regras com `mappings_confirmed = PARTIAL` (RAD_ION_RULE, PRESS_HIPER_RULE, ASSOC_MIN_SUB_AF, ASSOC_MIN_SUB_FP) entram no seed **sem** os códigos individuais da Tabela 24 — mapeamentos são externos e versionados, a complementar em rodada específica de extração da S-1.3.
3. `EPI_EFFECT_REQUIRES_CONTEXT` e `EXCEPTIONAL_LEGAL_OVERRIDE` têm `seed_ready = YES` **e** `HUMAN_DECISION_REQUIRED` simultaneamente — armazenamento confiável, decisão sempre humana.
4. C15A resolvido nesta rodada (página oficial CJF/TNU); C15B permanece aberto sem efeito bloqueante.
5. **Este documento não autoriza seed.** A Fase 2B permanece bloqueada até aprovação nominal desta revisão.
