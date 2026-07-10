## Plano de ajuste fino do PDF do PGR

Vou concentrar a correção em `src/components/pgr/PGRReportPDF.ts`, sem alterar dados nem regras do PGR.

### 1. Padronizar fonte, tamanhos e cores
- Criar/ajustar estilos fixos para texto de corpo, subtítulos, títulos, cabeçalho, rodapé, bullets e tabelas.
- Garantir que todo `doc.text(...)` relevante seja precedido por `setText(...)` com fonte `helvetica`, tamanho e cor explícitos.
- Reduzir variações visuais desnecessárias: corpo em cor única, textos auxiliares em cinza consistente, títulos em cor institucional.

### 2. Melhorar justificação sem espaçamento exagerado
- Substituir a justificação manual atual por uma função mais controlada.
- Justificar apenas linhas que tenham comprimento suficiente e espaços razoáveis entre palavras.
- Quando a linha for curta, tiver poucas palavras ou gerar espaçamento excessivo, usar alinhamento à esquerda para manter estética profissional.
- Evitar espaçamento artificial entre caracteres/palavras que deixa o texto “esticado”.

### 3. Aplicar justificação nos textos que ainda ficaram à esquerda
- Revisar chamadas de `paragraph(...)` no corpo do documento.
- Manter à esquerda apenas onde faz sentido: tabelas, bullets, metadados, títulos, rótulos e linhas técnicas curtas.
- Garantir que parágrafos narrativos longos fiquem justificados de forma equilibrada.

### 4. Ajustar capa e CNPJ
- Aumentar o tamanho do CNPJ na capa.
- Manter CNPJ centralizado, com quebra segura se necessário.
- Reorganizar espaçamentos da capa para evitar colisão com CNAE, grau de risco e vigência.

### 5. Revisar visualmente o PDF gerado
- Gerar novamente o PDF da empresa usada como referência.
- Converter páginas em imagens e revisar: capa, início do documento, resumo executivo, inventário, plano de ação e conclusão.
- Corrigir qualquer ocorrência visível de fonte inconsistente, cor fora do padrão, texto desalinhado indevidamente ou justificação exagerada antes de entregar.