# MANIFESTO DE REGRAS JURÍDICAS — LTCAT PREVIDENCIÁRIO
## Fase 2A — Documento para revisão e aprovação humana

| Campo | Valor |
|---|---|
| Versão | 1.0 (primeira submissão para aprovação) |
| Data de elaboração | 23/08/2026 (data de consulta de todas as fontes) |
| Domínio implementado | `SOCIAL_SECURITY` (aposentadoria especial RGPS) — **exclusivamente** |
| Fora de escopo | NR-15 (insalubridade) e NR-16 (periculosidade) como conclusões trabalhistas. NR-15, NHOs e demais normas técnicas aparecem apenas como **referência de metodologia/critério técnico** usado na caracterização previdenciária |
| Status do documento | `READY_FOR_REVIEW` — nenhuma regra aqui está parametrizada em software; nada foi criado em banco, migration, seed ou código |
| Regra de fontes | Somente fontes oficiais fundamentam regras (Planalto, INSS/GOV.BR, eSocial, MTE, Fundacentro, STF/STJ/TNU). Blogs/consultorias foram usados apenas para localizar temas. Tudo que não foi confirmado em fonte oficial está marcado `PENDING_LEGAL_VALIDATION`; conflitos e transições complexas estão marcados `REQUIRES_LEGAL_REVIEW` |

---

# 1. RESUMO EXECUTIVO

1. **Sucessão normativa confirmada em fonte primária (Planalto):** Decreto 53.831/1964 → Decreto 83.080/1979 → Lei 8.213/1991 → **Lei 9.032/1995 (29/04/1995: fim do enquadramento por categoria profissional)** → Decreto 2.172/1997 → Lei 9.528/1997 → Lei 9.732/1998 → **Decreto 3.048/1999 (Anexo IV)** → Decreto 4.882/2003 (19/11/2003) → Decreto 8.123/2013 (17/10/2013) → **EC 103/2019 (13/11/2019)** → Decreto 10.410/2020 → IN PRES/INSS 128/2022 (28/03/2022, consolidada com alterações posteriores).
2. **Princípio temporal confirmado e vinculante por jurisprudência:** o motor deve aplicar a regra vigente **na data da exposição**, nunca a regra atual retroativamente. O caso paradigmático é o ruído: 90 dB(A) de 06/03/1997 a 18/11/2003 e 85 dB(A) a partir de 19/11/2003 (**Tema 694/STJ** — vedação de retroatividade do Decreto 4.882/2003).
3. **Achado estrutural relevante:** o Decreto 4.882/2003 alterou **somente** os itens 2.0.1 (ruído), 3.0.1 (biológicos) e 4.0.0 (associação) do Anexo IV; os itens químicos 1.0.1–1.0.19 **não foram alterados** pelos Decretos 4.882/2003, 8.123/2013 e 10.410/2020 (confirmação linha a linha pendente — ver §15). **O Anexo IV não contém limites numéricos para agentes químicos** — os valores de referência vêm da NR-15/NHOs como critério técnico, nunca como texto do Decreto.
4. **Cobertura de agentes:** 20 grupos químicos (1.0.1–1.0.19), 5 grupos físicos (ruído, vibrações, radiações ionizantes, calor, pressões hiperbáricas), 1 grupo biológico (3.0.1 com 7 atividades taxativas) e 2 associações de mineração subterrânea (4.0.1/4.0.2). Agentes históricos **ausentes** do Anexo IV vigente (radiações não ionizantes, frio, umidade, infrassom/ultrassom) foram mapeados como `HUMAN_REVIEW_REQUIRED` — nunca parametrizáveis automaticamente.
5. **EPI:** regra geral do Tema 555/STF (EPI eficaz pode neutralizar) com **exceção absoluta do ruído** (item II da tese — EPI nunca descaracteriza). A extensão dessa exceção a agentes cancerígenos (benzeno, amianto, HPA, Cr VI, níquel) **não é tese vinculante** — esses casos são `HUMAN_REVIEW_REQUIRED`.
6. **Automatização:** somente a localização temporal da regra e a comparação numérica contra limite parametrizado foram classificadas `SAFE_TO_AUTOMATE`. Toda conclusão de enquadramento passa por confirmação humana no beta, e vibrações permanecem `NOT_PARAMETERIZED` até validação de código/limite.
7. **Pendências críticas:** 22 itens exigem validação direta em fonte primária (lista em §17), concentrados em: numeração literal do Anexo IV consolidado, artigos exatos da IN 128/2022 (indício forte: LTCAT nos arts. 276–280), códigos numéricos da Tabela 24 e teses literais de temas repetitivos. **Nenhum item pendente entra no banco antes de validação.**

---

# 2. HISTORICAL_RULE_TIMELINE

| # | Data inicial | Data final | Mudança normativa | Efeito no sistema | Fonte oficial |
|---|---|---|---|---|---|
| T1 | 30/03/1964 | 28/01/1979 | Decreto 53.831/1964 regulamenta a aposentadoria especial (LOPS): **enquadramento por categoria profissional** (Quadro Anexo, 15/20/25 anos) | Período coberto por presunção legal de nocividade: basta a categoria listada; sem laudo | planalto.gov.br/ccivil_03/decreto/d53831.htm |
| T2 | 29/01/1979 | 05/05/1999 | Decreto 83.080/1979: novo regulamento com Anexos I/II, **convivendo** com o Decreto 53.831/1964 | Regra do anexo mais favorável ao segurado no período de convivência — `REQUIRES_LEGAL_REVIEW` para aplicação | planalto.gov.br/ccivil_03/decreto/d83080.htm |
| T3 | 25/07/1991 | 28/04/1995 | Lei 8.213/1991, arts. 57/58 (redação original): mantém enquadramento por categoria + formulário de comprovação | Continuidade do sistema anterior | planalto.gov.br/ccivil_03/leis/l8213cons.htm |
| T4 | **29/04/1995** | — (paradigma vigente) | **Lei 9.032/1995: extingue o enquadramento por categoria profissional**; passa a exigir comprovação da efetiva exposição (habitual e permanente) | Marco de corte absoluto: categorias profissionais só valem para períodos até 28/04/1995 | planalto.gov.br/ccivil_03/leis/l9032.htm |
| T5 | 06/03/1997 | 05/05/1999 | Decreto 2.172/1997: formulário (SB-40/DSS-8030) embasado em laudo técnico; Anexo IV próprio (ruído **90 dB(A)**) | Primeiro regulamento com limite numérico próprio de ruído pós-1995 | planalto.gov.br/ccivil_03/decreto/d2172.htm |
| T6 | 11/12/1997 | — | Lei 9.528/1997: altera arts. 57/58 (conteúdo exato `PENDING_LEGAL_VALIDATION`) | Ajustes no regime da especial | planalto.gov.br/ccivil_03/leis/l9528.htm |
| T7 | 14/12/1998 | — | Lei 9.732/1998: altera dispositivos da Lei 8.213/91 (se introduziu literalmente 15/20/25 anos e "permanente" — `PENDING_LEGAL_VALIDATION`) | Consolidação legal dos requisitos | planalto.gov.br/ccivil_03/leis/l9732.htm |
| T8 | **06/05/1999** (data exata de início de vigência `REQUIRES_LEGAL_REVIEW` — publicação vs. vacatio) | vigente (com alterações) | **Decreto 3.048/1999 (RPS)**: Anexo IV unificado substitui os anexos anteriores; comprovação por formulário embasado em laudo técnico | Estrutura normativa-mãe do motor; rol de agentes **exaustivo**, atividades **exemplificativas** (químicos) / **taxativas** (biológicos) | planalto.gov.br/ccivil_03/decreto/d3048compilado.htm |
| T9 | **19/11/2003** | vigente | Decreto 4.882/2003: altera itens **2.0.1 (ruído: 90→85 dB(A)), 3.0.1 e 4.0.0** do Anexo IV | Redução do limite de ruído **sem retroatividade** (Tema 694/STJ); mudança terminológica em biológicos; nova regra de associação de agentes | planalto.gov.br/ccivil_03/decreto/2003/d4882.htm |
| T10 | 01/01/2004 | vigente | **PPP torna-se o documento padrão** de comprovação (substitui SB-40/DSS-8030/DIRBEN-8030 para novos períodos) | Documentos aceitos passam a depender do período do labor (tabela em §14) | Ato normativo exato `PENDING_LEGAL_VALIDATION` |
| T11 | 17/10/2013 | vigente | Decreto 8.123/2013: exige metodologia técnica (ruído → NEN/NHO-01; calor → NHO-06); disciplina LTCAT/PPP/responsável técnico | Motor passa a exigir metodologia identificada para períodos ≥ 17/10/2013 | planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d8123.htm (literalidade do Anexo IV pós-2013 `PENDING_LEGAL_VALIDATION`) |
| T12 | **13/11/2019** | vigente | **EC 103/2019**: nova redação ao regime (idade mínima 55/58/60 + tempo de exposição; regras de transição por pontos); direito adquirido a quem completou requisitos até 13/11/2019. **Não altera a comprovação técnica da exposição** | Afeta cálculo de benefício, **não** a caracterização da exposição — o motor de exposição não muda; conversão de tempo especial limitada a exposições até 13/11/2019 (Tema 998/STF — teor exato `REQUIRES_LEGAL_REVIEW`) | planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc103.htm |
| T13 | 30/06/2020 | vigente | Decreto 10.410/2020: nova redação a dispositivos do RPS (incl. art. 68) e ajustes; revoga art. 70 (tabela de conversão) | Atualização regulamentar pós-Reforma | planalto.gov.br/ccivil_03/decreto/d3048compilado.htm |
| T14 | 28/03/2022 | vigente (alterada por IN 170/2024 e posteriores) | **IN PRES/INSS 128/2022**: disciplina análise de exposição, LTCAT (indício: arts. 276–280), EPI, contemporaneidade, documentos por período | Norma operacional de referência do motor para evidências | in.gov.br/en/web/dou/-/instrucao-normativa-pres-inss-n-128... (numeração exata `PENDING_LEGAL_VALIDATION`) |
| T15 | jan/2023 | vigente | **PPP eletrônico via eSocial (S-2240)** — Portarias MTP 313/2021, 1.010/2021 e correlatas | LTCAT passa a alimentar evento eletrônico; rastreabilidade LTCAT↔S-2240 obrigatória | gov.br/esocial (data/ato exatos `REQUIRES_LEGAL_REVIEW`) |

