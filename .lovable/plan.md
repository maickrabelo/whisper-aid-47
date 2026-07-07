## O que vamos entregar

Três ajustes pedidos pelo usuário, agrupados em PGR e AEP:

### 1) PGR — CBO nos cargos do GHE
Hoje o GHE aceita vários cargos (chips), mas sem CBO. Vamos permitir associar um CBO a cada cargo dentro de um GHE. O CBO aparece no PDF do PGR, no eSocial S-2240 e nas telas.

### 2) PGR — Resumo inicial (total de colaboradores e cargos cobertos)
No topo do PGR/PGTR (aba "Visão Geral"), incluir um card com informações consolidadas que hoje o cliente sente falta:
- Total de trabalhadores cobertos (soma dos `worker_count` dos GHEs)
- Lista dos cargos cobertos (com CBO ao lado)
- Nº de GHEs cadastrados
Assim, ao abrir o PGR o usuário vê imediatamente o "quantos colaboradores/quais funções" que o documento cobre.

### 3) AEP — Escopo múltiplo (vários setores/cargos numa mesma AEP)
Este é o item central. Hoje o Passo 1 aceita **um setor + uma função por AEP**, o que forçaria criar uma AEP por colaborador. Vamos reformular o Passo 1 para aceitar um **escopo** com N itens, cada um contendo:
- Setor
- Cargo / função
- CBO (opcional)
- Nº de trabalhadores nesse recorte
- GHE do PGR (opcional)

Com isso, o usuário cria uma única AEP cobrindo, por exemplo, "Produção — Operador (5), Produção — Auxiliar (3), Administrativo — Analista (2)".

O restante do fluxo continua igual: metodologia (Passo 2), fatores/riscos (Passo 3, com importação do HSE-IT/COPSOQ agregando os dados de todos os respondentes — como é o correto pela NR-17), participantes ouvidos (Passo 4, agora com a função do Passo 1 sugerida no select) e assinatura (Passo 5).

## Como fica no banco

Vamos criar duas colunas novas (schema-only, dados existentes preservados):

```text
pgr_ghe:
  + roles_meta  jsonb   -- [{ "role": "Encanador", "cbo": "7241-10" }, ...]
                          (compatível com o campo `role` texto atual)

aep_avaliacoes:
  + escopo_json jsonb   -- [{ "setor": "...", "funcao": "...", "cbo": "...",
                                "worker_count": 5, "ghe_id": "..." }, ...]
                          (setor_nome/funcao_nome continuam preenchidos com
                           o primeiro item, para compatibilidade e resumos)
```

Nenhum dado antigo é apagado. As telas leem `roles_meta`/`escopo_json` quando existirem e caem para o formato antigo quando não existirem.

## Arquivos afetados

- `supabase/migrations/*` — nova migração adicionando `pgr_ghe.roles_meta` e `aep_avaliacoes.escopo_json`.
- `src/components/pgr/GHEManager.tsx` — input de CBO por cargo (par cargo+CBO com botão adicionar/remover).
- `src/components/pgr/PGROverview.tsx` — card "Resumo do escopo" (total trabalhadores, cargos+CBO, nº de GHEs).
- `src/components/aep/AEPWizard.tsx` — Passo 1 reformulado como lista de escopo (setor, cargo, CBO, nº, GHE).
- `src/components/aep/AEPReportPDF.ts` e `AEPConsolidatedReportPDF.ts` — exibir a lista de escopo completa.
- `src/pages/AEPDetail.tsx` — exibir escopo completo (não só o primeiro item).

## Fora de escopo

- Não vamos mudar a lógica de importação psicossocial no Passo 3 — os dados do HSE-IT/COPSOQ representam a percepção coletiva da empresa e é assim que a NR-17 espera que sejam utilizados. Vamos apenas adicionar uma nota curta explicando isso no Passo 3, para tirar a dúvida do usuário.
- Não vamos adicionar um cadastro nominal de "colaborador por colaborador" na AEP; o correto pela NR-17 é escopo por função/setor + participantes ouvidos.
