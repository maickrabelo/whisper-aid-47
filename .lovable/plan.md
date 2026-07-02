## Objetivo

Duas capacidades novas no módulo AEP:

1. **Relatório AEP Consolidado da Empresa** — um único PDF completo que reúne todas as AEPs de uma empresa (independente do PGR), servindo como o documento oficial de Avaliação Ergonômica Preliminar entregável para fiscalização/auditoria.
2. **Importação de dados de HSE-IT e COPSOQ** — durante a criação/edição da AEP, permitir puxar automaticamente resultados dos módulos psicossociais existentes da mesma empresa como fatores AEP, mantendo rastreabilidade da origem.

## Como o usuário verá

### 1. Relatório AEP Consolidado

- Na página `/aep/:companyId` (AEPDashboard), ao lado do botão "Nova AEP", adicionar um botão **"Baixar AEP Consolidado (PDF)"**.
- O PDF gerado inclui:
  - Capa com logo da gestora SST + logo da empresa + CNPJ + data de emissão + total de AEPs no documento.
  - Sumário executivo: quantidade de setores avaliados, total de fatores por categoria (físico/organizacional/cognitivo/psicossocial), fatores em nível intolerável/substancial.
  - Índice das AEPs incluídas (setor · função · data · versão · status).
  - Para cada AEP concluída (status `completed` ou `revised`): as mesmas seções do PDF individual atual (identificação, metodologia, fatores, participantes, evidências, assinatura do responsável técnico), separadas por quebra de página e numeradas ("AEP 1 de N", "AEP 2 de N", ...).
  - Anexo final: consolidação de todos os fatores em uma tabela única (setor · categoria · fator · severidade · probabilidade · nível), útil para leitura rápida por fiscal.
  - Rodapé em todas as páginas: "Documento consolidado AEP — {empresa} — página X/Y".
- AEPs em `draft` ou `in_progress` **não** entram no consolidado (avisar em toast se não houver nenhuma finalizada).
- Filtro opcional antes de gerar: selecionar quais AEPs incluir (por padrão todas as finalizadas), com um `Dialog` de checkboxes.

### 2. Importar HSE-IT / COPSOQ dentro do Wizard AEP

- No **Passo 3 (Fatores)** do `AEPWizard`, adicionar acima do formulário de fator dois botões:
  - **"Importar do HSE-IT"**
  - **"Importar do COPSOQ II"**
- Cada botão abre um `Dialog` que:
  1. Lista as avaliações HSE-IT/COPSOQ **da mesma empresa** com status finalizado (e opcionalmente filtrando por setor/departamento que bate com o `setor_nome` da AEP em criação).
  2. Ao selecionar uma avaliação, mostra as dimensões/fatores calculados que ficaram em nível de **risco alto ou muito alto** (HSE-IT usa os thresholds já implementados; COPSOQ usa a normalização 0-100 com faixas do módulo).
  3. Usuário marca quais dimensões deseja trazer como fatores AEP e clica "Importar N fatores".
- Cada dimensão importada vira uma linha de fator AEP com:
  - `categoria` = `psicossocial` (HSE-IT e COPSOQ são psicossociais)
  - `fator_nome` = nome da dimensão (ex.: "Demandas — HSE-IT", "Exigências quantitativas — COPSOQ II")
  - `fonte_causa` = "Importado de avaliação {tipo} de {data} — {n} respondentes"
  - `evidencia_texto` = escore/percentil calculado + faixa de risco
  - `severity` e `probability` pré-preenchidos a partir da faixa de risco da dimensão (mapa: baixo→1/1, moderado→2/2, alto→3/4, muito alto→5/4)
  - Novos campos opcionais: `source_assessment_type` (`hseit` | `copsoq`), `source_assessment_id` — para rastreabilidade.
- O usuário ainda pode editar os campos antes de salvar a AEP.
- Badge visual no card do fator quando foi importado ("Importado do HSE-IT" / "Importado do COPSOQ").

## Modelo de dados

**Alteração em `aep_fatores_avaliados`** — adicionar duas colunas opcionais para rastrear origem:

```sql
ALTER TABLE public.aep_fatores_avaliados
  ADD COLUMN source_assessment_type text
    CHECK (source_assessment_type IN ('hseit','copsoq') OR source_assessment_type IS NULL),
  ADD COLUMN source_assessment_id uuid;
```

