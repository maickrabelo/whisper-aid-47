## Problema

No PDF do PGR, as duas logos do cabeçalho estão vindo de empresas (nenhuma da gestora SST). Isso acontece porque `fetchCurrentSstLogoUrl` em `src/components/pgr/ESocialExportDialog.tsx` mistura a logo da gestora com logos de `companies` (buscadas por `profiles.company_id` do usuário logado e por e-mail), e ainda coloca as `companyCandidates` na frente do registro real do `sst_managers` na ordenação final. Quando o usuário tem qualquer vínculo com uma empresa que possua logo (caso do eng.alberto0808), essa logo de empresa é retornada como "logo da gestora" e ocupa o canto esquerdo. O canto direito então recebe a logo da empresa do PGR — resultado: duas logos de empresa.

## Correção

Reescrever `fetchCurrentSstLogoUrl` em `src/components/pgr/ESocialExportDialog.tsx` para buscar **exclusivamente** a logo da gestora SST, sem qualquer fallback para `companies`.

Regra de resolução da gestora, nesta ordem:

1. Gestora atribuída à empresa do PGR via `company_sst_assignments.sst_manager_id` (fonte da verdade — é a gestora daquele PGR).
2. Se, e somente se, não houver atribuição, cair para a gestora do usuário logado (`profiles.sst_manager_id`, depois `user_sst_managers.sst_manager_id`) — cobre o caso raro de uso administrativo/preview antes da atribuição.

Depois de resolver o `sst_manager_id`, buscar `logo_url` em `sst_managers` e passar por `freshLogoUrl` (cache-buster). Retornar `null` quando a gestora não tiver logo — nunca substituir por logo de empresa.

Remover completamente:
- A consulta a `companies` dentro dessa função (`companyCandidates`, filtros por `email`/`currentProfileCompanyId`).
- A ordenação que promove `companyCandidates` acima do registro do `sst_managers`.

A logo da empresa do PGR continua sendo buscada separadamente em `generatePDF` a partir de `companies` via `pgr.company_id` (canto direito) — esse trecho já está correto e não precisa mudar.

## Verificação

- Conta afetada (eng.alberto0808@gmail.com): gerar PGR e conferir que o canto esquerdo mostra a logo da gestora e o canto direito a da empresa.
- Conta de gestora sem logo cadastrada: canto esquerdo fica vazio, canto direito com a logo da empresa (nunca duplicada).
- Conta de empresa acessando um PGR próprio (sem gestora atribuída): canto esquerdo vazio, direito com a logo da empresa.

## Fora do escopo

Não alterar `renderReportLogos` (`src/lib/pdfLogos.ts`) nem o layout da capa em `PGRReportPDF.ts` — o bug é apenas de resolução da URL da logo da gestora.
