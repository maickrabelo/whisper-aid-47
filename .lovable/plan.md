Plano de correção:

1. **Corrigir a duplicata atual da imagem**
   - Consolidar os dois cadastros de `jose.simieli@gmail.com` na gestora SST mais nova, de 29/06.
   - Migrar para ela todos os vínculos possíveis: empresas geridas, perfil, colaboradores, convites, treinamentos, compras de slots e dados relacionados.
   - Remover o cadastro antigo/orfão para não aparecer mais duplicado no Master Dashboard.

2. **Blindar o webhook da Hotmart contra novas duplicatas**
   - Alterar a busca de conta existente para não usar `maybeSingle`, porque quando já existem duplicatas ele pode falhar ou escolher errado.
   - Buscar todas as gestoras/empresas/profiles por e-mail normalizado e escolher sempre a conta mais recente como destino.
   - Antes de ativar o plano comprado, executar uma consolidação automática:
     - mover tudo das contas antigas para a mais nova;
     - cancelar assinaturas antigas/trial;
     - ativar o plano comprado na conta mais recente;
     - resetar senha provisória;
     - enviar o e-mail via Resend com a nova senha;
     - manter empresas, avaliações, PGR, ouvidoria, treinamentos e histórico.

3. **Melhorar a importação JSON do Master Dashboard**
   - Atualizar `import-user-data` para receber o backup e primeiro detectar o e-mail do usuário no JSON.
   - Se já existir conta/gestora com esse e-mail, importar tudo para a conta mais recente, sem criar uma nova gestora duplicada.
   - Reescrever os IDs do backup durante a importação quando necessário:
     - `profiles.sst_manager_id`;
     - `user_sst_managers.sst_manager_id`;
     - `company_sst_assignments.sst_manager_id`;
     - `sst_training_modules.sst_manager_id`;
     - `account_invitations.sst_manager_id`;
     - `sst_extra_slot_purchases.sst_manager_id`.
   - Continuar ignorando erros não críticos/duplicatas e seguir importando o restante, como faço manualmente.
   - Processar em lotes pequenos para backups grandes não quebrarem por timeout.

4. **Adicionar rotina reutilizável de consolidação**
   - Criar dentro das funções uma rotina padrão `merge duplicate SST managers by email`, usada tanto pelo webhook quanto pelo importador.
   - Critério fixo: **a conta mais recente por `created_at` vence**.
   - Campos da conta antiga só serão copiados se estiverem faltando na conta mais nova.
   - Empresas, avaliações e PGR não serão recriados; apenas os vínculos serão apontados para a conta final.

5. **Feedback visual no importador**
   - Atualizar o diálogo “Importar Dados de Usuário” para mostrar:
     - e-mail detectado;
     - conta destino usada;
     - quantidade de duplicatas consolidadas;
     - tabelas importadas;
     - erros ignorados.

6. **Validação final**
   - Conferir no banco que `jose.simieli@gmail.com` ficou com apenas uma gestora SST.
   - Testar/importar um JSON em conta já existente e confirmar que não duplica.
   - Revisar logs do webhook para garantir que compras Hotmart de e-mail existente passam pelo fluxo de upgrade/consolidação, não pelo fluxo de criação nova.