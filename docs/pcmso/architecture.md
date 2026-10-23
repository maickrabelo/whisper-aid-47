# PCMSO — Arquitetura (Fase 0 e fundação da Fase 1)

Status: fundação implementada com feature flag desligada por padrão, rotas protegidas e autorização por empresa e ação. As fases clínicas permanecem planejadas e não são ativadas em produção. Fonte: especificação "Objetivo e forma de uso" (anexada em 14/10/2026).

## Princípios
- Módulo dentro do app atual (React + Vite + Lovable Cloud). Sem app separado.
- Reaproveita `companies`, autenticação, `user_companies`, `company_sst_assignments`, `RealAuthContext`.
- Trabalhador independente de PGR/PCMSO e suas revisões (cadastro ocupacional próprio).
- Identidade estável de grupo de exposição por empresa, mapeada aos GHEs documentais. Nunca associar por nome.
- PGR = fonte principal do inventário; LTCAT = evidência complementar; AEP = origem rastreável via `aep_pgr_vinculo` / `pgr_risks.source_module`.
- Aprovar, publicar, revisar e emitir = operações transacionais no backend (RPC security definer).
- Versão aprovada referencia snapshot + hash da origem; mudanças posteriores geram `pcmso_change_requests`.
- Flag `PCMSO_BETA` desligada por padrão (mesmo padrão do `LTCAT_BETA`: `feature_access` + RPC `has_feature_access` + `FeatureGuard`). Habilitação comercial ≠ autorização clínica.
- A autorização específica usa `pcmso_can(company_id, action)`, com a empresa e a ação validadas no backend; `pcmso_has_permission` está obsoleta. A listagem de empresas acessíveis continua centralizada em `pcmso_accessible_companies()`.
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

## Rotas
As rotas iniciais implementadas são `/pcmso` e `/pcmso/empresa/:companyId`. A primeira exige a feature flag `PCMSO_BETA`; a segunda exige autorização específica para a empresa antes de montar a tela. As rotas futuras são `/pcmso/programa/:programId`, `/pcmso/empresa/:companyId/trabalhadores`, `/pcmso/vinculo/:employmentId`, `/pcmso/empresa/:companyId/exames`, `/pcmso/atendimento/:encounterId` e `/pcmso/empresa/:companyId/relatorios`. Rotas só organizam navegação; autorização efetiva permanece no banco.

## Editor do programa
Abas: Identificação; Fontes e riscos; Grupos e funções; Protocolos; Ações e cronograma; Revisão médica; Documento; Histórico. Ausência de informação aparece como pendência.

## Releases
- A (Fases 1–5): programa documental.
- B (Fase 6 + parte da 7): gestão ocupacional, ASO externo.
- C (7–8): operação clínica, relatório analítico.
- D (9–10): S-2220 export; integrações opcionais.
Fora da 1ª entrega: IA diagnóstica, aptidão automática, transmissão eSocial, faturamento de exames, CAT automática.

## Fase 6 — preparação isolada
Convocações ocupacionais na página da empresa, separadas do programa documental. A autorização `pcmso_exam_can` exige `program.view` e liberação individual `PCMSO_EXAMS_BETA` para a empresa. Somente simulações são aceitas pelo banco enquanto a Release A aguarda assinatura/homologação; não há envio externo nem registro de resultado clínico. Pedidos usam protocolo manual ativo, chave idempotente e cópia imutável do trabalhador/vínculo e protocolo. Comparecimento é exclusivamente andamento administrativo, não conclusão médica ou aptidão.

## Piloto simulado das fases 7–9
Autorizado pelo usuário sem homologação médica. `pcmso_pilot_can` exige empresa piloto fixa, flag individual adicional e, para operações sensíveis, atribuição médica ativa. Fluxo médico separado na página da empresa; RPCs auditadas, sem tabelas clínicas acessíveis diretamente. ASO capturado no momento da emissão, correções append-only; programa sem aprovação é explicitamente permitido apenas na simulação. Assinatura manual declarada não é documento assinado verificado.
Relatório anual expõe somente resumo incompleto sem grupos/filtros clínicos e suprime toda a empresa abaixo de 5 indivíduos, evitando reconstrução por subtotais. Preparação S-2220 sem XMLDSig e ambiente 2, sem serviço de transmissão. Os esquemas oficiais/versionamento e limitações estão em `esocial/README.md`.

## Complemento documental e analítico
Exportação S-2220 individual/lote: seleção explícita de ASOs originais não substituídos, revisão médica confirmada, RPC auditada por ASO e validação integral antes de liberar XML ou ZIP. Falha em qualquer item impede download parcial, mas preparações anteriores podem permanecer na auditoria. Sem retificação, produção ou transmissão; ambiente 2 e autorização médica preservados.

Guarda de PDF manual separada do conteúdo aprovado: reservas e recibos imutáveis, objeto privado sem substituição/exclusão e download autenticado com hash conferido. ASO vinculado ao emitente; programa exige versão aprovada e responsável. Custódia não equivale à verificação jurídica da assinatura.
Relatório analítico independente do resumo operacional: indicadores declarados pelo responsável por setor/função e período, denominadores explícitos, ausência representada por null, reconciliação dos tipos/exames clínicos, análise/medidas/fontes/discussão. Revisões imutáveis; conteúdo bruto somente ao responsável, exportação integralmente ocultada quando célula positiva ou população abaixo de 5. Integração automática de indicadores clínicos e homologação por médico real não presumidas.
