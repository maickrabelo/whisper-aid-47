## Problema

O texto das seções finais do PGR ("PARTE VI — Conclusão e Recomendações": 6.1 Medidas de Engenharia, 6.2 Procedimentos Administrativos, 6.3 Treinamentos, 6.4 Monitoramento, 6.5 EPIs) está **fixo no código** (`src/components/pgr/PGRReportPDF.ts` linhas 870–897). Usuários de setores como comércio recebem bullets que não se aplicam (ex.: "tratamento acústico em equipamentos ruidosos", "exaustão localizada de agentes químicos", "FDS de matérias-primas").

## Solução: tornar essas seções editáveis por PGR

### 1. Banco (migration)
Adicionar colunas de texto opcionais em `pgr_documents`:
- `conclusion_intro` (text) — parágrafo introdutório da Parte VI
- `engineering_measures` (text) — bullets 6.1 (uma por linha)
- `administrative_controls` (text) — bullets 6.2
- `trainings` (text) — bullets 6.3
- `monitoring_text` (text) — parágrafo 6.4
- `epi_text` (text) — parágrafo 6.5

Todas nullable. Quando `null`/vazio, o PDF usa o texto padrão atual (retrocompatível).

### 2. UI — nova aba/card em `PGROverview.tsx`
Novo card "Conclusão e Recomendações (Parte VI do PDF)" com 6 campos `Textarea` pré-preenchidos com os textos padrão atuais. Cada bloco terá uma dica curta ("uma recomendação por linha", "deixe em branco para usar o texto padrão", "não se aplica ao meu setor? apague as linhas que não fazem sentido"). Botão "Restaurar padrão" por campo.

Salvamento no mesmo fluxo do form de identificação já existente (update em `pgr_documents`).

### 3. PDF — `PGRReportPDF.ts`
- Aceitar os novos campos no input do documento.
- Nas seções 6.1–6.3: se o campo estiver preenchido, quebrar por linha (ignorando vazias) e renderizar como bullets. Se vazio, usar os defaults atuais.
- Nas seções 6.4/6.5 e intro: usar texto customizado se houver; senão, default.
- Se o usuário salvar uma seção como string única com apenas um espaço (para "esconder"), não renderizar o subtítulo. (Regra: seção sem itens = não imprime o subtítulo.)

### 4. Retrocompatibilidade
PGRs antigos sem esses campos preenchidos continuam saindo idênticos ao modelo definitivo atual.

## Detalhes técnicos

- Migration adiciona colunas com `DEFAULT NULL`; sem alterações em GRANT/RLS (herda de `pgr_documents`).
- `types.ts` (auto-gerado) será atualizado automaticamente pela Cloud após migration.
- Reaproveita o helper `bullets()` e `paragraph()` já justificados/tipografados no PDF.
- Nenhuma alteração no restante do documento — apenas a Parte VI passa a ser data-driven.

## Fora do escopo

- Não vou tornar editáveis as demais partes do PGR (I–V) nesta iteração — apenas a Parte VI, que é a que traz o texto reclamado. Posso estender se você quiser depois.