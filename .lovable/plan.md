## Objetivo
Adicionar o módulo AEP (Avaliação Ergonômica Preliminar — NR-17 item 17.3.1) como submódulo independente por empresa, com atalho dentro do PGR. AEP cobre fatores ergonômicos (físico/biomecânico, organizacional, cognitivo) e psicossociais, alimenta o inventário de riscos do PGR mantendo rastreabilidade completa e suporta versionamento, anexos de evidências, alertas de revisão e PDF assinável.

## Como o usuário verá

- Nova rota `/aep/:companyId` acessível pelo card da empresa no SST Dashboard e por uma nova aba "AEP" dentro do `PGRDashboard`.
- Dentro da empresa, o usuário vê a **lista de AEPs** (filtros por setor, status, responsável, data + indicadores de "convertidas em riscos" e "vencidas para revisão").
- Botão **"Nova AEP"** abre um **wizard de 5 passos**:
  1. Identificação (setor, função, GHE quando houver PGR, descrição da situação de trabalho)
  2. Metodologia (multi-select: observação / entrevista / grupo focal / questionário validado / outro; nome do instrumento; checkbox de anonimato)
  3. Levantamento de fatores (formulário dinâmico com biblioteca pré-carregada de fatores NR-17 e psicossociais, agrupados por categoria; permite fator customizado; cada fator recebe severidade/probabilidade na mesma escala da matriz do PGR)
  4. Evidências e participação dos trabalhadores (upload de fotos, atas, documentos; registro de quem foi ouvido/consultado; campo de anonimato)
  5. Revisão e assinatura (dados do responsável técnico: nome, cargo, registro CREA/CRP/outro; data; confirmação)
- **Tela de detalhe da AEP** com abas: dados gerais, fatores levantados, evidências, histórico de versões, riscos vinculados no PGR e botão **"Exportar PDF assinável"**.
- **Integração com PGR** (tela de "Envio ao inventário"): lista os fatores da AEP concluída com preview de como cada um ficará em `pgr_risks`, sugestão de vínculo com riscos existentes equivalentes (busca por setor + fator similar) e botão de envio individual ou em lote.
- **Badge "Origem: AEP"** em cada linha do inventário de riscos do PGR (`RiskInventory.tsx`), com link para a AEP de origem — reusa `pgr_risks.source_module` que já existe.
- **Versionamento**: botão "Nova versão" no detalhe cria um clone com incremento de `version`, mantendo o histórico. Todas as versões continuam consultáveis; apenas a mais recente aparece por padrão na listagem.
- **Alertas de revisão**: badge amarela quando `next_review_date` está a ≤30 dias e vermelha quando vencida; card no dashboard resume AEPs vencidas.
- **Mini dashboard** no topo da lista: AEPs por status, % setores avaliados (usa `pgr_ghe` como base quando existir), fatores mais recorrentes, AEPs vencidas.

## Modelo de dados

Tabelas novas em `public` (com GRANTs + RLS por empresa/SST, seguindo o mesmo padrão de `pgr_documents`):

**`aep_avaliacoes`**
- `id`, `company_id` (FK companies), `pgr_document_id` (FK pgr_documents, nullable — AEP pode existir sem PGR para ME/EPP)
- `ghe_id` (FK pgr_ghe, nullable), `setor_nome` text, `funcao_nome` text
- `situacao_trabalho` text (descrição da atividade avaliada)
- `assessment_date` date, `next_review_date` date
- `responsible_name`, `responsible_role`, `responsible_registration` (CREA/CRP/etc.)
- `methodologies` text[] (multi-select), `methodology_details` text
- `instrument_name` text (quando aplicável), `anonymity_ensured` boolean
- `status` text check in ('draft','in_progress','completed','in_review','revised')
- `version` int default 1, `parent_version_id` uuid (self-FK — encadeia versões)
- `signed_at` timestamptz, `signature_hash` text (hash simples nome+data+conteúdo, sem certificado ICP)
- `created_by`, `created_at`, `updated_at`

