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
| 6 | Solicitações e vencimentos | B | Implementada em simulação isolada; operação real aguarda aceite da Release A |
| 7 | Controles clínicos e ASO | B/C | Fluxo simulado implementado/testado; operação clínica real desligada |
| 8 | Relatório analítico | C | Relatório manual estruturado e PDF/revisões testados em simulação; homologação clínica pendente |
| 9 | eSocial S-2220 (export) | D | Download explícito de preparação simulada sem assinatura; ambiente 2, sem transmissão ou homologação |
| 10 | Integrações complementares | D | Pendente |
| 11 | Homologação e piloto | — | Pendente |

## Dúvidas abertas
Exportação externa (23/10/2026): S-2240 do PGR prepara XML individual/ZIP com validações e declarações técnicas explícitas; download e histórico verificados no piloto. S-2220 continua simulado e autorizado somente ao médico do piloto. Nenhum evento foi transmitido ou aceito. Compatibilidade com fornecedor externo e homologação aguardam transmissor escolhido, dados reais autorizados e certificado/autorizações. Evidências e limites: `esocial/README.md`.

1. Conferir migrações do repositório contra o banco real antes da Fase 1.
2. Qualidade dos dados de `pgr_ghe_workers` (CPF, matrícula, duplicidades) — diagnóstico agregado na Fase 2.
3. Cada gestora cadastra seu médico por empresa; validação clínica com médico real ainda pendente. Conta piloto: teste.sst@srsms.app.
4. Assinatura manual externa confirmada; guarda privada de PDF implementada no piloto, autenticidade da assinatura não verificada. Assinatura XML eSocial não implementada; nenhuma transmissão autorizada.
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

## Fase 6 — simulação (23/10/2026)
- Solicitações manuais, prazo/vencimento, agendamento/local, comparecimento administrativo, cancelamento com motivo e histórico preservado.
- Flag independente `PCMSO_EXAMS_BETA`, com acesso apenas para a empresa Demo Maick da conta piloto. Banco exige `simulation=true`; nenhum e-mail/WhatsApp, resultado, aptidão, ASO ou pedido clínico real.
- RPCs idempotentes por chave, empresa e conteúdo; valida trabalhador/protocolo/GHE. Cópia ocupacional/protocolo preservada após mudança de função; protocolos inativos e pedidos encerrados bloqueados.
- Privilégios herdados de escrita foram detectados e explicitamente revogados nas duas tabelas; RLS não autoriza escrita direta. Histórico não pode ser forjado/apagado pela API.
- Testes persistidos: `tests/phase6_pilot.py` (UI criar/agendar/recarregar/cancelar/histórico + API isolada) e `tests/exam_deadline.test.ts`. Validados na sessão autorizada do piloto, sem erros de execução ou transbordamento em 390px. Dados fictícios identificados permanecem como simulação, protocolos fictícios inativos ao final.
- Etapa não homologada para operação real; assinatura documental e validação médica da Release A continuam pendentes. Prontuário/ASO/relatório analítico/eSocial ainda não implementados.

## Fases 7–9 — piloto autorizado (23/10/2026)
- Autorização do usuário: construir em simulação somente no piloto; assinatura manual; sem médico real para homologar; eSocial apenas preparação/download, nunca transmissão.
- Flag adicional `PCMSO_CLINICAL_PILOT` com acesso individual e empresa fixada no backend. A gestora não recebeu atribuição médica permanente. A atribuição fictícia temporária usada em teste foi revogada.
- Registros clínicos append-only, por atendimento/revisão; leitura RPC auditada exclusiva do médico ativo. Nenhum SELECT direto para authenticated/anon nas tabelas clínicas, ASOs, declarações e preparações eSocial. ASO não inclui notas clínicas; snapshot de empresa, trabalhador, procedimentos, protocolo, médico e versão do programa preservado. Correções geram nova revisão, aptidão sempre escolhida manualmente pelo médico do atendimento.
- ASO PDF marcado SIMULAÇÃO/SEM VALIDADE OCUPACIONAL; programa não aprovado explícito. Declaração de assinatura manual simulada append-only: não verifica, guarda nem prova assinatura real. Nenhum prontuário ou arquivo clínico entregue ao RH.
- Resumos anuais imutáveis e revisáveis por médico responsável. Sem filtros por GHE/sexo/doença, sem resultados clínicos ou subtotais sobrepostos. Menos de 5 trabalhadores distintos: todos os totais nulos. Acima do limiar: apenas solicitações/com ASO/sem ASO, sempre incompleto; doenças/CAT/indicadores ausentes permanecem nulos, não zero. Não substitui relatório analítico integral da NR-7.
- S-2220: preparo do `evtMonit`, Tabela 27 oficial, validação de dados obrigatórios, ambiente 2, histórico apenas `preparado_nao_transmitido`. CNPJ do piloto está ausente: download pelo fluxo real é corretamente bloqueado. Teste fictício de XML valida o corpo contra XSD oficial de 01/07/2026; documento inteiro rejeitado por ausência de XMLDSig, sem fabricar assinatura. Assinatura manual de ASO não assina XML.
- Evidências: `phase789_access.py`, `phase789_clinical.py` (UI autenticada: atendimento, aptidão manual, ASO PDF, declaração e resumo persistidos após reload; CNPJ faltante bloqueado); teste transacional com médico fictício/revogação desfeito; `s2220.test.ts`, `s2220_xsd.py` (7 testes JS totais PASS); build OK, zero erros de execução. Fixtures permanentes são exclusivamente simuladas.
- Limites atualizados no complemento abaixo; operação real, assinatura XML, integrações e homologação continuam pendentes/desligadas. Não declarar módulo 100% funcional.

## Complemento de assinatura manual e relatório analítico (23/10/2026)
- Guarda privada de PDF por ASO/programa aprovado: reserva/recibo imutáveis, limite 10 MB, upload sem substituição, SHA-256 declarado conferido no download, nome/caminho UUID sem CPF. Não verifica autenticidade da assinatura. Versões anteriores não reescritas; programa em rascunho recusado. Interface do programa aprovado não exercitada nesta etapa.
- Relatório analítico manual estruturado: período anual, setor/função, população única, contagens por tipos de exame, complementares/resultados alterados, novos casos de doença ocupacional e CAT, percentuais com denominadores, fontes/limitações, análise comparativa declarada, medidas/acompanhamento e discussão com empresa/CIPA. Sem diagnóstico automático; ausência=null. Exames clínicos reconciliados com tipos declarados; contagens inconsistentes recusadas.
- Salvar/ler apenas responsável; bruto clínico sem acesso direto. PDF suprime integralmente grupos, narrativa e totais se população ou qualquer indicador positivo <5. Sem filtros/export bruto para RH e sem proporções reconstrutivas em pequenos grupos. Status preenchido_simulado ou incompleto, nunca homologado/completo juridicamente.
- Teste autenticado `tests/phase789_completion.py`: guarda/reload/download de PDF com bytes iguais; relatório revisão 1 com 10 clínicos, 10 complementares, 5 alterações (50%); CAT ausente cria revisão 2 incompleta; PDF inspecionado. API direta, overwrite/delete e acesso após revogação bloqueados. 13/13 testes unitários PASS, zero erros de execução, build OK. Atribuição fictícia de médico revogada após teste. Fixtures explicitamente simuladas preservadas para demonstração.
- Pendências externas: médico real para homologar conteúdo e assinatura; responsável por política de retenção/base legal; eventual assinatura XML se evento transmissível vier a ser contratado/autorizado. Não há envio ao eSocial e não foi habilitado uso clínico real.