**Marcos que exigem versões distintas no motor (resumo operacional):** 28/04/1995 (fim categoria) · 06/03/1997 (limites Dec. 2.172/97) · 06/05/1999 (Anexo IV RPS) · 19/11/2003 (85 dB(A); biológicos; associação) · 01/01/2004 (PPP) · 17/10/2013 (metodologias NHO) · 13/11/2019 (Reforma — só benefício/conversão) · 28/03/2022 (IN 128/2022) · jan/2023 (PPP eletrônico).

---

# 3. AGENT_MASTER_MANIFEST

Códigos internos estáveis (`internal_code`) — **nunca** usar código de Tabela 24 ou Anexo IV como identidade do agente. Códigos externos são mapeamentos versionados. Nível de automação: `PARAMETERIZABLE` / `PARTIALLY_PARAMETERIZABLE` / `HUMAN_REVIEW_REQUIRED`.

| internal_code | Nome normalizado | Categoria | Cód. Anexo IV | Cód. Tabela 24 | evaluation_type | Metodologia | automation_level | Notas |
|---|---|---|---|---|---|---|---|---|
| PHYS_RUIDO | Ruído contínuo ou intermitente | Físico | 2.0.1 | 02.01.001 (`PENDING` — confirmar) | Quantitativo | NHO-01 (NEN); NR-15 An. 1 (períodos antigos) | PARTIALLY_PARAMETERIZABLE | EPI nunca descaracteriza (Tema 555/STF II) |
| PHYS_VIBR_MB | Vibrações — mãos e braços (VMB) | Físico | 2.0.2 (`REQUIRES_LEGAL_REVIEW` — confirmar) | 02.01.002–005 (`PENDING`) | Quantitativo | NHO-10 | HUMAN_REVIEW_REQUIRED | Sem decisão automática até validação |
| PHYS_VIBR_CI | Vibrações — corpo inteiro (VCI) | Físico | 2.0.2 (`REQUIRES_LEGAL_REVIEW`) | 02.01.002–005 (`PENDING`) | Quantitativo | NHO-09 | HUMAN_REVIEW_REQUIRED | Idem |
| PHYS_RAD_ION | Radiações ionizantes | Físico | 2.0.3 | 02.01.006–013 (`PENDING`) | Qualitativo/quantitativo misto | Dosimetria CNEN + rol de atividades | PARTIALLY_PARAMETERIZABLE | 7 alíneas de atividades |
| PHYS_CALOR | Calor (temperaturas anormais) | Físico | 2.0.4 (`PENDING` — ver §15, conflito de numeração) | 02.01.014 (`PENDING`) | Quantitativo | NHO-06 (pós-2013); NR-15 An. 3 (anterior) | PARTIALLY_PARAMETERIZABLE | Fonte natural enquadrável desde 06/03/1997 (TNU) |
| PHYS_PRESS_HIPER | Pressões atmosféricas anormais (hiperbáricas) | Físico | 2.0.5 | 02.01.015–018 (`PENDING`) | Qualitativo (3 atividades taxativas) | Descrição de atividade | PARTIALLY_PARAMETERIZABLE | Mergulho, tubulões/túneis, caixões/câmaras |
| CHEM_ARSENIO | Arsênio e compostos | Químico | 1.0.1 | `PENDING` | Qualitativo | NHO-06 | PARTIALLY_PARAMETERIZABLE | IARC Grupo 1 |
| CHEM_ASBESTO | Asbesto (amianto) | Químico | 1.0.2 | `PENDING` | Qualitativo | Contagem de fibras (NIOSH 7400 adaptado) | HUMAN_REVIEW_REQUIRED | Sem limite seguro; EPI não afasta |
| CHEM_BENZENO | Benzeno e compostos tóxicos | Químico | 1.0.3 | `PENDING` | Qualitativo | NHO-06 + NHO-08 | HUMAN_REVIEW_REQUIRED | Absorção cutânea; sem dose segura |
| CHEM_BERILIO | Berílio e compostos tóxicos | Químico | 1.0.4 | `PENDING` | Qualitativo | NHO-06 | PARTIALLY_PARAMETERIZABLE | IARC Grupo 1 |
| CHEM_BROMO | Bromo e compostos tóxicos | Químico | 1.0.5 | `PENDING` | Qualitativo | NHO-06 | PARTIALLY_PARAMETERIZABLE | — |
| CHEM_CADMIO | Cádmio e compostos tóxicos | Químico | 1.0.6 | `PENDING` | Qualitativo | NHO-06 | PARTIALLY_PARAMETERIZABLE | IARC Grupo 1 |
| CHEM_CARVAO_HPA | Carvão mineral e derivados (piche, alcatrão, HPA) | Químico | 1.0.7 | `PENDING` | Qualitativo | NHO-06/NHO-08 | HUMAN_REVIEW_REQUIRED | HPAs cancerígenos |
| CHEM_CHUMBO | Chumbo e compostos tóxicos | Químico | 1.0.8 | `PENDING` | Qualitativo + biomarcador | NHO-05/NHO-07 | PARTIALLY_PARAMETERIZABLE | Plumbemia (NR-7) como evidência |
| CHEM_CLORO_ORG | Cloro e compostos tóxicos (organoclorados, PCB, cloreto de vinila) | Químico | 1.0.9 | `PENDING` | Qualitativo | NHO-06 | HUMAN_REVIEW_REQUIRED | Cloreto de vinila cancerígeno |
| CHEM_CROMO | Cromo e compostos tóxicos | Químico | 1.0.10 | `PENDING` | Qualitativo (valência importa) | NHO-06 | HUMAN_REVIEW_REQUIRED | Cr(VI) IARC Grupo 1 |
| CHEM_CS2 | Dissulfeto de carbono | Químico | 1.0.11 | `PENDING` | Quantitativo | NHO-06 | PARAMETERIZABLE | LT numérico em NR-15 An. 11 |
| CHEM_FOSFORO | Fósforo e compostos tóxicos | Químico | 1.0.12 | `PENDING` | Qualitativo | NHO-06 | PARTIALLY_PARAMETERIZABLE | — |
| CHEM_IODO | Iodo | Químico | 1.0.13 | `PENDING` | Quantitativo | NHO-06 | PARAMETERIZABLE | LT em NR-15 An. 11 |
| CHEM_MANGANES | Manganês e compostos | Químico | 1.0.14 | `PENDING` | Qualitativo | NHO-06 | PARTIALLY_PARAMETERIZABLE | Neurotóxico |
| CHEM_MERCURIO | Mercúrio e compostos | Químico | 1.0.15 | `PENDING` | Qualitativo | NHO-05/NHO-06 | PARTIALLY_PARAMETERIZABLE | Absorção cutânea relevante |
| CHEM_NIQUEL | Níquel e compostos tóxicos | Químico | 1.0.16 | `PENDING` | Qualitativo | NHO-06 | HUMAN_REVIEW_REQUIRED | IARC Grupo 1 |
| CHEM_PETROLEO_HPA | Petróleo, xisto, gás natural e derivados | Químico | 1.0.17 | `PENDING` | Qualitativo | NHO-06/NHO-08 | HUMAN_REVIEW_REQUIRED | Benzo[a]pireno IARC 1 |
| CHEM_SILICA | Sílica livre cristalizada | Químico | 1.0.18 | `PENDING` | Misto | NHO-08 (gravimetria) | PARTIALLY_PARAMETERIZABLE | LT por fórmula NR-15 An. 12 |
| CHEM_OUTROS_G1 | Outras substâncias — Grupo I (estireno, butadieno, acrilonitrila, n-hexano, TDI etc.) | Químico | 1.0.19 (Grupo I) | `PENDING` | Qualitativo | NHO-06 | HUMAN_REVIEW_REQUIRED | Vários cancerígenos |
| CHEM_OUTROS_G2 | Outras substâncias — Grupo II (benzidina, benzopireno, óxido de etileno, creosoto etc.) | Químico | 1.0.19 (Grupo II) | `PENDING` | Qualitativo | Protocolos Fundacentro/LINACH | HUMAN_REVIEW_REQUIRED | Presença basta em tese; EPI controvertido |
| BIO_MICROORG | Microorganismos e parasitas infecto-contagiosos vivos e suas toxinas | Biológico | 3.0.1 | 03.01.001–007 | Qualitativo (7 atividades taxativas) | Avaliação qualitativa circunstanciada | PARTIALLY_PARAMETERIZABLE | Rol de atividades fechado; "trabalha em hospital" não basta |
| ASSOC_MIN_SUB_AF | Mineração subterrânea afastada da frente de produção | Associação | 4.0.1 | 04.01.001 (`PENDING`) | Qualitativo | Função + local | PARTIALLY_PARAMETERIZABLE | **20 anos** |
| ASSOC_MIN_SUB_FP | Mineração subterrânea em frente de produção | Associação | 4.0.2 | 04.01.002 (`PENDING`) | Qualitativo | Função + local | PARTIALLY_PARAMETERIZABLE | **15 anos** |
| HIST_RAD_NION | Radiações não ionizantes | Físico (histórico) | Ausente do Anexo IV vigente | 05.01.001 (residual) | — | — | HUMAN_REVIEW_REQUIRED | Só por decisão judicial/administrativa |
| HIST_FRIO | Frio | Físico (histórico) | Ausente | — | — | — | HUMAN_REVIEW_REQUIRED | Constava de diplomas revogados |
| HIST_UMIDADE | Umidade | Físico (histórico) | Ausente | — | — | — | HUMAN_REVIEW_REQUIRED | Idem |
| HIST_INFRA_ULTRA | Infrassom/Ultrassom | Físico (histórico) | Ausente | Tabela 23 (NR-9), não 24 | — | — | HUMAN_REVIEW_REQUIRED | Não confundir com ruído (2.0.1) |

