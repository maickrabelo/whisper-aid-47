# PCMSO — Arquitetura (Fase 0)

Status: proposta. Nenhuma estrutura `pcmso_*` ou rota `/pcmso*` existe ainda. Fonte: especificação "Objetivo e forma de uso" (anexada em 14/10/2026).

## Princípios
- Módulo dentro do app atual (React + Vite + Lovable Cloud). Sem app separado.
- Reaproveita `companies`, autenticação, `user_companies`, `company_sst_assignments`, `RealAuthContext`.
- Trabalhador independente de PGR/PCMSO e suas revisões (cadastro ocupacional próprio).
- Identidade estável de grupo de exposição por empresa, mapeada aos GHEs documentais. Nunca associar por nome.
- PGR = fonte principal do inventário; LTCAT = evidência complementar; AEP = origem rastreável via `aep_pgr_vinculo` / `pgr_risks.source_module`.
- Aprovar, publicar, revisar e emitir = operações transacionais no backend (RPC security definer).
- Versão aprovada referencia snapshot + hash da origem; mudanças posteriores geram `pcmso_change_requests`.
- Flag `PCMSO_BETA` desligada por padrão (mesmo padrão do `LTCAT_BETA`: `feature_access` + RPC `has_feature_access` + `FeatureGuard`). Habilitação comercial ≠ autorização clínica.
- Enum `app_role` preservado; papel médico = atribuição por empresa (`pcmso_professional_assignments`).

## Pontos de integração (código existente)
| Origem | Tabelas/arquivos | Uso no PCMSO | Fase |
|---|---|---|---|
| Empresas | `companies`, `user_companies`, `company_sst_assignments` | escopo de acesso | 1 |
| Feature flag | `feature_access`, `has_feature_access`, `src/components/feature-flags/FeatureGuard.tsx`, `src/hooks/useFeatureAccess.ts` | `PCMSO_BETA` | 1 |
| PGR | `pgr_documents`, `pgr_ghe`, `pgr_risks` | fonte de grupos/riscos (snapshot) | 3 |
| Trabalhadores | `pgr_ghe_workers` | backfill controlado para `occupational_*` | 2 |
| AEP | `aep_avaliacoes`, `aep_fatores_avaliados`, `aep_pgr_vinculo` | origem rastreável de fatores | 3 |
| LTCAT | `ltcat_documents`, `ltcat_ghes`, `ltcat_exposures`, `ltcat_evaluations` | evidências (medições) | 3 |
| Plano de ação | `pgr_action_items`, Kanban `/pgr/:companyId/kanban` | ações preventivas com confirmação, sem diagnóstico | 5 |
| eSocial | `pgr_esocial_exports` (S-2240 local) | padrão para S-2220 (export, sem transmissão) | 9 |
| Psicossocial/Clima/Burnout/Ouvidoria | tabelas `hseit_*`, `copsoq_*`, `burnout_*`, `climate_surveys`, `reports` | apenas agregados com limiar (sugestão 5) | 8 |
| Financeiro | assinaturas Asaas/Hotmart | não usado para exames | — |

## Rotas propostas
`/pcmso`, `/pcmso/empresa/:companyId`, `/pcmso/programa/:programId`, `/pcmso/empresa/:companyId/trabalhadores`, `/pcmso/vinculo/:employmentId`, `/pcmso/empresa/:companyId/exames`, `/pcmso/atendimento/:encounterId`, `/pcmso/empresa/:companyId/relatorios`. Rotas só organizam navegação; autorização efetiva no banco.

## Editor do programa
Abas: Identificação; Fontes e riscos; Grupos e funções; Protocolos; Ações e cronograma; Revisão médica; Documento; Histórico. Ausência de informação aparece como pendência.

## Releases
- A (Fases 1–5): programa documental.
- B (Fase 6 + parte da 7): gestão ocupacional, ASO externo.
- C (7–8): operação clínica, relatório analítico.
- D (9–10): S-2220 export; integrações opcionais.
Fora da 1ª entrega: IA diagnóstica, aptidão automática, transmissão eSocial, faturamento de exames, CAT automática.
