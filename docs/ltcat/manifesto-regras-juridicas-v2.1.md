# MANIFESTO DE REGRAS JURÍDICAS — LTCAT PREVIDENCIÁRIO
## Versão 2.1 — FASE 2A.1: NORMALIZAÇÃO JURÍDICA PARA PARAMETRIZAÇÃO

| Campo | Valor |
|---|---|
| Versão | 2.1 (revisão documental de normalização — **não autoriza seed, não autoriza Fase 2B**) |
| Base | `manifesto-regras-juridicas-v2.md` (v2.0) — **integralmente incorporado por referência**; este documento acrescenta a camada de normalização jurídica e corrige os pontos indicados na revisão |
| Data | 23/08/2026 |
| Domínio | `SOCIAL_SECURITY` (aposentadoria especial RGPS) — exclusivamente |
| Status | `READY_FOR_REVIEW` — nenhuma regra parametrizada em software; nada criado em banco, migration, seed ou código |
| Artefato complementar | `rule-implementation-readiness-v1.md` (matriz final de prontidão, §9 deste documento) |

---

# 1. MODELO DE AUTORIDADE (novo — obrigatório para toda regra)

Toda regra do manifesto passa a carregar **três atributos de autoridade**, além dos atributos temporais e de consequência já existentes.

## 1.1 `authority_type` — natureza da fonte

| Valor | Descrição | Exemplos neste manifesto |
|---|---|---|
| `LAW` | Lei federal | Lei 8.213/1991, Lei 9.032/1995, Lei 9.528/1997, Lei 9.732/1998 |
| `DECREE` | Decreto regulamentador | Decretos 53.831/64, 83.080/79, 2.172/97, 3.048/99, 4.882/03, 8.123/13, 10.410/20 |
| `ADMINISTRATIVE_INSTRUCTION` | Instrução normativa / ato administrativo federal | IN PRES/INSS 128/2022, MP 1.523/96 (ato provisório com força de lei — registrado aqui por sua função operacional), Portaria MTE 1.297/2014 |
| `ESOCIAL_RULE` | Leiaute/tabela oficial do eSocial | Tabela 24 (S-1.3), evento S-2240 |
| `TECHNICAL_STANDARD` | Norma técnica (critério, não fonte de direito) | NR-15 (Anexos 1, 2, 3, 8, 11, 12, 13, 13-A), NHO-01/05/06/08/09/10, ISO 2.631, ISO/DIS 5.349, CNEN NN 3.01 |
| `STF_PRECEDENT` | Precedente vinculante STF (repercussão geral) | Tema 555/STF, Tema 998/STF, ADI 3.406/3.470 |
| `STJ_PRECEDENT` | Precedente repetitivo STJ | Tema 694/STJ, Tema 1.083/STJ, Tema 1.090/STJ, Tema 534/STJ |
| `TNU_PRECEDENT` | Tema vinculante TNU | Tema 159/TNU, Tema 210/TNU, Tema 323/TNU |
| `OTHER_JUDICIAL_PRECEDENT` | Decisão judicial não vinculante (TRF, turmas, casos isolados) | Jurisprudência TRF4 (radiação não ionizante), TRF2 (LINACH) |

**Regra de separação (mandatória):** uma decisão judicial **nunca** é tratada como se fosse automaticamente regra administrativa do INSS. Precedentes têm `authority_type` judicial e `legal_effect_scope` restrito a `JUDICIAL_RECOGNITION` (salvo expressa recepção administrativa confirmada em fonte primária — ex.: Tema 555/STF recepcionado pelo art. 290, parágrafo único, da IN 128/2022, caso em que o efeito administrativo deriva da **IN**, não do precedente).

## 1.2 `legal_effect_scope` — âmbito de efeito jurídico (multi-valorado quando fundamentado)

| Valor | Descrição |
|---|---|
| `TECHNICAL_ASSESSMENT` | Fundamenta a avaliação técnica (medição, metodologia, limite) |
| `LTCAT_DOCUMENTATION` | Fundamenta exigência de conteúdo/forma do LTCAT e documentos correlatos |
| `INSS_ADMINISTRATIVE` | Vincula a análise administrativa do INSS |
| `ESOCIAL_VALIDATION` | Fundamenta mapeamento/validação no eSocial (S-2240, Tabela 24) |
| `JUDICIAL_RECOGNITION` | Fundamenta reconhecimento em sede judicial (não gera automação administrativa) |
| `HISTORICAL_CLASSIFICATION` | Fundamenta enquadramento de períodos históricos (regimes revogados) |

