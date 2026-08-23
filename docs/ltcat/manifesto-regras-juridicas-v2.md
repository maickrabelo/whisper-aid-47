# MANIFESTO DE REGRAS JURÍDICAS — LTCAT PREVIDENCIÁRIO
## Fase 2A — Versão 2 (pós rodada de validação das pendências críticas)

| Campo | Valor |
|---|---|
| Versão | 2.0 (segunda submissão para aprovação — incorpora a rodada de validação das 8 frentes críticas) |
| Data de elaboração | 23/08/2026 (data de consulta de todas as fontes) |
| Domínio implementado | `SOCIAL_SECURITY` (aposentadoria especial RGPS) — **exclusivamente** |
| Fora de escopo | NR-15 (insalubridade) e NR-16 (periculosidade) como conclusões trabalhistas. NR-15, NHOs, ISOs e demais normas técnicas aparecem apenas como **referência de metodologia/critério técnico** usado na caracterização previdenciária |
| Status do documento | `READY_FOR_REVIEW` — nenhuma regra aqui está parametrizada em software; nada foi criado em banco, migration, seed ou código |
| Regra de fontes | Somente fontes oficiais fundamentam regras (Planalto, INSS/GOV.BR, eSocial, MTE, Fundacentro, STF/STJ/TNU/CJF). Blogs/consultorias foram usados apenas para localizar temas. Tudo que não foi confirmado em fonte oficial está marcado `PENDING_LEGAL_VALIDATION`; conflitos e transições complexas estão marcados `REQUIRES_LEGAL_REVIEW` |
| Changelog | Ver `docs/ltcat/manifesto-v1-to-v2-changelog.md` — rastreabilidade integral das 8 validações |

---

# 0. RESOLUÇÕES DESTA VERSÃO (síntese das 8 frentes de validação)

| Frente | Pendência v1 | Resultado em v2 |
|---|---|---|
| 1. Ruído 1995–1997 | Limite e base normativa do interregno `PENDING` (C9) | **RESOLVIDO:** limite de **80 dB(A)** confirmado (Decreto 53.831/1964 como parâmetro; IN 128/2022, art. 292); identificada sub-divisão em **14/10/1996** (MP 1.523/1996 → exigência de laudo técnico como meio de prova) |
| 2. Vibrações | `NOT_PARAMETERIZED` (código e limites não confirmados) | **SUPERADO (estrutura):** item **2.0.2** do Anexo IV confirmado por transcrição literal do Planalto; **art. 296 da IN 128/2022 transcrito na íntegra** (3 incisos); matriz temporal completa parametrizada. Limites numéricos aren/VDVR seguem `PENDING` |
| 3. Agentes fora do Anexo IV | "Nunca automatizáveis", sem estrutura | **RESOLVIDO:** estrutura em 3 zonas temporais + especificação `EXCEPTIONAL_LEGAL_OVERRIDE`; **TNU Tema 210** (eletricidade >250V) confirmado com inteiro teor; código eSocial **05.01.001** confirmado como canal oficial com processo obrigatório |
| 4. Calor | Conflito C1 de numeração (1.0.4 × 2.0.4) | **RESOLVIDO:** transcrição direta do Planalto confirma **2.0.1 Ruído, 2.0.2 Vibrações, 2.0.3 Rad. Ionizantes, 2.0.4 Temperaturas Anormais (calor), 2.0.5 Pressão Atmosférica Anormal**; Tabela 24 `02.01.014` confirmada; Tema 323/TNU (19/11/2025) identificado |
| 5. IN PRES/INSS 128/2022 | Numeração de artigos `PENDING` (C8) | **RESOLVIDO (mapa):** Capítulo V, arts. 260–302. Confirmados: art. 287 (critérios quali/quanti), **art. 290, parágrafo único (exceção EPI×ruído)**, art. 292 (sub-períodos do ruído), art. 296 (vibrações), art. 299 (biológicos — presunção até 05/03/1997), art. 301 (agentes históricos limitados a < 05/03/1997) |
| 6. Tabela 24 eSocial | Estrutura de grupos `PENDING` (C2) | **RESOLVIDO (grupos):** 01 = Químicos, 02 = Físicos, 03 = Biológicos, 05 = Agentes reconhecidos por decisão judicial/administrativa. Confirmados: ruído `02.01.001`; calor `02.01.014` (remete à NR-15); vibrações `02.01.002–005`; biológicos `03.01.001–007`. **Sem códigos autônomos** para frio, umidade e radiações não ionizantes |
| 7. Químicos | Risco da regra automática errada "sem número no Anexo IV = qualitativo" | **CORRIGIDO:** substituída pela regra de roteamento por anexo da NR-15 (§9.0) — Anexo 11/Anexo 12 → quantitativo; Anexo 13/13-A/LINACH → qualitativo. Fichas por agente revisadas (arsênio, cádmio, chumbo, fósforo, manganês, mercúrio = quantitativos; benzeno, amianto, berílio, Grupo II = qualitativos) |
| 8. Biológicos | Natureza do rol e regime pré-1997 | **ESCLARECIDO:** alíneas a–g taxativas na letra do Decreto, mas jurisprudência (STJ/TNU) trata como **exemplificativa**; **art. 299, I, da IN 128/2022** permite enquadramento por presunção para qualquer estabelecimento **até 05/03/1997** |

---

# 1. RESUMO EXECUTIVO

1. **Sucessão normativa confirmada em fonte primária (Planalto):** Decreto 53.831/1964 → Decreto 83.080/1979 → Lei 8.213/1991 → **Lei 9.032/1995 (29/04/1995: fim do enquadramento por categoria profissional)** → **MP 1.523/1996 (14/10/1996: laudo técnico como prova)** → Decreto 2.172/1997 → Lei 9.528/1997 → Lei 9.732/1998 → **Decreto 3.048/1999 (Anexo IV)** → Decreto 4.882/2003 (19/11/2003) → Decreto 8.123/2013 (17/10/2013) → Portaria MTE 1.297/2014 (Anexo 8 NR-15, vibrações) → **EC 103/2019 (13/11/2019)** → Decreto 10.410/2020 → IN PRES/INSS 128/2022 (28/03/2022, consolidada).
2. **Princípio temporal confirmado e vinculante por jurisprudência:** o motor deve aplicar a regra vigente **na data da exposição**, nunca a regra atual retroativamente (Tema 694/STJ).
3. **Anexo IV — seção de agentes físicos confirmada por transcrição literal do Planalto (C1 resolvido):** 2.0.1 Ruído · 2.0.2 Vibrações ("trabalhos com perfuratrizes e marteletes pneumáticos", 25 anos) · 2.0.3 Radiações Ionizantes · 2.0.4 Temperaturas Anormais (**calor** — não inclui frio) · 2.0.5 Pressão Atmosférica Anormal.
4. **IN 128/2022 mapeada (C8 resolvido):** arts. 260–302 como capítulo da atividade especial, com âncoras confirmadas (287, 290, 292, 296, 299, 301). Citações no PDF/motor devem usar esta numeração.
5. **Tabela 24 estruturada (C2 resolvido):** 01 Químicos / 02 Físicos / 03 Biológicos / 05 excepcional. Códigos confirmados nos respectivos blocos; códigos individuais do grupo 01 (químicos) seguem `PENDING`.
6. **EPI:** Tema 555/STF (item II: ruído nunca descaracterizado por EPI) confirmado administrativamente pelo **art. 290, parágrafo único, da IN 128/2022**. **Novo marco identificado:** **Tema 1.090/STJ (repetitivo, 2025)** — anotação positiva de EPI eficaz no PPP afasta o tempo especial **em tese geral**; a extensão dessa tese a **cancerígenos sem limiar seguro** (benzeno, amianto, HPA, Cr VI, níquel) **não está pacificada** (Fundacentro, Despacho 24/2020/PRES) → esses casos permanecem `HUMAN_REVIEW_REQUIRED`.
7. **Automatização:** vibrações saem de `NOT_PARAMETERIZED` para estrutura temporal parametrizável (decisão de mérito segue com confirmação humana até validação dos limites aren/VDVR). Conclusão final de publicação continua `HUMAN_DECISION_REQUIRED`.
8. **Pendências remanescentes:** 20 itens (§18), concentrados em: códigos individuais da Tabela 24 grupo 01, limites numéricos NHO-09/10 e Quadro 1 do Anexo 11 da NR-15, teses literais (Tema 534/STJ, Tema 1.090/STJ, Tema 323/TNU, tese TNU vibrações 10/2025) e precedentes de frio/umidade/radiação não ionizante. **Nenhum item pendente entra no banco antes de validação.**

---

# 2. HISTORICAL_RULE_TIMELINE

