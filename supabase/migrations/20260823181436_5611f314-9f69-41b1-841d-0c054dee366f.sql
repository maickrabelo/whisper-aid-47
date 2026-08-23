-- PACOTE A / M2a — SEED JURÍDICO CONTROLADO LTCAT (manifesto v2.1, revisão 1.1)
-- Fonte: docs/ltcat/seed-ready-rules-review-v1.md
SELECT set_config('ltcat.audit_origin','SEED',false);
SELECT set_config('ltcat.audit_actor','pacote-a-seed-manifesto-v2.1-rev1.1',false);
SELECT set_config('ltcat.audit_context','{"pacote":"A","manifesto":"v2.1","revisao":"1.1","etapa":"M2a-entidades"}',false);
DO $seed$
DECLARE
  r jsonb;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements($j$[
{"k":"L8213","at":"LAW","al":"L2_LAW","t":"Lei nº 8.213, de 24 de julho de 1991","n":"8.213","y":1991,"b":"Presidência da República","u":"https://www.planalto.gov.br/ccivil_03/leis/l8213cons.htm","pd":"1991-07-25","ef":"1991-07-24","et":null,"d":"Arts. 57 (aposentadoria especial) e 58 (definições; §4º responsável técnico)."},
{"k":"L9032","at":"LAW","al":"L2_LAW","t":"Lei nº 9.032, de 28 de abril de 1995","n":"9.032","y":1995,"b":"Presidência da República","u":"https://www.planalto.gov.br/ccivil_03/leis/l9032.htm","pd":"1995-04-28","ef":"1995-04-29","et":null,"d":"Fim do enquadramento por categoria profissional; exigência de efetiva exposição; laudo técnico para insalubridade."},
{"k":"MP1523","at":"ADMINISTRATIVE_INSTRUCTION","al":"L2_LAW","t":"Medida Provisória nº 1.523, de 11 de outubro de 1996","n":"1.523","y":1996,"b":"Presidência da República","u":"https://www.planalto.gov.br/ccivil_03/mpv/antiga/1523.htm","pd":"1996-10-11","ef":"1996-10-14","et":"1997-12-10","d":"MP com força de lei (registrada na categoria ADMINISTRATIVE_INSTRUCTION conforme manifesto §1.1); convertida na Lei nº 9.528/1997."},
{"k":"L9528","at":"LAW","al":"L2_LAW","t":"Lei nº 9.528, de 10 de dezembro de 1997","n":"9.528","y":1997,"b":"Presidência da República","u":"https://www.planalto.gov.br/ccivil_03/leis/l9528.htm","pd":"1997-12-11","ef":"1997-12-10","et":null,"d":"Conversão da MP 1.523/1996."},
{"k":"D53831","at":"DECREE","al":"L3_DECREE","t":"Decreto nº 53.831, de 25 de março de 1964","n":"53.831","y":1964,"b":"Presidência da República","u":"https://www.planalto.gov.br/ccivil_03/decreto/antigos/d53831.htm","pd":"1964-03-25","ef":"1964-03-25","et":"1979-01-23","d":"Regulamento da Previdência Social — rol histórico de agentes (com alterações da Lei 5.890/1973)."},
{"k":"D83080","at":"DECREE","al":"L3_DECREE","t":"Decreto nº 83.080, de 24 de janeiro de 1979","n":"83.080","y":1979,"b":"Presidência da República","u":"https://www.planalto.gov.br/ccivil_03/decreto/antigos/d83080.htm","pd":"1979-01-24","ef":"1979-01-24","et":"1999-05-05","d":"Anexo I — rol histórico de agentes nocivos (1.1.1 a 1.1.11), vigente para fins do seed até 05/03/1997."},
{"k":"D2172","at":"DECREE","al":"L3_DECREE","t":"Decreto nº 2.172, de 5 de março de 1997","n":"2.172","y":1997,"b":"Presidência da República","u":"https://www.planalto.gov.br/ccivil_03/decreto/d2172.htm","pd":"1997-03-06","ef":"1997-03-06","et":null,"d":"Novo regulamento da previdência; rol de atividades (biológicos) e marco temporal de 06/03/1997."},
{"k":"D3048","at":"DECREE","al":"L3_DECREE","t":"Decreto nº 3.048, de 6 de maio de 1999 (texto compilado)","n":"3.048","y":1999,"b":"Presidência da República","u":"https://www.planalto.gov.br/ccivil_03/decreto/d3048compilado.htm","pd":"1999-05-07","ef":"1999-05-06","et":null,"d":"Anexo IV — agentes nocivos (2.0.1 a 4.0.2); cabeçalhos 1.0.0 e 3.0.0 (escopo urbano)."},
{"k":"D3265","at":"DECREE","al":"L3_DECREE","t":"Decreto nº 3.265, de 29 de novembro de 1999","n":"3.265","y":1999,"b":"Presidência da República","u":"https://www.planalto.gov.br/ccivil_03/decreto/d3265.htm","pd":"1999-11-30","ef":"1999-11-30","et":null,"d":"Alterações pontuais do Regulamento (contexto do Anexo IV)."},
{"k":"D4882","at":"DECREE","al":"L3_DECREE","t":"Decreto nº 4.882, de 18 de novembro de 2003","n":"4.882","y":2003,"b":"Presidência da República","u":"https://www.planalto.gov.br/ccivil_03/decreto/2003/d4882.htm","pd":"2003-11-19","ef":"2003-11-19","et":null,"d":"Nova redação do item 2.0.1 (85 dB(A), remissão NR-15); cria item 4.0.0 (associação de agentes)."},
{"k":"IN128","at":"ADMINISTRATIVE_INSTRUCTION","al":"L4_ADMINISTRATIVE_INSTRUCTION","t":"Instrução Normativa INSS/PRES nº 128, de 28 de março de 2022","n":"128","y":2022,"b":"INSS","u":"https://www.in.gov.br/en/web/dou/-/instrucao-normativa-inss/pres-n-128-de-28-de-marco-de-2022-389564713","pd":"2022-03-29","ef":"2022-04-01","et":null,"d":"Arts. 287, 290, 292, 296, 299, 301 — disciplina administrativa da aposentadoria especial."},
{"k":"T555STF","at":"STF_PRECEDENT","al":"L7_JUDICIAL_BINDING","t":"Tema 555 STF (RE 664.335/SC) — efetiva exposição; EPI × ruído","n":"Tema 555","y":2014,"b":"Supremo Tribunal Federal","u":"https://portal.stf.jus.br/jurisprudenciaRepercussao.asp?numeroProcesso=664335","pd":"2014-12-04","ef":"2014-12-04","et":null,"d":"Item I: efetiva exposição como pressuposto; Item II: EPI não descaracteriza ruído."},
{"k":"T694STJ","at":"STJ_PRECEDENT","al":"L7_JUDICIAL_BINDING","t":"Tema 694 STJ — marco temporal da exigência de laudo técnico","n":"Tema 694","y":null,"b":"Superior Tribunal de Justiça","u":null,"pd":null,"ef":null,"et":null,"d":"Resolução temporal entre regime por categoria profissional e regime por laudo/exposição efetiva."},
{"k":"T534STJ","at":"STJ_PRECEDENT","al":"L7_JUDICIAL_BINDING","t":"Tema 534 STJ — exposição efetiva × categoria profissional (C12)","n":"Tema 534","y":null,"b":"Superior Tribunal de Justiça","u":null,"pd":null,"ef":null,"et":null,"d":"Conflito C12 aberto, não bloqueante: interpretações sobre alcance do enquadramento."},
{"k":"T210TNU","at":"TNU_PRECEDENT","al":"L7_JUDICIAL_BINDING","t":"Tema 210 TNU — PEDILEF 0501567-42.2017.4.05.8405/RN (eletricidade)","n":"Tema 210","y":2019,"b":"Turma Nacional de Uniformização","u":"https://www.jfpe.jus.br/cjf/publico/pdfs/05015674220174058405.pdf","pd":"2019-12-01","ef":"2019-12-01","et":null,"d":"Critério judicial de habitualidade para exposição à eletricidade. REFERENCE_ONLY. C15B: nuances do inteiro teor pendentes."},
{"k":"T323TNU","at":"TNU_PRECEDENT","al":"L7_JUDICIAL_BINDING","t":"Tema 323 TNU — calor: exigências de PPP/prova (C6)","n":"Tema 323","y":null,"b":"Turma Nacional de Uniformização","u":null,"pd":null,"ef":null,"et":null,"d":"Conflito C6 aberto (inteiro teor pendente): controvérsia probatória sobre PPP para calor; não torna limites inaplicáveis."},
{"k":"TNU_PEDIF","at":"OTHER_JUDICIAL_PRECEDENT","al":"L7_JUDICIAL_BINDING","t":"TNU PEDIF 0503208-24.2015.4.05.8312 — calor de fonte natural","n":"0503208-24.2015.4.05.8312","y":2015,"b":"Turma Nacional de Uniformização","u":null,"pd":null,"ef":null,"et":null,"d":"Calor de fonte natural (clima) não caracteriza exposição a calor artificial para fins do item 2.0.4."},
{"k":"TNU_VIB_2025","at":"OTHER_JUDICIAL_PRECEDENT","al":"L7_JUDICIAL_BINDING","t":"Teses TNU sobre vibrações — repercussão geral (21/10/2025) (C13)","n":"REPER VIB 2025","y":2025,"b":"Turma Nacional de Uniformização","u":null,"pd":"2025-10-21","ef":"2025-10-21","et":null,"d":"Conflito C13 aberto: teses sobre vibrações localizadas/corpo inteiro; não bloqueia o núcleo de VIB_QUALIT_PERF."},
{"k":"T1090STJ","at":"STJ_PRECEDENT","al":"L7_JUDICIAL_BINDING","t":"Tema 1.090 STJ — EPI e descaracterização (contexto da governança EPI)","n":"Tema 1.090","y":null,"b":"Superior Tribunal de Justiça","u":null,"pd":null,"ef":null,"et":null,"d":"Referência da regra interna de governança EPI (camadas 1–4 do manifesto)."},
{"k":"BIO_ROL","at":"OTHER_JUDICIAL_PRECEDENT","al":"L7_JUDICIAL_BINDING","t":"Jurisprudência STJ/TNU — rol de agentes biológicos exemplificativo (C14)","n":"ROL-BIO","y":null,"b":"STJ/TNU","u":null,"pd":null,"ef":null,"et":null,"d":"Conflito C14 aberto: rol do item 3.0.1 tratado como exemplificativo pela jurisprudência; casos fora do rol com evidência → revisão humana."},
{"k":"NR15","at":"TECHNICAL_STANDARD","al":"L6_TECHNICAL_METHODOLOGY","t":"NR-15 — Portaria MTb nº 3.214/1978 (Anexo 1: ruído; Anexo 3: calor/IBUTG)","n":"NR-15","y":1978,"b":"Ministério do Trabalho","u":"https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-15-atividades-e-operacoes-insalubres","pd":"1978-06-08","ef":"1978-06-08","et":null,"d":"Anexo 1 (limites de tolerância ruído contínuo/intermitente) e Anexo 3 (limites IBUTG por regime de trabalho)."},
{"k":"CNEN_NN301","at":"TECHNICAL_STANDARD","al":"L6_TECHNICAL_METHODOLOGY","t":"CNEN NN 3.01 — Diretrizes Básicas de Proteção Radiológica","n":"NN 3.01","y":null,"b":"CNEN","u":"https://www.gov.br/cnen/pt-br","pd":null,"ef":null,"et":null,"d":"Dosimetria individual como evidência de suporte (dose não é gatilho autônomo)."},
{"k":"ESOCIAL_T24","at":"ESOCIAL_RULE","al":"L5_ESOCIAL_MAPPING","t":"eSocial — Tabela 24 (Agentes Nocivos e Atividades — Aposentadoria Especial), leiaute S-1.3","n":"Tabela 24","y":null,"b":"eSocial/Serpro","u":"https://www.gov.br/esocial/pt-br/tabelas-do-esocial/consulta-tabelas-do-esocial","pd":"2014-01-01","ef":"2014-01-01","et":null,"d":"Códigos 02.01.xxx–05.01.001. Nota de nomenclatura: na consulta pública atual o conteúdo aparece como Tabela 22; códigos e descrições idênticos."}
]$j$::jsonb) LOOP
    INSERT INTO public.legal_sources (id,authority_type,authority_level,title,number,year,issuing_body,official_url,publication_date,effective_from,effective_to,description)
    SELECT md5('ltcat-seed-v1:source:'||(r->>'k'))::uuid,(r->>'at')::public.legal_authority_type_enum,split_part(r->>'al','_',1),r->>'t',r->>'n',(r->>'y')::int,r->>'b',r->>'u',(r->>'pd')::date,(r->>'ef')::date,(r->>'et')::date,r->>'d'
    WHERE NOT EXISTS (SELECT 1 FROM public.legal_sources x WHERE x.title = r->>'t' AND x.number IS NOT DISTINCT FROM r->>'n');
  END LOOP;

  FOR r IN SELECT * FROM jsonb_array_elements($j$[
{"k":"GEN_CORE","n":"Núcleo transversal de regras gerais","c":"OTHER","d":"Agrupador das regras gerais GEN_* (não é agente nocivo).","s":[]},
{"k":"GOV_EPI","n":"Governança do fator EPI","c":"OTHER","d":"Regra interna de governança da matriz EPI (4 camadas).","s":[]},
{"k":"GOV_EXCEPTION","n":"Governança de registros excepcionais","c":"OTHER","d":"Trilha de exceção judicial/administrativa documentada (05.01.001).","s":[]},
{"k":"PHYS_RUIDO","n":"Ruído contínuo ou intermitente","c":"PHYSICAL","d":"Agente físico ruído (Anexo IV 2.0.1; Tabela 24 02.01.001).","s":["ruido","ruído","noise","RUÍDO CONTÍNUO OU INTERMITENTE"]},
{"k":"PHYS_CALOR","n":"Calor","c":"PHYSICAL","d":"Exposição a calor (Anexo IV 2.0.4; Tabela 24 02.02.001).","s":["calor","heat","CALOR","CALOR INTENSO","TEMPERATURAS ANORMAIS (CALOR)"]},
{"k":"PHYS_VIBR_MB","n":"Vibrações localizadas (mão-braço)","c":"PHYSICAL","d":"Vibrações localizadas mão-braço (Tabela 24 02.01.002).","s":["vibracoes localizadas","vibrações mão-braço","VIBRACOES LOCALIZADAS (MAO/BRACO)"]},
{"k":"PHYS_VIBR_CI","n":"Vibrações de corpo inteiro","c":"PHYSICAL","d":"Vibrações de corpo inteiro (Tabela 24 02.01.003/004 — aren · VDVR).","s":["vibracoes corpo inteiro","vibrações corpo inteiro","VIBRACOES (CORPO INTEIRO)"]},
{"k":"PHYS_VIBR_PERF","n":"Vibrações — perfuratrizes de rocha","c":"PHYSICAL","d":"Operador de perfuratriz de rocha (Anexo IV 2.0.2 alínea a; Tabela 24 02.01.005).","s":["perfuratriz","perfuratrizes","PERFURATRIZES DE ROCHA"]},
{"k":"BIO_MICROORG","n":"Microorganismos e parasitas infecto-contagiosos vivos e suas toxinas","c":"BIOLOGICAL","d":"Anexo IV 3.0.1 (alíneas a–g); Tabela 24 03.01.001–007.","s":["biologicos","agentes biológicos","microorganismos","BIOLOGICOS"]},
{"k":"PHYS_RAD_ION","n":"Radiações ionizantes","c":"PHYSICAL","d":"Anexo IV 2.0.3; Tabela 24 02.01.006–013 (condicional 1:N).","s":["radiacoes ionizantes","radiações ionizantes","RADIACOES IONIZANTES"]},
{"k":"PHYS_PRESS_HIPER","n":"Pressão atmosférica anormal (hiperbárica)","c":"PHYSICAL","d":"Anexo IV 2.0.5; Tabela 24 02.01.015–018 (condicional 1:N).","s":["pressao hiperbarica","pressão hiperbárica","PRESSOES ANORMAIS","HIPERBARICAS"]},
{"k":"ASSOC_GENERAL","n":"Associação de agentes nocivos (regra geral)","c":"ASSOCIATION","d":"Anexo IV 4.0.0 — composição de agentes simultâneos.","s":[]},
{"k":"ASSOC_MIN_SUB_AF","n":"Mineração de subsolo — afastada da frente de produção","c":"ASSOCIATION","d":"Anexo IV 4.0.1 — 20 anos.","s":[]},
{"k":"ASSOC_MIN_SUB_FP","n":"Mineração de subsolo — frente de produção","c":"ASSOCIATION","d":"Anexo IV 4.0.2 — 15 anos.","s":[]},
{"k":"HIST_FRIO","n":"Frio (histórico)","c":"PHYSICAL","d":"Dec. 83.080/1979 Anexo I 1.1.2 (Zonas A/B até 05/03/1997; Zona C → 05.01.001).","s":["frio","FRIO","TEMPERATURAS ANORMAIS (FRIO)"]},
{"k":"HIST_ELETRICIDADE","n":"Eletricidade (histórico/judicial)","c":"PHYSICAL","d":"Sem código autônomo administrativo; enquadramento judicial via Tema 210 TNU; S-2240 via 05.01.001.","s":["eletricidade","ELETRICIDADE"]},
{"k":"HIST_UMIDADE","n":"Umidade (histórico)","c":"PHYSICAL","d":"Agente histórico sem regra parametrizada no seed (NOT_PARAMETERIZED — rota de revisão humana).","s":["umidade","UMIDADE"]},
{"k":"HIST_RAD_NION","n":"Radiações não ionizantes (histórico)","c":"PHYSICAL","d":"Agente histórico sem regra parametrizada no seed (NOT_PARAMETERIZED — rota de revisão humana).","s":["radiacoes nao ionizantes","RAD. NAO-IONIZANTES"]}
]$j$::jsonb) LOOP
    INSERT INTO public.occupational_agents (id,internal_code,name,category,description,synonyms,active)
    SELECT md5('ltcat-seed-v1:agent:'||(r->>'k'))::uuid,r->>'k',r->>'n',(r->>'c')::public.agent_category_enum,r->>'d',(r->'s'),true
    WHERE NOT EXISTS (SELECT 1 FROM public.occupational_agents x WHERE x.internal_code = r->>'k');
  END LOOP;

  FOR r IN SELECT * FROM jsonb_array_elements($j$[
{"k":"MET_QUALIT","n":"Avaliação qualitativa circunstanciada","b":"SR SMS (metodologia interna)","v":"1.0","t":"QUALITATIVE","p":{},"u":[],"s":null},
{"k":"MET_GOLPES","n":"Contagem de golpes por minuto (ferramentas de percussão)","b":"SR SMS (conforme IN 128/2022, art. 296, I)","v":"1.0","t":"QUANTITATIVE","p":{"parameter":"golpes_por_minuto","unit":"golpes/min","threshold":120,"operator":"GT"},"u":["golpes/min"],"s":null},
{"k":"MET_DOSIM_CNEN","n":"Dosimetria individual de radiações ionizantes (evidência de suporte)","b":"CNEN","v":"NN 3.01","t":"EVIDENCE_SUPPORT","p":{"note":"Dose é evidência, não gatilho autônomo de enquadramento."},"u":["mSv"],"s":"CNEN_NN301"},
{"k":"NR15_AN3","n":"NR-15 Anexo 3 — Limites de tolerância para exposição ao calor (IBUTG)","b":"Ministério do Trabalho","v":"NR-15/1978","t":"LOOKUP_TABLE","p":{"parameter":"IBUTG","unit":"IBUTG_CELSIUS","operator":"LOOKUP_TABLE","limits":{"CONTINUOUS":{"LEVE":30.0,"MODERADA":26.7,"PESADA":25.0},"75_25":{"LEVE":30.6,"MODERADA":28.0,"PESADA":25.9},"50_50":{"LEVE":31.4,"MODERADA":29.4,"PESADA":27.9},"25_75":{"LEVE":32.2,"MODERADA":31.1,"PESADA":30.0}}},"u":["IBUTG_CELSIUS"],"s":"NR15"},
{"k":"NR15_AN1_REF","n":"NR-15 Anexo 1 — Limites de tolerância para ruído contínuo ou intermitente (remissão)","b":"Ministério do Trabalho","v":"NR-15/1978","t":"REFERENCE","p":{"note":"Remissão do item 2.0.1 (redação Dec. 4.882/2003): avaliação quantitativa conforme Anexo 1 da NR-15."},"u":["dB(A)"],"s":"NR15"}
]$j$::jsonb) LOOP
    INSERT INTO public.assessment_methodologies (id,internal_code,name,issuing_body,version,valid_from,methodology_type,parameters_schema,allowed_units,source_id)
    SELECT md5('ltcat-seed-v1:methodology:'||(r->>'k'))::uuid,r->>'k',r->>'n',r->>'b',r->>'v','2026-08-23'::date,CASE r->>'t' WHEN 'LOOKUP_TABLE' THEN 'QUANTITATIVE' WHEN 'REFERENCE' THEN 'QUANTITATIVE' WHEN 'EVIDENCE_SUPPORT' THEN 'QUALITATIVE' ELSE r->>'t' END,(r->'p'),(r->'u'),
      CASE WHEN r->>'s' IS NULL THEN NULL ELSE md5('ltcat-seed-v1:source:'||(r->>'s'))::uuid END
    WHERE NOT EXISTS (SELECT 1 FROM public.assessment_methodologies x WHERE x.internal_code = r->>'k');
  END LOOP;

  FOR r IN SELECT * FROM jsonb_array_elements($j$[
{"k":"T24","ct":"ESOCIAL_TABLE_24","v":"Tabela 24 — Agentes Nocivos e Atividades (leiaute S-1.3; DTINICIO dos códigos 01/01/2014)","u":"https://www.gov.br/esocial/pt-br/tabelas-do-esocial/consulta-tabelas-do-esocial","vf":"2014-01-01","vt":null},
{"k":"ANEXO_IV","ct":"DEC_3048_ANNEX_IV","v":"Anexo IV do Decreto nº 3.048/1999 — texto compilado","u":"https://www.planalto.gov.br/ccivil_03/decreto/d3048compilado.htm","vf":"1999-05-06","vt":null},
{"k":"HIST_53831","ct":"HISTORICAL_DECREE_53831","v":"Decreto nº 53.831/1964 — anexos (rol histórico)","u":"https://www.planalto.gov.br/ccivil_03/decreto/antigos/d53831.htm","vf":"1964-03-25","vt":"1979-01-23"},
{"k":"HIST_83080","ct":"HISTORICAL_DECREE_83080","v":"Decreto nº 83.080/1979 — Anexo I (rol histórico; para o seed até 05/03/1997)","u":"https://www.planalto.gov.br/ccivil_03/decreto/antigos/d83080.htm","vf":"1979-01-24","vt":"1997-03-05"}
]$j$::jsonb) LOOP
    INSERT INTO public.external_catalog_versions (id,catalog_type,version_name,source_url,valid_from,valid_to,status)
    SELECT md5('ltcat-seed-v1:catalog:'||(r->>'k'))::uuid,(r->>'ct')::public.catalog_type_enum,r->>'v',r->>'u',(r->>'vf')::date,(r->>'vt')::date,'ACTIVE'
    WHERE NOT EXISTS (SELECT 1 FROM public.external_catalog_versions x WHERE x.catalog_type = (r->>'ct')::public.catalog_type_enum);
  END LOOP;

  FOR r IN SELECT * FROM jsonb_array_elements($j$[
{"k":"C1","t":"Limites NR-15 × jurisprudência calor (Tema 323 TNU)","d":"Controvérsia probatória sobre PPP para calor; limites seguem aplicáveis.","st":"RESOLVED","sv":"medium","hr":false,"rn":"Resolvido: C6 trata apenas dos requisitos de PPP, não torna limites inaplicáveis."},
{"k":"C2","t":"Decreto 2.206/1975 × Lei 8.213/1991 (eletricidade)","d":"Regulamento antigo com previsão de eletricidade sem lastro na lei.","st":"RESOLVED","sv":"medium","hr":false,"rn":"Resolvido: sem lastro legal; eletricidade segue trilha judicial (Tema 210 TNU)."},
{"k":"C3","t":"IN 128/2022 × entendimento STF (Tema 555) — EPI","d":"EPI eficaz descaracteriza? Camadas 1–4 da matriz EPI.","st":"UNDER_REVIEW","sv":"high","hr":true,"rn":null},
{"k":"C4","t":"Decreto 53.831/1964 × Decreto 83.080/1979 (rol histórico)","d":"Divergências de rol entre decretos históricos.","st":"OPEN","sv":"low","hr":false,"rn":"Imaterial para o seed: marcos de vigência documentados por regra."},
{"k":"C5","t":"NOISE_V5 — remissão NR-15 (conflito interno)","d":"85 dB(A) fixo × remissão ao Anexo 1 da NR-15.","st":"OPEN","sv":"medium","hr":false,"rn":"Não bloqueante: redação vigente manda respeitar NR-15."},
{"k":"C6","t":"Tema 323 TNU — exigências de PPP para calor (inteiro teor pendente)","d":"Controvérsia probatória; afeta HEAT_V3/V4 apenas quanto a requisitos de PPP.","st":"UNDER_REVIEW","sv":"high","hr":true,"rn":null},
{"k":"C7","t":"Tabela 24 × Anexo IV — divergências residuais de mapeamento","d":"Mapeamentos condicionais 1:N resolvidos na revisão 1.1; residual documental.","st":"OPEN","sv":"low","hr":false,"rn":"Resíduo não bloqueante após revisão 1.1."},
{"k":"C8","t":"Tabela 24 — nomenclatura Tabela 22 na consulta pública","d":"Nota de nomenclatura: conteúdo idêntico, rótulo diverso.","st":"RESOLVED","sv":"low","hr":false,"rn":"Resolvido na revisão 1.1 (registro documental)."},
{"k":"C9","t":"eSocial — versões de leiaute × vigência dos códigos","d":"Introdução do codAgNoc e DTINICIO 01/01/2014 confirmados.","st":"RESOLVED","sv":"low","hr":false,"rn":"Resolvido na revisão 1.1 (consulta oficial Serpro/gov.br)."},
{"k":"C10","t":"Decreto 3.048/1999 (literal) × NR-15 — divergência textual","d":"Cabeçalho literal do Anexo IV × valores NR-15.","st":"OPEN","sv":"medium","hr":false,"rn":"Não bloqueante; casos da órbita → revisão humana."},
{"k":"C11","t":"EPI transversal — NR-15 × NR-6 × NR-9 × jurisprudência","d":"Descaracterização por EPI fora do ruído não pacificada.","st":"OPEN","sv":"high","hr":true,"rn":null},
{"k":"C12","t":"Categoria profissional × exposição efetiva (Tema 534 STJ)","d":"Alcance do enquadramento por categoria em períodos/jurisprudência.","st":"OPEN","sv":"medium","hr":true,"rn":null},
{"k":"C13","t":"Teses TNU sobre vibrações (21/10/2025)","d":"Repercussão geral sobre vibrações localizadas/corpo inteiro.","st":"OPEN","sv":"medium","hr":true,"rn":null},
{"k":"C14","t":"Rol de agentes biológicos — exemplificativo (STJ/TNU)","d":"Rol do item 3.0.1 tratado como exemplificativo.","st":"OPEN","sv":"medium","hr":true,"rn":null},
{"k":"C15B","t":"Tema 210 TNU — nuances do inteiro teor (tensão mínima, requisitos probatórios)","d":"Pendente de validação jurídica; sem efeito bloqueante.","st":"OPEN","sv":"medium","hr":true,"rn":null}
]$j$::jsonb) LOOP
    INSERT INTO public.legal_conflicts (id,conflict_code,title,description,status,severity,requires_human_review,resolved_at,resolution_note)
    SELECT md5('ltcat-seed-v1:conflict:'||(r->>'k'))::uuid,r->>'k',r->>'t',r->>'d',(r->>'st')::public.legal_conflict_record_status_enum,upper(r->>'sv'),(r->>'hr')::boolean,
      CASE WHEN r->>'st' = 'RESOLVED' THEN '2026-08-23'::timestamptz ELSE NULL END, r->>'rn'
    WHERE NOT EXISTS (SELECT 1 FROM public.legal_conflicts x WHERE x.conflict_code = r->>'k');
  END LOOP;
END $seed$;