## 1.3 `authority_level` — origem/hierarquia da fonte

Não se trata de hierarquia numérica arbitrária de conclusão jurídica; é a **identificação clara da natureza e origem** da autoridade, para impedir sobrescrita silenciosa.

| Nível | Natureza | Prevalece sobre |
|---|---|---|
| `L1_CONSTITUTIONAL` | CF, Emendas Constitucionais | Todos |
| `L2_LAW` | Lei federal | L3–L6 |
| `L3_DECREE` | Decreto regulamentador | L4–L6 |
| `L4_ADMINISTRATIVE` | IN, portarias, atos administrativos federais | L5–L6 (no âmbito administrativo) |
| `L5_ESOCIAL` | Leiautes/tabelas eSocial | L6 (no âmbito de escrituração) |
| `L6_TECHNICAL` | NR, NHO, ISO, CNEN | Nenhuma norma jurídica — é critério técnico de suporte |
| `L7_JUDICIAL_BINDING` | STF (repercussão geral), STJ (repetitivo), TNU (tema) | Vincula julgamentos; **não altera regra administrativa por si só** |
| `L8_JUDICIAL_NON_BINDING` | Demais decisões judiciais | Persuasivo apenas |

**Regras anti-sobrescrita (mandatórias):**
1. Uma `TECHNICAL_STANDARD` jamais sobrescreve, silencia ou altera regra de `LAW`/`DECREE`/`ADMINISTRATIVE_INSTRUCTION` — ela apenas operacionaliza critério quando a norma jurídica a ela remete.
2. Um precedente `L7`/`L8` jamais é convertido automaticamente em regra `INSS_ADMINISTRATIVE`.
3. Regra de nível superior só é substituída por ato de mesmo nível ou superior, com `valid_from/valid_to` explícitos.
4. Qualquer divergência material entre fontes → status de regra `LEGAL_CONFLICT_REQUIRES_REVIEW` e registro em §8. **Conflitos nunca são apagados.**

---

# 2. VOCABULÁRIO DE STATUS DE REGRA (novo — o motor futuro deve distinguir)

| Status | Significado | Comportamento no motor |
|---|---|---|
| `RULE_VALIDATED` | Fonte primária, dispositivo, período, metodologia (quando exigida) e consequência confirmados; sem conflito bloqueante | Elegível a seed (ver critérios §9) |
| `RULE_WITH_JUDICIAL_EXCEPTION` | Regra ordinária validada, mas existe exceção jurisprudencial documentada que pode afastar/alterar o resultado em casos concretos | Regra ordinária aplicável; casos na órbita da exceção são desviados para revisão humana; a exceção **nunca** é aplicada automaticamente como regra geral |
| `LEGAL_CONFLICT_REQUIRES_REVIEW` | Conflito jurídico aberto e documentado | Bloqueia seed da consequência afetada; mantido formalmente no registro de conflitos |
| `NOT_PARAMETERIZED` | Sem base suficiente para qualquer parametrização | Apenas detecção/roteamento para revisão humana |
| `PENDING_LEGAL_VALIDATION` | Item pontual da regra aguardando confirmação em fonte primária | Bloqueia seed até confirmação |

---

# 3. TIMELINE NORMALIZADA — `temporal_change_type` por marco (substitui §2 da v2.0)

Tipos admitidos: `EXPOSURE_THRESHOLD_CHANGE` · `METHODOLOGY_CHANGE` · `DOCUMENTATION_REQUIREMENT_CHANGE` · `AGENT_LIST_CHANGE` · `CLASSIFICATION_RULE_CHANGE` · `EPI_RULE_CHANGE` · `ESOCIAL_MAPPING_CHANGE` · `JUDICIAL_INTERPRETATION_CHANGE`.

