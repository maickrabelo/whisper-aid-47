# PCMSO — plano para deixar o módulo funcional

O módulo continua desligado para todos e só é liberado para a conta/empresa piloto. Cada etapa só começa depois que a anterior passa nos testes de aceite (docs/pcmso/acceptance.md).

## Etapa 1 — Corrigir o que veio do GitHub (bloqueia tudo hoje)
- Voltar a checagem de permissão das telas para a regra oficial da Fase 1 (`pcmso_can`). Hoje ela usa uma tabela de permissões vazia, então todo mundo cai na página "não encontrada".
- Ajustar as regras do banco dos programas e do histórico para aceitar também a Gestora SST que cuida da empresa, e não só quem está cadastrado direto na empresa.
- Desativar a tabela `pcmso_permissions` e a função ligada a ela (marcar como obsoletas, sem apagar).
- Refazer os 21 testes da Fase 1 e acrescentar testes da tela do programa: criar rascunho → enviar para revisão → aprovação médica → aprovado travado para edição.

## Etapa 2 — Cadastros dos trabalhadores (Fase 2)
- Cadastro único de trabalhadores por empresa (nome, CPF, matrícula, função, setor/GHE, admissão), importado dos trabalhadores dos GHEs do PGR com aviso de duplicados e CPF inválido.
- Tela de lista, edição e importação.

## Etapa 3 — Programa e inventário de riscos (Fase 3)
- Programa puxa automaticamente os riscos do PGR e da AEP de cada GHE, com indicação da origem e revisão manual.

## Etapa 4 — Exames e revisão médica (Fase 4)
- Catálogo de exames (admissional, periódico, retorno, mudança de função, demissional) e regras por risco/função, com periodicidade.
- Médico responsável revisa e aprova os protocolos.

## Etapa 5 — Documento PCMSO e ações (Fase 5)
- PDF formal do PCMSO (formato igual aos outros relatórios, com o formatador de nomes/endereços), versão rascunho com marca "BETA", e versão aprovada com assinatura do médico.
- Cronograma de ações editável.

## Etapas seguintes (planejadas, não entram agora)
- Fase 6: convocações e alertas de vencimento de exames.
- Fase 7: prontuário e emissão do ASO.
- Fase 8: relatório analítico anual (grupos pequenos ocultos).
- Fase 9: arquivo do evento S-2220 para o eSocial.
- Fase 11: piloto e homologação.

## O que preciso de você
- Conta e empresa do piloto, e o nome/CRM do médico responsável.
- Confirmar o limite de anonimato do relatório (sugestão: grupos com menos de 5 pessoas ficam ocultos).
- Em quais planos o PCMSO será vendido (pode ficar para depois).

## Detalhes técnicos
- `src/hooks/usePcmsoAccess.ts`: `usePcmsoCan` → RPC `pcmso_can`.
- Migração: recriar policies de `pcmso_programs`/`pcmso_audit_events` com `user_manages_company(auth.uid(), company_id) OR user_belongs_to_company(company_id)`, mantendo `pcmso_can` como condição; `COMMENT ... DEPRECATED` em `pcmso_permissions`/`pcmso_has_permission`.
- Fase 2: tabela `pcmso_workers` (GRANTs + RLS via `pcmso_can`), função de importação de `pgr_ghe_workers` com relatório de qualidade.
- Fases 3–5: tabelas `pcmso_program_risks`, `pcmso_exam_catalog`, `pcmso_exam_rules`, `pcmso_actions`; todas auditadas por `pcmso_audit_trigger`.
- Atualizar `docs/pcmso/status.md` e testes SQL em `docs/pcmso/tests/` a cada fase; verificação de telas via Playwright com conta de teste.
