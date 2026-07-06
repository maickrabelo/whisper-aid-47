Três ajustes independentes nas telas de AEP, PGR PDF e GHE.

## 1) AEP — permitir editar e excluir informações

Hoje, em `src/pages/AEPDetail.tsx`, as abas **Dados**, **Fatores** e **Participantes** só mostram as informações em modo leitura (o único delete existente é para evidências). Vou tornar todos esses conteúdos editáveis:

- **Aba Dados**: adicionar botão "Editar" que abre um diálogo com os campos principais da AEP (setor, função, situação avaliada, data, próxima revisão, metodologias, instrumento, detalhes, anonimato, responsável técnico, cargo, registro). Salva via `UPDATE aep_avaliacoes`.
- **Aba Fatores**: em cada card de fator, adicionar botões **Editar** e **Excluir**.
  - Editar: diálogo com categoria, nome, fonte/causa, grupos expostos, evidência textual, severidade, probabilidade e observações. Salva via `UPDATE aep_fatores_avaliados`.
  - Excluir: confirmação + `DELETE aep_fatores_avaliados` (mais `DELETE aep_pgr_vinculo` do fator, se houver). Se o fator já gerou risco no PGR, avisar que o vínculo será removido mas o risco no inventário permanece (para não quebrar histórico).
- **Aba Participantes**: adicionar botão "Adicionar" e ações de editar/excluir em cada linha.
- Todas as ações só habilitam quando `aep.status` for `draft`, `in_progress` ou `in_review`. Nos status `completed`/`revised`, mostrar aviso "Crie uma nova versão para alterar" (mantém rastreabilidade das AEPs já assinadas).

## 2) PGR PDF — ordenar riscos por categoria

Em `src/components/pgr/PGRReportPDF.ts`, dentro do loop por GHE (linha ~656), os riscos vêm sem ordenação, misturando "acidente / físico / químico / físico...". Vou ordenar `gheRisks` por `category` (ordem canônica: fisico, quimico, biologico, ergonomico, acidente, psicossocial) e depois por `agent_name`, para que na coluna **Cat.** os riscos apareçam agrupados. Nenhuma outra mudança no PDF.

## 3) GHE — múltiplos cargos no mesmo setor

Em `src/components/pgr/GHEManager.tsx`, o campo **Cargo** hoje é um único `<Input>`. Vou trocar por uma UI de múltiplos cargos:

- Input com botão "Adicionar" (e Enter) que empilha cada cargo como uma tag/badge removível.
- Persistência sem migração de schema: armazenar como lista separada por vírgula na coluna `role` existente (ex.: `"Encanador, Auxiliar técnico, Eletricista"`). Ao editar, o valor é dividido de volta em tags.
- Na tabela de listagem, exibir os cargos como badges empilhadas em vez de texto único.
- No PDF do PGR (`Cargo/Função: ...`), continua funcionando normalmente pois já usa `ghe.role` como string.

## Detalhes técnicos

- Arquivos alterados:
  - `src/pages/AEPDetail.tsx` — novos diálogos de edição + ações de excluir; guard por status.
  - `src/components/pgr/PGRReportPDF.ts` — ordenação `gheRisks.sort(...)` antes de montar `rows`.
  - `src/components/pgr/GHEManager.tsx` — componente de tags para o campo `role`; render como badges na tabela.
- Sem alterações de schema, RLS ou migrations.
- Sem mudanças em Edge Functions.