---

# 4. METHODOLOGY_MANIFEST

| Cód. interno | Metodologia | Órgão | Versão | Agentes | Vigência inicial | Vigência final | Parâmetros necessários | Unidades | Referência oficial | Status de uso previdenciário |
|---|---|---|---|---|---|---|---|---|---|---|
| MET_QUALIT | Avaliação qualitativa circunstanciada | — | — | Biológicos, hiperbárico, associações, químicos qualitativos | Sempre | vigente | Descrição de atividade, contato efetivo, frequência, setor | — | Anexo IV + IN 128/2022 | Aceita para agentes sem limite de tolerância |
| MET_NHO01 | NHO-01 — Avaliação da exposição ocupacional ao ruído | Fundacentro | 2001 e revisões | Ruído contínuo/intermitente | 17/10/2013 (exigida); aceita antes como boa técnica | vigente | NEN, dose, tempo de exposição, jornada | dB(A), % | gov.br/fundacentro | Obrigatória pós-Dec. 8.123/2013; q=3 |
| MET_NR15_AN1 | NR-15 Anexo 1 — Limites de tolerância para ruído contínuo/intermitente | MTE | Portaria 3.214/1978 e alterações | Ruído | Períodos anteriores a 2013 | Referência técnica | Nível médio, tempo, q=5 | dB(A) | gov.br/trabalho-e-emprego | Critério técnico histórico; não conclusão trabalhista |
| MET_NR15_AN2 | NR-15 Anexo 2 — Ruído de impacto | MTE | idem | Ruído de impacto | idem | Referência | Nível de pico | dB(C)/dB(A) pico | idem | `PENDING` no Anexo IV (sem item próprio) |
| MET_NHO06 | NHO-06 — Avaliação da exposição ocupacional ao calor | Fundacentro | 2002 e revisões | Calor | 17/10/2013 (exigida) | vigente | IBUTG, taxa metabólica, regime trabalho/descanso | °C (IBUTG), W/kcal/h | gov.br/fundacentro | Obrigatória pós-2013 (ver Tema 323 TNU — `REQUIRES_LEGAL_REVIEW`) |
| MET_NR15_AN3 | NR-15 Anexo 3 — Limites de tolerância para calor | MTE | 1978+; Portaria SEPRT 1.359/2019 | Calor | 06/03/1997 (por remissão) | 16/10/2013 (como critério direto) | IBUTG, taxa metabólica, regime | °C | gov.br/trabalho-e-emprego | Critério histórico por remissão do Anexo IV |
| MET_NHO09 | NHO-09 — Vibração de corpo inteiro (aren, VDR) | Fundacentro | rev. 2013 | VCI | Referência técnica | vigente | aren, VDVR | m/s² | gov.br/fundacentro | Limites numéricos `PENDING_LEGAL_VALIDATION` |
| MET_NHO10 | NHO-10 — Vibração mãos-braços | Fundacentro | vigente | VMB | idem | vigente | aren por eixo | m/s² | gov.br/fundacentro | idem |
| MET_NHO05 | NHO-05 — Monitoramento biológico (ex.: chumbo no sangue) | Fundacentro | vigente | Chumbo, mercúrio | Referência | vigente | Biomarcador | µg/100mL | gov.br/fundacentro | Evidência complementar |
| MET_NHO08 | NHO-08 — Coleta/análise de poeiras (gravimetria) | Fundacentro | vigente | Sílica, poeiras minerais | Referência | vigente | Massa respirável, % SiO₂ | mg/m³ | gov.br/fundacentro | Aceita com fórmula NR-15 An. 12 |
| MET_NHO06_Q | NHO-06 aplicada a agentes químicos (amostragem/análise) | Fundacentro | vigente | Químicos quantitativos | Referência | vigente | Concentração média ponderada | ppm, mg/m³ | gov.br/fundacentro | Critério técnico; LT vem da NR-15 |
| MET_DOSIM_CNEN | Dosimetria individual de radiações ionizantes | CNEN | NN 3.01 | Radiações ionizantes | Referência | vigente | Dose efetiva | mSv | cnen.gov.br | Evidência técnica; enquadramento por atividade |
| MET_FIBRAS | Contagem de fibras (microscopia contraste de fase, NIOSH 7400 adaptado) | Fundacentro/NIOSH | — | Asbesto | Referência | vigente | Fibras/cm³ | f/cm³ | Fundacentro | Evidência; presença basta (qualitativo) |

