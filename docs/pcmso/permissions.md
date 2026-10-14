# PCMSO — Permissões e privacidade (Fase 0)

Autorização = recurso habilitado (`PCMSO_BETA`) **+** vínculo com a empresa **+** atribuição específica **+** ação permitida. A flag sozinha não dá acesso a dados. Vale para RLS, RPCs, Edge Functions, exportações e Storage. Trocar `companyId` na URL nunca concede acesso.

## Matriz
| Perfil | Origem no app | Pode | Não pode |
|---|---|---|---|
| Admin da plataforma | `has_role(admin)` | habilitar flag, suporte | acesso clínico automático |
| Gestora/equipe SST | `role=sst` + `company_sst_assignments` / `user_sst_managers` | dados ocupacionais, preparar programa | aprovar decisão clínica sem atribuição |
| Empresa/RH | `role=company` + `user_companies` | cadastro, solicitações, pendências, ASOs autorizados | resultados, anamnese, diagnóstico |
| Médico responsável | `pcmso_professional_assignments` (função=responsavel) | protocolos, aprovação, análise clínica nas empresas atribuídas | fora do período/empresa atribuída |
| Médico examinador | atribuição função=examinador | atendimentos e ASOs do escopo | aprovar programa sem atribuição adicional |
| Clínica | atribuição explícita | agenda, andamento | resultados sem atribuição |
| Trabalhador | posterior | próprios documentos | — |

## Permissões granulares
`program.prepare`, `program.approve`, `exams.schedule`, `clinical.read`, `clinical.write`, `aso.issue`, `esocial.export`. Atribuições clínicas com validade e revogação imediata. Verificação por função `security definer` (ex.: `pcmso_can`) usada nas políticas.

## Regras
- RLS com negação por padrão; GRANT explícito por tabela.
- Sem views amplas com colunas clínicas; leitura clínica via RPC estreita que registra em `pcmso_audit_events`.
- Caches/queries indexados por empresa+usuário; limpos ao trocar contexto/sair.
- Bucket privado próprio, caminhos com UUID, URL assinada curta pós-autorização; validação de tipo/tamanho. Não reutilizar o portal SST.
- Nunca usar service_role no cliente.
- LGPD: dados de saúde sensíveis; definir finalidade e base legal (não usar consentimento genérico); retenção, backup/restauração testados; cancelamento de assinatura não apaga histórico.
- Flag desligada: bloqueia novas operações; dados preservados.