| # | Data | Marco | `temporal_change_type` (multi-valorado) | Observação de normalização |
|---|---|---|---|---|
| T1 | 30/03/1964 | Decreto 53.831/64 | `CLASSIFICATION_RULE_CHANGE`, `AGENT_LIST_CHANGE` | Institui categoria profissional e rol histórico (inclui frio, umidade, eletricidade, radiação) |
| T2 | 29/01/1979 | Decreto 83.080/79 | `AGENT_LIST_CHANGE` | Restringe rol de físicos; convive com T1 (mais favorável — C4 aberto) |
| T3 | 25/07/1991 | Lei 8.213/91 | `CLASSIFICATION_RULE_CHANGE`, `DOCUMENTATION_REQUIREMENT_CHANGE` | PBPS; formulários de comprovação |
| T4 | 29/04/1995 | Lei 9.032/95 | `CLASSIFICATION_RULE_CHANGE` | **Fim do enquadramento por categoria** — não é mudança de limite nem de documento |
| T4a | 14/10/1996 | MP 1.523/96 (→ Lei 9.528/97) | `DOCUMENTATION_REQUIREMENT_CHANGE` | **Correção aplicada:** não é "nova regra de ruído"; é exigência documental (laudo técnico lastreando o formulário) que afeta **todos** os agentes no período, não apenas o ruído |
| T5 | 06/03/1997 | Decreto 2.172/97 | `EXPOSURE_THRESHOLD_CHANGE` (ruído 90 dB(A)), `AGENT_LIST_CHANGE` (exclui frio/umidade/eletricidade/radiação não ionizante), `METHODOLOGY_CHANGE` (vibrações → ISO 2.631/5.349), `DOCUMENTATION_REQUIREMENT_CHANGE` (formulário + laudo) | Marco múltiplo — registrar os 4 efeitos separadamente |
| T6 | 11/12/1997 | Lei 9.528/97 | `DOCUMENTATION_REQUIREMENT_CHANGE` | Conversão da MP 1.523/96 (literalidade `PENDING`) |
| T7 | 14/12/1998 | Lei 9.732/98 | `CLASSIFICATION_RULE_CHANGE` | Requisitos 15/20/25 anos (literalidade `PENDING`) |
| T8 | 06/05/1999 | Decreto 3.048/99 | `AGENT_LIST_CHANGE`, `CLASSIFICATION_RULE_CHANGE` | Anexo IV unificado; rol exaustivo (vigência exata — C10 aberto) |
| T9 | 19/11/2003 | Decreto 4.882/2003 | `EXPOSURE_THRESHOLD_CHANGE` (ruído 90→85), `AGENT_LIST_CHANGE` (biológicos — redação), `CLASSIFICATION_RULE_CHANGE` (associação 4.0.0) | Sem retroatividade (Tema 694/STJ) |
| T10 | 01/01/2004 | PPP documento padrão | `DOCUMENTATION_REQUIREMENT_CHANGE` | Ato exato `PENDING` |
| T11 | 17/10/2013 | Decreto 8.123/2013 | `METHODOLOGY_CHANGE` | NHO-01 (ruído), NHO-06 (calor) — literalidade `PENDING` |
| T11a | 10/09/2012 | NHO-09/NHO-10 publicadas | `METHODOLOGY_CHANGE` (facultativa) | Opção da empresa (art. 296, III, parte final, IN 128/2022) |
| T11b | 13/08/2014 | Portaria MTE 1.297/2014 (Anexo 8 NR-15) | `EXPOSURE_THRESHOLD_CHANGE`, `METHODOLOGY_CHANGE` | Vibrações: limite regulamentar + NHO-09/10 obrigatórias |
| T12 | 13/11/2019 | EC 103/2019 | `CLASSIFICATION_RULE_CHANGE` | Benefício/conversão — **não** altera caracterização da exposição |
| T13 | 30/06/2020 | Decreto 10.410/2020 | `CLASSIFICATION_RULE_CHANGE` | Revoga tabela de conversão (art. 70) |
| T14 | 28/03/2022 | IN PRES/INSS 128/2022 | `DOCUMENTATION_REQUIREMENT_CHANGE`, `EPI_RULE_CHANGE`, `CLASSIFICATION_RULE_CHANGE` (sub-períodos expressos: arts. 292, 296, 299, 301) | Norma operacional de evidências |
| T15 | jan/2023 | PPP eletrônico (S-2240) | `ESOCIAL_MAPPING_CHANGE`, `DOCUMENTATION_REQUIREMENT_CHANGE` | Rastreabilidade LTCAT↔S-2240 |
| J1 | 04/12/2014 | Tema 555/STF (RE 664.335) | `JUDICIAL_INTERPRETATION_CHANGE`, `EPI_RULE_CHANGE` | Eficácia do EPI; exceção absoluta do ruído (item II) |
| J2 | 14/05/2014 | Tema 694/STJ | `JUDICIAL_INTERPRETATION_CHANGE` | Vedação de retroatividade do limite de 85 dB(A) |
| J3 | 2018 | Tema 1.083/STJ (REsp 1.886.795/RS) | `JUDICIAL_INTERPRETATION_CHANGE` | Ruído sem NEN: critério do nível máximo |
| J4 | dez/2019 | Tema 210/TNU | `JUDICIAL_INTERPRETATION_CHANGE` | Habitualidade da exposição à eletricidade (ver §4) |
| J5 | 29/04/2025 | Tema 1.090/STJ | `JUDICIAL_INTERPRETATION_CHANGE`, `EPI_RULE_CHANGE` | Anotação de EPI eficaz no PPP (ver §6) |
| J6 | 19/11/2025 | Tema 323/TNU | `JUDICIAL_INTERPRETATION_CHANGE` | Requisitos técnicos do PPP para calor (íntegra pendente — C6) |
| J7 | 21/10/2025 | Tese TNU vibrações | `JUDICIAL_INTERPRETATION_CHANGE` | Somente fontes secundárias — `PENDING` (C13) |