**Regra de incompatibilidade de metodologia:** o motor **nunca converte silenciosamente** resultados entre metodologias incompatíveis (ex.: NEN q=3 ↔ nível médio q=5; IBUTG NHO-06 ↔ NR-15 An. 3 sem identificar taxa metabólica). Se o LTCAT não declara metodologia/parâmetros para período em que ela é exigida → `INCONCLUSIVE`.

---

# 5. BLOCO A — MANIFESTO DAS REGRAS GERAIS

### GEN-001 — Exposição efetiva
- **rule_key:** `GEN_EFFECTIVE_EXPOSURE` · **domínio:** SOCIAL_SECURITY
- **Norma principal:** Lei 8.213/1991, art. 57, caput e §1º (literalidade do §1º `PENDING_LEGAL_VALIDATION`)
- **Conteúdo:** aposentadoria especial pressupõe exposição **efetiva** do trabalhador ao agente nocivo (Tema 555/STF, item I).
- **Conclusão do motor:** exigir evidência de exposição real (LTCAT/PPP com agente identificado), nunca presunção por ambiente/categoria (pós-29/04/1995).
- **Status:** READY_FOR_REVIEW

### GEN-002 — Permanente, não ocasional nem intermitente
- **rule_key:** `GEN_PERMANENT_EXPOSURE`
- **Norma principal:** Decreto 3.048/1999, art. 65 ("tempo de trabalho permanente... não ocasional nem intermitente... indissociável da produção do bem ou da prestação do serviço") — confirmar literalidade no Planalto (`PENDING`)
- **Conteúdo:** exposição eventual/intermitente não caracteriza. Motor exige campos: frequência, duração/jornada, indissociabilidade da atividade-fim.
- **INCONCLUSIVE quando:** frequência declarada como "eventual", "esporádica" ou ausente.
- **Status:** READY_FOR_REVIEW

### GEN-003 — Regra temporal (tempus regit actum)
- **rule_key:** `GEN_TEMPORAL_RULE`
- **Conteúdo:** o enquadramento usa a legislação **da época da prestação do serviço** (consagrado no Tema 694/STJ para ruído; princípio geral do RPS). Dispositivo exato do Decreto 3.048 que o enuncia: `REQUIRES_LEGAL_REVIEW` (o art. 70 localizado tratava de tabela de conversão — hoje revogado pelo Decreto 10.410/2020).
- **Conclusão do motor:** resolução de regra SEMPRE por `valid_from/valid_to` do período da exposição; proibido aplicar regra atual a período histórico.
- **Status:** REQUIRES_LEGAL_REVIEW (dispositivo), READY_FOR_REVIEW (princípio)

### GEN-004 — Responsável técnico do LTCAT
- **rule_key:** `GEN_TECHNICAL_RESPONSIBLE`
- **Norma principal:** Lei 8.213/1991, art. 58, §4º — LTCAT emitido por **médico do trabalho ou engenheiro de segurança do trabalho** (literalidade dos incisos a–h `PENDING`)
- **Conclusão do motor:** documento sem responsável técnico habilitado identificado (nome, CPF, conselho, nº registro) → **bloqueio de publicação** (alinhado ao `can_sign_ltcat` do plano).
- **Status:** READY_FOR_REVIEW

### GEN-005 — Rol de agentes exaustivo; atividades exemplificativas (químicos) / taxativas (biológicos)
- **rule_key:** `GEN_ANNEX_IV_SCOPE`
- **Fonte:** Cabeçalhos 1.0.0 e 3.0.0 do Anexo IV (Decreto 3.265/1999 e Decreto 3.048/1999 consolidado)
- **Conteúdo:** só gera enquadramento agente constante do Anexo IV; para químicos, a atividade listada é exemplo (importa a presença do agente); para biológicos, a exposição vale **"unicamente nas atividades relacionadas"** (rol fechado a–g).
- **NOT_PARAMETERIZED quando:** agente citado não consta do Anexo IV nem é enquadrável por composição comprovada (ex.: "solvente orgânico" genérico sem CAS; "produto de limpeza" por nome comercial).
- **Status:** READY_FOR_REVIEW

### GEN-006 — Documentos de comprovação por período (contemporaneidade e equivalências)
- **rule_key:** `GEN_EVIDENCE_BY_PERIOD` — tabela completa em §14
- Até 28/04/1995: categoria profissional (CTPS/registro) · 1995–2003: SB-40, DISES BE 5235, DSS-8030, DIRBEN-8030 + laudo · ≥ 01/01/2004: PPP (base: LTCAT) · ≥ jan/2023: PPP eletrônico (S-2240).
- Laudo extemporâneo: aceito pela jurisprudência se inalteradas as condições de trabalho; Tema repetitivo específico **não confirmado** — `REQUIRES_LEGAL_REVIEW`.
- **Status:** READY_FOR_REVIEW (estrutura), PENDING (atos exatos)

### GEN-007 — Alterações ambientais relevantes
- **rule_key:** `GEN_ENV_CHANGE`
- **Conteúdo:** mudança de máquina, processo, produto, ambiente, jornada, EPC, EPI ou metodologia **encerra a condição anterior** e abre nova (histórico imutável — já previsto na arquitetura de exposições). Nenhum prazo fixo de atualização do LTCAT foi confirmado em fonte (`PENDING`); a exigência operacional é de contemporaneidade das demonstrações ambientais (IN 128/2022, arts. 279–280 — indício).
- **Status:** READY_FOR_REVIEW

---

# 6. BLOCO B — RUÍDO (detalhado)

**Agente interno:** `PHYS_RUIDO` · **Categoria:** físico · **Sinônimos:** ruído ocupacional, ruído contínuo, ruído intermitente, nível de pressão sonora · **Anexo IV:** 2.0.1 · **Tabela 24:** 02.01.001 (`PENDING`) · **Tempo previdenciário:** 25 anos.

### 6.1 Versões da regra