| # | Data inicial | Data final | Mudança normativa | Efeito no sistema | Fonte oficial |
|---|---|---|---|---|---|
| T1 | 30/03/1964 | 28/01/1979 | Decreto 53.831/1964: **enquadramento por categoria profissional** (Quadro Anexo, 15/20/25 anos). Inclui frio (1.1.2), umidade (1.1.3), radiação genérica (1.1.4), eletricidade >250V (1.1.8) e vibração quantitativa por golpes (1.1.5, 120 golpes/min) | Presunção legal de nocividade; sem laudo | planalto.gov.br (íntegra primária do DOU `PENDING` — usada cópia de terceiro nesta rodada) |
| T2 | 29/01/1979 | 05/03/1997 | Decreto 83.080/1979: Anexos I/II, **convivendo** com o Decreto 53.831/1964 (rol de físicos mais restrito: sem umidade/eletricidade/radiação não ionizante autônomos; mantém frio em câmaras frigoríficas) | Regra do anexo mais favorável ao segurado no período de convivência — `REQUIRES_LEGAL_REVIEW` para aplicação | planalto.gov.br/ccivil_03/decreto/d83080.htm |
| T3 | 25/07/1991 | 28/04/1995 | Lei 8.213/1991, arts. 57/58 (redação original): categoria + formulário | Continuidade | planalto.gov.br/ccivil_03/leis/l8213cons.htm |
| T4 | **29/04/1995** | — (paradigma vigente) | **Lei 9.032/1995: extingue o enquadramento por categoria profissional**; exige comprovação da efetiva exposição habitual e permanente | Marco de corte absoluto: categorias só valem até 28/04/1995 | planalto.gov.br/ccivil_03/leis/l9032.htm |
| T4a | **14/10/1996** | — | **MP 1.523/1996 (posteriormente Lei 9.528/1997, art. 5º):** laudo técnico passa a ser meio de prova exigido da exposição | Subdivide o interregno 1995–1997: a partir desta data, formulário **embasado em laudo técnico** | planalto.gov.br (MP 1.523/96 — redação convertida `REQUIRES_LEGAL_REVIEW` para literalidade) |
| T5 | 06/03/1997 | 05/05/1999 | Decreto 2.172/1997: formulário embasado em laudo; Anexo IV próprio (ruído **90 dB(A)**; vibrações por **ISO 2.631/ISO-DIS 5.349**). **Revoga Decretos 53.831/64 e 83.080/79** | Fim do enquadramento de frio, umidade, eletricidade e radiação não ionizante (ausentes do novo rol) | planalto.gov.br/ccivil_03/decreto/d2172.htm |
| T6 | 11/12/1997 | — | Lei 9.528/1997: conversão da MP 1.523/96; altera arts. 57/58 | Consolida a exigência de laudo técnico | planalto.gov.br/ccivil_03/leis/l9528.htm (conteúdo exato `PENDING`) |
| T7 | 14/12/1998 | — | Lei 9.732/1998: altera dispositivos da Lei 8.213/91 | Consolidação dos requisitos (15/20/25 anos; "permanente" — literalidade `PENDING`) | planalto.gov.br/ccivil_03/leis/l9732.htm |
| T8 | **06/05/1999** (início exato de vigência `REQUIRES_LEGAL_REVIEW` — C10) | vigente (com alterações) | **Decreto 3.048/1999 (RPS)**: Anexo IV unificado; rol de agentes **exaustivo**, atividades exemplificativas (químicos) / taxativas na letra (biológicos) | Estrutura normativa-mãe do motor | planalto.gov.br/ccivil_03/decreto/d3048compilado.htm |
| T9 | **19/11/2003** | vigente | Decreto 4.882/2003: altera itens **2.0.1 (ruído: 90→85 dB(A)), 3.0.1 e 4.0.0** | Redução do limite de ruído **sem retroatividade** (Tema 694/STJ) | planalto.gov.br/ccivil_03/decreto/2003/d4882.htm |
| T10 | 01/01/2004 | vigente | **PPP torna-se o documento padrão** de comprovação | Documentos aceitos passam a depender do período do labor (§14) | Ato exato `PENDING_LEGAL_VALIDATION` |
| T11 | 17/10/2013 | vigente | Decreto 8.123/2013: metodologia técnica (ruído → NEN/NHO-01; calor → NHO-06); disciplina LTCAT/PPP/responsável técnico | Metodologia identificada obrigatória para períodos ≥ 17/10/2013 | planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d8123.htm |
| T11a | 10/09/2012 | 12/08/2014 | Publicação das **NHO-09 e NHO-10** (Fundacentro): uso **facultativo** para vibrações (art. 296, III, parte final, IN 128/2022) | LTCAT pode adotar NHO-09/10 antes da obrigatoriedade | gov.br/fundacentro; portalin.inss.gov.br/in/76 |
| T11b | **13/08/2014** | vigente | **Portaria MTE 1.297/2014** aprova o **Anexo 8 da NR-15** (vibrações): critério quantitativo obrigatório com NHO-09/NHO-10 (art. 296, III, IN 128/2022) | Vibrações passam a ter limite de tolerância regulamentar de referência | gov.br/trabalho-e-emprego; portalin.inss.gov.br/in/76 |
| T12 | **13/11/2019** | vigente | **EC 103/2019**: idade mínima 55/58/60 + tempo de exposição; transição por pontos; direito adquirido até 13/11/2019. **Não altera a comprovação técnica da exposição** | Afeta cálculo de benefício, **não** a caracterização; conversão de tempo especial limitada a exposições até 13/11/2019 (Tema 998/STF — teor `REQUIRES_LEGAL_REVIEW`) | planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc103.htm |
| T13 | 30/06/2020 | vigente | Decreto 10.410/2020: nova redação a dispositivos do RPS; revoga art. 70 (tabela de conversão) | Atualização regulamentar pós-Reforma | planalto.gov.br/ccivil_03/decreto/d3048compilado.htm |
| T14 | 28/03/2022 | vigente (alterada por IN 170/2024 e posteriores) | **IN PRES/INSS 128/2022**: disciplina análise de exposição, LTCAT, EPI (art. 290), sub-períodos do ruído (art. 292), vibrações (art. 296), biológicos (art. 299), agentes históricos (art. 301) | Norma operacional de referência do motor para evidências | portalin.inss.gov.br/in/76 |
| T15 | jan/2023 | vigente | **PPP eletrônico via eSocial (S-2240)** | LTCAT alimenta evento eletrônico; rastreabilidade LTCAT↔S-2240 obrigatória | gov.br/esocial (ato/data exatos `REQUIRES_LEGAL_REVIEW` — C7) |

**Marcos que exigem versões distintas no motor (resumo operacional):** 28/04/1995 (fim categoria) · **14/10/1996 (laudo técnico exigido — novo)** · 06/03/1997 (Dec. 2.172/97; fim dos agentes históricos) · 06/05/1999 (Anexo IV RPS) · 19/11/2003 (85 dB(A); biológicos; associação) · 01/01/2004 (PPP) · 10/09/2012 (NHO-09/10 facultativo) · 17/10/2013 (metodologias NHO) · **13/08/2014 (Anexo 8 NR-15 vibrações — novo)** · 13/11/2019 (Reforma — só benefício/conversão) · 28/03/2022 (IN 128/2022) · jan/2023 (PPP eletrônico).

---

# 3. AGENT_MASTER_MANIFEST

Códigos internos estáveis (`internal_code`) — **nunca** usar código de Tabela 24 ou Anexo IV como identidade do agente. Nível de automação: `PARAMETERIZABLE` / `PARTIALLY_PARAMETERIZABLE` / `HUMAN_REVIEW_REQUIRED`.

