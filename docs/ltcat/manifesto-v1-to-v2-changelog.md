# V1_TO_V2_CHANGELOG — Manifesto de Regras Jurídicas LTCAT

| Campo | Valor |
|---|---|
| De | `docs/ltcat/manifesto-regras-juridicas-v1.md` (v1.0) |
| Para | `docs/ltcat/manifesto-regras-juridicas-v2.md` (v2.0) |
| Data | 23/08/2026 |
| Escopo | Somente validação das 8 pendências críticas autorizadas. Nenhuma migration, seed ou alteração de código |

---

## A. Pendências RESOLVIDAS (fonte primária confirmada)

| # | Item v1 | Status v1 | Achado da validação | Alteração no v2 | Fonte primária |
|---|---|---|---|---|---|
| 1 | Limite de ruído no interregno 29/04/1995–05/03/1997 | `PENDING` (C9; INCONCLUSIVE) | Limite **80 dB(A)** confirmado; identificado marco intermediário de **14/10/1996** (MP 1.523/96 → Lei 9.528/97): laudo técnico passa a ser prova exigida | NOISE_V2 dividida em **NOISE_V2A** (29/04/1995–13/10/1996, formulário) e **NOISE_V2B** (14/10/1996–05/03/1997, laudo técnico); saem de INCONCLUSIVE; novos exemplos E2a/E2b; novo marco T4a na timeline | Decreto 53.831/64 (parâmetro); IN 128/2022, art. 292; MP 1.523/96 |
| 2 | Vibrações sem código Anexo IV e sem base na IN | `REQUIRES_LEGAL_REVIEW` / `NOT_PARAMETERIZED` | **Item 2.0.2 confirmado por transcrição literal do Planalto** ("VIBRAÇÕES — a) trabalhos com perfuratrizes e marteletes pneumáticos — 25 ANOS"); **art. 296 da IN 128/2022 transcrito na íntegra** | Bloco D reescrito: 6 versões de regra (VIB_V1_QUAL, VIB_V1_QUANT 120 golpes/min, VIB_V2 ISO 2.631/5.349, VIB_V3_FACULT, VIB_V4 NHO-09/10+Anexo 8 NR-15, VIB_QUALIT_PERF); novo agente interno `PHYS_VIBR_PERF`; automação sobe para `PARTIALLY_PARAMETERIZABLE`/`AUTOMATE_WITH_HUMAN_CONFIRMATION` | planalto.gov.br (Anexo IV); portalin.inss.gov.br/in/76 (art. 296); Portaria MTE 1.297/2014 |
| 3 | Códigos de vibração na Tabela 24 | `PENDING` (02.01.002–005 genérico) | Confirmados: **02.01.002** (mão-braço), **02.01.003** (VCI-aren), **02.01.004** (VCI-VDVR), **02.01.005** (perfuratrizes/marteletes) | Tabela 24 dos agentes de vibração marcada ✅; aren/VDVR explicados e oficiais | gov.br/esocial, leiaute S-1.3 (Tabela 24, extração direta do HTML oficial) |
| 4 | Agentes fora do Anexo IV ("nunca automatizáveis", sem estrutura) | `HUMAN_REVIEW_REQUIRED` genérico | Estrutura temporal completa: constavam do Dec. 53.831/64 (frio 1.1.2, umidade 1.1.3, radiação 1.1.4, eletricidade 1.1.8); Dec. 83.080/79 restringiu (manteve frio); coexistência até 05/03/1997; ausência no Anexo IV vigente **confirmada por transcrição**; **art. 301 da IN 128/2022** limita enquadramento a < 06/03/1997 | Nova §11.2 com **3 zonas temporais** (ZONE_A categoria / ZONE_B comprovação 1995–1997 / ZONE_C só exceção); novo agente `HIST_ELETRICIDADE` | Decretos 53.831/64 e 83.080/79; Planalto (Anexo IV); IN 128/2022, art. 301 |
| 5 | Eletricidade — base de exceção judicial | Não mapeada | **TNU Tema 210 confirmado com inteiro teor**: exposição a tensão >250V caracteriza tempo especial **sem exigir exposição ininterrupta** | Eletricidade ganha linha própria na tabela de exceções; GEN-002 passa a registrar a exceção qualificada | cjf.jus.br (PEDILEF 0501567-42.2017.4.05.8405/RN, inteiro teor) |
| 6 | Código eSocial para exceções (05.01.001) | `PENDING` | **Confirmado**: grupo 05 = agentes não constantes do Anexo IV incluídos por decisão judicial/administrativa; **número do processo obrigatório** no S-2240 | Nova §11.3: especificação `EXCEPTIONAL_LEGAL_OVERRIDE` (tipo/escopo de decisão, processo, trânsito, período, segurado, validação humana obrigatória) | gov.br/esocial Tabela 24 S-1.3 |
| 7 | Conflito C1 — numeração de calor (1.0.4 × 2.0.4) | `REQUIRES_LEGAL_REVIEW` | **Resolvido por transcrição literal do Planalto**: 2.0.1 Ruído, 2.0.2 Vibrações, 2.0.3 Rad. Ionizantes, **2.0.4 Temperaturas Anormais (calor)**, 2.0.5 Pressão Atmosférica; **1.0.4 = Berílio** (químico) | `PHYS_CALOR` marcado 2.0.4 ✅; C1 encerrado em §15 | planalto.gov.br/ccivil_03/decreto/d3048anexoii-iii-iv.htm |
| 8 | Código de calor na Tabela 24 | `PENDING` | **02.01.014 confirmado** (descrição remete à NR-15) | Marcado ✅ no manifest | gov.br/esocial Tabela 24 S-1.3 |
| 9 | Numeração de artigos da IN 128/2022 | `PENDING` (C8; indício 276–280) | **Mapa confirmado**: capítulo da atividade especial = arts. 260–302; âncoras: art. 287 (critérios), **art. 290 p. único (EPI×ruído)**, art. 292 (ruído sub-períodos), art. 296 (vibrações), art. 299 (biológicos), art. 301 (agentes históricos) | C8 encerrado; citações atualizadas em todos os blocos; NOISE_V7 cita art. 290 ✅ | portalin.inss.gov.br/in/76 |
| 10 | Estrutura de grupos da Tabela 24 | `PENDING` (C2) | **Resolvido**: 01 Químicos / 02 Físicos / 03 Biológicos / 05 excepcional | C2 encerrado; §14 atualizado; biológicos 03.01.001–007 ✅ | gov.br/esocial Tabela 24 S-1.3 |
| 11 | Exceção EPI×ruído com fundamento apenas jurisprudencial | Tema 555/STF (redação literal `PENDING`) | **Confirmação administrativa primária**: art. 290, parágrafo único, IN 128/2022 | Matriz EPI (§12) passa a citar os dois fundamentos ✅ | IN 128/2022, art. 290 |
| 12 | Biológicos — regime pré-1997 | Não mapeado | **Art. 299, I, IN 128/2022**: enquadramento por presunção admitido para qualquer estabelecimento **até 05/03/1997** | Novas versões BIO_V1/BIO_V2 (§10.1); jurisprudência do rol exemplificativo registrada (conflito C14) | IN 128/2022, art. 299 |