| rule_key | valid_from | valid_to | Limite | Unidade | Metodologia | Critério | EPI | Motivo do marco | Fonte |
|---|---|---|---|---|---|---|---|---|---|
| NOISE_V1 | — | 28/04/1995 | — | — | — | Categoria profissional (Quadro Anexo Dec. 53.831/64 e 83.080/79); parâmetro retroativo 80 dB(A) (Enunciado CRPS 13/2021 — `PENDING`) | n/a | Vigência dos regulamentos antigos | Decretos 53.831/64, 83.080/79 |
| NOISE_V2 | 29/04/1995 | 05/03/1997 | 80 dB(A) (referência administrativa) | dB(A) | Não normatizada | Habitual + permanente | n/a | Lei 9.032/95 (fim categoria) até Dec. 2.172/97 | Lei 9.032/95; base exata `PENDING` |
| NOISE_V3 | 06/03/1997 | 05/05/1999 | **90 dB(A)** | dB(A) | Medição técnica (sem metodologia federal obrigatória) | Quantitativo | n/a | Decreto 2.172/1997 | d2172.htm; Tema 694/STJ |
| NOISE_V4 | 06/05/1999 | 18/11/2003 | **90 dB(A)** | dB(A) | idem | Quantitativo | n/a | Decreto 3.048/1999 (redação original) | Anexo IV; Tema 694/STJ |
| NOISE_V5 | 19/11/2003 | 16/10/2013 | **85 dB(A)** | dB(A) | Limites da legislação trabalhista (remissão NR-15) — literalidade `PENDING` | Quantitativo | Sem tratamento expresso | Decreto 4.882/2003 (art. 2º, item 2.0.1) | d4882.htm |
| NOISE_V6 | 17/10/2013 | vigente | **NEN > 85 dB(A)** | dB(A) (NEN) | **NHO-01 Fundacentro** | Quantitativo | Tema 555/STF II: EPI **nunca** descaracteriza | Decreto 8.123/2013 | d8123.htm (literalidade `PENDING`) |
| NOISE_V7 | 28/03/2022 | vigente | NEN > 85 dB(A) | dB(A) | NHO-01 | Quantitativo + evidências IN | idem | IN 128/2022 (art. exato `PENDING`) | gov.br/inss |

### 6.2 Campos da regra (estrutura obrigatória)

- **Regra de comparação:** `measured_NEN > limite(período)` → especial; caso contrário não especial.
- **Tempo de exposição / permanência:** habitual e permanente (GEN-002); jornada normalizada a 8h no NEN.
- **EPC:** medidas coletivas que reduzam o NEN a ≤ limite descaracterizam (efeito na medição, não na forma).
- **EPI:** **exceção absoluta** — declaração de eficácia no PPP não descaracteriza (Tema 555/STF, item II, RE 664.335/SC, tese confirmada em agregadores; redação literal no portal STF `PENDING`).
- **q=3 vs q=5:** NHO-01 usa incremento de duplicação q=3; NR-15 An. 1 usa q=5. Divergência técnica ativa (Parecer Fundacentro 2020; Nota Técnica SEI 9/2019) — `REQUIRES_LEGAL_REVIEW` quando o LTCAT não declara o critério usado.
- **Ruído variável sem NEN:** Tema 1083/STJ (REsp 1.886.795/RS) — na falta de NEN, critério do nível máximo (pico) com habitualidade comprovada.
- **Ruído de impacto:** NR-15 An. 2 como referência técnica; **sem item próprio** no Anexo IV → `NOT_PARAMETERIZED` como agente autônomo; subsumir a 2.0.1 apenas com laudo que o trate como ruído ocupacional avaliado.
- **Evidência exigida:** LTCAT/PPP com medição por dosímetro/medidor integrador, metodologia declarada, jornada, responsável técnico.

### 6.3 Exemplos técnicos por marco temporal

| # | Cenário | Regra | Resultado |
|---|---|---|---|
| E1 | NEN 88 dB(A), exposição em 2010 | NOISE_V5 (85) | `SPECIAL=TRUE` (88 > 85) |
| E2 | NEN 88 dB(A), exposição em 2000 | NOISE_V4 (90) | `SPECIAL=FALSE` — vedação de retroatividade (Tema 694/STJ) |
| E3 | Dose 130% em jornada 8h, 2015, EPI "eficaz" declarado | NOISE_V6 | `SPECIAL=TRUE`, `EPI_OVERRIDE=IGNORED_NOISE` |
| E4 | Apenas picos, sem NEN, 2018 | Tema 1083/STJ | `INCONCLUSIVE_REQUIRES_ADDITIONAL_DATA` até avaliar pico + habitualidade |

### 6.4 INCONCLUSIVE / NOT_PARAMETERIZED (ruído)
- `INCONCLUSIVE`: interregno 29/04/1995–05/03/1997 sem base numérica confirmada; LTCAT sem metodologia declarada para período ≥ 17/10/2013; conflito q=3/q=5 não resolvido.
- `NOT_PARAMETERIZED`: ruído de impacto como item autônomo; infrassom/ultrassom (não são 2.0.1).

---

# 7. BLOCO C — CALOR

**Agente interno:** `PHYS_CALOR` · **Categoria:** físico · **Anexo IV:** 2.0.4 (`PENDING` — conflito de numeração, §15) · **Tabela 24:** 02.01.014 (`PENDING`) · **Tempo previdenciário:** 25 anos.

### 7.1 Versões da regra

| rule_key | valid_from | valid_to | Critério | Metodologia | Fonte/motivo |
|---|---|---|---|---|---|
| HEAT_V1 | — | 28/04/1995 | Categoria profissional | — | Decretos 53.831/64, 83.080/79 |
| HEAT_V2 | 29/04/1995 | 05/03/1997 | Exposição efetiva sem limite regulamentar próprio | — | Lei 9.032/95 |
| HEAT_V3 | 06/03/1997 | 05/05/1999 | Remissão ao **Anexo 3 da NR-15** (IBUTG × taxa metabólica × regime) | NR-15 An. 3 | Decreto 2.172/97 — **calor de fonte natural enquadrável desde este marco** (TNU, PEDIF 0503208-24.2015.4.05.8312) |
| HEAT_V4 | 06/05/1999 | 16/10/2013 | Idem (remissão NR-15 An. 3) | NR-15 An. 3 | Decreto 3.048/99; ajustes redacionais Dec. 4.882/2003 |
| HEAT_V5 | 17/10/2013 | vigente | Exigência de metodologia **NHO-06** (IBUTG, taxa metabólica, regime) | NHO-06 | Decreto 8.123/2013 |

### 7.2 Pontos sensíveis
- **Origem da fonte (artificial vs. solar/ambiental):** o Anexo IV não distingue; TNU reconhece calor natural desde 06/03/1997. Alcance exato do **Tema 323/TNU (11/2025)** sobre dados técnicos exigíveis no PPP: `REQUIRES_LEGAL_REVIEW` (tese literal não obtida).
- **Tabela de limites (NR-15 An. 3, referência histórica):** trabalho contínuo — leve 30,0 / moderada 26,7 / pesada 25,0 °C IBUTG; 75%T — 30,6/28,0/25,9; 50%T — 31,4/29,4/27,9; 25%T — 32,2/31,1/30,0. Divergências numéricas entre NR-15 An. 3 e NHO-06: `PENDING`.
- **Exemplo resolvido:** fundição, moderada (~300 kcal/h), 50%T/50%D, IBUTG 29,0 °C, 2015 → limite 29,4 → `SPECIAL=FALSE`; se IBUTG 30,0 → `SPECIAL=TRUE` (NHO-06 registrada).
- **EPI:** ventilação/EPC eficaz que reduza IBUTG abaixo do limite descaracteriza (efeito na medição). EPI individual contra calor: análise caso a caso.
- **INCONCLUSIVE:** LTCAT sem taxa metabólica/regime para período ≥ 17/10/2013; IBUTG sem regime declarado.

---

# 8. BLOCO D — VIBRAÇÕES

**Agentes internos:** `PHYS_VIBR_MB` (NHO-10), `PHYS_VIBR_CI` (NHO-09) · **Anexo IV:** 2.0.2 (`REQUIRES_LEGAL_REVIEW` — existência/número do código não confirmados na fonte primária nesta rodada) · **Tabela 24:** 02.01.002–005 (`PENDING`).