| internal_code | Nome normalizado | Categoria | Cód. Anexo IV | Cód. Tabela 24 | evaluation_type | Metodologia | automation_level | Notas |
|---|---|---|---|---|---|---|---|---|
| PHYS_RUIDO | Ruído contínuo ou intermitente | Físico | 2.0.1 ✅ | **02.01.001** ✅ | Quantitativo | NHO-01 (NEN); NR-15 An. 1 (períodos antigos) | PARTIALLY_PARAMETERIZABLE | EPI nunca descaracteriza (Tema 555/STF II + art. 290, p. único, IN 128/2022) |
| PHYS_VIBR_MB | Vibrações — mãos e braços (VMB) | Físico | 2.0.2 ✅ | **02.01.002** ✅ | Quantitativo (pós-1997) | ISO/DIS 5.349 (1997–2014); NHO-10 (desde 13/08/2014; facultativo desde 10/09/2012) | PARTIALLY_PARAMETERIZABLE | Limites numéricos `PENDING`; mérito com confirmação humana |
| PHYS_VIBR_CI | Vibrações — corpo inteiro (VCI) | Físico | 2.0.2 ✅ | **02.01.003** (aren) / **02.01.004** (VDVR) ✅ | Quantitativo (pós-1997) | ISO 2.631 (1997–2014); NHO-09 (desde 13/08/2014; facultativo desde 10/09/2012) | PARTIALLY_PARAMETERIZABLE | Idem |
| PHYS_VIBR_PERF | Vibrações — perfuratrizes e marteletes pneumáticos | Físico | 2.0.2, alínea a ✅ | **02.01.005** ✅ | **Qualitativo** (atividade, todo período) | Descrição de atividade | PARTIALLY_PARAMETERIZABLE | Enquadramento direto pelo Anexo IV, 25 anos |
| PHYS_RAD_ION | Radiações ionizantes | Físico | 2.0.3 ✅ | 02.01.006–013 (`PENDING` — confirmar códigos) | Qualitativo/quantitativo misto | Dosimetria CNEN + rol de atividades | PARTIALLY_PARAMETERIZABLE | 7 alíneas de atividades |
| PHYS_CALOR | Calor (temperaturas anormais) | Físico | **2.0.4** ✅ (C1 resolvido) | **02.01.014** ✅ (remete à NR-15) | Quantitativo | NHO-06 (pós-2013); NR-15 An. 3 (anterior) | PARTIALLY_PARAMETERIZABLE | Fonte natural enquadrável desde 06/03/1997 (TNU); Tema 323/TNU (11/2025) `REQUIRES_LEGAL_REVIEW` |
| PHYS_PRESS_HIPER | Pressões atmosféricas anormais (hiperbáricas) | Físico | 2.0.5 ✅ | 02.01.015–018 (`PENDING`) | Qualitativo (3 atividades taxativas) | Descrição de atividade | PARTIALLY_PARAMETERIZABLE | Mergulho, tubulões/túneis, caixões/câmaras |
| CHEM_ARSENIO | Arsênio e compostos | Químico | 1.0.1 | `PENDING` | **Misto** (Anexo 11: quantitativo; Anexo 13: qualitativo por atividade) | NHO + inspeção NR-15 An. 13 | PARTIALLY_PARAMETERIZABLE | IARC Grupo 1; EPI×cancerígeno `PENDING` (Tema 1.090) |
| CHEM_ASBESTO | Asbesto (amianto) | Químico | 1.0.2 | `PENDING` | **Qualitativo por natureza** (+LT técnico Anexo 12 NR-15) | Contagem de fibras (NIOSH 7400 adaptado) | HUMAN_REVIEW_REQUIRED | Sem nível seguro (STF ADI 3.406/3.470); tese EPI fortemente contestada |
| CHEM_BENZENO | Benzeno e compostos tóxicos | Químico | 1.0.3 | `PENDING` | **Qualitativo** (Anexo 13-A NR-15 + PPEOB) | Programa específico benzeno (IN MTP 2/2021) | HUMAN_REVIEW_REQUIRED | Manuseio de misturas ≥1% em volume; sem limiar seguro; Fundacentro Despacho 24/2020/PRES |
| CHEM_BERILIO | Berílio e compostos tóxicos | Químico | 1.0.4 | `PENDING` | **Qualitativo** (Anexo 13 NR-15 — confirmar enquadramento exato `PENDING`) | Inspeção NR-15 An. 13 | PARTIALLY_PARAMETERIZABLE | IARC Grupo 1 |
| CHEM_BROMO | Bromo e compostos tóxicos | Químico | 1.0.5 | `PENDING` | A rotear por NR-15 (§9.0) | Conforme anexo NR-15 | PARTIALLY_PARAMETERIZABLE | Enquadramento NR-15 `PENDING` |
| CHEM_CADMIO | Cádmio e compostos tóxicos | Químico | 1.0.6 | `PENDING` | **Quantitativo** (Quadro 1 Anexo 11 NR-15 — confirmar item `PENDING`) | NHO (gravimetria + espectrometria) | PARTIALLY_PARAMETERIZABLE | IARC Grupo 1 |
| CHEM_CARVAO_HPA | Carvão mineral e derivados (piche, alcatrão, HPA) | Químico | 1.0.7 | `PENDING` | Qualitativo | NHO-06/NHO-08 | HUMAN_REVIEW_REQUIRED | HPAs cancerígenos |
| CHEM_CHUMBO | Chumbo e compostos tóxicos | Químico | 1.0.8 | `PENDING` | **Quantitativo** (Anexo 11) + biomarcador (plumbemia, NR-7) | NHO + indicadores biológicos | PARTIALLY_PARAMETERIZABLE | Composto importa (tetraetila ≠ inorgânico); EPI com maior consistência técnica que cancerígenos |
| CHEM_CLORO_ORG | Cloro e compostos tóxicos (organoclorados, PCB, cloreto de vinila) | Químico | 1.0.9 | `PENDING` | Misto por composto (§9.0) | Conforme anexo NR-15 | HUMAN_REVIEW_REQUIRED | Cloreto de vinila IARC Grupo 1 (angiossarcoma) |
| CHEM_CROMO | Cromo e compostos tóxicos | Químico | 1.0.10 | `PENDING` | Misto por valência (Cr VI: qualitativo/Anexo 13; Cr III: possível Anexo 11) | Conforme anexo NR-15 | HUMAN_REVIEW_REQUIRED | Cr(VI) IARC Grupo 1; laudo deve especificar valência |
| CHEM_CS2 | Dissulfeto de carbono | Químico | 1.0.11 | `PENDING` | Quantitativo | NHO (LT NR-15 An. 11) | PARAMETERIZABLE | LT numérico em NR-15 An. 11 |
| CHEM_FOSFORO | Fósforo e compostos tóxicos | Químico | 1.0.12 | `PENDING` | **Quantitativo** (Anexo 11 — valor exato `PENDING`) | NHO | PARTIALLY_PARAMETERIZABLE | — |
| CHEM_IODO | Iodo | Químico | 1.0.13 | `PENDING` | Quantitativo | NHO (LT NR-15 An. 11) | PARAMETERIZABLE | — |
| CHEM_MANGANES | Manganês e compostos | Químico | 1.0.14 | `PENDING` | **Quantitativo** (fumos, Anexo 11) | NHO (gravimetria + absorção atômica) | PARTIALLY_PARAMETERIZABLE | Neurotóxico |
| CHEM_MERCURIO | Mercúrio e compostos | Químico | 1.0.15 | `PENDING` | **Quantitativo** (vapor, VLE-Teto Anexo 11) + mercúrio urinário (NR-7) | NHO + indicadores biológicos | PARTIALLY_PARAMETERIZABLE | Absorção cutânea relevante |
| CHEM_NIQUEL | Níquel e compostos tóxicos | Químico | 1.0.16 | `PENDING` | Misto por forma química (solúveis: Anexo 11; metálico/sulfeto: qualitativo) | Conforme anexo NR-15 | HUMAN_REVIEW_REQUIRED | IARC Grupo 1; laudo deve especificar forma |
| CHEM_PETROLEO_HPA | Petróleo, xisto, gás natural e derivados | Químico | 1.0.17 | `PENDING` | Qualitativo | NHO-06/NHO-08 (HPA por HPLC) | HUMAN_REVIEW_REQUIRED | Benzo[a]pireno IARC 1; misturas asfálticas com HPA (alínea b) |
| CHEM_SILICA | Sílica livre cristalizada | Químico | 1.0.18 | `PENDING` | **Quantitativo** (Anexo 12 NR-15, fórmula por %SiO₂) | NHO (gravimetria + DRX) | PARTIALLY_PARAMETERIZABLE | Tensão fibrogênico × IARC Grupo 1 `PENDING` |
| CHEM_OUTROS_G1 | Outras substâncias — Grupo I (estireno, butadieno, acrilonitrila, n-hexano, TDI etc.) | Químico | 1.0.19 (Grupo I) | `PENDING` | **Quantitativo quando constar do Anexo 11** (estireno, n-hexano têm LT) | NHO por composto | PARTIALLY_PARAMETERIZABLE | Tratamento varia por substância — identificação nominal obrigatória |
| CHEM_OUTROS_G2 | Outras substâncias — Grupo II (benzidina, benzopireno, óxido de etileno, cloreto de vinil, creosoto etc.) | Químico | 1.0.19 (Grupo II) | `PENDING` | **Qualitativo** (cancerígenos/mutagênicos — LINACH) | Identificação do uso/manuseio | HUMAN_REVIEW_REQUIRED | Mera exposição gera tempo especial (jurisprudência TRF2); EPI controvertido |
| BIO_MICROORG | Microorganismos e parasitas infecto-contagiosos vivos e suas toxinas | Biológico | 3.0.1 ✅ | 03.01.001–007 ✅ | Qualitativo (7 atividades na letra do Decreto) | Avaliação qualitativa circunstanciada | PARTIALLY_PARAMETERIZABLE | Presunção até 05/03/1997 (art. 299, I, IN 128/2022); rol tratado como exemplificativo pela jurisprudência |
| ASSOC_MIN_SUB_AF | Mineração subterrânea afastada da frente de produção | Associação | 4.0.1 | 04.01.001 (`PENDING`) | Qualitativo | Função + local | PARTIALLY_PARAMETERIZABLE | **20 anos** |
| ASSOC_MIN_SUB_FP | Mineração subterrânea em frente de produção | Associação | 4.0.2 | 04.01.002 (`PENDING`) | Qualitativo | Função + local | PARTIALLY_PARAMETERIZABLE | **15 anos** |
| HIST_RAD_NION | Radiações não ionizantes | Físico (histórico) | Ausente do Anexo IV vigente ✅ (transcrição Planalto) | Sem código autônomo; 05.01.001 quando excepcional ✅ | — | — | HUMAN_REVIEW_REQUIRED | 3 zonas temporais (§11); só exceção judicial/administrativa pós-1997 |
| HIST_FRIO | Frio | Físico (histórico) | Ausente ✅ | Sem código autônomo ✅ | — | — | HUMAN_REVIEW_REQUIRED | Dec. 53.831/64 (1.1.2) + Dec. 83.080/79 (1.1.2, câmaras frigoríficas) até 05/03/1997; sem precedente qualificado pós-97 localizado |
| HIST_UMIDADE | Umidade | Físico (histórico) | Ausente ✅ | Sem código autônomo ✅ | — | — | HUMAN_REVIEW_REQUIRED | Apenas Dec. 53.831/64 (1.1.3) até 05/03/1997; nenhum precedente qualificado localizado |
| HIST_ELETRICIDADE | Eletricidade (tensão > 250V) | Físico (histórico) | Ausente ✅ | Sem código autônomo ✅ | — | — | HUMAN_REVIEW_REQUIRED | Apenas Dec. 53.831/64 (1.1.8) até 05/03/1997; **TNU Tema 210** (exceção judicial) |
| HIST_INFRA_ULTRA | Infrassom/Ultrassom | Físico (histórico) | Ausente | Tabela 23 (NR-9), não 24 | — | — | HUMAN_REVIEW_REQUIRED | Não confundir com ruído (2.0.1) |

---

# 4. METHODOLOGY_MANIFEST

| Cód. interno | Metodologia | Órgão | Versão | Agentes | Vigência inicial | Vigência final | Parâmetros necessários | Unidades | Referência oficial | Status de uso previdenciário |
|---|---|---|---|---|---|---|---|---|---|---|
| MET_QUALIT | Avaliação qualitativa circunstanciada | — | — | Biológicos, hiperbárico, associações, químicos qualitativos, vibração por perfuratrizes | Sempre | vigente | Descrição de atividade, contato efetivo, frequência, setor | — | Anexo IV + IN 128/2022 (art. 287) | Aceita para agentes sem limite de tolerância |
| MET_NHO01 | NHO-01 — Avaliação da exposição ocupacional ao ruído | Fundacentro | 2001 e revisões | Ruído contínuo/intermitente | 17/10/2013 (exigida) | vigente | NEN, dose, tempo de exposição, jornada | dB(A), % | gov.br/fundacentro | Obrigatória pós-Dec. 8.123/2013; q=3 |
| MET_NR15_AN1 | NR-15 Anexo 1 — Limites de tolerância para ruído | MTE | Portaria 3.214/1978 e alterações | Ruído | Períodos anteriores a 2013 | Referência técnica | Nível médio, tempo, q=5 | dB(A) | gov.br/trabalho-e-emprego | Critério técnico histórico |
| MET_NR15_AN2 | NR-15 Anexo 2 — Ruído de impacto | MTE | idem | Ruído de impacto | idem | Referência | Nível de pico | dB(C)/dB(A) pico | idem | `PENDING` no Anexo IV (sem item próprio) |
| MET_NHO06 | NHO-06 — Avaliação da exposição ocupacional ao calor | Fundacentro | 2002 e revisões | Calor | 17/10/2013 (exigida) | vigente | IBUTG, taxa metabólica, regime trabalho/descanso | °C (IBUTG) | gov.br/fundacentro | Obrigatória pós-2013 (ver Tema 323 TNU — `REQUIRES_LEGAL_REVIEW`) |
| MET_NR15_AN3 | NR-15 Anexo 3 — Limites de tolerância para calor | MTE | 1978+ | Calor | 06/03/1997 (por remissão) | 16/10/2013 (como critério direto) | IBUTG, taxa metabólica, regime | °C | gov.br/trabalho-e-emprego | Critério histórico por remissão do Anexo IV |
| MET_ISO2631 | ISO 2.631 — Vibração de corpo inteiro | ISO | vigente à época | VCI | 06/03/1997 | 12/08/2014 | Limites definidos na própria norma | m/s² | IN 128/2022, art. 296, II | Critério regulamentar do período (Dec. 2.172/97) |
| MET_ISO5349 | ISO/DIS 5.349 — Vibração mãos-braços | ISO | vigente à época | VMB | 06/03/1997 | 12/08/2014 | idem | m/s² | IN 128/2022, art. 296, II | idem |
| MET_NHO09 | NHO-09 — Vibração de corpo inteiro (aren, VDVR) | Fundacentro | 2013 | VCI | 10/09/2012 (facultativo); **13/08/2014 (obrigatório)** | vigente | aren, VDVR | m/s² | gov.br/fundacentro | Limites do Anexo 8 NR-15; valores numéricos `PENDING_LEGAL_VALIDATION` |
| MET_NHO10 | NHO-10 — Vibração mãos-braços | Fundacentro | 2013 | VMB | idem | vigente | aren por eixo | m/s² | gov.br/fundacentro | idem |
| MET_NR15_AN8 | NR-15 Anexo 8 — Vibrações | MTE | Portaria MTE 1.297/2014 | VCI, VMB | 13/08/2014 | vigente | Limites de tolerância do anexo | m/s² | gov.br/trabalho-e-emprego | Limite regulamentar de referência pós-2014 |
| MET_NHO05 | NHO-05 — Monitoramento biológico | Fundacentro | vigente | Chumbo, mercúrio | Referência | vigente | Biomarcador | µg/100mL | gov.br/fundacentro | Evidência complementar |
| MET_NHO08 | NHO-08 — Coleta/análise de poeiras | Fundacentro | vigente | Sílica, poeiras minerais | Referência | vigente | Massa respirável, % SiO₂ | mg/m³ | gov.br/fundacentro | Aceita com fórmula NR-15 An. 12 |
| MET_NHO_QUIM | NHOs de amostragem química (gravimetria, espectrometria, HPLC) | Fundacentro | vigente | Químicos quantitativos | Referência | vigente | Concentração média ponderada | ppm, mg/m³ | gov.br/fundacentro | Critério técnico; LT vem da NR-15 |
| MET_NR15_AN11 | NR-15 Anexo 11 — Quadro 1 (LT por substância) | MTE | vigente | Químicos com LT numérico | Referência | vigente | LT/LEO por composto | ppm, mg/m³ | gov.br/trabalho-e-emprego | **Roteador de quali/quanti (§9.0)** — valores por composto `PENDING` |
| MET_NR15_AN12 | NR-15 Anexo 12 — Poeiras minerais | MTE | vigente | Sílica, asbesto, poeiras | Referência | vigente | Fórmula %SiO₂; contagem de fibras | mg/m³, f/cm³ | gov.br/trabalho-e-emprego | Quantitativo |
| MET_NR15_AN13 | NR-15 Anexo 13 — Atividades por inspeção (sem LT numérico) | MTE | vigente | Químicos sem LT (ex.: berílio) | Referência | vigente | Descrição técnica + grau | — | gov.br/trabalho-e-emprego | Qualitativo por natureza da norma |
| MET_NR15_AN13A | NR-15 Anexo 13-A — Benzeno | MTE | Portaria SSST 14/1995; IN MTP 2/2021 | Benzeno | Referência | vigente | PPEOB; misturas ≥1% vol | — | gov.br/trabalho-e-emprego | Qualitativo por natureza do risco |
| MET_DOSIM_CNEN | Dosimetria individual de radiações ionizantes | CNEN | NN 3.01 | Radiações ionizantes | Referência | vigente | Dose efetiva | mSv | cnen.gov.br | Evidência técnica; enquadramento por atividade |
| MET_FIBRAS | Contagem de fibras (microscopia contraste de fase, NIOSH 7400 adaptado) | Fundacentro/NIOSH | — | Asbesto | Referência | vigente | Fibras/cm³ | f/cm³ | Fundacentro | Evidência; presença basta (qualitativo) |
| MET_GOLPES | Medição de vibração em golpes por minuto | — | Dec. 53.831/64 (1.1.5) | Vibração (período histórico) | — | 05/03/1997 | Golpes/min; LT 120/min | golpes/min | IN 128/2022, art. 296, I | Critério quantitativo histórico |

