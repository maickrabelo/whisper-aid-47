
## Objetivo
Permitir que uma AEP cubra vários GHEs mas com **avaliação separada por GHE**: cada item do escopo passa a ter sua própria situação de trabalho, seus fatores e seus participantes. O PDF passa a mostrar uma seção por GHE, e AEPs antigas ganham um botão "Dividir por GHE".

## Estrutura de dados

Não é preciso criar tabela nova. Vamos usar as colunas já existentes:

- `aep_avaliacoes.escopo_json` — passa a guardar por item do escopo também `situacao_trabalho` e `tempId` (identificador estável do bloco).
- `aep_fatores_avaliados` — nova coluna `escopo_ref` (text, nullable). Recebe o `tempId` do bloco de escopo ao qual o fator pertence. Null = fator geral (comportamento antigo).
- `aep_participantes` — nova coluna `escopo_ref` (text, nullable), mesma lógica.

Migração adiciona só as duas colunas nullable + índices simples. Sem quebra de compatibilidade.

## Wizard (`src/components/aep/AEPWizard.tsx`)

Reestruturação do passo 1 e passo 3/4:

- **Passo 1 — Identificação**
  - Cada item do escopo agora expõe: setor, função, CBO, nº trab., GHE vinculado (já existem) **+ campo "Situação de trabalho avaliada"** (textarea) por item.
  - Removemos o textarea único global `situacaoTrabalho`. No submit, gravamos em `escopo_json[i].situacao_trabalho`. Para compatibilidade com o resto do app, `aep_avaliacoes.situacao_trabalho` recebe a concatenação (`"[GHE X] ... \n\n[GHE Y] ..."`).
  - Validação de passo: cada item precisa ter setor, função e situação preenchidos.

- **Passo 3 — Fatores**
  - Acima da lista, um seletor "Bloco (GHE)" com os itens do escopo + opção "Geral (todos)".
  - Cada fator adicionado recebe `escopo_ref` = tempId do bloco atualmente selecionado (ou null se "Geral").
  - Lista de fatores agrupada visualmente por bloco, cada grupo com título "GHE X — Setor / Função".
  - Importações HSE-IT/COPSOQ herdam o bloco atualmente selecionado.

- **Passo 4 — Participantes**
  - Mesma lógica: seletor de bloco + `escopo_ref` gravado por participante.

- **Passo 5 — Revisão**
  - Resumo passa a listar, por bloco: nº fatores, nº participantes, situação avaliada.

## Detalhe (`src/pages/AEPDetail.tsx`) e badges
- Abas "Fatores" e "Participantes" agrupam por bloco de escopo. Fatores sem `escopo_ref` aparecem em "Geral".
- Adicionar/editar fator manualmente também expõe o seletor de bloco.

## PDF

- **`src/components/aep/AEPReportPDF.ts`** — em vez de imprimir uma única "Situação avaliada" e uma lista flat de fatores, iterar o `escopo_json`: para cada bloco, seção com título ("GHE X — Setor / Função / Nº trab."), situação avaliada, fatores desse bloco e participantes desse bloco. Fatores/participantes com `escopo_ref` null caem em uma seção final "Geral".
- **`src/components/aep/AEPConsolidatedReportPDF.ts`** — mesma reorganização por bloco dentro de cada AEP.

## Dividir AEP antiga por GHE

Novo botão "Dividir por GHE" no cabeçalho do `AEPDetail`, visível apenas quando `escopo_json.length > 1`. Fluxo:

1. Diálogo de confirmação listando quantas AEPs serão criadas (uma por item do escopo) e avisando que a AEP original será marcada como `superseded` (status novo permitido: já usamos `revised`; usaremos `revised` + adicionamos texto "dividida em N AEPs" em `methodology_details`).
2. Para cada item do `escopo_json`:
   - Insere nova linha em `aep_avaliacoes` copiando todos os campos gerais, com `escopo_json = [item]`, `ghe_id = item.ghe_id`, `setor_nome/funcao_nome` do próprio item, `situacao_trabalho` = a situação daquele bloco (ou a original se ainda não migrada), `parent_version_id` = id da AEP original, `version = 1`.
   - Copia `aep_fatores_avaliados` cujo `escopo_ref` bata com o `tempId` do item (ou todos, se a AEP antiga não tiver `escopo_ref`).
   - Copia `aep_participantes` com a mesma regra.
   - Evidências permanecem apenas na AEP original (comportamento igual ao "Nova versão").
3. Vínculos com PGR (`aep_pgr_vinculo`) permanecem apontando para a AEP original — não são reatribuídos, para não quebrar histórico.
4. Ao concluir, redireciona o usuário para o `AEPDashboard` mostrando as novas AEPs.

Componente novo: `src/components/aep/SplitAEPByGHEDialog.tsx`. Chamado pelo `AEPDetail`.

## Migração
```
ALTER TABLE public.aep_fatores_avaliados ADD COLUMN escopo_ref text;
ALTER TABLE public.aep_participantes ADD COLUMN escopo_ref text;
CREATE INDEX IF NOT EXISTS idx_aep_fatores_escopo_ref ON public.aep_fatores_avaliados(aep_id, escopo_ref);
CREATE INDEX IF NOT EXISTS idx_aep_participantes_escopo_ref ON public.aep_participantes(aep_id, escopo_ref);
```
Sem alteração em RLS/GRANTs (colunas nullable em tabelas já existentes).

## Arquivos tocados
- `supabase/migrations/<novo>.sql`
- `src/components/aep/AEPWizard.tsx`
- `src/components/aep/AEPReportPDF.ts`
- `src/components/aep/AEPConsolidatedReportPDF.ts`
- `src/pages/AEPDetail.tsx`
- `src/components/aep/SplitAEPByGHEDialog.tsx` (novo)

## Fora do escopo
- Não vamos criar tabelas separadas por bloco nem alterar contratos com o PGR.
- Não vamos re-mapear vínculos antigos AEP→PGR automaticamente na divisão.
