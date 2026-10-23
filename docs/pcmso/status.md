# PCMSO — Status

Atualizado: 23/10/2026

| Fase | Descrição | Release | Status |
|---|---|---|---|
| 0 | Diagnóstico e plano | — | Concluída |
| 1 | Acesso e estrutura | A | Concluída (flag desligada em produção) |
| 2 | Cadastros e migração | A | Concluída (22/10/2026) |
| 3 | Programa e inventário | A | Implementada; validação médica do piloto pendente |
| 4 | Protocolos e revisão médica | A | Implementada; validação médica do piloto pendente |
| 5 | Documento e ações | A | PDF e ações implementados no piloto; assinatura/homologação pendentes |
| 6 | Solicitações e vencimentos | B | Pendente |
| 7 | Controles clínicos e ASO | B/C | Pendente |
| 8 | Relatório analítico | C | Pendente |
| 9 | eSocial S-2220 (export) | D | Pendente |
| 10 | Integrações complementares | D | Pendente |
| 11 | Homologação e piloto | — | Pendente |

## Dúvidas abertas
1. Conferir migrações do repositório contra o banco real antes da Fase 1.
2. Qualidade dos dados de `pgr_ghe_workers` (CPF, matrícula, duplicidades) — diagnóstico agregado na Fase 2.
3. Cada gestora cadastra seu médico por empresa; validação clínica com médico real ainda pendente. Conta piloto: teste.sst@srsms.app.
4. Fluxo de assinatura do ASO (Release C) e provedor eSocial (Release D).
5. Planos comerciais que incluirão o PCMSO.
6. Limiar de anonimato confirmado: grupos com menos de 5 pessoas ocultos.
7. Política de retenção e base legal (com responsável de privacidade).

## Fase 1 — entregue
- Flag `PCMSO_BETA` criada **desligada** (global). Liberar exige: ligar a flag e conceder `feature_access` ao usuário.
- Política de flag desligada: todas as leituras e escritas do módulo retornam vazio/negado; dados preservados.
- Tabelas: `pcmso_professional_assignments`, `pcmso_programs`, `pcmso_audit_events`.
- Funções: `pcmso_can(company, permissão)`, `pcmso_accessible_companies()`, `pcmso_has_clinical_assignment`.
- Admin gerencia atribuições, mas não ganha acesso clínico; SST prepara, não aprova.
- Rotas: `/pcmso` (FeatureGuard) e `/pcmso/empresa/:companyId` (404 sem `program.view`). Atalho no painel SST só com flag liberada.

## Correção pós-GitHub (21/10/2026)
- `usePcmsoCan` voltou a usar `pcmso_can` (a `pcmso_permissions` ficou vazia e bloqueava todos).
- Policies de `pcmso_programs`/`pcmso_audit_events` passaram a usar `pcmso_can` (inclui Gestora SST e médico; respeita a flag). Sem DELETE.
- `pcmso_permissions` e `pcmso_has_permission` marcadas DEPRECATED.

## Fase 2 — entregue (22/10/2026)
- Tabelas `pcmso_workers` (único por empresa+CPF), `pcmso_worker_history` (admissão, mudança de função, desligamento, readmissão), `pcmso_worker_import_map`.
- RPC `pcmso_import_pgr_workers(company, dry_run)`: prévia antes de gravar, idempotente, une só por CPF, rejeita CPF inválido.
- RPC `pcmso_worker_event`: fecha o vínculo atual e abre novo, sem apagar histórico.
- Tela: quadro "Trabalhadores" na página da empresa (CPF mascarado).

## Fase 3 — inventário (22/10/2026)
- Cópia integral do PGR, GHEs e AEPs da mesma empresa em `pcmso_source_snapshots`, com hash e identificação das origens; vínculos por UUID, nunca por nome.
- Importação explícita e idempotente; fatores AEP já ligados a riscos do PGR não são duplicados na lista.
- Mudanças nas fontes geram `pcmso_change_requests`; aprovação e arquivamento impedem edição da cópia pela API.
- Revisão manual com observações auditadas em `pcmso_inventory_reviews`, sem modificar a fonte.
- Testes transacionais: 13/13 PASS; dados fictícios desfeitos. Importação exercitada no programa piloto.
- Nesta etapa não foram implementados assinatura, protocolos ou PDF.

## Fase 4 — protocolos (23/10/2026)
- Catálogo de exames por empresa e protocolos manuais para admissão, periódico, retorno, mudança de riscos e demissão; periodicidade, grupo/função, risco da cópia, justificativa e observações.
- SST prepara em rascunho; protocolos ficam bloqueados em revisão. Retorno a rascunho para ajustes; somente médico responsável com atribuição ativa e nome/CRM/UF completos aprova.
- Aprovação exige fonte importada, revisão do inventário atual, protocolos ativos e nenhuma pendência de origem ou protocolo desatualizado. Não é assinatura digital, nem prescrição automática.
- Captura imutável da empresa, fontes, revisão, protocolos e médico na aprovação; histórico append-only das alterações de protocolos.
- Nova revisão idempotente preserva o aprovado, atualiza fontes disponíveis e copia protocolos ainda compatíveis; revisão do inventário precisa ser feita novamente.
- 20/20 testes de acesso, revisão e integridade PASS, transação desfeita; privilégio de escrita do histórico foi explicitamente removido após teste inicial detectar concessão prévia.
- Interface testada na conta piloto: cadastro periódico de 12 meses, histórico e desativação após recarregar; exame fictício permanece inativo e identificado como teste. Sem erros de execução e sem transbordamento horizontal na tela estreita.
- Aprovação/revisão médica exercitada com usuários fictícios pelo backend, não com médico real pela interface. Homologação clínica e Fase 5 (PDF/ações) pendentes. Liberação segue restrita ao piloto.

## Fase 5 — documento e ações (23/10/2026)
- Vigência, objetivos, responsabilidades, fluxo de urgência e acompanhamento editáveis no rascunho, preservados na aprovação e copiados na próxima revisão.
- Ações preventivas com responsável, prazo e situação; cronograma e quadro por situação, confirmação de conclusão/cancelamento ao editar e histórico append-only. Sem campos de trabalhador, resultado clínico ou diagnóstico. Não escreve no plano do PGR.
- RPC autorizada `pcmso_document_payload` fornece minuta do rascunho ou conteúdo integral aprovado; exportação antiga não consulta cadastros atuais. Flag desativada e ausência de vínculo bloqueiam a exportação.
- PDF A4 paginado: identificação, vigência, objetivos, fontes e GHEs, riscos/fatores AEP, protocolos, ações e responsável médico. Compartilha normalização de endereços/setores e proteção de texto.
- Minuta marcada BETA/não aprovada; aprovado marcado assinatura pendente, com médico/CRM/data e hash. Aprovação não equivale a assinatura; não existe upload, verificação ou guarda de documento assinado nesta entrega.
- 13/13 testes de integridade/acesso PASS com dados fictícios desfeitos. Teste do renderizador sem mutação PASS. Cadastro de ação, histórico, documento salvo e download exercitados pelo navegador no piloto, sem erros ou transbordamento horizontal. PDF com 12 GHEs e textos longos gerou 4 páginas.
- Objetivo e ação fictícios identificados como teste permanecem no rascunho piloto. Não representam orientações médicas reais.
- Bloqueios para aceite integral: assinatura documental e homologação pelo médico cadastrado pela gestora; fases clínicas e eSocial permanecem desligadas. Não declarar o módulo 100% funcional.