**Regra de incompatibilidade de metodologia:** o motor **nunca converte silenciosamente** resultados entre metodologias incompatíveis (ex.: NEN q=3 ↔ nível médio q=5; IBUTG NHO-06 ↔ NR-15 An. 3 sem identificar taxa metabólica; ISO 2.631 ↔ NHO-09 sem perímetro de equivalência). Se o LTCAT não declara metodologia/parâmetros para período em que ela é exigida → `INCONCLUSIVE`.

---

# 5. BLOCO A — MANIFESTO DAS REGRAS GERAIS

### GEN-001 — Exposição efetiva
- **rule_key:** `GEN_EFFECTIVE_EXPOSURE` · **domínio:** SOCIAL_SECURITY
- **Norma principal:** Lei 8.213/1991, art. 57, caput e §1º (literalidade do §1º `PENDING_LEGAL_VALIDATION`); IN 128/2022, art. 287.
- **Conteúdo:** aposentadoria especial pressupõe exposição **efetiva** do trabalhador ao agente nocivo (Tema 555/STF, item I).
- **Conclusão do motor:** exigir evidência de exposição real (LTCAT/PPP com agente identificado), nunca presunção por ambiente/categoria (pós-29/04/1995).
- **Status:** READY_FOR_REVIEW

### GEN-002 — Permanente, não ocasional nem intermitente
- **rule_key:** `GEN_PERMANENT_EXPOSURE`
- **Norma principal:** Decreto 3.048/1999, art. 65 (literalidade `PENDING`).
- **Conteúdo:** exposição eventual/intermitente não caracteriza. Motor exige campos: frequência, duração/jornada, indissociabilidade da atividade-fim. **Exceção qualificada:** TNU Tema 210 (eletricidade >250V) — habitualidade/permanência interpretadas conforme a rotina de trabalho, **sem exigir exposição ininterrupta**; alcance extensivo a outros agentes `REQUIRES_LEGAL_REVIEW`.
- **INCONCLUSIVE quando:** frequência declarada como "eventual", "esporádica" ou ausente.
- **Status:** READY_FOR_REVIEW

### GEN-003 — Regra temporal (tempus regit actum)
- **rule_key:** `GEN_TEMPORAL_RULE`
- **Conteúdo:** o enquadramento usa a legislação **da época da prestação do serviço** (Tema 694/STJ; IN 128/2022 aplica sub-períodos expressos nos arts. 292, 296, 299 e 301 — confirmação administrativa do princípio).
- **Conclusão do motor:** resolução de regra SEMPRE por `valid_from/valid_to` do período da exposição; proibido aplicar regra atual a período histórico.
- **Status:** READY_FOR_REVIEW (princípio confirmado em múltiplas âncoras); dispositivo geral do RPS `REQUIRES_LEGAL_REVIEW`

### GEN-004 — Responsável técnico do LTCAT
- **rule_key:** `GEN_TECHNICAL_RESPONSIBLE`
- **Norma principal:** Lei 8.213/1991, art. 58, §4º — LTCAT emitido por **médico do trabalho ou engenheiro de segurança do trabalho** (literalidade dos incisos a–h `PENDING`)
- **Conclusão do motor:** documento sem responsável técnico habilitado identificado (nome, CPF, conselho, nº registro) → **bloqueio de publicação**.
- **Status:** READY_FOR_REVIEW

### GEN-005 — Rol de agentes exaustivo; atividades exemplificativas/taxativas
- **rule_key:** `GEN_ANNEX_IV_SCOPE`
- **Fonte:** Cabeçalho 1.0.0 do Anexo IV (transcrição confirmada nesta rodada): *"O que determina o direito ao benefício é a exposição do trabalhador ao agente nocivo presente no ambiente de trabalho e no processo produtivo, em nível de concentração superior aos limites de tolerância estabelecidos. O rol de agentes nocivos é exaustivo, enquanto que as atividades listadas, nas quais pode haver a exposição, é exemplificativa."* (Decreto 3.265/1999) · Cabeçalho 3.0.0 (biológicos): "exposição unicamente nas atividades relacionadas".
- **Conteúdo:** só gera enquadramento agente constante do Anexo IV; para químicos, a atividade listada é exemplo; para biológicos, rol fechado na letra do Decreto, mas tratado como exemplificativo pela jurisprudência (§10).
- **Jurisprudência correlata:** **Tema 534/STJ** (rol exemplificativo) — existência confirmada; texto integral e processo de origem `PENDING` (nº informado por fonte secundária conflita com o do Tema 694 — não citar em peça sem conferência).
- **NOT_PARAMETERIZED quando:** agente citado não consta do Anexo IV nem é enquadrável por composição comprovada (ex.: "solvente orgânico" genérico sem CAS — **confirmado: não existe item genérico "solventes" no Anexo IV**; enquadramento exige composto nominado: benzeno 1.0.3, CS₂ 1.0.11, substância de 1.0.19 etc.).
- **Status:** READY_FOR_REVIEW

### GEN-006 — Documentos de comprovação por período
- **rule_key:** `GEN_EVIDENCE_BY_PERIOD` — tabela completa em §14
- Até 28/04/1995: categoria profissional (CTPS/registro) · 29/04/1995–13/10/1996: comprovação de exposição (formulário) · **14/10/1996–2003: formulário embasado em laudo técnico** (MP 1.523/96 → Lei 9.528/97) · ≥ 01/01/2004: PPP (base: LTCAT) · ≥ jan/2023: PPP eletrônico (S-2240).
- Laudo extemporâneo: aceito pela jurisprudência se inalteradas as condições; Tema repetitivo específico não confirmado — `REQUIRES_LEGAL_REVIEW`.
- **Status:** READY_FOR_REVIEW (estrutura), PENDING (atos exatos)

### GEN-007 — Alterações ambientais relevantes
- **rule_key:** `GEN_ENV_CHANGE`
- **Conteúdo:** mudança de máquina, processo, produto, ambiente, jornada, EPC, EPI ou metodologia **encerra a condição anterior** e abre nova. Nenhum prazo fixo de atualização do LTCAT confirmado em fonte (`PENDING`); exigência operacional de contemporaneidade (IN 128/2022 — arts. exatos na faixa 276–280 `PENDING`).
- **Status:** READY_FOR_REVIEW

---

# 6. BLOCO B — RUÍDO (detalhado)

**Agente interno:** `PHYS_RUIDO` · **Categoria:** físico · **Anexo IV:** 2.0.1 ✅ · **Tabela 24:** 02.01.001 ✅ · **Tempo previdenciário:** 25 anos.

### 6.1 Versões da regra

| rule_key | valid_from | valid_to | Limite | Unidade | Metodologia | Critério | EPI | Motivo do marco | Fonte |
|---|---|---|---|---|---|---|---|---|---|
| NOISE_V1 | — | 28/04/1995 | — | — | — | Categoria profissional (Quadro Anexo Dec. 53.831/64 e 83.080/79) | n/a | Vigência dos regulamentos antigos | Decretos 53.831/64, 83.080/79 |
| **NOISE_V2A** | **29/04/1995** | **13/10/1996** | **80 dB(A)** ✅ | dB(A) | Não normatizada | Habitual + permanente, comprovados | n/a | Lei 9.032/95 (fim categoria) | Lei 9.032/95; Dec. 53.831/64 (parâmetro); IN 128/2022, art. 292 ✅ |
| **NOISE_V2B** | **14/10/1996** | **05/03/1997** | **80 dB(A)** ✅ | dB(A) | Não normatizada | Habitual + permanente, comprovados; **laudo técnico exigido** | n/a | MP 1.523/1996 (→ Lei 9.528/97) | MP 1.523/96; IN 128/2022, art. 292 ✅ |
| NOISE_V3 | 06/03/1997 | 05/05/1999 | **90 dB(A)** | dB(A) | Medição técnica | Quantitativo | n/a | Decreto 2.172/1997 | d2172.htm; Tema 694/STJ |
| NOISE_V4 | 06/05/1999 | 18/11/2003 | **90 dB(A)** | dB(A) | idem | Quantitativo | n/a | Decreto 3.048/1999 (redação original) | Anexo IV; Tema 694/STJ |
| NOISE_V5 | 19/11/2003 | 16/10/2013 | **85 dB(A)** | dB(A) | Limites da legislação trabalhista (remissão NR-15) — literalidade `PENDING` | Quantitativo | Sem tratamento expresso | Decreto 4.882/2003 (item 2.0.1) | d4882.htm |
| NOISE_V6 | 17/10/2013 | 27/03/2022 | **NEN > 85 dB(A)** | dB(A) (NEN) | **NHO-01 Fundacentro** | Quantitativo | Tema 555/STF II: EPI **nunca** descaracteriza | Decreto 8.123/2013 | d8123.htm (literalidade `PENDING`) |
| NOISE_V7 | 28/03/2022 | vigente | NEN > 85 dB(A) | dB(A) | NHO-01 | Quantitativo + evidências IN | idem — confirmado pelo **art. 290, parágrafo único, IN 128/2022** ✅ | IN 128/2022 | portalin.inss.gov.br/in/76 |

