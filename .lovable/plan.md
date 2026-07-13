# Ajuste NR-31: nomenclatura PGRTR + orientação para cadastro de riscos

O usuário reportou dois pontos:
1. A sigla correta no seu contexto (NR-31) é **PGRTR** — hoje o sistema exibe "PGTR".
2. Ele já tem um PGRTR vigente e quer entender **como cadastrar os riscos existentes** para migrar/otimizar o processo dentro da ferramenta.

## 1. Trocar a sigla PGTR → PGRTR (somente exibição)

Manter o valor interno `document_type = 'pgtr'` no banco (evita migração de dados e quebras). A mudança é **apenas de rótulo** na UI.

Arquivos a ajustar:

- `src/hooks/usePgrTerminology.ts` — trocar `shortName: 'PGTR'` → `'PGRTR'`, `createButtonLabel: 'Criar PGTR'` → `'Criar PGRTR'`, `emptyStateTitle` e `fullName` ("Programa de Gerenciamento de Riscos do Trabalhador Rural" permanece; NR-31 chama de PGRTR).
- `src/components/pgr/CreateDocumentDialog.tsx` — no card da direita, trocar título "PGTR" → "PGRTR" e ajustar descrição.
- `src/pages/PGRDashboard.tsx` — as chamadas já consomem `term.shortName`; só precisa garantir que o toast de sucesso e o título do documento gerado usem "PGRTR".
- `src/components/pgr/RiskInventory.tsx`, `GHEManager.tsx`, `PGRReportPDF.ts` — trocar quaisquer strings literais "PGTR" para "PGRTR" (rótulos, títulos de PDF, cabeçalhos).

O tipo TypeScript `PgrDocType = 'pgr' | 'pgtr'` continua igual (identificador interno).

## 2. Orientar como cadastrar riscos já existentes

Adicionar um card informativo/expansível no topo do **Inventário de Riscos** (`RiskInventory.tsx`), exibido enquanto ainda houver poucos/nenhum risco cadastrado ou sob demanda ("Como migrar meu PGRTR atual?"). O conteúdo cobre o passo a passo:

1. Ir em **GHERs** e cadastrar os grupos homogêneos (setores/funções) do PGRTR atual.
2. Voltar em **Inventário** → **Adicionar risco**, escolhendo o GHER, o agente (catálogo NR-31 já integrado), severidade, probabilidade e magnitude.
3. Para riscos com controles já implantados, preencher os campos de controle existente e evidências.
4. Após terminar, ir em **Plano de Ação** para migrar/registrar as ações que já estão em andamento.

Texto curto, em pt-BR, com ícone informativo e link "Fechar" (persistir dispensa em `localStorage` por documento).

## Fora de escopo

- Não alterar o enum/valor do banco (`pgtr`).
- Não criar importador em massa de riscos agora — o pedido do usuário é orientação; se ele quiser CSV/importação, tratamos em pedido separado.