## B. Regras CORRIGIDAS (erros de premissa do v1)

| # | Premissa v1 | Problema | Correção v2 |
|---|---|---|---|
| 13 | "Anexo IV não tem limite numérico → avaliação qualitativa automática" (implícito na ficha de vários químicos) | Regra automática errada: o Anexo IV nunca traz limites — eles estão na NR-15 | Nova **regra-roteadora §9.0 (`CHEM_NR15_ROUTING`)**: Anexo 11/12 NR-15 → quantitativo; Anexo 13/13-A/LINACH → qualitativo. Fichas reclassificadas: **quantitativos** = cádmio, chumbo, fósforo, manganês, mercúrio, sílica (Anexo 12), Grupo I quando no Quadro 1; **qualitativos** = benzeno (13-A), amianto (por natureza), berílio (13), Grupo II (LINACH); **mistos** = arsênio, cromo (valência), níquel (forma química) |
| 14 | Vibrações tratadas como sem item no Anexo IV | Incorreto: item 2.0.2 existe com alínea qualitativa | Ver #2 — trilha qualitativa (perfuratrizes) e trilhas quantitativas separadas |
| 15 | Agentes históricos "nunca automatizáveis" | Simplificação: havia enquadramento ordinário até 05/03/1997 | Roteamento por zona temporal `SAFE_TO_AUTOMATE` (§16); mérito da exceção permanece humano |
| 16 | Cabeçalho 1.0.0 do Anexo IV parcialmente inferido | — | **Transcrição confirmada**: "nível de concentração superior aos limites de tolerância estabelecidos; rol exaustivo; atividades exemplificativas" — registrada em GEN-005 |
| 17 | "Solventes em geral" como possível grupo | Confirmado: **não existe item genérico** no Anexo IV | GEN-005 passa a exigir composto nominado (benzeno 1.0.3, CS₂ 1.0.11, 1.0.19 etc.) |