- **Posição do motor:** `NOT_PARAMETERIZED` para decisão automática de mérito até confirmar (a) código/redação no Anexo IV consolidado, (b) limites numéricos oficiais NHO-09 (aren, VDVR) e NHO-10 (aren por eixo), (c) dispositivo da IN 128/2022.
- **Jurisprudência:** reconhecimento judicial de VCI (ex.: operador de ponte rolante) mesmo sem limite regulamentar expresso, com rol tratado como exemplificativo — reforça `HUMAN_REVIEW_REQUIRED`.
- **Proibição:** não transformar limite trabalhista (NR-15 An. 8 / NR-9) em limite previdenciário sem fundamento normativo confirmado.
- **Automação segura hoje:** apenas **detectar** menção a vibração no LTCAT/PPP e classificar como `LTCAT_REVIEW_REQUIRED`.

---

# 9. BLOCO E — AGENTES QUÍMICOS

**Regra-mãe (cabeçalho 1.0.0 do Anexo IV):** rol de agentes **exaustivo**; atividades **exemplificativas**; o que determina o benefício é a presença do agente no processo produtivo em condição capaz de causar dano (redação Decreto 3.265/1999). **O Anexo IV não fixa limites numéricos** — valores vêm de NR-15/NHOs como critério técnico. Alterações dos Decretos 4.882/2003, 8.123/2013 e 10.410/2020 **não incidiram** sobre 1.0.1–1.0.19 (confirmação linha a linha `PENDING`, §15).

**Distinção obrigatória:** "produto químico" ≠ "agente químico previdenciário". Menção genérica sem substância/CAS → `NOT_PARAMETERIZED`.

### 9.1 Fichas dos 5 agentes mais relevantes

**BENZENO (1.0.3, CAS 71-43-2)** — Critério **qualitativo** (presença habitual e permanente basta; IARC Grupo 1, sem dose segura); sem limite de tolerância para descaracterização; metodologia NHO-06/NHO-08; **absorção cutânea relevante**; EPI não neutraliza (construção jurisprudencial, não tese vinculante) → `HUMAN_REVIEW_REQUIRED`. Vigência: desde 06/05/1999 sem alteração textual comprovada. Evidência: identificação nominal no LTCAT/PPP, descrição do contato, metodologia.

**ASBESTO/AMIANTO (1.0.2, CAS 1332-21-4)** — Qualitativo; **não existe limite seguro** (OMS/IARC/Fundacentro); contagem de fibras (NIOSH 7400 adaptado); EPI não afasta → `HUMAN_REVIEW_REQUIRED`. Nota: proibição do crisotila (ADI 3.937/STF, 2017) tem efeito prospectivo sobre existência do risco, não sobre o texto do Anexo IV — exposições residuais (estoque/manutenção) `REQUIRES_LEGAL_REVIEW`.

**SÍLICA LIVRE CRISTALIZADA (1.0.18, CAS 14808-60-7)** — Critério misto: presença (qualitativo) + avaliação gravimétrica (NHO-08) contra fórmula de LT da NR-15 An. 12 (% SiO₂); efeito fibrogênico (silicose) + IARC Grupo 1; EPI controvertido → `PARTIALLY_PARAMETERIZABLE` com confirmação humana. LTCAT só qualitativo sem %SiO₂ → `REQUIRES_LEGAL_REVIEW`.

**CHUMBO (1.0.8, CAS 7439-92-1)** — Qualitativo + biomarcador (plumbemia, NR-7 — valor vigente por período `PENDING`); NHO-05/NHO-07; jurisprudência dividida sobre EPI → `HUMAN_REVIEW_REQUIRED` na conclusão; composto importa (tetraetila ≠ inorgânico).

**HIDROCARBONETOS/HPA — Petróleo e derivados (1.0.17), Carvão e derivados (1.0.7)** — Qualitativo; múltiplos cancerígenos (benzo[a]pireno IARC 1); EPI controvertido → `HUMAN_REVIEW_REQUIRED`. "Hidrocarbonetos" sem especificação de substância/processo → `NOT_PARAMETERIZED`.

### 9.2 Demais químicos (1.0.1–1.0.19)
Ver AGENT_MASTER_MANIFEST (§3) para ficha resumida de cada item: arsênio (1.0.1), berílio (1.0.4), bromo (1.0.5), cádmio (1.0.6), cloro/organoclorados (1.0.9), cromo (1.0.10 — valência), dissulfeto de carbono (1.0.11 — quantitativo), fósforo (1.0.12), iodo (1.0.13 — quantitativo), manganês (1.0.14), mercúrio (1.0.15), níquel (1.0.16), Grupos I/II de 1.0.19.

### 9.3 Regras transversais de químicos
- Quantitativo apenas quando há LT tecnicamente reconhecido e agente não cancerígeno sem dose segura (ex.: CS₂, iodo).
- Qualitativo para cancerígenos/mutagênicos e Grupo II de 1.0.19.
- `INCONCLUSIVE`: PPP informa "EPI eficaz" para cancerígeno sem CA/tipo; divergência LTCAT × PPP; período cruza mudança de norma técnica sem critério claro.

---

# 10. BLOCO F — AGENTES BIOLÓGICOS

**Agente interno:** `BIO_MICROORG` · **Anexo IV:** 3.0.1 (cabeçalho 3.0.0: "exposição **unicamente nas atividades relacionadas**") · **Tabela 24:** 03.01.001–007 · **Critério:** qualitativo · **Tempo previdenciário:** 25 anos.

**Atividades taxativas (alíneas a–g):** (a) estabelecimentos de saúde com contato com pacientes infecto-contagiosos ou manuseio de materiais contaminados; (b) animais infectados para tratamento/preparo de soro e vacinas; (c) laboratórios de autópsia, anatomia e anátomo-histologia; (d) exumação de corpos e manipulação de resíduos de animais deteriorados; (e) galerias, fossas e tanques de esgoto; (f) esvaziamento de biodigestores; (g) coleta e industrialização do lixo.

**Alteração histórica:** Decreto 4.882/2003 mudou "infecciosos" → "infecto-contagiosos" (meramente terminológica; rol inalterado). Decreto 8.123/2013 não alterou o item (confirmação `PENDING`).

**Limite de automatização (regra central):** o motor **não** interpreta "trabalha em hospital" como enquadramento. Exigências mínimas: (1) descrição de **contato efetivo** (perfurocortantes, pacientes, resíduos, secreções); (2) função compatível com uma das 7 alíneas; (3) setor coerente; (4) habitualidade/permanência; (5) PPP/LTCAT com código 03.01.xxx e responsável técnico.
- `INCONCLUSIVE`: cargo sem descrição de tarefas; contato indireto/esporádico; atividade fora das 7 alíneas; PPP omisso; divergência CBO × descrição → `REQUIRES_LEGAL_REVIEW`.
- **EPI/EPC:** não descaracterizam automaticamente; eficácia de EPI para biológicos é tema **não pacificado** (debate TNU em curso em 2026) → qualquer PPP com "EPI eficaz" para biológico vai a `REQUIRES_LEGAL_REVIEW`, nunca a exclusão automática.

---

# 11. BLOCO G — DEMAIS AGENTES DO ANEXO IV