### 6.2 Campos da regra (estrutura obrigatória)

- **Regra de comparação:** `measured_NEN > limite(período)` → especial; caso contrário não especial.
- **Interregno 1995–1997 (resolvido):** limite **80 dB(A)** confirmado, com base no Decreto 53.831/64 como parâmetro administrativo e no art. 292 da IN 128/2022. Sub-períodos: até 13/10/1996 comprovação por formulário; a partir de 14/10/1996 **laudo técnico obrigatório** (MP 1.523/96).
- **EPC:** medidas coletivas que reduzam o NEN a ≤ limite descaracterizam (efeito na medição).
- **EPI:** **exceção absoluta** — Tema 555/STF, item II (RE 664.335/SC; redação literal no portal STF `PENDING`) **+ art. 290, parágrafo único, IN 128/2022** (confirmação administrativa primária) ✅.
- **q=3 vs q=5:** divergência técnica ativa — `REQUIRES_LEGAL_REVIEW` quando o LTCAT não declara o critério.
- **Ruído variável sem NEN:** Tema 1083/STJ (REsp 1.886.795/RS) — nível máximo (pico) com habitualidade comprovada.
- **Ruído de impacto:** NR-15 An. 2 como referência técnica; sem item próprio no Anexo IV → `NOT_PARAMETERIZED` como agente autônomo.
- **Evidência exigida:** LTCAT/PPP com medição por dosímetro/medidor integrador, metodologia declarada, jornada, responsável técnico.

### 6.3 Exemplos técnicos por marco temporal

| # | Cenário | Regra | Resultado |
|---|---|---|---|
| E1 | NEN 88 dB(A), exposição em 2010 | NOISE_V5 (85) | `SPECIAL=TRUE` (88 > 85) |
| E2 | NEN 88 dB(A), exposição em 2000 | NOISE_V4 (90) | `SPECIAL=FALSE` — vedação de retroatividade (Tema 694/STJ) |
| E2a | **Medição 82 dB(A), exposição em 1996 (pós-14/10), com laudo** | **NOISE_V2B (80)** | **`SPECIAL=TRUE` (82 > 80), exige laudo técnico** ✅ |
| E2b | **Medição 82 dB(A), exposição em 1995 (pós-29/04), sem laudo** | **NOISE_V2A (80)** | **`SPECIAL=TRUE` se habitualidade comprovada por formulário/outros meios** ✅ |
| E3 | Dose 130% em jornada 8h, 2015, EPI "eficaz" declarado | NOISE_V6 | `SPECIAL=TRUE`, `EPI_OVERRIDE=IGNORED_NOISE` |
| E4 | Apenas picos, sem NEN, 2018 | Tema 1083/STJ | `INCONCLUSIVE_REQUIRES_ADDITIONAL_DATA` |

### 6.4 INCONCLUSIVE / NOT_PARAMETERIZED (ruído)
- `INCONCLUSIVE`: LTCAT sem metodologia declarada para período ≥ 17/10/2013; conflito q=3/q=5 não resolvido; período 1995–1997 sem qualquer comprovação documental.
- `NOT_PARAMETERIZED`: ruído de impacto como item autônomo; infrassom/ultrassom.

---

# 7. BLOCO C — CALOR

**Agente interno:** `PHYS_CALOR` · **Categoria:** físico · **Anexo IV:** **2.0.4 ✅ (conflito C1 resolvido por transcrição literal do Planalto — calor é físico; 1.0.4 é berílio, químico)** · **Tabela 24:** **02.01.014 ✅** (descrição remete à NR-15) · **Tempo previdenciário:** 25 anos.

### 7.1 Versões da regra

| rule_key | valid_from | valid_to | Critério | Metodologia | Fonte/motivo |
|---|---|---|---|---|---|
| HEAT_V1 | — | 28/04/1995 | Categoria profissional | — | Decretos 53.831/64, 83.080/79 |
| HEAT_V2 | 29/04/1995 | 05/03/1997 | Exposição efetiva sem limite regulamentar próprio | — | Lei 9.032/95 |
| HEAT_V3 | 06/03/1997 | 05/05/1999 | Remissão ao **Anexo 3 da NR-15** (IBUTG × taxa metabólica × regime) | NR-15 An. 3 | Decreto 2.172/97 — **calor de fonte natural enquadrável desde este marco** (TNU, PEDIF 0503208-24.2015.4.05.8312) |
| HEAT_V4 | 06/05/1999 | 16/10/2013 | Idem (remissão NR-15 An. 3) | NR-15 An. 3 | Decreto 3.048/99 |
| HEAT_V5 | 17/10/2013 | vigente | Exigência de metodologia **NHO-06** | NHO-06 | Decreto 8.123/2013 |

### 7.2 Pontos sensíveis
- **Origem da fonte (artificial vs. solar/ambiental):** o Anexo IV não distingue; TNU reconhece calor natural desde 06/03/1997. **Tema 323/TNU (19/11/2025)** — requisitos técnicos exigíveis no PPP para calor: tese literal `REQUIRES_LEGAL_REVIEW` (obter íntegra no CJF).
- **Tabela de limites (NR-15 An. 3, referência histórica):** trabalho contínuo — leve 30,0 / moderada 26,7 / pesada 25,0 °C IBUTG; 75%T — 30,6/28,0/25,9; 50%T — 31,4/29,4/27,9; 25%T — 32,2/31,1/30,0. Divergências entre NR-15 An. 3 e NHO-06: `PENDING`.
- **Exemplo resolvido:** fundição, moderada (~300 kcal/h), 50%T/50%D, IBUTG 29,0 °C, 2015 → limite 29,4 → `SPECIAL=FALSE`; se IBUTG 30,0 → `SPECIAL=TRUE` (NHO-06 registrada).
- **EPI:** ventilação/EPC eficaz que reduza IBUTG abaixo do limite descaracteriza (efeito na medição).
- **INCONCLUSIVE:** LTCAT sem taxa metabólica/regime para período ≥ 17/10/2013; IBUTG sem regime declarado.

---

# 8. BLOCO D — VIBRAÇÕES (reescrito — estrutura parametrizada)

**Agentes internos:** `PHYS_VIBR_MB` (NHO-10), `PHYS_VIBR_CI` (NHO-09), `PHYS_VIBR_PERF` (qualitativo) · **Anexo IV:** **2.0.2 ✅ — transcrição literal do Planalto: "2.0.2 VIBRAÇÕES — a) trabalhos com perfuratrizes e marteletes pneumáticos. — 25 ANOS"** · **Tabela 24:** **02.01.002 (mão-braço) ✅ · 02.01.003 (VCI — aren) ✅ · 02.01.004 (VCI — VDVR) ✅ · 02.01.005 (perfuratrizes/marteletes) ✅** · **Tempo previdenciário:** 25 anos.

### 8.1 Base normativa confirmada — IN 128/2022, art. 296 (transcrição literal ✅)

> **Art. 296.** A exposição ocupacional a vibrações, localizadas ou no corpo inteiro, dará ensejo à caracterização de atividade especial quando:
> **I** – até 5 de março de 1997, véspera da publicação do Decreto nº 2.172, de 1997, poderá ser qualitativa, nas atividades descritas com o código 1.1.4 no Anexo I do Decreto nº 83.080, de 1979, ou quantitativa, quando a vibração for medida em golpes por minuto (limite de tolerância de 120/min), de acordo com o código 1.1.5 do Quadro Anexo do Decreto nº 53.831, de 1964;
> **II** – a partir de 6 de março de 1997, quando forem ultrapassados os limites de tolerância definidos pela Organização Internacional para Normalização – ISO, em suas Normas ISO nº 2.631 e ISO/DIS nº 5.349, respeitando-se as metodologias e os procedimentos de avaliação que elas autorizam; e
> **III** – a partir de 13 de agosto de 2014, quando forem ultrapassados os limites de tolerância definidos no Anexo 8 da NR-15 do MTE, com avaliação segundo as metodologias e os procedimentos adotados pelas NHO-09 e NHO-10 da FUNDACENTRO, sendo facultado à empresa a sua utilização a partir de 10 de setembro de 2012, data da publicação das referidas normas.

(Fonte: portalin.inss.gov.br/in/76, íntegra conferida contra o PDF oficial do DOU, edição 60, Seção 1, p. 132, 29/03/2022 — **confiança ALTA**.)

### 8.2 Versões da regra

| rule_key | valid_from | valid_to | Critério | Metodologia | Limite | Fonte |
|---|---|---|---|---|---|---|
| VIB_V1_QUAL | — | 05/03/1997 | Qualitativo (atividade) | Código 1.1.4 Anexo I Dec. 83.080/79 | — | IN 128/2022, art. 296, I ✅ |
| VIB_V1_QUANT | — | 05/03/1997 | Quantitativo | Golpes/min (cód. 1.1.5 Dec. 53.831/64) | **120 golpes/min** ✅ | IN 128/2022, art. 296, I ✅ |
| VIB_V2 | 06/03/1997 | 12/08/2014 | Quantitativo | **ISO 2.631 (VCI) / ISO-DIS 5.349 (VMB)** | Limites das próprias normas ISO (INSS remete à norma) | IN 128/2022, art. 296, II ✅; Dec. 2.172/97 |
| VIB_V3_FACULT | 10/09/2012 | 12/08/2014 | Quantitativo (opção da empresa) | NHO-09 / NHO-10 | Limites do Anexo 8 NR-15 | IN 128/2022, art. 296, III (parte final) ✅ |
| VIB_V4 | 13/08/2014 | vigente | Quantitativo obrigatório | **NHO-09 / NHO-10** | **Limites do Anexo 8 da NR-15** (Portaria MTE 1.297/2014) | IN 128/2022, art. 296, III ✅ |
| VIB_QUALIT_PERF | todo o período | vigente | **Qualitativo (atividade)** — perfuratrizes e marteletes pneumáticos | Descrição de atividade | — (enquadramento direto) | Anexo IV, 2.0.2, alínea a ✅ (transcrição Planalto) |

