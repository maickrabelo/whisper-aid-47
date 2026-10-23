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
- [x] Funciona sem prontuário ou eSocial; quadro de ações sem diagnóstico.
Evidência: `tests/phase5_documents.sql` — 13/13 PASS em 23/10/2026 (transação desfeita); teste do renderizador aprovado sem mutação PASS. Cadastro de ação, histórico, persistência do documento e download BETA exercitados na conta piloto; PDF longo de 4 páginas inspecionado. Minuta BETA e versão aprovada são distintas, mas assinatura digital e registro de documento assinado ainda não implementados: não considerar a Fase 5 homologada integralmente.

## Fase 6 — Solicitações e vencimentos
- [ ] Retry não duplica pedidos; cancelamentos no histórico.
- [ ] Mudança de função preserva acompanhamento; sem envio real de e-mail/WhatsApp em dev.

## Fase 7 — Controles clínicos e ASO
- [ ] RH/admin sem atribuição não obtêm resultados via API/arquivo.
- [ ] Médico revogado perde acesso; nenhum botão define aptidão sozinho.

## Fase 8 — Relatório analítico
- [ ] Reconciliação com totais conhecidos; ausência ≠ zero.
- [ ] Correção gera revisão; incompleto não aparece como completo.

## Fase 9 — S-2220
- [ ] XSD/regras rejeitam incompletos; arquivo válido verificável.
- [ ] Download ≠ transmitido; nenhuma transmissão real na homologação.

## Fase 10 — Integrações complementares
- [ ] Anonimato preservado, filtros pequenos suprimidos, anexos clínicos ocultos ao RH.
- [ ] Contratos externos com autenticação, idempotência e tratamento de falhas.

## Fase 11 — Homologação e piloto
- [ ] Sem bloqueio crítico de acesso, histórico ou integridade.
- [ ] Validação funcional pelo médico responsável.
- [ ] Itens não homologados desligados; reversão por flag preservando dados.