| Agente | Anexo IV | Critério | Automação | Observações |
|---|---|---|---|---|
| Radiações ionizantes | 2.0.3 | Qualitativo (rol a–g) + dosimetria CNEN | PARTIALLY_PARAMETERIZABLE | Sem dosimetria/laudo de radioproteção ou fora das alíneas → INCONCLUSIVE |
| Pressões hiperbáricas | 2.0.5 | Qualitativo (3 atividades: caixões/câmaras; tubulões/túneis sob ar comprimido; mergulho com escafandro) | PARTIALLY_PARAMETERIZABLE | Função fora das 3 alíneas → INCONCLUSIVE |
| Associação — regra geral | 4.0.0 | "Nas associações de agentes acima do nível de tolerância, considera-se o enquadramento do que exigir **menor tempo**" (redação Dec. 4.882/2003) | HUMAN_REVIEW_REQUIRED | Regra de composição, sempre com revisão |
| Mineração subterrânea afastada da frente | 4.0.1 | Qualitativo | PARTIALLY_PARAMETERIZABLE | **20 anos** |
| Mineração subterrânea frente de produção | 4.0.2 | Qualitativo | PARTIALLY_PARAMETERIZABLE | **15 anos** |
| Radiações não ionizantes | **ausente** | — | HUMAN_REVIEW_REQUIRED | Só via decisão judicial/administrativa (Tabela 24, 05.01.001) |
| Frio / Umidade / Infrassom / Ultrassom | **ausentes** | — | HUMAN_REVIEW_REQUIRED | Constavam de diplomas revogados; infrassom/ultrassom estão na Tabela 23 (NR-9), **não** na 24 |

---

# 12. EPI E EPC (seção específica)

**Não existe regra genérica "EPI eficaz elimina aposentadoria especial".** Matriz por grupo:

| Grupo | EPI pode afastar? | Condições | Exceções | Evidências | Vigência |
|---|---|---|---|---|---|
| Ruído (2.0.1) | **NUNCA** | — | Exceção absoluta (Tema 555/STF, item II) | — | Tese de 04/12/2014, aplicada pelo STF também a períodos anteriores |
| Químicos não cancerígenos com LT (CS₂, iodo) | Sim, em tese (Tema 555, item I) | Eficácia real comprovada: CA vigente, tipo adequado ao agente, periodicidade de troca, treinamento | Se medição mostra concentração > LT mesmo com EPI | Ficha de EPI, CA, laudo | Pós-Tema 555 |
| Químicos cancerígenos sem dose segura (benzeno, amianto, HPA, Cr VI, níquel, Grupo II) | **Controvertido** — padrão: não afasta | — | Prova técnica robusta em contrário → julgamento humano | Idem + avaliação de absorção cutânea | `REQUIRES_LEGAL_REVIEW` sempre |
| Biológicos (3.0.1) | Não pacificado | — | Tema TNU em debate (2026) | — | `REQUIRES_LEGAL_REVIEW` |
| Físicos com medição (calor, ionizantes) | Efeito indireto | EPI/EPC que altere a **medição** (IBUTG, dose) abaixo do limite descaracteriza pelo resultado, não pela declaração | — | Laudo quantitativo | Permanente |

**EPC:** regra geral — EPC que **elimina ou neutraliza** a nocividade afasta a especialidade (dispositivo exato na IN 128/2022 `PENDING`). Exigências do motor: descrição da medida, eficácia declarada com evidência (medição pós-implantação), vigência. EPC sem evidência de eficácia → ignorado para descaracterização e sinalizado.

---

# 13. CONTEÚDO OBRIGATÓRIO DO LTCAT

Base: Lei 8.213/1991, art. 58, §4º (incisos a–h — literalidade `PENDING`) e IN 128/2022 (indício forte: arts. 276–280, com art. 276 listando itens e art. 280 impondo que LTCAT e demonstrações ambientais **embasem o PPP**).

| Elemento | Fundamento | Obrigatório | Validação proposta | Bloqueia publicação? |
|---|---|---|---|---|
| Identificação da empresa e do trabalhador/GHE | Art. 58, §4º | Sim | Campos estruturados presentes | Sim |
| Relação nominal de agentes nocivos (nunca genérica) | §4º + GEN-005 | Sim | Cada agente resolve para `internal_code` do catálogo; senão → NOT_PARAMETERIZED | Sim |
| Critério de avaliação (qualitativo/quantitativo) e metodologia | IN 128/2022 | Sim quando o agente exige medição | Metodologia declarada compatível com o período (§4) | Sim (para ruído/calor pós-2013) |
| Resultados de medições e parâmetros (NEN, IBUTG, concentração) | IN 128/2022 | Condicional | Unidade + valor + data + instrumento | Sim, se o agente exigir |
| EPC existente e eficácia | §4º / IN | Sim | Medida + evidência + vigência | Não bloqueia; afeta conclusão |
| EPI fornecido: tipo, CA, periodicidade, eficácia declarada | §4º / IN | Sim quando houver | CA válido; declaração de eficácia | Não bloqueia; afeta conclusão (exceto ruído) |
| Responsável técnico habilitado (médico do trabalho ou engenheiro de segurança), assinatura e registro | Art. 58, §4º | Sim | `can_sign_ltcat=true` + cadastro completo (Fase 3) | **Sim — bloqueante** |
| Data de elaboração e histórico de alterações ambientais | IN 128/2022 (contemporaneidade) | Sim | Timestamp + vínculo a `sst_change_events` | Sim |
| Conclusão do laudo (exposição/não exposição, por agente e período) | IN 128/2022, art. 276, X (indício) | Sim | Conclusão por exposição, nunca genérica | Sim |

---

# 14. RELAÇÃO LTCAT × PPP × S-2240

| Marco | Conteúdo | Base |
|---|---|---|
| Até 28/04/1995 | Categoria profissional (CTPS) | Decretos 53.831/64, 83.080/79 |
| 1995–2003 | Formulários SB-40, DISES BE 5235, DSS-8030/DIRBEN-8030 embasados em laudo técnico | Decreto 2.172/97; Decreto 3.048/99 |
| ≥ 01/01/2004 | **PPP** é o documento padrão, elaborado **com base no LTCAT** (IN 128/2022, art. 280 — indício) | Ato exato `PENDING` |
| ≥ jan/2023 | **PPP eletrônico** via eSocial; evento **S-2240** carrega agentes (Tabela 24), EPC/EPI, responsável técnico | Portarias MTP 313/2021, 1.010/2021; reconciliação exata `REQUIRES_LEGAL_REVIEW` |
| Consequência para o motor | LTCAT é a **evidência-mãe**; o S-2240 é projeção eletrônica. Divergências LTCAT × S-2240 alimentam a Matriz de Coerência (Fase 7 do plano geral) | — |

**Tabela 24 — versionamento:** leiautes S-1.0 (2018–2023) → S-1.2 (produção 20/11/2023) → **S-1.3 vigente** (produção 02/12/2024; Portaria Conjunta RFB/MPS/MTE 13/2024; consolidada até NT 06/2026 rev. 09/04/2026). Códigos são **mapeamentos externos versionados**, nunca identidade do agente. Estrutura de grupos e códigos numéricos: `PENDING_LEGAL_VALIDATION` (extração direta da tabela vigente + histórico de NTs que a alteraram).

---

# 15. LEGAL_CONFLICTS_AND_AMBIGUITIES