**Indicadores oficiais:** **aren** (aceleração resultante de exposição normalizada, jornada 8h) e **VDVR** (Valor da Dose de Vibração Resultante, mais sensível a picos) — ambos confirmados na Tabela 24 (02.01.003/004). **Valores numéricos de limite/ação da NHO-09/10 e do Anexo 8: `PENDING_LEGAL_VALIDATION`** (não parametrizar sem leitura integral das normas).

### 8.3 Regras operacionais do motor
- **Detecção → roteamento:** menção a "perfuratriz/martelete pneumático" → trilha qualitativa `PHYS_VIBR_PERF` (02.01.005); demais vibrações → trilha quantitativa (aren/VDVR).
- **Decisão de mérito quantitativa:** `AUTOMATE_WITH_HUMAN_CONFIRMATION` enquanto os limites numéricos não forem validados; a comparação temporal (qual regra se aplica) é `SAFE_TO_AUTOMATE`.
- **Jurisprudência:** tese TNU de 21/10/2025 sobre vibração (mais favorável; alcance motorista de ônibus × perfuratrizes) — **somente fontes secundárias → `PENDING_LEGAL_VALIDATION`** (buscar acórdão no CJF/TNU). Tese TNU anterior restritiva (qualitativo de 2.0.2 não extensível por analogia a outras funções) — número do processo `PENDING`. Tema 534/STJ (rol exemplificativo) citado como paradigma — texto integral `PENDING`.
- **Proibição mantida:** não transformar limite trabalhista em previdenciário sem fundamento — **agora há fundamento confirmado (art. 296, III) para o Anexo 8 NR-15 pós-13/08/2014**; antes disso, a remissão é às normas ISO.
- **INCONCLUSIVE:** LTCAT pós-13/08/2014 sem aren/VDVR e sem NHO-09/10 declarada; período 1997–2014 sem referência às ISOs; valor numérico sem indicador identificado (aren × VDVR × outro).

---

# 9. BLOCO E — AGENTES QUÍMICOS

### 9.0 REGRA-ROTEADORA (nova — corrige a regra automática errada)

**Proibido:** inferir "Anexo IV não tem limite numérico → avaliação qualitativa automática".
**Regra correta (`CHEM_NR15_ROUTING`):** o Anexo IV **nunca** traz limites numéricos — o limite está na NR-15. Para cada agente/substância:

| Passo | Verificação | Resultado |
|---|---|---|
| 1 | Substância identificada nominalmente (nome/CAS)? | Não → `NOT_PARAMETERIZED` |
| 2 | Consta do **Anexo 11 (Quadro 1)** ou **Anexo 12** da NR-15? | Sim → **quantitativo obrigatório** (NHO + LT) |
| 3 | Consta apenas do **Anexo 13** da NR-15 (inspeção, sem LT)? | Sim → **qualitativo** por natureza da norma |
| 4 | É **benzeno** (Anexo 13-A) ou cancerígeno sem limiar seguro (**LINACH**, Portaria Interministerial MTE/MPS/MS 9/2014 / Grupo II de 1.0.19)? | Sim → **qualitativo** por natureza do risco (ciência toxicológica), não por ausência de número |

### 9.1 Fichas dos agentes mais relevantes (revisadas)

**BENZENO (1.0.3, CAS 71-43-2)** — **Qualitativo** (Anexo 13-A NR-15, desde Portaria SSST 14/1995; programa PPEOB, hoje IN MTP 2/2021); comprovação de manuseio de benzeno/misturas **≥1% em volume**; sem limiar seguro (IARC Grupo 1); absorção cutânea relevante; **EPI:** Fundacentro (Despacho 24/2020/PRES) considera tecnicamente inadequada a neutralização plena por EPI para cancerígenos; extensão do Tema 1.090/STJ a cancerígenos `PENDING` → `HUMAN_REVIEW_REQUIRED`. Exceção de "sistemas fechados" com ônus técnico do empregador.

**ASBESTO/AMIANTO (1.0.2, CAS 1332-21-4)** — **Qualitativo por natureza** + LT técnico no Anexo 12 NR-15 (contagem de fibras); consenso científico de inexistência de nível seguro (IARC Grupo 1; STF ADI 3.406/3.470 — proibição do crisotila); jurisprudência majoritária aceita a mera exposição habitual comprovada; tese de EPI fortemente contestada → `HUMAN_REVIEW_REQUIRED`.

**SÍLICA LIVRE CRISTALIZADA (1.0.18, CAS 14808-60-7)** — **Quantitativo** (Anexo 12 NR-15, fórmula por %SiO₂; NHO gravimetria + DRX); atenção: IARC classifica sílica cristalina como Grupo 1 — tensão entre tratamento fibrogênico clássico (quantitativo) e classificação cancerígena → `PENDING_LEGAL_VALIDATION`; `PARTIALLY_PARAMETERIZABLE` com confirmação humana.

**CHUMBO (1.0.8, CAS 7439-92-1)** — **Quantitativo** (Anexo 11, mg/m³) + biomarcador (plumbemia/plumbúria, NR-7 — valor por período `PENDING`); não listado classicamente como cancerígeno Grupo 1 (2A/2B conforme composto) → tese de EPI eficaz tem **maior consistência técnica** que nos cancerígenos, sujeita ao Tema 1.090/STJ; composto importa (tetraetila ≠ inorgânico) → `PARTIALLY_PARAMETERIZABLE` com revisão.

**HIDROCARBONETOS/HPA — Petróleo e derivados (1.0.17), Carvão e derivados (1.0.7)** — Qualitativo; múltiplos cancerígenos (benzo[a]pireno IARC 1); misturas asfálticas com HPA (alínea b) por metodologia própria (HPLC); EPI controvertido → `HUMAN_REVIEW_REQUIRED`.

### 9.2 Síntese por tipo de evidência (nova)

| Tipo de agente | Evidência exigível |
|---|---|
| Consta do Anexo 11/12 NR-15 (LT numérico) | LTCAT quantitativo: metodologia NHO, valor medido, LT aplicado, conclusão de superação; PPP consistente |
| Consta apenas do Anexo 13 NR-15 | LTCAT descritivo da atividade/ambiente/grau — dispensada medição |
| Cancerígeno LINACH / Grupo II 1.0.19 | Comprovação de manuseio/exposição habitual e permanente à substância listada, independentemente de concentração |
| Benzeno (1.0.3) | Manuseio de benzeno/mistura ≥1% vol (Anexo 13-A + PPEOB) |

### 9.3 Regras transversais de químicos
- Enquadramento Anexo 11 × 12 × 13 × 13-A **por composto específico** (ex.: cromo por valência; níquel por forma química; arsênio por via/atividade) — confirmar o Quadro 1 vigente por substância (`PENDING` para arsênio, berílio, cádmio, cromo, fósforo, níquel).
- Quantitativo apenas quando há LT tecnicamente reconhecido e agente não cancerígeno sem dose segura.
- `INCONCLUSIVE`: PPP informa "EPI eficaz" para cancerígeno sem CA/tipo; divergência LTCAT × PPP; período cruza mudança de norma técnica sem critério claro; laudo não especifica composto/valência quando relevante.

---

# 10. BLOCO F — AGENTES BIOLÓGICOS

**Agente interno:** `BIO_MICROORG` · **Anexo IV:** 3.0.1 ✅ (cabeçalho 3.0.0: "exposição **unicamente nas atividades relacionadas**") · **Tabela 24:** 03.01.001–007 ✅ · **Critério:** qualitativo · **Tempo previdenciário:** 25 anos.

**Atividades (alíneas a–g):** (a) estabelecimentos de saúde com contato com pacientes infecto-contagiosos ou manuseio de materiais contaminados; (b) animais infectados para tratamento/preparo de soro e vacinas; (c) laboratórios de autópsia, anatomia e anátomo-histologia; (d) exumação de corpos e manipulação de resíduos de animais deteriorados; (e) galerias, fossas e tanques de esgoto; (f) esvaziamento de biodigestores; (g) coleta e industrialização do lixo.

### 10.1 Versões da regra (novo)

| rule_key | valid_from | valid_to | Critério | Fonte |
|---|---|---|---|---|
| BIO_V1 | — | 05/03/1997 | **Enquadramento por presunção admitido para qualquer estabelecimento** | IN 128/2022, **art. 299, I** ✅ |
| BIO_V2 | 06/03/1997 | vigente | Rol das 7 alíneas (taxativo na letra do Decreto) + comprovação de contato | Dec. 2.172/97; Dec. 3.048/99; IN 128/2022, art. 299 ✅ |

### 10.2 Limites de automatização
- O motor **não** interpreta "trabalha em hospital" como enquadramento (pós-1997). Exigências mínimas: (1) descrição de **contato efetivo**; (2) função compatível com uma das 7 alíneas; (3) setor coerente; (4) habitualidade/permanência; (5) PPP/LTCAT com código 03.01.xxx e responsável técnico.
- **Jurisprudência trata o rol como exemplificativo** (STJ/TNU) — atividade fora das alíneas **com evidência robusta de contato** → `REQUIRES_LEGAL_REVIEW` (não rejeição automática).
- **EPI/EPC:** não descaracterizam automaticamente; eficácia de EPI para biológicos **não pacificada** (debate TNU em curso) → qualquer PPP com "EPI eficaz" para biológico vai a `REQUIRES_LEGAL_REVIEW`.
- `INCONCLUSIVE`: cargo sem descrição de tarefas; contato indireto/esporádico; PPP omisso; divergência CBO × descrição.

---

# 11. BLOCO G — DEMAIS AGENTES E AGENTES FORA DO ANEXO IV (reescrito)

### 11.1 Agentes do Anexo IV

| Agente | Anexo IV | Critério | Automação | Observações |
|---|---|---|---|---|
| Radiações ionizantes | 2.0.3 ✅ | Qualitativo (rol a–g) + dosimetria CNEN | PARTIALLY_PARAMETERIZABLE | Sem dosimetria/laudo de radioproteção ou fora das alíneas → INCONCLUSIVE |
| Pressões hiperbáricas | 2.0.5 ✅ | Qualitativo (3 atividades) | PARTIALLY_PARAMETERIZABLE | Função fora das 3 alíneas → INCONCLUSIVE |
| Associação — regra geral | 4.0.0 | "Nas associações de agentes acima do nível de tolerância, considera-se o enquadramento do que exigir **menor tempo**" | HUMAN_REVIEW_REQUIRED | Regra de composição, sempre com revisão |
| Mineração subterrânea afastada da frente | 4.0.1 | Qualitativo | PARTIALLY_PARAMETERIZABLE | **20 anos** |
| Mineração subterrânea frente de produção | 4.0.2 | Qualitativo | PARTIALLY_PARAMETERIZABLE | **15 anos** |

### 11.2 Agentes fora do Anexo IV — estrutura em 3 zonas temporais (nova)