Sem FK dura (as tabelas de origem podem ser deletadas independente); a rastreabilidade fica no par tipo+id. Nenhum grant/RLS novo — herda das políticas atuais da tabela.

Nenhuma outra tabela nova. O consolidado é gerado 100% no cliente.

## Frontend

**Novos arquivos:**
- `src/components/aep/AEPConsolidatedReportPDF.ts` — geração do PDF consolidado. Reusa helpers de `AEPReportPDF.ts` (renderização de cabeçalho, lista de fatores, participantes, evidências) refatorados como funções puras `renderAEPSection(doc, y, aep, fatores, participantes, evidencias)` que retornam o novo `y`. Adiciona capa, sumário executivo e tabela final consolidada.
- `src/components/aep/ImportAssessmentDialog.tsx` — dialog reutilizável com prop `type: 'hseit' | 'copsoq'`. Carrega avaliações da empresa, computa escores por dimensão (reusando lógica já existente em `HSEITResults.tsx` e `COPSOQResults.tsx`, extraída para libs — ver abaixo), oferece seleção e retorna os fatores importados via callback `onImport(fatores: PartialFator[])`.
- `src/lib/hseitDimensionScoring.ts` — extrai da página `HSEITResults.tsx` a função que calcula os escores por dimensão + faixa de risco (baixo/moderado/alto/muito alto).
- `src/lib/copsoqDimensionScoring.ts` — mesmo para COPSOQ (extraído de `COPSOQResults.tsx`).
- `src/components/aep/ConsolidatedFilterDialog.tsx` — pequeno dialog opcional com checkboxes para o usuário escolher quais AEPs entram no consolidado antes de gerar o PDF.

**Arquivos alterados:**
- `src/pages/AEPDashboard.tsx`:
  - Botão "Baixar AEP Consolidado" no header.
  - Handler que abre o filtro, carrega em paralelo (Promise.all) os fatores/participantes/evidências de todas as AEPs elegíveis e chama `generateAEPConsolidatedReportPDF`.
- `src/components/aep/AEPWizard.tsx` (StepFatores):
  - Dois botões de importação no topo do passo de fatores.
  - Estado local aceita a lista importada e mescla com fatores manuais.
  - Ao salvar a AEP, persiste `source_assessment_type` e `source_assessment_id` em `aep_fatores_avaliados`.
- `src/components/aep/AEPReportPDF.ts` — pequena refatoração para expor as funções de renderização de seção como exports nomeados, sem quebrar a chamada atual `generateAEPReportPDF`.
- `src/integrations/supabase/types.ts` — adicionar as duas novas colunas em `aep_fatores_avaliados`.

## Mapeamento faixa de risco → severity/probability

Escala 1-5 (matriz padrão AEP):

| Faixa da dimensão | severity | probability | Nível AEP resultante |
| --- | --- | --- | --- |
| Baixo               | 1 | 2 | tolerável |
| Moderado            | 3 | 3 | moderado |
| Alto                | 4 | 4 | substancial |
| Muito alto / crítico| 5 | 5 | intolerável |

Somente dimensões em **Alto** ou **Muito alto** aparecem por padrão marcadas no dialog (usuário pode desmarcar/marcar outras).

## Fora do escopo

- Auto-sync contínuo: se a HSE-IT/COPSOQ de origem for atualizada após a importação, o fator AEP **não** é reprocessado automaticamente (usuário precisa importar de novo). Só guardamos referência.
- Importação de dados do Burnout ou Clima (fica para v2 se pedido).
- Assinatura digital ICP-Brasil no consolidado (mantém hash simples como AEP individual).
- Consolidado por período/data — nesta v1 é sempre "todas as AEPs finalizadas da empresa" (opcionalmente filtradas pelo dialog manual).

## Resumo do fluxo

```text
Fluxo Consolidado:
  AEPDashboard → [Baixar AEP Consolidado] → FilterDialog (opt-out por AEP)
      → carrega fatores/participantes/evidências de N AEPs em paralelo
      → generateAEPConsolidatedReportPDF → download PDF único

Fluxo Importação:
  AEPWizard passo 3 → [Importar HSE-IT | Importar COPSOQ]
      → ImportAssessmentDialog lista avaliações finalizadas da empresa
      → seleciona avaliação → mostra dimensões com faixa Alto/Muito alto
      → marca dimensões → [Importar]
      → fatores entram no estado do wizard já com severity/probability sugeridos
      → salvar AEP grava source_assessment_type + source_assessment_id
```
