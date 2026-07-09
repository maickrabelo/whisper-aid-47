
## Objetivo

Refinar a geração do PDF do PGR em `src/components/pgr/PGRReportPDF.ts` para padronizar tipografia, aplicar justificação, corrigir a capa, estruturar atividades por GHE em bullets, traduzir termos técnicos e garantir que todos os GHEs cadastrados apareçam no inventário.

Todas as mudanças ficam concentradas no gerador de PDF (`PGRReportPDF.ts`) e no carregamento de GHEs em `ESocialExportDialog.tsx` (fonte dos dados que alimenta o PDF).

---

## 1. Padronização de fonte

Hoje algumas células de tabela (após o Resumo Executivo) e a legenda de matriz alternam pesos sem resetar explicitamente a família para `helvetica`. Vou:

- Centralizar todas as chamadas em um helper `setText` (já existe) e garantir que **toda** rotina de desenho (header/footer/legenda/matriz/tabela) chame `setText` antes de `doc.text`, sem depender do estado anterior.
- Auditar os pontos onde `doc.setFont(...)` é chamado sem `helvetica` explícito (dentro de `table.drawHeader` e legenda da matriz) e forçar `helvetica` em todos.

Resultado: uma única família Helvetica em todo o documento, sem "quebras" visuais.

## 2. Alinhamento justificado

A função `paragraph()` hoje quebra linhas com `splitTextToSize` e imprime cada linha à esquerda. Vou substituir por `doc.text(lines, x, y, { align: 'justify', maxWidth: CONTENT_W })` (suportado pelo jsPDF) para justificar o corpo do texto. A última linha permanece alinhada à esquerda (comportamento nativo). Títulos, bullets e células de tabela ficam como estão.

## 3. Capa: CNPJ e CNAE legíveis

Hoje CNPJ (y=140) e a linha "CNAE • Grau de Risco" (y=148) são desenhados como texto de linha única centralizada — se o CNAE for extenso, corta. Vou:

- Aumentar o espaçamento vertical entre nome da empresa (y=120) e bloco de metadados.
- Renderizar CNPJ e "CNAE • Grau de Risco" em duas linhas separadas com `splitTextToSize` para garantir wrap quando necessário.
- Reposicionar o bloco de vigência (y=170→y=180) para não colidir com o wrap.

## 4. Atividades por GHE em bullets

Hoje `paragraph('Atividades: ' + ghe.activities_description)` imprime um único bloco corrido. Vou:

- Detectar separadores no campo `activities_description` (quebras de linha `\n`, `;`, `•`, ou o padrão "Função X:" / "Cargo:").
- Renderizar cada atividade/função como um item de `bullets([...])`, prefixado pela função quando identificável (ex.: `Almoxarife — recebe e confere materiais...` vira um bullet, `Auxiliar de Almoxarife — ...` outro).
- Fallback: se não houver separador identificável, mantém como parágrafo justificado (comportamento antigo).

## 5. Tradução dos níveis de risco

No inventário (`PGRReportPDF.ts` linha ~697), a célula "Risco" imprime `(r.risk_level || '').toUpperCase()`, resultando em `TOLERABLE`, `MODERATE`, `SUBSTANTIAL`, `INTOLERABLE`, `TRIVIAL`. Vou adicionar um dicionário local reutilizando o já existente em `RiskInventory.tsx`:

```text
trivial      → TRIVIAL
tolerable    → TOLERADO
moderate     → MODERADO
substantial  → SUBSTANCIAL
intolerable  → INTOLERÁVEL
```

Também vou revisar labels de probabilidade/severidade — se aparecer "Improbable" em algum ponto (a busca inicial não encontrou; provavelmente é interpretação do "Tolerable" pelo usuário, mas checarei também o campo `magShort` e legendas).

## 6. GHEs faltando no PDF (bug)

Ao investigar em `ESocialExportDialog.tsx` (que monta `input.ghes` para o PDF) preciso verificar:

- Se há `.limit()` ou paginação implícita no `supabase.from('pgr_ghe').select(...)`.
- Se o filtro por `pgr_document_id` está correto (revisões antigas podem ter GHEs órfãos).
- Ordenação estável por nome/setor.

Fix esperado: remover qualquer `limit`, adicionar `order('name')`, e garantir que a query traga todos os GHEs vinculados ao `pgr.id` atual. Se o problema for RLS, revisar policy de `pgr_ghe` para SELECT.

---

## Arquivos alterados

- `src/components/pgr/PGRReportPDF.ts` — itens 1, 2, 3, 4, 5
- `src/components/pgr/ESocialExportDialog.tsx` — item 6 (query de GHEs)

## Validação

Após implementar, vou gerar um PDF de teste via Playwright usando um PGR existente (Sisal Estilo) e:

1. Converter para imagens com `pdftoppm` e inspecionar visualmente capa + parágrafos justificados + tabela de riscos traduzida.
2. Contar GHEs no PDF vs. count no banco (`pgr_ghe` por `pgr_document_id`) para confirmar que todos aparecem.
3. Conferir que a fonte é uniforme em todas as páginas.