**Fatos normativos confirmados:** Decreto 53.831/1964 — frio (1.1.2), umidade (1.1.3), radiação genérica incl. não ionizante (1.1.4), eletricidade >250V (1.1.8). Decreto 83.080/1979 — rol restrito de físicos (mantém frio em câmaras frigoríficas; sem umidade/eletricidade/radiação não ionizante autônomos); **os dois decretos coexistiram até 05/03/1997** (aplica-se o mais favorável). Decreto 2.172/1997 revogou ambos; **transcrição do Anexo IV vigente confirma a ausência** dos quatro agentes (seção 2.0.x: ruído, vibrações, radiações ionizantes, calor, pressões — e rol exaustivo). **IN 128/2022, art. 301 ✅:** enquadramento desses agentes limitado a períodos **anteriores a 06/03/1997**.

| Zona | Período | Regra | Evidência |
|---|---|---|---|
| ZONE_A | até 28/04/1995 | Enquadramento por categoria profissional (Dec. 53.831/64; frio também Dec. 83.080/79) | CTPS/registro de categoria |
| ZONE_B | 29/04/1995 – 05/03/1997 | Possível por **comprovação de exposição** (não mais por categoria); agente constava de anexo vigente | Formulário; **laudo técnico a partir de 14/10/1996** |
| ZONE_C | a partir de 06/03/1997 | **Sem enquadramento ordinário** (ausentes do Anexo IV, rol exaustivo); somente `EXCEPTIONAL_LEGAL_OVERRIDE` | Decisão judicial/administrativa específica |

**Exceções judiciais confirmadas/pendentes:**

| Agente | Precedente | Status |
|---|---|---|
| Eletricidade (>250V) | **TNU Tema 210** (PEDILEF 0501567-42.2017.4.05.8405/RN): não exigível exposição ininterrupta; habitualidade conforme rotina | ✅ confirmado com inteiro teor (cjf.jus.br) |
| Radiação não ionizante | Jurisprudência dispersa TRF4 (soldadores/pintores); notícia CJF 2017 sem inteiro teor obtido | `PENDING_LEGAL_VALIDATION` |
| Frio | Jurisprudência dispersa por perícia (NR-15 An. 9); sem Tema vinculante localizado | `PENDING_LEGAL_VALIDATION` |
| Umidade | **Nenhum precedente qualificado localizado** | `PENDING_LEGAL_VALIDATION` |

### 11.3 EXCEPTIONAL_LEGAL_OVERRIDE (especificação aprovada conceitualmente)

Código eSocial fixo: **05.01.001** ✅ — "agentes nocivos não constantes do Anexo IV do Decreto 3.048/1999, incluídos por força de decisão judicial ou administrativa" (Tabela 24, S-1.3); o S-2240 **exige número do processo judicial/administrativo** — a rastreabilidade da decisão é requisito oficial, não opção nossa.

```yaml
EXCEPTIONAL_LEGAL_OVERRIDE:
  agent_code_internal: enum [HIST_FRIO, HIST_UMIDADE, HIST_ELETRICIDADE, HIST_RAD_NION, OUTRO]
  esocial_table24_code: "05.01.001"   # fixo
  decision_type: enum [JUDICIAL, ADMINISTRATIVA]
  decision_scope: enum [INDIVIDUAL_PROCESS, TNU_TEMA_VINCULANTE, STJ_REPETITIVO, PARADIGMA_NAO_VINCULANTE]
  process_number: string              # obrigatório (espelha exigência do S-2240)
  issuing_body: string                # ex.: "TNU", "STJ - 1ª Seção", "INSS - DIRBEN"
  tema_number: string | null          # ex.: "Tema 210" — obrigatório se TNU_TEMA_VINCULANTE
  transito_em_julgado: boolean / date
  period_start / period_end: date
  worker_id: string                   # obrigatório se INDIVIDUAL_PROCESS
  employer_cnpj: string
  supporting_document: { type, file_reference, issuing_authority }
  legal_basis_summary: string
  source_url: string | null
  human_validation: { validated, validated_by, validated_at, validation_notes }  # obrigatório antes de qualquer cálculo
  status: enum [PENDING_LEGAL_VALIDATION, VALIDATED, REJECTED, EXPIRED]
  audit_trail: { created_at, created_by, updated_at, updated_by }
```

**Regras de negócio:** (1) `VALIDATED` exige `human_validation.validated=true` + documento anexado; (2) tese vinculante gera vínculo derivado por segurado (`worker_id`); (3) uso em cálculo gera automaticamente `05.01.001` no S-2240 com `process_number`; (4) `PARADIGMA_NAO_VINCULANTE` permanece `PENDING_LEGAL_VALIDATION` até revisão humana específica.

---

# 12. EPI E EPC (seção específica)

**Não existe regra genérica "EPI eficaz elimina aposentadoria especial".** Matriz atualizada:

| Grupo | EPI pode afastar? | Condições | Exceções | Evidências | Vigência |
|---|---|---|---|---|---|
| Ruído (2.0.1) | **NUNCA** | — | Exceção absoluta: Tema 555/STF, item II **+ art. 290, parágrafo único, IN 128/2022** ✅ | — | Permanente |
| Químicos não cancerígenos com LT (CS₂, iodo, chumbo, manganês, mercúrio) | Sim, em tese (Tema 555, item I; **Tema 1.090/STJ (2025)** — anotação positiva de EPI eficaz no PPP afasta) | Eficácia real: CA vigente, tipo adequado, periodicidade, treinamento; e medição ≤ LT | Se medição > LT mesmo com EPI | Ficha de EPI, CA, laudo | Tema 1.090: alcance exato `PENDING` (tese literal) |
| Químicos cancerígenos sem limiar seguro (benzeno, amianto, HPA, Cr VI, níquel, Grupo II) | **Controvertido** — padrão: não afasta | — | Extensão do Tema 1.090 a cancerígenos **não pacificada** (Fundacentro Despacho 24/2020/PRES; jurisprudência TRF2: mera exposição a agente LINACH gera tempo especial) | Idem + absorção cutânea | `REQUIRES_LEGAL_REVIEW` sempre |
| Biológicos (3.0.1) | Não pacificado | — | Debate TNU em curso (2026) | — | `REQUIRES_LEGAL_REVIEW` |
| Físicos com medição (calor, ionizantes, vibrações) | Efeito indireto | EPI/EPC que altere a **medição** abaixo do limite descaracteriza pelo resultado | — | Laudo quantitativo | Permanente |

**EPC:** regra geral — EPC que **elimina ou neutraliza** a nocividade afasta a especialidade (dispositivo exato na IN 128/2022 `PENDING`). Exigências: descrição, eficácia com evidência (medição pós-implantação), vigência. EPC sem evidência → ignorado para descaracterização e sinalizado.

---

# 13. CONTEÚDO OBRIGATÓRIO DO LTCAT

Base: Lei 8.213/1991, art. 58, §4º (literalidade dos incisos `PENDING`) e IN 128/2022 (capítulo da atividade especial confirmado: **arts. 260–302** ✅; artigos de LTCAT/conteúdo na faixa 276–280 `PENDING` — confirmação pontual pendente).

| Elemento | Fundamento | Obrigatório | Validação proposta | Bloqueia publicação? |
|---|---|---|---|---|
| Identificação da empresa e do trabalhador/GHE | Art. 58, §4º | Sim | Campos estruturados presentes | Sim |
| Relação nominal de agentes nocivos (nunca genérica) | §4º + GEN-005 | Sim | Cada agente resolve para `internal_code`; senão → NOT_PARAMETERIZED | Sim |
| Critério de avaliação (qualitativo/quantitativo) e metodologia | IN 128/2022 (art. 287 ✅) | Sim quando o agente exige medição | Metodologia compatível com o período (§4) + roteador NR-15 (§9.0) | Sim (para ruído/calor/vibração pós-marcos) |
| Resultados de medições e parâmetros (NEN, IBUTG, concentração, aren/VDVR) | IN 128/2022 | Condicional | Unidade + valor + data + instrumento + **indicador identificado** | Sim, se o agente exigir |
| EPC existente e eficácia | §4º / IN | Sim | Medida + evidência + vigência | Não bloqueia; afeta conclusão |
| EPI fornecido: tipo, CA, periodicidade, eficácia declarada | §4º / IN (art. 290 ✅) | Sim quando houver | CA válido; declaração de eficácia | Não bloqueia; afeta conclusão (exceto ruído) |
| Responsável técnico habilitado, assinatura e registro | Art. 58, §4º | Sim | `can_sign_ltcat=true` + cadastro completo | **Sim — bloqueante** |
| Data de elaboração e histórico de alterações ambientais | IN 128/2022 (contemporaneidade) | Sim | Timestamp + vínculo a eventos de mudança | Sim |
| Conclusão do laudo (exposição/não exposição, por agente e período) | IN 128/2022 | Sim | Conclusão por exposição, nunca genérica | Sim |

---

# 14. RELAÇÃO LTCAT × PPP × S-2240

| Marco | Conteúdo | Base |
|---|---|---|
| Até 28/04/1995 | Categoria profissional (CTPS) | Decretos 53.831/64, 83.080/79 |
| 29/04/1995–13/10/1996 | Comprovação de exposição (formulário) | Lei 9.032/95 |
| **14/10/1996–2003** | **Formulário embasado em laudo técnico** | **MP 1.523/96 → Lei 9.528/97** ✅ (novo marco) |
| ≥ 01/01/2004 | **PPP** documento padrão, elaborado **com base no LTCAT** | Ato exato `PENDING` |
| ≥ jan/2023 | **PPP eletrônico** via eSocial; evento **S-2240** | Portarias MTP 313/2021, 1.010/2021 (C7 — `REQUIRES_LEGAL_REVIEW`) |
| Consequência para o motor | LTCAT é a **evidência-mãe**; S-2240 é projeção eletrônica. Divergências alimentam a Matriz de Coerência | — |

**Tabela 24 — estrutura confirmada (C2 resolvido) ✅:** grupos **01 = Químicos · 02 = Físicos · 03 = Biológicos · 05 = agentes reconhecidos por decisão judicial/administrativa**. Códigos confirmados: ruído `02.01.001`; vibrações `02.01.002–005`; calor `02.01.014` (remete à NR-15); biológicos `03.01.001–007`; excepcional `05.01.001` (com processo obrigatório). **Sem códigos autônomos** para frio, umidade e radiações não ionizantes. Pendentes: códigos individuais do grupo 01 (químicos), radiações ionizantes (`02.01.006–013`), hiperbáricas (`02.01.015–018`) e associações (`04.01.001–002`) — extração completa da tabela S-1.3 vigente + histórico de NTs. Códigos são **mapeamentos externos versionados**, nunca identidade do agente.

---

# 15. LEGAL_CONFLICTS_AND_AMBIGUITIES

