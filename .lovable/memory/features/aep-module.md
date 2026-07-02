---
name: AEP Module (NR-17)
description: Avaliação Ergonômica Preliminar — módulo por empresa; PDF consolidado; importa dimensões HSE-IT/COPSOQ como fatores psicossociais
type: feature
---

## Escopo
Módulo AEP (NR-17 item 17.3.1) implementado como submódulo independente por empresa (`/aep/:companyId`) com atalho a partir do `PGRDashboard` (aba AEP) e ícone `ClipboardList` roxo no card da empresa em `SSTDashboard`. AEP pode existir sem PGR (ME/EPP dispensadas), mas envio ao inventário exige PGR vinculado.

## Consolidado + importação de psicossociais
- Botão "AEP Consolidado (PDF)" no `AEPDashboard` gera um único documento com capa, sumário executivo, índice, seções de todas as AEPs finalizadas (completed/revised) e tabela anexa de fatores. `src/components/aep/AEPConsolidatedReportPDF.ts`.
- Wizard passo 3 permite "Importar do HSE-IT" e "Importar do COPSOQ II": traz dimensões em risco alto/muito alto como fatores psicossociais com severity/probability pré-preenchidos. `ImportAssessmentDialog.tsx` + libs `src/lib/hseitDimensionScoring.ts` e `src/lib/copsoqDimensionScoring.ts`.
- Rastreabilidade em `aep_fatores_avaliados.source_assessment_type` (`hseit`|`copsoq`) e `source_assessment_id`. Badge "Importado do HSE-IT/COPSOQ II" no card do fator e no PDF consolidado.

## Tabelas
- `aep_avaliacoes` — registro principal (setor, função, ghe_id opcional, situação, metodologias[], responsável técnico, status, version, parent_version_id, signature_hash)
- `aep_fatores_avaliados` — itens levantados (categoria: ergonomico_fisico/organizacional/cognitivo/psicossocial, severity/probability 1-5, trigger `aep_fatores_clamp`)
- `aep_pgr_vinculo` — rastreabilidade aep_fator_id → pgr_risk_id (UNIQUE)
- `aep_evidencias` — anexos no bucket privado `aep-evidencias` (path = `{aep_id}/{file}`)
- `aep_participantes` — trabalhadores ouvidos, anonimizável
- `aep_fatores_catalogo` — biblioteca com ~34 fatores NR-17/psicossociais pré-carregada (leitura pública para authenticated)

## Integração com PGR
- Ao enviar fatores ao inventário, `pgr_risks` recebe `source_module='aep'` + `source_module_id=aep_fator_id`
- `RiskInventory.tsx` renderiza `<AEPBadge>` roxo com link para AEP de origem quando `source_module='aep'`
- Categoria AEP → categoria PGR via `aepCategoriaToPgr()` em `src/lib/aepRiskLevel.ts`: psicossocial→psicossocial, demais→ergonomico
- `SendToInventoryDialog` faz busca de riscos similares (mesmo ghe_id + agent_name ILIKE) e oferece "vincular vs criar novo"

## Componentes
- `src/pages/AEPDashboard.tsx` — lista + KPIs + filtros
- `src/pages/AEPDetail.tsx` — 5 abas (Dados, Fatores, Evidências, Participantes, Versões)
- `src/components/aep/AEPWizard.tsx` — wizard 5 passos (identificação, metodologia, fatores, participantes, revisão/assinatura)
- `src/components/aep/SendToInventoryDialog.tsx` — preview + envio ao PGR
- `src/components/aep/AEPReportPDF.ts` — PDF assinável usando `renderReportLogos` (logo SST + empresa)
- `src/components/aep/AEPBadge.tsx` — badge "Origem: AEP" reutilizável
- `src/hooks/useAEPFatoresCatalog.ts` — carrega e cacheia biblioteca

## Versionamento
- "Nova versão" copia AEP + fatores + participantes (sem evidências), status=draft, incrementa version, aponta parent_version_id para o root da cadeia
- Vínculos com PGR ficam presos à versão de origem

## Assinatura
- Hash simples base64 de `nome|cargo|registro|timestamp|nº fatores` (sem ICP-Brasil), armazenado em `signature_hash`
- `signed_at` timestamp registrado no submit do wizard

## Fora do escopo (v1)
- ICP-Brasil, notificações por e-mail de revisão vencida (só badges), auto-import de HSE-IT/COPSOQ/Climate como fatores AEP