---

# 4. ELETRICIDADE — TEMAS TNU SEPARADOS (correção aplicada)

Os dois precedentes **não** são fundidos. Cada um responde a questão distinta e permanece com escopo exclusivamente judicial.

### ELEC-TNU-159 — Possibilidade de enquadramento pós-1997
- **rule_key:** `ELEC_POST_1997_POSSIBILITY`
- **authority_type:** `TNU_PRECEDENT` · **authority_level:** `L7_JUDICIAL_BINDING`
- **legal_effect_scope:** `JUDICIAL_RECOGNITION` (**somente**)
- **Questão:** possibilidade de reconhecimento de especialidade por exposição à eletricidade em tensão superior a 250 V **após** o Decreto 2.172/1997 (agente fora do Anexo IV).
- **Tese literal:** `PENDING_LEGAL_VALIDATION` — registrada conforme deliberação da revisão; inteiro teor do acórdão não foi conferido em fonte primária nesta rodada.
- **Efeito no motor:** **nenhum** enquadramento administrativo automático. Casos de eletricidade pós-06/03/1997 → trilha `EXCEPTIONAL_LEGAL_OVERRIDE` (§11.3 da v2.0), com este Tema como precedente anexável (`decision_scope=TNU_TEMA_VINCULANTE`, `tema_number=159`).

### ELEC-TNU-210 — Habitualidade/permanência da exposição
- **rule_key:** `ELEC_HABITUALITY_CRITERION`
- **authority_type:** `TNU_PRECEDENT` · **authority_level:** `L7_JUDICIAL_BINDING`
- **legal_effect_scope:** `JUDICIAL_RECOGNITION` (**somente**)
- **Questão:** habitualidade/permanência da exposição à eletricidade > 250 V — critério baseado na **probabilidade da exposição** e no **caráter indissociável** do processo/serviço, **sem exigência de tempo mínimo de exposição durante a jornada** (não se exige exposição ininterrupta).
- **Fonte primária confirmada:** PEDILEF 0501567-42.2017.4.05.8405/RN, inteiro teor (cjf.jus.br) ✅.
- **Efeito no motor:** nenhum direto; documenta critério a ser avaliado por humano na trilha de exceção.

**Vedação expressa:** é proibido transformar Tema 159 ou Tema 210 em regra `INSS_ADMINISTRATIVE` ou em enquadramento ordinário automatizado de eletricidade. O status do conjunto eletricidade-pós-1997 é `RULE_WITH_JUDICIAL_EXCEPTION` (a "regra ordinária" é a **ausência** de enquadramento; a exceção é judicial).

---

# 5. EPI — QUATRO CAMADAS OBRIGATÓRIAS (substitui §12 da v2.0)

Para cada agente, os quatro campos abaixo são **independentes e não equivalentes**. Redução técnica da exposição por EPI **não** implica automaticamente qualquer consequência para aposentadoria especial.

| Campo | Pergunta que responde | Fontes típicas |
|---|---|---|
| `technical_epi_effect` | O EPI reduz tecnicamente a exposição medida? | NHOs, NR-15, laudos, CA |
| `administrative_epi_effect` | O INSS reconhece o EPI como descaracterizador na análise administrativa? | IN 128/2022 (art. 290), atos INSS |
| `judicial_epi_effect` | Como os tribunais tratam o EPI para aquele agente? | Tema 555/STF, Tema 1.090/STJ, TNU, TRFs |
| `esocial_epi_reporting` | Como o EPI é reportado no S-2240? | Tabela 24/leiaute S-1.3 (registro de EPI com CA e indicador de eficácia — nome exato do campo `PENDING`) |