| # | Fontes envolvidas | Conflito | Impacto | Decisão humana necessária | Status v2 |
|---|---|---|---|---|---|
| C1 | Numeração dos físicos no Anexo IV (1.0.4 × 2.0.4) | Códigos errados comprometeriam eSocial | — | — | **RESOLVIDO ✅** — transcrição Planalto: 2.0.1–2.0.5; 1.0.4 = berílio |
| C2 | Estrutura de grupos da Tabela 24 | Mapeamento eSocial incorreto | — | — | **RESOLVIDO ✅** — 01 químicos / 02 físicos / 03 biológicos / 05 excepcional |
| C3 | Tema 555/STF × jurisprudência sobre cancerígenos | Extensão "sem dose segura" não é tese vinculante | Sobre-automatizar descaracterização | Manter `HUMAN_REVIEW_REQUIRED` para cancerígenos | MANTIDO; reforçado por Fundacentro Despacho 24/2020/PRES |
| C4 | Decreto 53.831/64 × Decreto 83.080/79 | Dois anexos concorrentes (1979–1997) | Qual rol por período | Anexo mais favorável — `REQUIRES_LEGAL_REVIEW` por caso | MANTIDO |
| C5 | NHO-01 (q=3) × NR-15 An. 1 (q=5) | Critérios incompatíveis | Resultado pode mudar | Metodologia declarada; conflito → `REQUIRES_LEGAL_REVIEW` | MANTIDO |
| C6 | Tema 323/TNU (19/11/2025) | Dados técnicos exigíveis no PPP para calor | Validação de evidência de calor | Obter íntegra no CJF | MANTIDO (data precisada) |
| C7 | Portarias MTP 313/2021, 334/2022, 1.010/2021 | Ato/data do PPP eletrônico | Marco T15 | Reconciliar atos | MANTIDO |
| C8 | IN 128/2022 — numeração de artigos | Citações erradas | — | — | **RESOLVIDO ✅** (mapa arts. 260–302; âncoras 287/290/292/296/299/301). Pontual: arts. de conteúdo do LTCAT (276–280) `PENDING` |
| C9 | 80 dB(A) no interregno 1995–1997 | Base do parâmetro | Períodos 1995–1997 | — | **RESOLVIDO ✅** — Dec. 53.831/64 + art. 292 IN 128/2022; subdivisão 14/10/1996 |
| C10 | Vigência do Decreto 3.048/1999 | Publicação × vacatio 45 dias | Marco T8 ±45 dias | Confirmar regra de vigência | MANTIDO |
| **C11 (novo)** | Tema 1.090/STJ (2025) × Fundacentro Despacho 24/2020/PRES × TRF2 (LINACH) | EPI eficaz anotado no PPP × cancerígenos sem limiar | Descaracterização indevida de cancerígenos | Tese literal do Tema 1.090 + delimitação do alcance | **NOVO — `PENDING_LEGAL_VALIDATION`** |
| **C12 (novo)** | Tema 534/STJ × nº de processo informado por fontes secundárias | Processo de origem conflita com o do Tema 694 | Citação forense incorreta | Confirmar texto integral e REsp no portal do STJ | **NOVO — `PENDING_LEGAL_VALIDATION`** |
| **C13 (novo)** | Tese TNU vibrações (21/10/2025) × tese TNU anterior restritiva | Alcance do qualitativo de 2.0.2 (perfuratrizes × outras funções, ex.: motorista) | Enquadramento de VCI sem laudo | Obter acórdãos no CJF/TNU | **NOVO — `PENDING_LEGAL_VALIDATION`** |
| **C14 (novo)** | Rol de biológicos: taxativo (letra do Decreto) × exemplificativo (jurisprudência STJ/TNU) | Atividade fora das alíneas com evidência de contato | Rejeição automática indevida | `REQUIRES_LEGAL_REVIEW` caso a caso | **NOVO** |

---

# 16. MATRIZ DE AUTOMAÇÃO

| Tipo de decisão | Classificação | Exemplos |
|---|---|---|
| Localizar a versão da regra pela data da exposição | `SAFE_TO_AUTOMATE` | Resolver NOISE_V2B vs NOISE_V5; VIB_V2 vs VIB_V4 |
| Comparar valor numérico com limite parametrizado (mesma unidade/metodologia) | `SAFE_TO_AUTOMATE` | NEN 88 > 85; IBUTG 30,0 > 29,4; golpes 150 > 120 (período histórico) |
| Verificar presença de campos obrigatórios e responsável habilitado | `SAFE_TO_AUTOMATE` | Bloqueio de publicação (§13) |
| Detectar menção a agente do Anexo IV no LTCAT/PPP | `SAFE_TO_AUTOMATE` | Sugestão de candidato na triagem |
| Aplicar exceção de EPI do ruído | `SAFE_TO_AUTOMATE` | Ignorar "EPI eficaz" para 2.0.1 |
| Rotear químico para trilha qualitativa/quantitativa (§9.0) | `SAFE_TO_AUTOMATE` (roteamento) | Anexo 11 → quantitativo; LINACH → qualitativo |
| Rotear zona temporal de agente histórico (§11.2) | `SAFE_TO_AUTOMATE` (roteamento) | Frio em 1990 → ZONE_A; frio em 2010 → ZONE_C |
| Enquadrar exposição qualitativa com evidência completa | `AUTOMATE_WITH_HUMAN_CONFIRMATION` | Biológico com as 5 exigências; vibração por perfuratrizes |
| Aplicar regra de associação de agentes (4.0.0) | `AUTOMATE_WITH_HUMAN_CONFIRMATION` | Menor tempo entre agentes concorrentes |
| Decidir mérito quantitativo de vibrações (aren/VDVR) | `AUTOMATE_WITH_HUMAN_CONFIRMATION` | Até validar limites numéricos (§8.2) |
| Julgar eficácia de EPI/EPC fora do ruído | `HUMAN_DECISION_REQUIRED` | Cancerígenos; biológicos |
| Resolver conflitos metodológicos (q=3/q=5, NHO-06/NR-15, ISO/NHO-09) | `HUMAN_DECISION_REQUIRED` | §15-C5 |
| Validar e aplicar `EXCEPTIONAL_LEGAL_OVERRIDE` | `HUMAN_DECISION_REQUIRED` (sempre) | Frio/umidade/eletricidade/radiação não ionizante pós-1997 |
| Enquadrar agente fora do Anexo IV sem decisão documentada | `NOT_SAFE_TO_AUTOMATE` | Sempre decisão judicial/administrativa |
| Conclusão final de publicação do documento | `HUMAN_DECISION_REQUIRED` | Compliance validator + responsável `can_sign_ltcat` |

---

# 17. ITENS PENDENTES DE VALIDAÇÃO (bloqueiam seed/parametrização)

**PENDING_LEGAL_VALIDATION (confirmar em fonte primária):**
1. Tabela 24 — códigos individuais do **grupo 01 (químicos)** por substância; radiações ionizantes (02.01.006–013); hiperbáricas (02.01.015–018); associações (04.01.001–002); histórico de NTs.
2. Literalidade do item 2.0.1 pós-Decreto 8.123/2013 e confirmação linha a linha de não-alteração dos itens 1.0.x.
3. Art. 58, §4º, incisos a–h, da Lei 8.213/91 (literalidade atual).
4. Art. 57, §1º, da Lei 8.213/91 (literalidade).
5. IN 128/2022 — artigos exatos de conteúdo do LTCAT (faixa 276–280) e de EPC; redação literal integral do art. 287.
6. Ato que tornou o PPP obrigatório a partir de 01/01/2004.
7. Redação oficial da tese do Tema 555/STF no portal do STF.
8. **Valores numéricos oficiais NHO-09/NHO-10 (aren, VDVR) e Anexo 8 NR-15** — leitura integral das normas.
9. **Quadro 1 do Anexo 11 da NR-15** — valores e enquadramento por composto (arsênio, berílio, cádmio, cromo, fósforo, níquel, estireno, n-hexano).
10. Valor de plumbemia (NR-7) vigente por período.
11. Conteúdo exato das Leis 9.528/1997 e 9.732/1998 nos arts. 57/58; literalidade da MP 1.523/96 convertida.
12. Regra de vigência do Decreto 3.048/1999 (C10).
13. Íntegra do Decreto 53.831/1964 em fonte primária (DOU/LexML) — nesta rodada usou-se cópia de terceiro para os itens 1.1.2–1.1.8.
14. Existência do "Tema 1095/STF" sobre ruído (não confirmado — não usar).

**REQUIRES_LEGAL_REVIEW (análise jurídica dedicada):**
15. Dispositivo exato da regra temporal no RPS.
16. Tema 998/STF — teor e trânsito (conversão pós-EC 103/2019).
17. Tema repetitivo sobre contemporaneidade/extemporaneidade do LTCAT.
18. Tema 323/TNU (19/11/2025) — íntegra da tese sobre calor.
19. **Tema 1.090/STJ (2025)** — tese literal e delimitação do alcance a cancerígenos (C11).
20. **Tema 534/STJ** — texto integral e processo de origem (C12).
21. **Teses TNU de vibrações** — acórdão de 21/10/2025 e tese restritiva anterior (C13).
22. **Precedentes de frio, umidade e radiação não ionizante** — busca dirigida em Temas TNU/Repetitivos STJ (§11.2).
23. EPI × agentes biológicos — julgamento TNU em curso (2026).
24. Regra do anexo mais favorável 53.831/64 × 83.080/79 (C4).

---

# 18. CONTROLE DE QUALIDADE EXECUTADO

- ✅ Nenhuma regra usa blog/consultoria como fundamento — fontes secundárias serviram apenas para localizar temas; tudo não confirmado em fonte oficial está marcado.
- ✅ Conflitos entre frentes explicitados (§15), sem escolha silenciosa; **C1, C2, C8 e C9 resolvidos com fonte primária direta**.
- ✅ Regra atual nunca aplicada retroativamente (exemplos E2 do ruído; matriz de vibrações com marcos 1997/2014).
- ✅ Lacunas de vigência sinalizadas (vigência do Decreto 3.048 — C10).
- ✅ **Novas transcrições literais nesta versão:** seção 2.0.x do Anexo IV (Planalto); art. 296 da IN 128/2022; cabeçalho 1.0.0 do Anexo IV; TNU Tema 210 (inteiro teor).
- ⚠️ Itens confirmados apenas por fonte secundária nesta rodada (Tema 534 nº processo, tese TNU vibrações 10/2025, radiação não ionizante TRF4) foram **mantidos como `PENDING`** e não fundamentam nenhuma regra parametrizável.
- ⚠️ Decreto 53.831/1964: itens 1.1.2–1.1.8 transcritos de cópia de terceiro — confirmação em DOU/LexML pendente (item 13, §17).

**Este manifesto não autoriza seed nem implementação. Nenhuma regra entra no banco sem aprovação nominal.**