| # | Fontes envolvidas | Conflito | Impacto | Decisão humana necessária |
|---|---|---|---|---|
| C1 | Frente "calor" (código 1.0.4 pós-2013) × frente "biológicos/outros" (2.0.4; ruído 2.0.1; vibrações 2.0.2; ionizantes 2.0.3; pressões 2.0.5) | Numeração dos itens de agentes físicos no Anexo IV consolidado | Códigos errados no catálogo comprometeriam mapeamento eSocial | **Cotejo direto do Anexo IV consolidado no Planalto** antes de qualquer seed. Prevalência provisória: estrutura 2.0.x (duas frentes independentes convergiram) |
| C2 | Frente "Tabela 24" (grupos 01=físicos/02=químicos/03=biológicos citado por consultorias) × frente "biológicos" (03.01.xxx biológicos; 02.01.xxx físicos; grupo 01 referenciado para químicos) | Estrutura de grupos da Tabela 24 | Mapeamento eSocial incorreto | Extração direta da Tabela 24 vigente (S-1.3) e do histórico de NTs |
| C3 | Tema 555/STF (exceção do ruído) × jurisprudência inferior sobre cancerígenos | Extensão da lógica "sem dose segura" a benzeno/amianto não é tese vinculante | Sobre-automatizar descaracterização por EPI | Manter `HUMAN_REVIEW_REQUIRED` para cancerígenos |
| C4 | Decreto 53.831/64 × Decreto 83.080/79 (1979–1991) | Dois anexos concorrentes | Qual rol aplicar por período | Regra do anexo mais favorável — `REQUIRES_LEGAL_REVIEW` por caso |
| C5 | NHO-01 (q=3) × NR-15 An. 1 (q=5) | Critérios de dose incompatíveis para o mesmo período | Resultado do enquadramento pode mudar | Exigir metodologia declarada; conflito → `REQUIRES_LEGAL_REVIEW` |
| C6 | Tema 323/TNU (11/2025) — fontes secundárias divergem sobre ênfase | Dados técnicos exigíveis no PPP para calor (taxa metabólica) | Validação de evidência de calor | Obter íntegra do acórdão no CJF |
| C7 | Portarias MTP 313/2021, 334/2022, 1.010/2021 | Ato/data exatos da obrigatoriedade do PPP eletrônico | Marco T15 da timeline | Reconciliar atos no gov.br |
| C8 | IN 128/2022 × IN 170/2024 e posteriores | Numeração de artigos diverge entre versões circulantes (276–280 vs. 261–277) | Citações erradas no PDF/motor | Fixar versão consolidada oficial e registrar `citation` por versão de regra |
| C9 | Enunciado CRPS 13/2021 (80 dB(A) até 05/03/1997) × ausência de limite regulamentar no interregno 1995–1997 | Base do parâmetro retroativo | Períodos 1995–1997 | `PENDING_LEGAL_VALIDATION`; tratar como INCONCLUSIVE até validar |
| C10 | Vigência do Decreto 3.048/1999 | Publicação (06/05/1999) × vacatio de 45 dias | Marco T8 em ±45 dias | Confirmar regra de vigência do decreto |

---

# 16. MATRIZ DE AUTOMAÇÃO

| Tipo de decisão | Classificação | Exemplos |
|---|---|---|
| Localizar a versão da regra pela data da exposição | `SAFE_TO_AUTOMATE` | Resolver NOISE_V3 vs NOISE_V5 pela data |
| Comparar valor numérico com limite parametrizado (mesma unidade/metodologia) | `SAFE_TO_AUTOMATE` | NEN 88 > 85; IBUTG 30,0 > 29,4 |
| Verificar presença de campos obrigatórios e responsável habilitado | `SAFE_TO_AUTOMATE` | Bloqueio de publicação (§13) |
| Detectar menção a agente do Anexo IV no LTCAT/PPP | `SAFE_TO_AUTOMATE` | Sugestão de candidato na triagem |
| Aplicar exceção de EPI do ruído | `SAFE_TO_AUTOMATE` | Ignorar "EPI eficaz" para 2.0.1 |
| Enquadrar exposição qualitativa com evidência completa | `AUTOMATE_WITH_HUMAN_CONFIRMATION` | Biológico com as 5 exigências mínimas atendidas |
| Aplicar regra de associação de agentes (4.0.0) | `AUTOMATE_WITH_HUMAN_CONFIRMATION` | Menor tempo entre agentes concorrentes |
| Julgar eficácia de EPI/EPC fora do ruído | `HUMAN_DECISION_REQUIRED` | Cancerígenos; biológicos |
| Resolver conflitos metodológicos (q=3/q=5, NHO-06/NR-15) | `HUMAN_DECISION_REQUIRED` | §15-C5 |
| Enquadrar agente fora do Anexo IV (rad. não ionizante, frio, umidade) | `NOT_SAFE_TO_AUTOMATE` | Sempre decisão judicial/administrativa |
| Decidir mérito de vibrações | `NOT_SAFE_TO_AUTOMATE` (nesta versão) | Até validar código/limites |
| Conclusão final de publicação do documento | `HUMAN_DECISION_REQUIRED` | Compliance validator + responsável `can_sign_ltcat` |

---

# 17. ITENS PENDENTES DE VALIDAÇÃO (bloqueiam seed/parametrização)

**PENDING_LEGAL_VALIDATION (confirmar em fonte primária):**
1. Texto literal do Anexo IV consolidado (Planalto) — numeração exata de todos os itens (resolve C1).
2. Literalidade do item 2.0.1 pós-Decreto 8.123/2013 e dos itens 1.0.x (confirmação de não-alteração).
3. Art. 58, §4º, incisos a–h, da Lei 8.213/91 (literalidade atual).
4. Art. 57, §1º, da Lei 8.213/91 (literalidade).
5. Numeração exata dos arts. da IN 128/2022 sobre LTCAT/PPP/EPI/EPC (indício: 276–280) e alterações posteriores (IN 170/2024+).
6. Tabela 24: códigos numéricos exatos por agente, grupos e vigências (resolve C2) + histórico de NTs.
7. Ato que tornou o PPP obrigatório a partir de 01/01/2004.
8. Ato que tornou o LTCAT lastro obrigatório do formulário (1997).
9. Redação oficial da tese do Tema 555/STF no portal do STF.
10. Valores numéricos oficiais NHO-09/NHO-10 (aren, VDVR, limites de ação/exposição).
11. Valor de plumbemia (NR-7) vigente por período.
12. Parâmetro 80 dB(A) para 1995–1997 (Enunciado CRPS 13/2021 — íntegra).
13. Conteúdo exato das Leis 9.528/1997 e 9.732/1998 nos arts. 57/58.
14. Regra de vigência do Decreto 3.048/1999 (resolve C10).
15. Existência do "Tema 1095/STF" sobre ruído (não confirmado — não usar).

**REQUIRES_LEGAL_REVIEW (análise jurídica dedicada):**
16. Dispositivo exato da regra temporal no RPS (art. 70 localizado é tabela de conversão, revogado).
17. Tema 998/STF — teor e trânsito (conversão pós-EC 103/2019).
18. Tema repetitivo sobre contemporaneidade/extemporaneidade do LTCAT (existência e número).
19. Tema 323/TNU (11/2025) — íntegra da tese sobre calor.
20. EPI × agentes biológicos — julgamento TNU em curso (2026).
21. Regra do anexo mais favorável 53.831/64 × 83.080/79.
22. Extensão da exceção do Tema 555 a cancerígenos; exposição residual a amianto pós-ADI 3.937.

---

# 18. CONTROLE DE QUALIDADE EXECUTADO

- ✅ Nenhuma regra usa blog/consultoria como fundamento — blogs serviram apenas para localizar temas; tudo não confirmado em fonte oficial está marcado.
- ✅ Conflitos entre frentes de pesquisa explicitados (§15), sem escolha silenciosa.
- ✅ Regra atual nunca aplicada retroativamente (exemplos E2 do ruído demonstram a vedação).
- ✅ Lacunas de vigência sinalizadas (interregno 1995–1997; vigência do Decreto 3.048).
- ⚠️ Verificação de links: parte das páginas do Planalto apresentou timeout/renderização client-side durante a coleta — itens afetados estão marcados `PENDING` e exigem checagem humana direta.
- ⚠️ Códigos duplicados: divergência de numeração detectada e isolada em C1/C2 antes de qualquer persistência.

**Este manifesto não autoriza seed nem implementação. Nenhuma regra entra no banco sem aprovação nominal.**
