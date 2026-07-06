## Bug identificado

A edge function `sst-reset-company-password` faz:

```ts
const { data: roleData } = await supabaseAdmin
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .maybeSingle();
```

Só que na base **todo usuário SST tem 2 linhas em `user_roles`** (confirmado: 50+ usuários com múltiplas roles). O `.maybeSingle()` só aceita 0 ou 1 linha — com 2+ retorna erro e `roleData` fica `null`. Como o código ignora esse erro, `authorized` permanece `false` e a função responde **403** ("Acesso negado a esta empresa"), que o cliente exibe como o toast genérico "Erro ao resetar senha".

## Correção

Em `supabase/functions/sst-reset-company-password/index.ts`, trocar o `.maybeSingle()` por uma consulta que retorna todas as roles:

```ts
const { data: rolesData } = await supabaseAdmin
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id);

const roles = (rolesData || []).map(r => r.role);
const isAdmin = roles.includes('admin');
const isSst = roles.includes('sst');
```

E ajustar o bloco de autorização abaixo para usar `isSst` em vez de `roleData?.role === 'sst'`.

Nenhuma outra alteração — o fluxo restante (buscar profile do SST, verificar `company_sst_assignments`, gerar senha, enviar e-mail) continua igual.

## Arquivos alterados

- `supabase/functions/sst-reset-company-password/index.ts` — corrigir consulta de roles.