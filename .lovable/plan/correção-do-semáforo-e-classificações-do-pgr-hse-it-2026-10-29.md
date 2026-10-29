# Correção do semáforo e classificações do PGR HSE-IT

## Diagnóstico confirmado
- **Cálculo está correto.** As questões negativas são invertidas (6 − nota), então 5 é sempre favorável. Os resultados usam: 3,67+ favorável, 2,33–3,66 intermediário, abaixo de 2,33 risco. Por isso Papel/Cargo 4,57 aparece como Tolerável, corretamente.
- **Erro 1, na seção 4.4:** só o texto da legenda está invertido no PDF ("Verde abaixo de 2,33... Vermelho 3,67 ou mais"). As cores e as classificações não usam esse texto.
- **Erro 2, na seção 4.3:** a tabela de 5 níveis (Muito Baixo a Muito Alto, com cortes 4,20/3,40/2,60/1,80) aparece apenas no texto. Nenhum gráfico, tabela, inventário ou plano de ação usa essa tabela. Todo o relatório segue os 3 níveis. É daí que vem a divergência do 3,64.

## O que será feito (somente HSE-IT, PGR)
1. Corrigir a legenda 4.4 para: Verde de 3,67 a 5,00, Amarelo de 2,33 a 3,66 e Vermelho abaixo de 2,33.
2. Substituir a tabela 4.3 de 5 níveis por uma tabela única de 3 níveis. Ela vai casar cada faixa com o que o relatório realmente usa:
   - 3,67–5,00: Favorável / Severidade Baixa / Improvável / Tolerável
   - 2,33–3,66: Intermediário / Moderada / Possível / Moderado
   - abaixo de 2,33: Risco / Alta / Provável / Intolerável
   A seção 4.4 passa a ser só a explicação das cores, sem limites diferentes.
3. Fazer a legenda, a severidade, a probabilidade e a classificação usarem os mesmos limites de `getHealthImpact`. Assim os números não ficam escritos em lugares diferentes e não voltam a divergir.
4. Conferir o relatório HSE-IT comum (não PGR) e os gráficos e telas de resultados para achar algum texto de legenda invertido, e corrigir só o texto.
5. Criar um teste que confirma:
   - a inversão das questões negativas;
   - os limites 3,67 e 2,33 (3,64 é intermediário, 4,57 é favorável, 2,32 é risco);
   - que a legenda do PDF segue esses limites.
6. Gerar o PDF PGR HSE-IT com os dados da Ipê Engenharia e conferir as páginas 5 a 7.

## Fora do escopo
- O COPSOQ II e as outras metodologias não mudam.
- Os cálculos e resultados existentes não mudam: só os textos explicativos são corrigidos. Os relatórios já baixados precisam ser gerados de novo para sair corrigidos.

## Detalhes técnicos
- Arquivo principal: `src/components/hseit/HSEITPGRReportPDF.tsx` (seções 4.3/4.4 e as funções `getSeverity`/`getProbability`).
- Os limites ficam em uma constante exportada de `src/data/hseitQuestions.ts`.