## C. Itens NOVOS identificados na validação (não existiam no v1)

| # | Item | Status | Onde no v2 |
|---|---|---|---|
| 18 | **Tema 1.090/STJ (repetitivo, 29/04/2025)**: anotação positiva de EPI eficaz no PPP afasta tempo especial (tese geral); alcance a cancerígenos sem limiar **não pacificado** | `PENDING_LEGAL_VALIDATION` (tese literal e alcance) | §12 matriz EPI; conflito **C11** |
| 19 | **Fundacentro Despacho 24/2020/PRES**: inadequação técnica de neutralização por EPI para cancerígenos (benzeno) | Registrado como fundamento técnico | §9.1 (benzeno), §12 |
| 20 | **LINACH** (Portaria Interministerial MTE/MPS/MS 9/2014) como roteador de qualitatividade para cancerígenos; jurisprudência TRF2 (mera exposição gera tempo especial) | Registrado | §9.0, §9.2 |
| 21 | **Tema 323/TNU (19/11/2025)** — requisitos técnicos do PPP para calor | `REQUIRES_LEGAL_REVIEW` (data precisada; íntegra pendente) | §7.2, C6 |
| 22 | **Tese TNU sobre vibrações (21/10/2025)** — só fontes secundárias; conflita com tese TNU anterior restritiva | `PENDING_LEGAL_VALIDATION` | §8.3, conflito **C13** |
| 23 | **Tema 534/STJ** (rol exemplificativo) — processo de origem informado por secundária conflita com Tema 694 | `PENDING_LEGAL_VALIDATION` | GEN-005, conflito **C12** |
| 24 | Marcos novos na timeline: **T4a (14/10/1996, MP 1.523/96)**, **T11a (10/09/2012, NHO-09/10 facultativo)**, **T11b (13/08/2014, Anexo 8 NR-15)** | Incorporados | §2 |
| 25 | Novas metodologias: MET_ISO2631, MET_ISO5349, MET_NR15_AN8, MET_NR15_AN11, MET_NR15_AN12, MET_NR15_AN13, MET_NR15_AN13A, MET_GOLPES | Incorporadas | §4 |
| 26 | Prazo do art. 296, III: uso **facultativo** de NHO-09/10 desde 10/09/2012 | Incorporado | VIB_V3_FACULT |

## D. Itens que PERMANECEM pendentes (não alterados nesta rodada)

C4 (anexo mais favorável 53.831×83.080) · C5 (q=3/q=5) · C6/Tema 323 íntegra · C7 (PPP eletrônico) · C10 (vigência Dec. 3.048) · literalidades: art. 58 §4º a–h, art. 57 §1º, Leis 9.528/97 e 9.732/98, item 2.0.1 pós-2013, art. 287 IN 128 · Tema 555 redação portal STF · Tema 998/STF · limites numéricos aren/VDVR e Quadro 1 Anexo 11 NR-15 · plumbemia NR-7 · ato PPP 2004 · EPI×biológicos (TNU 2026) · Decreto 53.831/64 em fonte primária (usada cópia de terceiro) · códigos Tabela 24 grupo 01 e faixas 02.01.006–018, 04.01.001–002.

**Total de pendências: 22 (v1) → 24 listadas no v2, porém com 12 resolvidas e 7 novas abertas pela própria validação; redução líquida de itens bloqueantes críticos (C1, C2, C8, C9 encerrados).**
