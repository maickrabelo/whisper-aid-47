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
- [ ] Duas execuções do backfill não duplicam registros.
- [ ] Mudança de função e readmissão mantêm histórico.
- [ ] Referências cruzadas entre empresas recusadas pelo banco.

## Fase 3 — Programa e inventário
- [ ] Editar o PGR gera pendência e não altera conteúdo aprovado.
- [ ] Importação repetida mantém os mesmos vínculos.
- [ ] Empresa errada bloqueada no backend.

## Fase 4 — Protocolos e revisão médica
- [ ] SST prepara mas não aprova sem atribuição.
- [ ] Alterações preservam versão anterior; aprovado bloqueado inclusive por API.
- [ ] Nenhum exame prescrito só por score/IA.

## Fase 5 — Documento e ações (fim da Release A)
- [ ] Versão anterior gera o mesmo conteúdo após mudanças na empresa.
- [ ] Minuta e assinado distintos.
- [ ] Funciona sem prontuário ou eSocial; Kanban sem diagnóstico.

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
