## Objetivo

Padronizar a tipografia do PDF do PGR (`src/components/pgr/PGRReportPDF.ts`) para atender às regras solicitadas e corrigir a quebra de palavra na primeira coluna das tabelas de riscos.

## Regras tipográficas a aplicar

Três estilos únicos que valem para todo o miolo do documento (capa e chrome de cabeçalho/rodapé permanecem como estão — são elementos de display, não fazem parte do "corpo"):

- **Título de seção** — 13pt, **negrito**, azul-escuro (`COLORS.primary`, RGB 30/58/138). Aplicado a `PARTE I…VI`, `Identificação da Empresa`, `Resumo Executivo`.
- **Subtítulo** — 11pt, **negrito**, cor do texto padrão. Aplicado a todos os `subTitle(...)`: `1.1 Introdução`, `Empregador`, `SESMT`, `GHE: …`, `Matriz N×N`, `6.1 …`, etc.
- **Corpo** — 10pt, regular, cor do texto padrão. Vale para parágrafos, bullets, metadados de GHE ("Setor: … • Cargo: …"), rótulo "Atividades por função:", legendas de assinatura, texto vazio ("Nenhum GHE cadastrado…"). Tudo unificado.

Exceções mantidas (não fazem parte do corpo textual):
- **Tabelas** — mantêm 8.1pt para caber o conteúdo denso (esta é a única concessão; caso contrário nenhum inventário caberia). É o padrão único de "texto de tabela".
- **Matriz de risco / eixos / legenda** — visual próprio (mantém 7.5–8pt e 10pt no número da célula).
- **Rodapé/cabeçalho de página e capa** — mantêm seus tamanhos atuais (elementos de chrome/display).

## Mudanças no arquivo

### 1. Substituir o objeto `TYPE` (linhas 108–116)

```ts
const TYPE = {
  body: 10,       // único tamanho de corpo (parágrafos, bullets, metadados, listas)
  table: 8.1,     // exclusivo de tabelas
  caption: 8,     // rodapé, cabeçalho de página, legenda da matriz
  subtitle: 11,   // todos os subtítulos — sempre negrito
  section: 13,    // todos os títulos de seção — sempre negrito + azul
};
```

Remover as chaves `bodySmall` e `bullet` para eliminar a possibilidade de variação.

### 2. Forçar negrito nos títulos e subtítulos (linhas 211–229)

- `sectionTitle`: trocar `setText(TYPE.section, false, COLORS.primary)` → `setText(TYPE.section, true, COLORS.primary)`.
- `subTitle`: trocar `setText(TYPE.subtitle, false, COLORS.text)` → `setText(TYPE.subtitle, true, COLORS.text)`. Ajustar o `state.y += 5.5` para `6.5` para respirar o negrito 11pt.

### 3. Bullets no tamanho do corpo (linhas 263–275)

Substituir `TYPE.bullet` por `TYPE.body` nos dois `setText` da função `bullets`. Recalibrar `lineH` (`4.5 → 4.8`) para ficar consistente com o parágrafo 10pt.

### 4. Remover overrides pontuais de tamanho no miolo

Todas essas chamadas deixam de passar `size`, herdando o corpo padrão de 10pt:
- Linha 712: `paragraph('Nenhum GHE cadastrado até o momento.', { size: 9 })` → sem `size`.
- Linha 722: `paragraph(meta, { size: TYPE.bodySmall, align: 'left' })` → `paragraph(meta, { align: 'left' })`.
- Linha 731: `setText(TYPE.bodySmall, false, COLORS.text)` (rótulo "Atividades por função:") → `setText(TYPE.body, true, COLORS.text)` (mini-rótulo em negrito, mesmo tamanho do corpo).
- Linha 748: cabeçalho UPPERCASE de função dentro do GHE (`setText(TYPE.bodySmall, true, COLORS.primary)`) → passa a usar o estilo de subtítulo: `setText(TYPE.subtitle, true, COLORS.text)` para respeitar a regra "1 tamanho de subtítulo, negrito". Ajustar o `state.y += 4.5` para `6`.
- Linha 757: `paragraph(..., { size: TYPE.bodySmall })` → sem `size`.
- Linha 764: `paragraph('— Sem riscos… —', { size: TYPE.bodySmall, align: 'left' })` → sem `size`, mantendo `align: 'left'`.
- Linha 829: `paragraph('Nenhuma ação cadastrada até o momento.', { size: 9 })` → sem `size`.

### 5. Assinatura (linhas 893–900)

- Linha 893 (nome): `setText(9.5, ...)` → `setText(TYPE.body, false, COLORS.text)`.
- Linha 895 (CPF/registro): `setText(8.5, ..., COLORS.muted)` → `setText(TYPE.caption, false, COLORS.muted)` (caption 8pt para caber; é rodapé de assinatura).
- Linha 900 ("Responsável Técnico"): idem — usa caption.

### 6. Corrigir quebra de palavra na 1ª coluna das tabelas de riscos (linha 819)

Categoria com valor mais longo é `psicossocial` (12 caracteres). Com 14mm − 3mm de padding sobra 11mm, forçando quebra. Ajustar larguras somando 174mm (= `CONTENT_W`):

```ts
[26, 30, 18, 16, 14, 20, 22, CONTENT_W - 26 - 30 - 18 - 16 - 14 - 20 - 22]
// = [26, 30, 18, 16, 14, 20, 22, 28]
```

- 1ª col. sobe de 14 → **26mm** (garante `psicossocial` numa linha só a 8.1pt, com folga).
- `Agente` mantido em 30mm (era 32); `Fonte` mantida em 18mm (era 20); `Medição` 16mm (era 18); `Limite` 14mm (era 16); coluna `Controles` fica com 28mm.
- Somatório final = 174mm = `CONTENT_W`. ✅

Nenhuma outra tabela precisa mudar.

## Fora do escopo (mantido)

- Capa (tipografia de display: 36/18/14/13/10/9pt) — permanece como está.
- Cabeçalho e rodapé de página — permanecem em `TYPE.caption`.
- Matriz de risco (rótulos dos eixos, números das células, legenda) — permanece como está.
- Nenhuma alteração em cores fora dos títulos.

## Verificação

Após aplicar, revisar visualmente: capa → identificação → parte I → subtítulos ("Empregador", "SESMT" etc.) → parte IV com tabelas de riscos (checar 1ª coluna com "Psicossocial", "Ergonômico", "Biológico") → assinatura. Todos os textos de corpo devem estar num único tamanho; todos os títulos em negrito + azul; todos os subtítulos em negrito.
