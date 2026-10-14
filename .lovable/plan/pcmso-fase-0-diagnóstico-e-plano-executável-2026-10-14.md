# PCMSO — Fase 0: Diagnóstico e plano executável

A especificação enviada pede execução em 12 fases (Prompts 0 a 11), uma por vez, com critérios de aceite entre elas. Este plano cobre apenas a **Fase 0**, que é só documentação: nenhuma mudança no banco, nas telas ou no comportamento atual do app.

## O que será entregue

Cinco documentos em `docs/pcmso/`:

1. **architecture.md** — como o PCMSO se encaixa no app atual: reaproveita empresas, login e gestoras; PGR como fonte principal de riscos; LTCAT como evidência complementar; AEP como origem rastreável. Mapa dos pontos de integração (PGR, GHE, trabalhadores, AEP, LTCAT, plano de ação/Kanban, exportação S-2240, controle de módulo beta).
2. **data-model.md** — tabelas novas propostas (prefixo `pcmso_`), quais tabelas existentes são lidas, ordem das migrações (todas aditivas), e plano de migração dos trabalhadores atuais do PGR sem duplicar nem unir por nome.
3. **permissions.md** — quem acessa o quê: gestora SST, empresa, médico responsável atribuído por empresa, admin; separação entre liberação comercial (módulo PCMSO_BETA, desligado por padrão) e autorização clínica; regra de que mudar a empresa na URL nunca concede acesso.
4. **acceptance.md** — critérios de aceite de cada fase (0 a 11), copiados e detalhados da especificação, em formato de checklist.
5. **status.md** — situação de cada fase, recursos por release (A documental, B gestão ocupacional, C clínica, D eSocial/integrações) e dúvidas abertas.

## Dúvidas que ficarão registradas (não presumidas)

- Conferência entre as migrações do projeto e o banco real antes da Fase 1.
- Qualidade atual dos dados de trabalhadores (CPFs, matrículas, duplicidades) — diagnóstico sem expor dados pessoais.
- Quem será o médico responsável do piloto e qual empresa piloto.
- Fluxo de assinatura do ASO e provedor eSocial (ficam para releases C/D).
- Em quais planos o PCMSO será vendido.

## Próximos passos após aprovar

Depois de revisar os documentos, você envia o Prompt 1 (acesso e estrutura do módulo) e seguimos fase por fase.

## Detalhes técnicos

- Leitura do código atual: `pgr_documents`, `pgr_ghe`, `pgr_ghe_workers`, `pgr_risks`, `pgr_action_items`, `aep_*`, `ltcat_*`, `feature_access` + RPC `has_feature_access`, `FeatureGuard`, `RealAuthContext`, `user_companies`, `company_sst_assignments`, exportação S-2240 em `pgr_esocial_exports`.
- Novo flag `PCMSO_BETA` reaproveitando o padrão do `LTCAT_BETA`.
- Papel médico como atribuição por empresa em tabela própria (sem alterar o enum `app_role`).
- Registro de uma linha no `AGENTS.md` sobre a pasta `docs/pcmso` como fonte das decisões do módulo.
