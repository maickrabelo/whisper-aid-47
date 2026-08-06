# Pixel de anúncios do ChatGPT + evento de assinatura (server-side)

Sim, é possível — inclusive com a compra concluída na Hotmart. A conversão não é medida pelo navegador (o usuário sai do nosso site), e sim pelo backend: quando o webhook da Hotmart confirma a compra, o servidor envia o evento `subscription_created` para a Conversions API da OpenAI.

## O que será feito

### 1. Pixel no site (navegador)
- Adicionar o script de configuração do pixel OpenAI (`oaiq`) no `index.html`.
- Criar um helper `src/lib/openaiPixel.ts` com `oaiqTrack(evento, dados)`.
- Rastrear troca de rota (SPA) igual já é feito com o Meta Pixel, via um componente `OpenAIPixelRouteTracker`.
- Disparar eventos de topo/meio de funil no navegador: lead nos formulários de teste/demo e `InitiateCheckout` quando o usuário é enviado para o checkout Hotmart.

### 2. Atribuição do clique até a Hotmart
- Ao entrar no site, capturar os parâmetros de anúncio da URL (ex.: `oai_*`/`utm_*`) e guardar em `localStorage` por 30 dias.
- Ao enviar o usuário para o checkout Hotmart, anexar esses parâmetros como parâmetros de rastreio (`sck`/`src`) da própria Hotmart, para que voltem no webhook.
- Registrar também esses parâmetros nos leads criados no site (quando existe e-mail), servindo como fallback de atribuição por e-mail.

### 3. Evento de conversão server-side
- Nova função compartilhada `supabase/functions/_shared/openai-capi.ts` que faz o POST em `https://bzr.openai.com/v1/events?pid=5suuVCixrwGcmkDPzEfVe9` com `Authorization: Bearer <chave>`.
- Chamada em `hotmart-webhook` nos eventos aprovados (`PURCHASE_APPROVED` / `PURCHASE_COMPLETE`), enviando `type: "subscription_created"`, `data.type: "plan_enrollment"`, valor/plano, `id` (event id = id da transação Hotmart, garantindo deduplicação e evitando duplicidade em reenvios) e os identificadores de atribuição recuperados.
- Mesma chamada em `asaas-webhook` (pagamento confirmado) e em `purchase-extra-*`, se você quiser contar essas assinaturas também — confirme abaixo.
- Falha na chamada nunca quebra o provisionamento: erro só vai para log.

### 4. Chave da API
A chave que você colou no chat ficou truncada/misturada com outro texto, então não posso usá-la como está. Vou pedir a chave em um formulário seguro (ela fica guardada como segredo do backend, nunca no código). Também recomendo revogar a chave colada no chat e gerar uma nova, já que ela ficou exposta em texto.

## Detalhes técnicos
- Segredo: `OPENAI_ADS_CAPI_KEY` (via formulário seguro).
- `pid` do pixel: `5suuVCixrwGcmkDPzEfVe9` (público, fica no código).
- Deduplicação: mesmo `event_id` no navegador e no servidor quando o evento existir nos dois lados.
- `timestamp_ms` em ms, `action_source: "web"`, `source_url` com a URL pública do app.