**`aep_fatores_avaliados`** (tabela filha de itens levantados)
- `id`, `aep_id` FK cascade
- `categoria` text check in ('ergonomico_fisico','ergonomico_organizacional','ergonomico_cognitivo','psicossocial')
- `fator_codigo` text (referência à biblioteca; null quando customizado), `fator_nome` text
- `fonte_causa` text, `grupos_expostos` text
- `evidencia_texto` text
- `severity` smallint (1–5), `probability` smallint (1–5), `matrix_size` smallint default 5
- `observacoes` text
- `created_at`, `updated_at`

**`aep_pgr_vinculo`** (rastreabilidade AEP → risco do PGR)
- `id`, `aep_fator_id` FK, `pgr_risk_id` FK, `linked_at` timestamptz, `linked_by` uuid
- unique(aep_fator_id, pgr_risk_id)

**`aep_evidencias`** (anexos)
- `id`, `aep_id` FK cascade, `file_path` text (bucket `aep-evidencias`), `file_name`, `mime_type`, `size_bytes`, `descricao`, `uploaded_by`, `uploaded_at`

**`aep_participantes`** (registro de quem foi ouvido)
- `id`, `aep_id` FK cascade, `nome`, `funcao`, `tipo_participacao` (entrevista/grupo focal/questionário), `data_participacao`, `anonimizado` boolean

**`aep_fatores_catalogo`** (biblioteca pré-carregada, leitura pública para authenticated)
- `id`, `codigo` unique, `categoria`, `nome`, `descricao`, `severidade_tipica`, `probabilidade_tipica`, `ativo` boolean
- **Seed inicial (~40 itens)** cobrindo NR-17 e Guia MTE Psicossocial:
  - Ergonômico físico: posto de trabalho inadequado, mobiliário sem regulagem, iluminação inadequada, ruído crônico, temperatura desconfortável, levantamento manual de cargas, movimentos repetitivos, postura estática prolongada, postura forçada.
  - Ergonômico organizacional: jornada excessiva, ritmo/pressão de tempo, pausas insuficientes, metas inatingíveis, trabalho noturno/turnos, sobrecarga quantitativa.
  - Ergonômico cognitivo: sobrecarga cognitiva, monotonia, atenção sustentada excessiva, tomada de decisão sob pressão.
  - Psicossocial: baixa autonomia, ambiguidade de papel, conflito de papel, assédio moral, assédio sexual, discriminação, violência de terceiros, relações socioprofissionais degradadas, falta de suporte da chefia, falta de reconhecimento, insegurança no emprego, conflito trabalho-família, exigência emocional, exposição a sofrimento humano.

**Alterações em `pgr_risks`**: nenhuma. Já existe `source_module` (usar `'aep'`) e `source_module_id` (usar `aep_fator_id`). Isso garante o badge "Origem: AEP" e o link reverso.

**Bucket `aep-evidencias`** (privado) + policies alinhadas às RLS das tabelas.

**RLS**: mesmo padrão das tabelas do PGR — SST gerencia via `company_sst_assignments` + `user_in_sst_manager`, empresa vê via `user_in_company`, admin gerencia tudo. Diferente do PGR, **não exige `has_pgr_module`** — AEP é disponível para toda empresa (obrigação NR-17 mesmo sem PGR).

**Trigger** em `aep_fatores_avaliados` para clamp severity/probability como já é feito em `pgr_risks`.

## Regras de negócio

- Só é possível **concluir** uma AEP (status → `completed`) se houver ao menos 1 fator, 1 participante e o responsável técnico preenchido.
- Após conclusão, a tela "Enviar ao inventário" aparece e permite:
  - **Gerar novo risco**: cria linha em `pgr_risks` com `category` derivada (ergonomico_* → `ergonomico`; psicossocial → `psicossocial`), `agent_name = fator_nome`, `exposure_description = fonte_causa`, severidade/probabilidade copiadas do fator (editáveis no preview), `ghe_id` copiado, `source_module='aep'`, `source_module_id=aep_fator_id`. Depois grava `aep_pgr_vinculo`.
  - **Vincular a risco existente**: busca em `pgr_risks` do mesmo `pgr_document_id` por `ghe_id` + `agent_name ILIKE` similar; se encontrar, sugere vínculo (só grava `aep_pgr_vinculo` sem duplicar).
