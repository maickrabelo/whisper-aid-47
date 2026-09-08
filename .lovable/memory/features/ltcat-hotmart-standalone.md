---
name: LTCAT avulso via Hotmart
description: Código de plano Hotmart 1376605 libera o módulo LTCAT (feature LTCAT_BETA) no webhook
type: feature
---

- Plano Hotmart (plan id) `1376605` = venda avulsa do módulo LTCAT. Produto é o mesmo de sempre.
- Mapeado em `hotmart_product_plans` para o plano `ltcat-avulso` ("LTCAT Avulso", category manager, 5 empresas / 500 vidas, sem IA, sem Ouvidoria, sem PGR, visibility hotmart_only).
- `hotmart-webhook`: `LTCAT_HOTMART_PLAN_IDS` + `setLtcatAccess()`.
  - Conta já existente → NÃO troca o plano; apenas grava `feature_access` com `LTCAT_BETA` habilitado.
  - Conta nova → provisiona normalmente com o plano LTCAT Avulso e libera `LTCAT_BETA` ao final.
  - Cancelamento/reembolso desse plano → `LTCAT_BETA` desabilitado.
