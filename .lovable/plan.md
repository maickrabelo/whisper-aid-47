# LTCAT em Beta Privado

Novo módulo de LTCAT (Laudo Técnico das Condições Ambientais do Trabalho), visível e utilizável **apenas** por `teste.sst@srsms.app`, sobre uma infraestrutura de feature flags reutilizável.

## 1. Infraestrutura de feature flags (base de tudo)

Tabelas novas no banco:

- `feature_flags` — `feature_key`, `enabled`, `beta`, timestamps. Registro inicial: `LTCAT_BETA` (enabled, beta).
- `feature_access` — `feature_key`, `user_id`, `company_id` (opcional), `sst_manager_id` (opcional), `plan_id` (opcional), `enabled`, `valid_from`, `valid_to`. Só o `user_id` de `teste.sst@srsms.app` é cadastrado agora.
- Função `has_feature_access(_user_id, _feature_key)` (security definer) usada por todas as políticas de acesso e pelo backend. Nenhum e-mail comparado em policy, nenhum bypass por perfil admin.
- Hook único no frontend: `useFeatureAccess('LTCAT_BETA')` → `{ allowed, loading }`. Nada de comparação de e-mail espalhada pelo código.

Ninguém consegue se auto-conceder acesso: `feature_access` é gravável apenas por service role (edge functions/admin), leitura restrita ao próprio registro.

## 2. Estrutura de dados do LTCAT

- `ltcat_documents` — empresa, estabelecimento/unidade, versão, status (rascunho/em revisão/publicado), data-base, responsável técnico (nome, CPF, registro/NIT), metodologia, considerações, conclusão, campos de assinatura, vínculo opcional ao PGR de origem.
- `ltcat_avaliacoes` — por GHE/setor/cargo: agente nocivo (catálogo eSocial), tipo (físico/químico/biológico), técnica utilizada (NR-15 Anexos, NHO-01/NHO-06, NR-16), intensidade/concentração medida, unidade, limite de tolerância, tempo de exposição, EPC existente e eficácia, EPI (CA) e eficácia, insalubridade (grau), periculosidade, enquadramento para aposentadoria especial (Decreto 3.048/99 Anexo IV) e código eSocial do fator.
- `ltcat_instrumentos` — instrumentos de medição usados (equipamento, marca/modelo, nº série, calibração).
- `ltcat_anexos` — bucket privado `ltcat-anexos` (certificados de calibração, laudos, fotos).
- `ltcat_audit_log` — auditoria beta: criação, edição, avaliação, conclusão, override, geração de PDF, publicação, divergência, erro, tentativa de acesso negado.
- `beta_feedback` — `feature_key`, `user_id`, `page`, `category` (BUG/UX/LEGAL_RULE/PDF/DATA/PERFORMANCE/SUGGESTION), `description`, `severity`, `resolved`.

Todas as tabelas com RLS exigindo **simultaneamente**: usuário autenticado + vínculo com a empresa/tenant (mesmas funções já usadas hoje: `user_in_company`, `user_manages_company`) + `has_feature_access(auth.uid(), 'LTCAT_BETA')`. A permissão beta não fura o isolamento entre tenants.

## 3. Interface do módulo

- Rota `/ltcat` (hub de seleção de empresa, no mesmo padrão do PGR Hub), `/ltcat/:companyId` (dashboard) e `/ltcat/:companyId/:documentId` (documento).
- Guarda de rota: verifica a flag **antes** de renderizar e antes de qualquer consulta; sem acesso → 404 padrão do projeto (nunca renderizar e depois esconder).
- Selo discreto `BETA` ao lado do título e do item de menu.
- Item de menu/card no dashboard aparece somente com `allowed === true`.
- Abas do documento: Identificação, Estabelecimentos/GHE, Avaliações Ambientais, Instrumentos, EPC/EPI, Conclusão, Assinaturas, Anexos.
- Reaproveitamento de dados: importar GHEs, cargos, setores e riscos do PGR e das AEPs da empresa (mesma abordagem do "Importar da AEP" já existente). Nenhuma escrita automática de volta nos outros módulos — toda ação que impactaria PGR/AEP/psicossocial exibe a consequência, pede confirmação explícita e grava histórico.
- Botão discreto "Enviar feedback do Beta" dentro do módulo.
- Regras não parametrizadas exibem "Regra jurídica não parametrizada. Revisão técnica necessária."; recursos não validados exibem "Funcionalidade em validação beta." Nenhum resultado inventado para destravar o fluxo.

## 4. PDF e eSocial

- Gerador de PDF do LTCAT seguindo o padrão tipográfico já unificado do PGR (mesma fonte, textos justificados, capa com fundo), com quadro de avaliações por GHE, conclusão de insalubridade/periculosidade/aposentadoria especial e bloco de assinaturas (com override manual, reaproveitando `reportSignatures`).
- Matriz de coerência LTCAT × PGR: aponta divergências (agente no PGR sem avaliação no LTCAT, EPI eficaz x enquadramento, etc.), sem corrigir nada automaticamente.
- Exportação/validação de dados para o S-2240 a partir das avaliações (formato XML para download, no mesmo padrão do export existente do PGR). Geração de PDF e export passam pela verificação da flag no backend.

## 5. Backend

- Edge functions do módulo (`ltcat-*`) validam o JWT da sessão, resolvem o `user_id` no servidor e checam `has_feature_access` antes de qualquer operação. Nada é confiado do frontend.
- Anexos: URLs assinadas emitidas apenas por função autorizada; políticas do bucket exigem a flag.
- Nenhuma alteração nas policies, hooks ou rotas dos módulos existentes (PGR, AEP, psicossocial, ouvidoria, clima). Usuários atuais não percebem diferença.

## 6. Verificação

Testes manuais no preview cobrindo os 10 cenários do adendo: acesso liberado para o usuário beta; menu/dashboard limpos para os demais; URL direta, ID conhecido, chamada de API, anexo e troca manual de IDs negados; admin comum sem feature access negado; usuário beta sem vínculo com outro tenant negado; e a flag permanecendo restrita após o deploy.

A liberação geral não acontecerá automaticamente — `LTCAT_BETA` fica restrito até uma solicitação explícita futura.

## Estimativa de créditos

Escopo grande, então proponho entregar em etapas (cada etapa é utilizável e testável):

| Etapa | Conteúdo | Créditos estimados |
|---|---|---|
| 1 | Feature flags + `feature_access` + função + hook + guarda de rota + auditoria + feedback beta | 8 – 12 |
| 2 | Schema LTCAT completo com RLS + hub/dashboard + CRUD de documentos | 12 – 18 |
| 3 | Avaliações ambientais, instrumentos, EPC/EPI, importação de GHE do PGR/AEP | 15 – 22 |
| 4 | PDF do LTCAT + assinaturas + anexos em bucket privado | 12 – 18 |
| 5 | Matriz de coerência LTCAT × PGR + export/validação S-2240 | 10 – 15 |
| 6 | Testes dos 10 cenários beta + ajustes | 5 – 8 |

**Total estimado: 62 – 93 créditos** (faixa média provável ~75). Ajustes de regra jurídica, revisões de layout do PDF e mudanças de escopo pedidas durante o caminho entram fora dessa faixa, tipicamente 2 – 5 créditos por rodada de ajuste.

Se você colar o prompt mestre do LTCAT com as regras técnicas/jurídicas antes de começarmos, eu ajusto as etapas 3 e 5 (que são as mais sensíveis a essas regras) sem custo adicional de replanejamento.