- Envio ao inventário exige que a AEP tenha `pgr_document_id`; se não tiver, a UI orienta a criar/vincular um PGR antes.
- **Versionamento**: "Nova versão" copia AEP + fatores + participantes (sem evidências, que ficam por versão), incrementa `version`, aponta `parent_version_id` para a atual e coloca status `draft`. Vínculos com PGR ficam presos à versão de origem.
- **Alerta de revisão**: campo `next_review_date` opcional; front calcula badges. Sem trigger/cron nesta v1.
- **PDF**: reusa `pdfLogos.ts` (logo gestora + logo empresa) e o mesmo estilo visual do `PGRReportPDF.ts`. Inclui: identificação, metodologia, tabela de fatores com severidade/probabilidade/nível, lista de participantes, anexos listados, campo de assinatura do responsável técnico.

## Frontend

**Novos arquivos:**
- `src/pages/AEPDashboard.tsx` — rota `/aep/:companyId`: header + lista + botão Nova AEP.
- `src/pages/AEPDetail.tsx` — rota `/aep/:companyId/:aepId`: abas (Dados, Fatores, Evidências, Participantes, Versões, Riscos vinculados) + botão exportar PDF + botão "Enviar ao inventário".
- `src/components/aep/AEPWizard.tsx` — wizard de 5 passos (usa `Dialog` fullscreen).
- `src/components/aep/steps/StepIdentificacao.tsx`
- `src/components/aep/steps/StepMetodologia.tsx`
- `src/components/aep/steps/StepFatores.tsx` (autocomplete via `aep_fatores_catalogo`, badges de categoria, matriz mini para severidade/probabilidade)
- `src/components/aep/steps/StepEvidencias.tsx` (upload + participantes)
- `src/components/aep/steps/StepRevisao.tsx`
- `src/components/aep/AEPList.tsx` — tabela filtrada + KPIs no topo.
- `src/components/aep/AEPKPICards.tsx`
- `src/components/aep/SendToInventoryDialog.tsx` — preview antes de gerar/ vincular.
- `src/components/aep/AEPReportPDF.ts` — geração de PDF (mesmo padrão do `PGRReportPDF.ts`).
- `src/components/aep/AEPBadge.tsx` — badge "Origem: AEP" reutilizável.
- `src/hooks/useAEPAccess.ts` — libera acesso para role `sst` (assigned) / `company` / `admin`; não requer PGR module.
- `src/hooks/useAEPFatoresCatalog.ts` — carrega e cacheia a biblioteca.

**Arquivos alterados:**
- `src/App.tsx` — registra `/aep/:companyId` e `/aep/:companyId/:aepId`.
- `src/pages/PGRDashboard.tsx` — adiciona aba "AEP" que renderiza `<AEPList companyId={...} pgrDocumentId={pgr.id} embedded />` com atalho para o dashboard completo.
- `src/pages/SSTDashboard.tsx` — botão "AEP" no card da empresa (junto de PGR).
- `src/components/pgr/RiskInventory.tsx` — quando `source_module = 'aep'`, mostra `<AEPBadge aepId={...} />` com link.

## Fora do escopo
- Assinatura digital ICP-Brasil (usa hash simples + nome/data).
- Cron/edge function de notificação por e-mail de AEPs vencidas (só badge visual).
- Importação em massa de fatores por CSV.
- Fluxo de aprovação multi-nível.
- Integração com módulos Climate/HSE-IT/COPSOQ (podem virar fatores manualmente, mas sem auto-import nesta v1).
