# PCMSO — Critérios de aceite

## Fase 0 — Diagnóstico
- [x] Cada recurso proposto tem fonte de dados, responsável de acesso e fase (architecture.md, data-model.md, permissions.md).
- [x] Dúvidas sobre produção identificadas sem presumir migrações aplicadas (status.md).
- [x] Nenhuma alteração de banco ou comportamento.

## Fase 1 — Acesso e estrutura
- [x] Conta sem permissão não acessa por interface nem por API.
- [x] Contas autorizadas veem apenas suas empresas (teste com 2 empresas/perfis).
- [x] Flag desligada impede novas operações.
Evidência: `tests/phase1_access.sql` — 21/21 PASS em 14/10/2026 (transação desfeita).

## Fase 2 — Cadastros e migração
- [x] Duas execuções do backfill não duplicam registros.
- [x] Mudança de função e readmissão mantêm histórico.
- [x] Referências cruzadas entre empresas recusadas pelo banco.
Evidência: `tests/phase2_workers.sql` — 12/12 PASS em 22/10/2026 (transação desfeita).

## Fase 3 — Programa e inventário
- [x] Editar o PGR gera pendência e não altera conteúdo aprovado.
- [x] Importação repetida mantém os mesmos vínculos.
- [x] Empresa errada bloqueada no backend.
Evidência: `tests/phase3_inventory.sql` — 13/13 PASS em 22/10/2026 (transação desfeita); importação validada na conta piloto.

## Fase 4 — Protocolos e revisão médica
- [x] SST prepara mas não aprova sem atribuição.
- [x] Alterações preservam versão anterior; aprovado bloqueado inclusive por API.
- [x] Nenhum exame prescrito só por score/IA.
Evidência: `tests/phase4_protocols.sql` — 20/20 PASS em 23/10/2026, executados pelo canal privilegiado de testes e desfeitos por exceção final. Cadastro, leitura após atualização, histórico e desativação exercitados pela interface na conta piloto, sem erros de execução; validação clínica por médico real ainda pendente.

## Fase 5 — Documento e ações (fim da Release A)
- [x] Versão anterior gera o mesmo conteúdo após mudanças na empresa.
- [ ] Minuta e assinado distintos.
Guarda privada de PDF manual vinculada somente ao programa aprovado implementada; recusada para rascunho. Upload/download do ASO exercitado no piloto. Fluxo de assinatura do programa aprovado ainda não exercitado pela interface, pois não há programa homologado nem médico real: não marcar aceite integral.
- [x] Funciona sem prontuário ou eSocial; quadro de ações sem diagnóstico.
Evidência: `tests/phase5_documents.sql` — 13/13 PASS em 23/10/2026 (transação desfeita); teste do renderizador aprovado sem mutação PASS. Cadastro de ação, histórico, persistência do documento e download BETA exercitados na conta piloto; PDF longo de 4 páginas inspecionado. Minuta BETA e versão aprovada são distintas, mas assinatura digital e registro de documento assinado ainda não implementados: não considerar a Fase 5 homologada integralmente.

## Fase 6 — Solicitações e vencimentos
- [x] Retry não duplica pedidos; cancelamentos no histórico (simulação).
- [x] Mudança de função preserva acompanhamento; sem envio real de e-mail/WhatsApp em dev.
Evidência: `tests/phase6_pilot.py` — fluxo autenticado no piloto (criação, agendamento, leitura após recarregar, cancelamento, histórico), repetição/conflito, isolamento por empresa, API direta bloqueada, histórico protegido, mudança de função, prazo/motivo obrigatórios, protocolo inativo, pedido encerrado, interface/API sem sessão e tela 390px. `tests/exam_deadline.test.ts` — 2/2 PASS; teste anterior do PDF também PASS. Operação exclusivamente simulada com flag separada; aceite médico/assinatura da Release A continuam pendentes e impedem liberação real.

## Fase 7 — Controles clínicos e ASO
- [x] RH/admin sem atribuição não obtêm resultados via API/arquivo (piloto simulado).
- [x] Médico revogado perde acesso; nenhum botão define aptidão sozinho (piloto simulado).
Evidência: `phase789_access.py`, `phase789_clinical.py`, `phase789_completion.py`; atendimento/ASO/declaração persistidos, guarda/download de PDF com mesmos bytes, bloqueio de escrita/leitura direta e overwrite/delete de arquivo. Atribuição fictícia revogada ao final e download/leitura negados. Sem homologação clínica real ou prontuário integral.

## Fase 8 — Relatório analítico
- [x] Reconciliação com totais conhecidos; ausência ≠ zero (contagens declaradas simuladas).
- [x] Correção gera revisão; incompleto não aparece como completo (simulação).
`analyticalReport.test.ts`: limiar 4/5, indicador raro, null, taxa/denominador e imutabilidade. `phase789_completion.py`: 10 clínicos=5 admissionais+5 periódicos, 10 complementares/5 alterações=50% no PDF, zero declarado; retirar CAT cria revisão 2 incompleta sem reescrever revisão 1. Relatório manual inclui setor/função, população, tipos, complementares/alterações, casos/CAT, análise comparativa, fontes, medidas e discussão empresa/CIPA. Homologação NR-7 por médico real e integração clínica automática continuam pendentes.

## Fase 9 — S-2220
- [ ] XSD/regras rejeitam incompletos; arquivo válido verificável.
- [x] Download ≠ transmitido; nenhuma transmissão real na homologação.
Preparação sem XMLDSig: corpo validado contra XSD oficial via `s2220_xsd.py`; documento completo corretamente rejeitado por falta de assinatura XML. `s2220.test.ts` rejeita campos incompletos/códigos fora da Tabela 27. CNPJ ausente no piloto bloqueado pela interface e RPC. Não considerar evento inteiro XSD-válido nem aceito pelo eSocial.

## Fase 10 — Integrações complementares
- [ ] Anonimato preservado, filtros pequenos suprimidos, anexos clínicos ocultos ao RH.
- [ ] Contratos externos com autenticação, idempotência e tratamento de falhas.

## Fase 11 — Homologação e piloto
- [ ] Sem bloqueio crítico de acesso, histórico ou integridade.
- [ ] Validação funcional pelo médico responsável.
- [ ] Itens não homologados desligados; reversão por flag preservando dados.