## 5.1 Matriz EPI por agente (quatro camadas)

| Agente | `technical_epi_effect` | `administrative_epi_effect` | `judicial_epi_effect` | `esocial_epi_reporting` |
|---|---|---|---|---|
| Ruído (2.0.1) | Protetor auricular reduz NPS no ouvido do trabalhador | **Nunca descaracteriza** — art. 290, parágrafo único, IN 128/2022 ✅ | **Nunca descaracteriza** — Tema 555/STF, item II ✅ | EPI reportado normalmente no S-2240; eficácia declarada **não** altera o código do agente |
| Calor (2.0.4) | EPC (ventilação/barreira) reduz IBUTG medido; EPI individual limitado | Efeito **indireto**: se a medição (com EPC) ficar ≤ limite, não há exposição especial | Sem tese específica; segue resultado da medição | Medição final reportada; EPC/EPI declarados |
| Vibrações (2.0.2) | Luvas/assentos anti-vibratórios com eficácia controversa tecnicamente | Sem regra expressa confirmada → `PENDING` | Sem tese consolidada → análise humana | Idem calor |
| Radiações ionizantes (2.0.3) | Blindagem/distância/tempo (EPC) e dosimetria | Enquadramento por atividade + dosimetria; EPI não é o eixo | Sem tese específica | Dosímetro/dose reportada |
| Pressões hiperbáricas (2.0.5) | Não aplicável (condição de trabalho) | Não descaracteriza | — | — |
| Químicos com LT não cancerígenos (CS₂, iodo, chumbo, manganês, mercúrio, fósforo) | Respirador/luvas adequados reduzem dose interna | Em tese, eficácia comprovada pode descaracterizar (IN 128/2022, art. 290 — alcance literal `PENDING`) | Tema 555/STF item I (eficácia pode neutralizar); **Tema 1.090/STJ** (anotação positiva no PPP) — alcance exato `PENDING` (C11) | EPI + CA + eficácia declarada |
| Químicos cancerígenos sem limiar (benzeno, amianto, HPA, Cr VI, níquel, Grupo II) | Redução de exposição ≠ eliminação de risco (sem dose segura — Fundacentro Despacho 24/2020/PRES) | Tratamento administrativo específico não confirmado → `PENDING` | **Controvertido**: TRF2 (LINACH — mera exposição basta) × possível alcance do Tema 1.090 — **C11 ABERTO** | Idem |
| Biológicos (3.0.1) | EPI barreira reduz contato | Não descaracteriza automaticamente | **Não pacificado** (debate TNU em curso) → conflito aberto | EPI declarado sem efeito automático |
| Eletricidade (histórico/exceção) | EPI (luvas/classe de tensão) reduz risco de contato | Agente fora do Anexo IV — sem análise ordinária | Enquadramento só judicial (Temas 159/210) | 05.01.001 com processo |

**Fontes separadas (mandatório registrar isoladamente):** Tema 555/STF · Tema 1.090/STJ · IN PRES/INSS 128/2022 (art. 290) · regras do S-2240. Nenhuma camada deriva de outra por inferência automática.

---

# 6. TEMA 1.090/STJ — ALCANCE EXATO E REGRA DE CONTEXTO

### Registro da tese
- **authority_type:** `STJ_PRECEDENT` · **authority_level:** `L7_JUDICIAL_BINDING`
- **legal_effect_scope:** `JUDICIAL_RECOGNITION`
- **Conteúdo registrado:** recurso repetitivo (decisão noticiada em 29/04/2025) — **anotação positiva sobre uso de EPI eficaz no PPP afasta o reconhecimento do tempo especial**.
- **Alcance exato:** `PENDING_LEGAL_VALIDATION` — tese literal, hipóteses de aplicação e tratamento de divergência PPP × evidências técnicas não foram confirmados em inteiro teor.
- **Vedações:** é **proibido** generalizar automaticamente `EPI eficaz → NOT_CHARACTERIZED`. É proibido estender a tese a cancerígenos sem limiar seguro enquanto **C11** estiver aberto.

