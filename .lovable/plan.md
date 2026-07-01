## Objetivo
Permitir que ao criar um documento em uma empresa, o usuário escolha entre **PGR** (Programa de Gerenciamento de Riscos — NR-1) ou **PGTR** (Plano de Gerenciamento de Riscos do Trabalhador Rural — NR-31), com estrutura expandida e campos específicos da NR-31.

## Como funcionará

Ao clicar em "Criar PGR" numa empresa, aparece um diálogo com duas opções:
- **PGR (NR-1)** — fluxo atual, sem alterações visíveis.
- **PGTR (NR-31)** — versão rural, com terminologia, catálogos e campos específicos.

Uma empresa pode ter documentos dos dois tipos convivendo. As telas, PDF e exportação e-Social se adaptam ao tipo escolhido.

## Adaptações no PGTR

**Terminologia (labels dinâmicos):**
- "GHE" → "Grupo Homogêneo de Exposição Rural (GHER)"
- "Endereço" → "Localização da propriedade rural"
- "CNAE" mantém, adiciona "Atividade rural principal"

**Novos campos no documento (aba Visão Geral):**
- Cultura / atividade agrícola predominante (ex: cana, café, pecuária, hortifruti)
- Área rural total (hectares)
- Regime de trabalho (safra / permanente / terceirizado)
- Existência de alojamento (sim/não + descrição)
- Transporte de trabalhadores (próprio / terceirizado / não se aplica)

**Novos campos no Inventário de Riscos (quando PGTR):**
- Uso de agrotóxicos: produto, princípio ativo, classe toxicológica (I-IV), EPI exigido, período de reentrada
- Máquinas e implementos agrícolas: identificação e proteções
- Riscos biológicos rurais (zoonoses, animais peçonhentos)

**Catálogo de agentes rurais pré-carregado** (agrotóxicos por classe, ergonomia em colheita, ruído de trator, calor/exposição solar, biológicos rurais) usado como sugestões ao adicionar riscos.

**PDF e capa:**
- Título "PGTR — Plano de Gerenciamento de Riscos do Trabalhador Rural"
- Cabeçalho cita NR-31 no lugar de NR-1
- Seção extra "Caracterização Rural" com os novos campos
- Seção "Agrotóxicos utilizados" quando houver

**Exportação e-Social:** mantém S-2240 (agentes nocivos), o layout é o mesmo — apenas o texto de contexto do relatório muda.

## Detalhes técnicos

**Banco (uma migration):**
- `pgr_documents.document_type text default 'pgr' check in ('pgr','pgtr')`
- `pgr_documents.rural_activity text`, `rural_area_hectares numeric`, `work_regime text`, `has_lodging boolean`, `lodging_description text`, `worker_transport text`
- `pgr_risks.pesticide_product text`, `pesticide_active_ingredient text`, `pesticide_toxicity_class text`, `pesticide_required_epi text`, `pesticide_reentry_period text` (todos nullable, só usados quando `document_type='pgtr'`)
- Nova tabela `pgtr_agents_catalog` (id, category, agent_name, typical_severity, typical_probability, typical_epi, description) com GRANTs + RLS (leitura pública para authenticated) e seed inicial com ~30 agentes NR-31.

**Frontend:**
- `src/components/pgr/CreateDocumentDialog.tsx` (novo): escolha PGR/PGTR com descrição.
- `src/pages/PGRDashboard.tsx`: substitui o botão único por diálogo; propaga `document_type` para os filhos; ajusta título e breadcrumbs.
- `src/hooks/usePgrTerminology.ts` (novo): retorna labels conforme `document_type` (ghe/gher, endereço, etc.).
- `src/components/pgr/PGROverview.tsx`: renderiza os campos rurais adicionais quando PGTR.
- `src/components/pgr/RiskInventory.tsx`: aba/seção "Agrotóxicos" quando PGTR, com autocomplete via `pgtr_agents_catalog`.
- `src/components/pgr/GHEManager.tsx`: apenas troca de rótulos via hook.
- `src/components/pgr/PGRReportPDF.ts`: ramifica cabeçalho, título e adiciona seções rurais quando PGTR (usa `pdfLogos.ts` existente).
- `src/pages/PGRHub.tsx` e cards de listagem: mostram badge "PGR" ou "PGTR".

**Sem mudanças em:** RLS existente do PGR, `usePGRModuleAccess`, Kanban, checklist, e-Social layout, hotmart-webhook.

## Fora do escopo
- Fluxo separado de aprovação/versionamento distinto por tipo.
- Cálculo de matriz de risco diferente (mantém a atual 3x3/4x4/5x5).
- Assinatura digital / e-Social S-2245 específico rural.