### Nova regra — `EPI_EFFECT_REQUIRES_CONTEXT`
- **rule_key:** `EPI_EFFECT_REQUIRES_CONTEXT`
- **authority_type:** `OTHER` (regra interna de governança derivada dos conflitos documentados) · **authority_level:** regra do motor (não é fonte jurídica)
- **legal_effect_scope:** `LTCAT_DOCUMENTATION`, `INSS_ADMINISTRATIVE` (roteamento)
- **Disparadores obrigatórios (qualquer um):**
  1. agente possui exceção jurisprudencial documentada (ruído; eletricidade; cancerígenos LINACH);
  2. dúvida sobre eficácia do EPI (CA vencido, tipo inadequado, periodicidade ausente);
  3. **conflito entre informação do PPP e evidências técnicas** (ex.: PPP declara "EPI eficaz" e laudo mede concentração acima do LT);
  4. agente cancerígeno ou situação juridicamente controvertida (C3, C11, EPI×biológicos).
- **Consequência:** `HUMAN_DECISION_REQUIRED` com exposição das quatro camadas (§5.1) ao revisor; o motor **nunca** conclui descaracterização por EPI sozinho nesses cenários.
- **Status:** `RULE_VALIDATED` (regra de roteamento — consequência definida e sem conflito).

**C11 permanece formalmente ABERTO** até que o alcance do Tema 1.090/STJ sobre agentes cancerígenos esteja solidamente resolvido em fonte primária.

---

# 7. ATRIBUTOS NORMALIZADOS POR BLOCO (padrão de registro)

Padrão obrigatório por regra daqui em diante: `rule_key` · `authority_type` · `authority_level` · `legal_effect_scope` (multi) · `valid_from/valid_to` · `primary_source` · `conflicts` · `status` · `automation_level`. A matriz completa, linha a linha, está em `rule-implementation-readiness-v1.md`. Resumo por bloco:

| Bloco | Autoridade predominante | Scopes | Status dominante |
|---|---|---|---|
| Regras gerais (GEN) | `LAW` + `ADMINISTRATIVE_INSTRUCTION` | `INSS_ADMINISTRATIVE`, `LTCAT_DOCUMENTATION` | Misto (§readiness) |
| Ruído | `DECREE` (limites) + `TECHNICAL_STANDARD` (NHO-01) + `STF_PRECEDENT` (EPI) + `ADMINISTRATIVE_INSTRUCTION` (IN 128) | `TECHNICAL_ASSESSMENT`, `INSS_ADMINISTRATIVE`, `JUDICIAL_RECOGNITION` | `RULE_VALIDATED` (V1–V5); V6/V7 pendentes de literalidade |
| Calor | `DECREE` + `TECHNICAL_STANDARD` (NR-15 An. 3 / NHO-06) | `TECHNICAL_ASSESSMENT`, `INSS_ADMINISTRATIVE` | `RULE_VALIDATED` (V1–V4); V5 pendente; `RULE_WITH_JUDICIAL_EXCEPTION` (Tema 323 — C6) |
| Vibrações | `ADMINISTRATIVE_INSTRUCTION` (art. 296) + `TECHNICAL_STANDARD` (ISO/NHO) + `DECREE` (2.0.2) | `TECHNICAL_ASSESSMENT`, `INSS_ADMINISTRATIVE` | Estrutura `RULE_VALIDATED`; limites numéricos `PENDING`; `RULE_WITH_JUDICIAL_EXCEPTION` (C13) |
| Químicos | `DECREE` (Anexo IV, rol exaustivo) + `TECHNICAL_STANDARD` (NR-15 roteadora) | `TECHNICAL_ASSESSMENT`, `INSS_ADMINISTRATIVE` | Roteadora validada; fichas `PENDING` (Tabela 24 grupo 01, Quadro 1, IN 128 por agente) |
| Biológicos | `DECREE` + `ADMINISTRATIVE_INSTRUCTION` (art. 299) | `INSS_ADMINISTRATIVE`, `HISTORICAL_CLASSIFICATION` | `RULE_VALIDATED` (V1, V2 dentro do rol); **C14 ABERTO** (rol taxativo × exemplificativo) |
| Demais Anexo IV (ionizantes, hiperbáricas, mineração, associação) | `DECREE` | `INSS_ADMINISTRATIVE` | `RULE_VALIDATED` |
| Históricos (frio, umidade, eletricidade, rad. não ionizante) | `DECREE` (revogados) + `ADMINISTRATIVE_INSTRUCTION` (art. 301) + `TNU_PRECEDENT` (exceções) | `HISTORICAL_CLASSIFICATION`, `JUDICIAL_RECOGNITION` | Zonas A/B `RULE_VALIDATED`; Zona C `RULE_WITH_JUDICIAL_EXCEPTION`; umidade/eletricidade/radiação com itens literais de 1964 `PENDING` |
| EPI | Quadruplo (§5) — nunca fundir camadas | Conforme camada | `RULE_VALIDATED` (ruído); `LEGAL_CONFLICT_REQUIRES_REVIEW` (cancerígenos — C11; biológicos) |
| eSocial | `ESOCIAL_RULE` (Tabela 24 S-1.3) | `ESOCIAL_VALIDATION` | Estrutura de grupos validada; códigos químicos individuais `PENDING` |

---

# 8. REGISTRO DE CONFLITOS (nenhum conflito foi apagado)

| # | Conflito | Status em v2.1 |
|---|---|---|
| C1 | Numeração físicos Anexo IV | ENCERRADO ✅ (v2.0) |
| C2 | Grupos Tabela 24 | ENCERRADO ✅ (v2.0) |
| C3 | Tema 555 × cancerígenos | **ABERTO** — absorvido parcialmente por C11 |
| C4 | Anexo mais favorável 53.831/64 × 83.080/79 | **ABERTO** |
| C5 | q=3 × q=5 | **ABERTO** |
| C6 | Tema 323/TNU — íntegra | **ABERTO** |
| C7 | Ato do PPP eletrônico | **ABERTO** |
| C8 | Numeração IN 128 | ENCERRADO ✅ (v2.0); remanescente pontual: arts. de conteúdo do LTCAT `PENDING` |
| C9 | 80 dB(A) 1995–1997 | ENCERRADO ✅ (v2.0) |
| C10 | Vigência Dec. 3.048/99 | **ABERTO** |
| **C11** | **Tema 1.090/STJ × cancerígenos sem limiar (× Fundacentro Despacho 24/2020/PRES × TRF2/LINACH)** | **ABERTO — mantido formalmente até resolução sólida do alcance; bloqueia qualquer automação EPI→descaracterização para cancerígenos** |
| C12 | Tema 534/STJ — processo de origem | **ABERTO** |
| C13 | Teses TNU vibrações (2025 × anterior) | **ABERTO** |
| **C14** | **Biológicos: rol taxativo (letra) × exemplificativo (jurisprudência)** | **ABERTO — mantido formalmente; enquadramento dentro do rol segue validado, fora do rol exige revisão jurídica** |
| **C15 (novo)** | **TNU Tema 159 — inteiro teor não conferido em fonte primária** | **ABERTO — `PENDING_LEGAL_VALIDATION`; não fundamenta automação** |

---

# 9. CRITÉRIOS DE PRONTIDÃO (`seed_ready`)

`seed_ready = YES` **somente** quando TODOS os itens forem verdade:
1. fonte primária confirmada;
2. artigo/item confirmado;
3. período (`valid_from/valid_to`) confirmado;
4. metodologia confirmada, quando necessária;
5. consequência definida;
6. **nenhum** conflito jurídico bloqueante aberto sobre a consequência da regra.

Caso contrário: `seed_ready = NO` (sem exceções, sem "quase pronto").

A matriz completa está em **`docs/ltcat/rule-implementation-readiness-v1.md`**.

---

# 10. CONTROLE DE QUALIDADE DESTA REVISÃO

- ✅ Nenhum código, migration, tabela ou seed foi criado.
- ✅ Decisões judiciais separadas de regras administrativas em todo o documento (`legal_effect_scope=JUDICIAL_RECOGNITION` quando aplicável).
- ✅ Temas TNU 159 e 210 registrados separadamente, sem fusão (§4).
- ✅ EPI decomposto em quatro camadas por agente, sem equivalência automática (§5).
- ✅ Tema 1.090/STJ registrado sem generalização; `EPI_EFFECT_REQUIRES_CONTEXT` criada (§6).
- ✅ Marcos temporais classificados por tipo de mudança, com 14/10/1996 corrigido para `DOCUMENTATION_REQUIREMENT_CHANGE` (§3).
- ✅ C11, C14 e novo C15 mantidos formalmente abertos (§8).

**Este manifesto não autoriza seed nem implementação. A Fase 2B permanece bloqueada até aprovação nominal.**
