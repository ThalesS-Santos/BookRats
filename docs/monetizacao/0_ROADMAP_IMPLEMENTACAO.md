# Roadmap de Implementacao da Monetizacao — BookRats

## Objetivo deste documento

Este e o roteiro operacional (passo a passo) para implementar a monetizacao do BookRats
em cima da arquitetura que ja existe (Firebase/Firestore + Zustand + Expo/React Native).
Os documentos `1_assinaturas_premium.md` a `5_parcerias_editoras.md` descrevem **o que**
construir (specs de produto/negocio); este documento descreve **como**, **em que ordem**,
**onde no repositorio** cada peca entra, e **como proteger** o sistema contra fraude,
vazamento de dados e ataques.

Formato: fases -> etapas numeradas. Cada etapa e pequena o suficiente para virar um
commit/PR isolado. Nao pule etapas de seguranca — elas sao o que separa um app amador de
um app que pode processar dinheiro real.

Decisao ja tomada (ver `CLAUDE.md`): **mantemos Firebase/Firestore**. Nao ha migracao para
SQL. Todo o roteiro abaixo assume Firestore + Cloud Functions como backend.

---

## Principio arquitetural nao-negociavel

> **O cliente (app) nunca escreve diretamente em campos financeiros/premium.**
> Toda escrita de `subscription`, `wallet.balance`, `coin_ledger`, `entitlements` etc.
> acontece **exclusivamente** via Cloud Functions autenticadas por webhook assinado
> (RevenueCat/Stripe/AdMob SSV) ou via `Callable Function` autenticada pelo Firebase Auth
> com regra de negocio no servidor. O Firestore Rules bloqueia essas escritas vindas do
> SDK client-side, mesmo que alguem descompile o app e tente forjar requests.

Isso e o que evita: usuario dar `premium: true` em si mesmo pelo DevTools, duplicar
moedas, fraudar rewarded ads, ou fingir que pagou.

---

## Estrutura de pastas alvo (visao final)

```
BookRats/
├── functions/                              # NOVO — Firebase Cloud Functions (projeto Node separado)
│   ├── src/
│   │   ├── index.js                        # exports de todas as functions
│   │   ├── webhooks/
│   │   │   ├── revenueCatWebhook.js         # assinaturas (App Store/Play/Stripe via RC)
│   │   │   ├── stripeWebhook.js             # (opcional, se usar Stripe direto tambem)
│   │   │   └── admobSsvWebhook.js           # verificacao de rewarded ads
│   │   ├── callable/
│   │   │   ├── purchaseCoinPackage.js       # compra de pacote de moedas (IAP consumivel)
│   │   │   ├── spendCoins.js                # gasto de moedas (streak freeze, presentes)
│   │   │   ├── restorePurchases.js          # fallback de restauracao
│   │   │   └── claimAffiliateClick.js       # registra clique (rate-limited)
│   │   ├── scheduled/
│   │   │   ├── expireSubscriptions.js       # cron: expira assinaturas vencidas
│   │   │   ├── refreshAffiliateOffers.js    # cron: atualiza precos de afiliados (TTL 24h)
│   │   │   └── aggregateCampaignAnalytics.js # cron: consolida metricas B2B
│   │   ├── lib/
│   │   │   ├── verifySignature.js           # validacao HMAC/RSA reutilizavel
│   │   │   ├── firestoreLedger.js           # helper de double-entry bookkeeping
│   │   │   └── rateLimiter.js               # limitador de abuso (Firestore-based ou Redis)
│   │   └── config/
│   │       └── secrets.js                   # leitura de secrets (nunca hardcode)
│   ├── package.json
│   └── .env.example
│
├── src/
│   ├── core/
│   │   ├── api/
│   │   │   └── monetization.js              # NOVO — interface RevenueCat/AdMob/Affiliates
│   │   ├── store/
│   │   │   └── slices/
│   │   │       └── monetizationSlice.js     # NOVO — subscription, wallet, premiumFlags
│   │   └── constants/
│   │       └── products.js                  # NOVO — IDs de produtos (SKUs), precos de referencia
│   ├── ui/
│   │   ├── screens/
│   │   │   ├── PaywallScreen.js             # NOVO
│   │   │   ├── ShopScreen.js                # NOVO — loja de moedas/cosmeticos
│   │   │   └── SubscriptionManageScreen.js  # NOVO — gerenciar assinatura
│   │   └── components/
│   │       ├── organisms/
│   │       │   ├── PaywallOfferCard.js
│   │       │   ├── CoinPackageGrid.js
│   │       │   └── RewardedAdButton.js
│   │       └── molecules/
│   │           └── PremiumBadge.js
│   └── utils/
│       └── monetizationGuards.js            # NOVO — helpers "podeAdicionarLivro()", etc.
│
├── docs/
│   └── monetizacao/
│       ├── 0_ROADMAP_IMPLEMENTACAO.md       # este arquivo
│       ├── 1_assinaturas_premium.md
│       ├── 2_marketing_afiliados.md
│       ├── 3_microtransacoes_gamificacao.md
│       ├── 4_anuncios_in_app.md
│       ├── 5_parcerias_editoras.md
│       └── 6_seguranca_monetizacao.md       # NOVO — checklist de seguranca especifico
│
├── firestore.rules                          # ATUALIZADO — novas colecoes
└── firestore.indexes.json                   # ATUALIZADO — indices para queries de ledger/campaigns
```

Por que `functions/` e um projeto Node separado da raiz: e o padrao do Firebase CLI
(`firebase init functions`), tem seu proprio `package.json`/deploy, e evita que
dependencias de backend (ex: `stripe`, `googleapis`) entrem no bundle do app mobile.

---

## FASE 0 — Pre-requisitos de infraestrutura (fazer antes de qualquer linha de codigo de produto)

### Etapa 1 — Criar contas e projetos externos

- Conta RevenueCat (plano gratis serve para comecar) vinculada ao projeto Firebase.
- Conta Google AdMob vinculada ao app (mesmo antes de ter build na loja, da pra criar).
- Conta Google Play Console + Apple Developer (se ainda nao tiver) — precisa disso para
  registrar os produtos de IAP (assinaturas e consumiveis) nas duas lojas.
- Conta BigQuery habilitada no projeto GCP do Firebase (para analytics de afiliados/B2B).

### Etapa 2 — Ativar Firebase Blaze plan (pay-as-you-go)

Cloud Functions com chamadas HTTPS externas (webhooks) **exigem** o plano Blaze. O plano
Spark (gratis) nao permite `outbound networking`. Sem isso, nenhum webhook funciona.

### Etapa 3 — Inicializar `functions/` no repo

```bash
firebase init functions
```

Escolher JavaScript (para manter consistencia com o resto do projeto, que nao usa
TypeScript) ou TypeScript se preferir tipagem forte nesse modulo — decisao isolada, nao
afeta o app mobile.

### Etapa 4 — Configurar secrets (nunca commitar)

Usar `firebase functions:secrets:set` (Secret Manager do GCP) para:

- `REVENUECAT_WEBHOOK_SECRET`
- `STRIPE_WEBHOOK_SECRET` (se aplicavel)
- `ADMOB_SSV_PUBLIC_KEY_URL` (nao e secret, mas fica junto do config)
- `AFFILIATE_API_KEYS` (Amazon PA-API, etc.)

Nunca usar `.env` commitado nem `functions.config()` legado (deprecado pelo Firebase).

### Etapa 5 — Configurar CI/CD minimo para `functions/`

Mesmo com o CI principal desativado (`quality-gates.yml.disabled`), criar um script
`functions/package.json` com `lint` e `test` proprios, para nao depender do gate do app
mobile. Adicionar ao `npm run check:gate` da raiz uma chamada opcional para
`functions` quando ela existir.

---

## FASE 1 — Modelagem de dados e regras de seguranca (a fundacao)

Esta fase e so estrutura de dados + regras. Nenhuma tela ainda. E a fase mais importante
para cybersegurança porque define o que e e o que nao e possivel escrever depois.

### Etapa 6 — Definir schema de `users/{userId}.subscription`

```json
{
  "subscription": {
    "status": "active | trialing | grace_period | expired | cancelled | none",
    "tier": "free | premium_monthly | premium_annual | premium_lifetime",
    "productId": "bookrats_club_annual",
    "platform": "app_store | play_store | stripe",
    "originalTransactionId": "...",
    "expiresAt": "timestamp | null",
    "cancelAtPeriodEnd": false,
    "updatedAt": "timestamp",
    "updatedBy": "revenuecat_webhook"
  }
}
```

`updatedBy` e um campo de auditoria: sempre grava qual mecanismo fez a ultima escrita
(rastreabilidade em caso de disputa/chargeback).

### Etapa 7 — Criar colecao `wallets/{userId}`

```json
{ "balance": 0, "version": 0, "updatedAt": "timestamp" }
```

`version` existe para **optimistic locking**: toda escrita via transaction confere que
`version` nao mudou entre leitura e escrita, evitando double-spend em cliques duplos.

### Etapa 8 — Criar colecao `coin_ledger/{txId}` (append-only)

Cada linha e imutavel (nunca update/delete). Todo credito/debito de moeda gera um
documento aqui. Isso da rastreabilidade total (double-entry bookkeeping) e permite
reconstruir o saldo do zero em caso de bug/disputa.

### Etapa 9 — Criar colecao `entitlement_events/{eventId}` (auditoria de webhooks)

Toda chamada de webhook recebida (RevenueCat, Stripe, AdMob SSV) grava um evento bruto
aqui **antes** de processar, com `processed: false -> true`. Serve para:

- Idempotencia (se o mesmo evento chegar duas vezes, nao processa duas vezes).
- Debug/replay em caso de falha.
- Auditoria de seguranca (ver quem/quando alterou entitlements).

### Etapa 10 — Criar colecoes de afiliados e B2B

- `books/{bookId}/affiliates` (TTL 24h, conforme doc 2).
- `clicks/{clickId}` (rate-limited, ver Fase 6).
- `campaigns/{campaignId}` e `campaign_analytics/{campaignId}` (ver doc 5).

### Etapa 11 — Escrever `firestore.rules` para as novas colecoes

Regras minimas (expandir com o subagent `firestore-rules-reviewer` depois de escrever):

```javascript
match /users/{userId} {
  allow read: if isOwner(userId);
  allow update: if isOwner(userId)
    && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['subscription']);
  // subscription so muda via Admin SDK (Cloud Functions), que ignora rules.
}

match /wallets/{userId} {
  allow read: if isOwner(userId);
  allow write: if false; // cliente NUNCA escreve wallet diretamente
}

match /coin_ledger/{txId} {
  allow read: if isOwner(resource.data.userId);
  allow write: if false; // so Admin SDK
}

match /entitlement_events/{eventId} {
  allow read, write: if false; // interno, so Admin SDK
}
```

Ponto critico: **`allow write: if false` + Admin SDK** e o padrao correto. Cloud
Functions usando `firebase-admin` **ignoram** Firestore Rules por design (tem acesso
root), entao bloquear o client 100% aqui e seguro e nao quebra os webhooks.

### Etapa 12 — Rodar `firestore-rules-reviewer` no diff

Conforme `CLAUDE.md`, qualquer alteracao em `firestore.rules` deve passar pelo subagent
antes de merge. Rodar nesta etapa, antes de seguir para a Fase 2.

### Etapa 13 — Criar `firestore.indexes.json` para as queries novas

Ex: `coin_ledger` filtrado por `userId` + ordenado por `createdAt`; `clicks` filtrado por
`bookId` + `createdAt` para o link-checker (doc 2, secao 6).

---

## FASE 2 — Backend: Cloud Functions de pagamento

### Etapa 14 — Helper `verifySignature.js`

Funcao generica que valida:

- HMAC-SHA256 (formato usado pelo RevenueCat e Stripe).
- RSA-SHA256 (formato usado pelo Google AdMob SSV, doc 4).
  Escrever testes unitarios isolados (nao dependem de rede) validando assinaturas
  conhecidas/forjadas.

### Etapa 15 — `webhooks/revenueCatWebhook.js`

Fluxo:

1. Recebe POST, extrai header de autorizacao (RevenueCat manda um `Authorization`
   bearer configuravel, nao um HMAC no body — confirmar no painel do RC).
2. Compara com o secret salvo no Secret Manager (Etapa 4). Se nao bate, `401`.
3. Grava o evento bruto em `entitlement_events` (Etapa 9) com `processed: false`.
4. Verifica idempotencia: se `event.id` ja existe e `processed: true`, responde `200`
   sem reprocessar.
5. Roda `db.runTransaction` que le `entitlement_events/{eventId}` + escreve
   `users/{userId}.subscription` + marca `processed: true` no mesmo lote atomico.
6. Responde `200` sempre que processado com sucesso (RevenueCat reenviara em retry se
   nao receber 2xx).

### Etapa 16 — `webhooks/admobSsvWebhook.js`

Seguir exatamente o fluxo do doc 4 (secao 3): baixar chaves publicas do AdMob (cachear em
memoria com TTL), validar RSA-SHA256 da query string, creditar `wallet.balance` via
`FieldValue.increment` dentro de uma transaction que tambem grava no `coin_ledger`.

### Etapa 17 — `callable/purchaseCoinPackage.js` (Callable Function)

Para compras de pacotes de moedas via IAP nativo (nao via RevenueCat, se for IAP direto):
o app chama essa function autenticado (`context.auth.uid`), a function valida o recibo de
compra (`react-native-iap` receipt validation contra Apple/Google server-to-server), e so
entao credita o wallet transacionalmente. **Nunca confiar no `amount` que vem do cliente**
— o valor de moedas por produto e uma tabela fixa no servidor (`config/products.js`).

### Etapa 18 — `callable/spendCoins.js`

Debita moedas (compra de streak freeze, presente, cosmetico). Sempre:

1. Le `wallet.version` atual.
2. Confere saldo suficiente.
3. Escreve debito + incrementa `version` + grava linha no ledger — tudo dentro da mesma
   `runTransaction` (ver doc 3, secao 3, codigo de exemplo `buyStreakFreeze`).
4. Se `version` mudou entre leitura e escrita (corrida de cliques), a transaction falha e
   e re-tentada automaticamente pelo SDK do Firestore.

### Etapa 19 — `scheduled/expireSubscriptions.js`

Cron diario (Cloud Scheduler + Pub/Sub trigger) que varre assinaturas com `expiresAt <
now` e `status == active`, e rebaixa para `expired`. Isso cobre o caso de o webhook de
expiracao falhar silenciosamente (rede, bug) — e uma rede de seguranca, nao a fonte de
verdade primaria.

### Etapa 20 — Testes de idempotencia e concorrencia

Escrever testes (com Firebase Emulator Suite — ver Etapa 21) simulando:

- O mesmo webhook chegando 2x seguidas (nao pode duplicar credito).
- Duas chamadas simultaneas de `spendCoins` com saldo exato para 1 compra (a segunda deve
  falhar com "saldo insuficiente", nao permitir saldo negativo).

### Etapa 21 — Configurar Firebase Emulator Suite para `functions/`

```bash
firebase emulators:start --only functions,firestore
```

Todo o desenvolvimento e teste de webhooks deve rodar local contra o emulador antes de
deploy — evita gastar quota real e evita testar contra dados de producao.

---

## FASE 3 — Frontend: infraestrutura de monetizacao no app

### Etapa 22 — Instalar dependencias no app

```bash
npm install react-native-purchases
npm install react-native-google-mobile-ads
```

Ambos exigem rebuild nativo (`expo run:android` / `expo run:ios`), nao funcionam no Expo
Go — mesma logica ja documentada para `expo-notifications` no `CLAUDE.md`.

### Etapa 23 — `src/core/constants/products.js`

Tabela central de SKUs (IDs de produto), espelhando exatamente o que esta cadastrado no
App Store Connect / Google Play Console / RevenueCat. Usada tanto no frontend (exibir
oferta certa) quanto documentada para a Cloud Function (Etapa 17) usar o mesmo valor de
"quantas moedas vale este produto" — nunca confiar em preco/quantidade vindos do client.

### Etapa 24 — `src/core/store/slices/monetizationSlice.js`

Estado (tudo **sessao**, nao persistido — mesma logica do `authSlice`/`socialSlice`,
porque `subscription`/`wallet` sao re-hidratados via listener do Firestore a cada login,
persistir arriscaria mostrar saldo/premium desatualizado):

```javascript
{
  subscription: null,        // espelha users/{uid}.subscription via onSnapshot
  wallet: { balance: 0, version: 0 },
  isPremium: false,           // derivado de subscription.status
  offerings: [],               // cache de RevenueCat.getOfferings()
  purchaseInProgress: false,
}
```

Importante: **`isPremium` e derivado**, nunca setado manualmente — calculado a partir do
snapshot real do Firestore (`subscription.status === 'active' || 'trialing' ||
'grace_period'`). Isso segue o principio ja estabelecido no projeto (camada "Derivado" do
`core/store/index.js`).

### Etapa 25 — Atualizar `partialize` do store raiz

Confirmar explicitamente que `monetizationSlice` **nao** entra no `partialize` de
`core/store/index.js`. Isso deve ser um teste de regressao (ver Etapa 34).

### Etapa 26 — `src/core/api/monetization.js`

Funcoes:

- `initializePurchases(userId)` — configura RevenueCat SDK com o `appUserID` = Firebase
  `uid` (fundamental: e assim que o webhook sabe qual usuario creditar).
- `fetchOfferings()`
- `purchasePackage(pkg)`
- `restorePurchases()`
- `subscribeToSubscriptionStatus(uid, callback)` — `onSnapshot` em
  `users/{uid}.subscription`, alimenta o slice.
- `subscribeToWallet(uid, callback)` — `onSnapshot` em `wallets/{uid}`.

### Etapa 27 — Listener de mudanca de auth

Em `authSlice` (ou no bootstrap do `App.js`), ao logar: chamar
`initializePurchases(uid)` + `subscribeToSubscriptionStatus` + `subscribeToWallet`. Ao
deslogar: `Purchases.logOut()` e cancelar os listeners (mesmo padrao dos listeners sociais
existentes).

### Etapa 28 — `src/utils/monetizationGuards.js`

Funcoes puras reutilizaveis pela UI, ex:

```javascript
export function podeAdicionarLivroAtivo(booksAtivos, isPremium) {
  if (isPremium) return true;
  return booksAtivos.length < 3; // limite gratuito, doc 1
}
```

Mantem a regra de negocio testavel e fora de componentes React (mesmo padrao de
`utils/streak.js`/`utils/stats.js` que ja existe no projeto).

---

## FASE 4 — Frontend: telas de assinatura (Paywall)

### Etapa 29 — `PaywallScreen.js`

Seguir o design do doc 1 (secao 2): gradiente premium, 3-4 beneficios, seletor de
pacotes com plano anual pre-selecionado (ancoragem), CTA, links de Termos/Privacidade e
"Restaurar Compras" **obrigatorios** (exigencia da Apple App Store Review Guidelines
3.1.2 — sem isso o app e rejeitado).

### Etapa 30 — Gatilhos de paywall

Interceptar nos pontos definidos no doc 1 (secao 2.1): 4o livro ativo, IA (futuro),
export de PDF. Usar `monetizationGuards.js` (Etapa 28) para decidir quando abrir o
paywall em vez de executar a acao.

### Etapa 31 — `SubscriptionManageScreen.js`

Mostrar status atual, data de expiracao, botao "Gerenciar assinatura" que abre a tela
nativa da loja (`Linking.openURL('itms-apps://apps.apple.com/account/subscriptions')` no
iOS, deep link equivalente no Android) — **nao construir cancelamento custom**: as lojas
exigem que o cancelamento de fato aconteca pelo fluxo nativo delas.

### Etapa 32 — Fluxo de retencao (opcional, fase avancada)

Pesquisa de motivo de cancelamento + oferta de desconto (doc 1, secao 5) — via
RevenueCat "Win-back offers" ou promocional offers da Apple/Google. Deixar para depois do
MVP funcionar.

### Etapa 33 — Loading states e error handling

Overlay de compra em progresso (`purchaseInProgress` do slice), tratamento de
`e.userCancelled` (nao mostrar erro se o usuario so fechou o modal nativo de pagamento).

### Etapa 34 — Testes de regressao do slice

- `monetizationSlice` nao aparece no `partialize`.
- `isPremium` deriva corretamente de cada `status` possivel (`active`, `trialing`,
  `grace_period` = true; `expired`, `cancelled`, `none` = false).
- `monetizationGuards` cobertos a 90%+ (mesma politica de `core/store` do projeto).

---

## FASE 5 — Frontend: microtransacoes e loja

### Etapa 35 — `ShopScreen.js` + `CoinPackageGrid.js`

Grid de pacotes de moedas com precificacao nao-linear (doc 3, secao 5) definida em
`products.js` (Etapa 23), nunca calculada no cliente.

### Etapa 36 — Fluxo de compra de item com moedas

UI chama `callable/spendCoins` (Etapa 18) via Firebase Functions SDK
(`httpsCallable`), nunca escreve `wallet` diretamente. Loading + optimistic UI (mostrar
saldo atualizado imediatamente, reverter se a function falhar).

### Etapa 37 — `StreakRecoveryModal.js`

Seguir doc 3 (secao 2), oferecendo tanto pagamento direto (IAP consumivel) quanto gasto
de RatsCoins — dois caminhos que convergem para as mesmas Cloud Functions (Etapas 17/18).

### Etapa 38 — Sistema de presentes nos Echoes

Estender o modelo de `annotations` existente: novo subcampo `gifts` com incrementos
controlados (mesmo padrao ja usado para `claps`/`replyCount` no Firestore Rules atual).
Gasto de moedas passa por `spendCoins`; o credito ao destinatario (se houver cashout de
criadores) e outra function separada, com suas proprias regras de antifraude.

---

## FASE 6 — Frontend + backend: anuncios in-app

### Etapa 39 — Configurar `react-native-google-mobile-ads`

IDs de teste (`TestIds`) em `__DEV__`, IDs reais só em build de producao — nunca
misturar (risco de banimento de conta AdMob por clique invalido em dev).

### Etapa 40 — `RewardedAdButton.js`

Pre-carregamento em background (doc 4, secao 2). Credito real **nao** acontece no
callback `EARNED_REWARD` do cliente — esse callback so atualiza UI otimisticamente. O
credito de verdade vem do webhook SSV (Etapa 16), que e a fonte da verdade.

### Etapa 41 — Banners e intersticiais

Posicionamento conforme doc 4 (secao 2): nunca sobrepor botoes de navegacao, desmontar
componentes de ads instantaneamente se `isPremium` virar `true` no meio da sessao
(listener do slice, Etapa 24, deve disparar isso reativamente).

### Etapa 42 — Rate limiting de rewarded ads (anti-fraude)

Implementar contador em Firestore (mais simples que Redis para o estagio atual do
projeto — Redis so vale a pena com escala real, ver Fase 8): documento
`ad_view_counters/{userId}_{date}` incrementado atomicamente, limite de 5/dia
verificado **dentro da Cloud Function SSV**, nunca no cliente.

### Etapa 43 — Consentimento de privacidade (LGPD/GDPR)

Implementar Google User Messaging Platform (UMP SDK) para consent de ads
personalizados antes de carregar qualquer anuncio — obrigatorio para lojas e para LGPD
(usuario brasileiro).

---

## FASE 7 — Frontend + backend: afiliados

### Etapa 44 — `books/{bookId}/affiliates` + cache TTL

Cloud Function agendada (Etapa 19, mesmo padrao) que atualiza ofertas com TTL de 24h
(doc 2, secao 3). Comecar simples: sem Redis/Cloudflare Workers ainda (Fase 8 escala
isso depois). Cache direto no Firestore ja resolve para volume inicial.

### Etapa 45 — `BookPurchaseOptions.js`

Componente conforme doc 2 (secao 2), usando `expo-web-browser` (ja e dependencia do
projeto) para abrir o link em in-app browser.

### Etapa 46 — Registro de cliques com rate limiting

`callable/claimAffiliateClick.js`: grava em `clicks/{clickId}` com `userId` do
`context.auth`, nunca aceita `userId` vindo do body (spoofing). Rate limit simples por
usuario/minuto para impedir bot clicando em loop.

### Etapa 47 — Geo-targeting de tag de afiliado

A Cloud Function le o header de geolocalizacao (Firebase Functions expõe
`request.headers['x-appengine-country']` em algumas regioes, ou usar servico de geo-IP)
e escolhe a tag de afiliado correta antes de gravar a `affiliateUrl` final.

### Etapa 48 — Link checker (cron)

Cloud Scheduler diario que faz `HEAD` request nas ofertas mais acessadas e desativa
links quebrados (doc 2, secao 6).

---

## FASE 8 — Escala (so priorizar quando houver tracao real de usuarios)

Esta fase e a que os documentos 1-5 chamam de "metodos enterprise para bilhoes de
usuarios". **Nao implementar prematuramente** — adiciona complexidade operacional
(Redis, Pub/Sub, BigQuery, Cloudflare Workers) que so se paga com escala real. Ordem de
prioridade **se/quando** o app crescer:

### Etapa 49 — Custom Claims JWT para `premium`

Ao processar o webhook de assinatura, alem de escrever `users/{uid}.subscription`,
setar `admin.auth().setCustomUserClaims(uid, { premium: true })`. Isso permite que
Firestore Rules leiam `request.auth.token.premium == true` sem precisar de `get()`
extra dentro da regra — reduz leituras cobradas. So compensa com volume alto.

### Etapa 50 — Buffer de analytics via Pub/Sub + BigQuery

Migrar `clicks`/`campaign-event` de escrita direta no Firestore para stream via
Pub/Sub -> BigQuery (doc 2 e doc 5, secao 4), quando o volume de cliques comecar a
aproximar o limite de 10k writes/s do Firestore (extremamente improvavel no curto
prazo).

### Etapa 51 — Cache de 3 niveis para ofertas de afiliados

Cloudflare Workers (Edge) + Redis (GCP Memorystore) na frente do Firestore, so quando o
trafego de `/offers` justificar (doc 2, secao 4).

### Etapa 52 — Sharded counters para rankings/contadores globais

Se o ranking do "BookRats Club" comecar a sofrer contencao de escrita em um unico
documento, implementar distributed counters (doc 1, secao 4).

### Etapa 53 — Consistencia eventual para XP/gamificacao

Buffer de ganho de XP em Redis + flush em lote a cada N minutos (doc 3, secao 4), so
quando updates em tempo real comecarem a gerar hot documents.

---

## FASE 9 — Cybersegurança dedicada (transversal — revisar a cada fase acima)

Esta fase nao e sequencial — e uma checklist que deve ser aplicada continuamente. Ver
tambem o novo `docs/monetizacao/6_seguranca_monetizacao.md` (Etapa 54).

### Etapa 54 — Criar `docs/monetizacao/6_seguranca_monetizacao.md`

Documento dedicado (proximo desta serie) detalhando ameacas especificas de monetizacao:
replay attack em webhook, fraude de rewarded ad, double-spending de moedas, self-XSS via
nome de presente, chargeback abuse, account takeover para roubo de saldo.

### Etapa 55 — Validacao de assinatura em TODOS os webhooks

Nenhum endpoint HTTPS de Cloud Function que grava dado financeiro pode processar sem
validar assinatura primeiro. Code review obrigatorio nisso (usar
`firestore-rules-reviewer` tambem quando o webhook tocar Firestore, mesmo sendo Cloud
Function).

### Etapa 56 — Protecao contra replay attack

Cada evento de webhook processado grava seu `event.id` (Etapa 9) e e checado antes de
qualquer escrita — reprocessar o mesmo evento (replay malicioso ou retry legitimo) nunca
credita duas vezes.

### Etapa 57 — Least privilege nas Service Accounts

A Service Account usada pelas Cloud Functions deve ter **apenas** as permissoes IAM
necessarias (Firestore read/write nas colecoes relevantes, Secret Manager read). Nunca
usar a conta com role `Owner`/`Editor` do projeto inteiro.

### Etapa 58 — Rate limiting em todas as Callable Functions

`spendCoins`, `claimAffiliateClick`, `purchaseCoinPackage` — todas precisam de limite de
chamadas por usuario/minuto (contador simples em Firestore com TTL, ou App Check — ver
Etapa 60) para impedir scripts automatizados de abusar da API.

### Etapa 59 — Nunca logar dados sensiveis

Reforcar no `Logger` (`core/observability/`) que nenhum log de monetizacao inclua:
numero de cartao, token de pagamento completo, `originalTransactionId` completo (mascarar
parcialmente), ou saldo exato de outros usuarios. Seguir o padrao de `redact.js` ja
existente.

### Etapa 60 — Firebase App Check

Ativar App Check (Play Integrity no Android, DeviceCheck/App Attest no iOS) nas Cloud
Functions Callable de monetizacao. Isso bloqueia chamadas vindas de fora do app real
(scripts, Postman, apps clonados) mesmo que o atacante tenha um token de auth valido
roubado.

### Etapa 61 — Protecao de conta (account takeover)

Garantir que Firebase Auth exige verificacao de email/reautenticacao para acoes
sensiveis (troca de metodo de pagamento fica 100% na loja, mas troca de senha/email deve
exigir reauth recente) — evita que sequestro de sessao vire sequestro de assinatura.

### Etapa 62 — Testes de penetracao manual pre-lancamento

Antes de lancar monetizacao em producao, tentar manualmente (ou com Postman/Burp Suite):

- Chamar `spendCoins` direto via `httpsCallable` sem estar autenticado -> deve falhar.
- Forjar um webhook do RevenueCat com secret errado -> deve retornar 401 e nao gravar
  nada.
- Tentar `update` em `wallets/{outroUserId}` pelo SDK client -> deve ser bloqueado pela
  rule.
- Duplo-clique rapido em "comprar streak freeze" com saldo exato -> so 1 compra deve
  passar.

### Etapa 63 — Monitoramento e alertas

Configurar Cloud Monitoring / Firebase Alerts para: erro rate alto em Cloud Functions de
pagamento, picos anormais de `entitlement_events` (possivel ataque), falhas de assinatura
de webhook acima de um limiar (possivel tentativa de forjar requests).

### Etapa 64 — Plano de resposta a incidente

Documentar (mesmo que resumido) o que fazer se: uma chave de API vazar (rotacionar via
Secret Manager, invalidar a antiga), um bug creditar moedas indevidamente (script de
reconciliacao usando o `coin_ledger` como fonte de verdade para corrigir `wallet.balance`
de todo mundo).

---

## FASE 10 — Compliance e requisitos das lojas

### Etapa 65 — Apple App Store Review Guidelines 3.1

Todas as assinaturas/consumiveis vendidos **dentro do app** devem usar In-App Purchase
nativo (StoreKit) — nunca link externo de pagamento para conteudo digital. Afiliados
(Fase 7) sao excecao permitida (produto fisico/servico de terceiro, nao conteudo
digital do app).

### Etapa 66 — Google Play Billing policy

Mesma logica: conteudo digital consumido dentro do app -> Google Play Billing
obrigatorio. RevenueCat abstrai isso corretamente para ambas as lojas.

### Etapa 67 — Politica de reembolso e "Restaurar Compras"

Botao de restaurar compras obrigatorio e visivel no Paywall (Etapa 29) — rejeicao comum
de review se faltar.

### Etapa 68 — LGPD (Lei Geral de Protecao de Dados)

Consentimento explicito para ads personalizados (Etapa 43), politica de privacidade
atualizada mencionando processamento de dados de pagamento por terceiros (RevenueCat/
Stripe/AdMob), e direito do usuario a exportar/excluir seus dados de wallet/ledger
mediante solicitacao.

### Etapa 69 — Termos de uso e EULA

Adicionar clausulas especificas sobre: moedas virtuais nao sao reembolsaveis em dinheiro
(exceto onde a lei exigir), assinaturas renovam automaticamente, presentes virtuais nao
tem valor monetario garantido.

---

## FASE 11 — QA e lancamento gradual

### Etapa 70 — Sandbox testing completo

Testar fluxo de compra real em sandbox: App Store Sandbox, Google Play internal
testing track, RevenueCat sandbox mode. Cobrir: compra bem-sucedida, cancelamento,
reembolso, renovacao automatica, upgrade/downgrade de plano.

### Etapa 71 — Beta fechado com monetizacao ativa

Lancar para um grupo pequeno de usuarios reais (TestFlight / Google Play internal
testing) com pagamento real antes do rollout completo — validar que webhooks funcionam
com trafego real, nao so sandbox.

### Etapa 72 — Rollout gradual (staged rollout)

Usar staged rollout do Google Play (ex: 10% -> 50% -> 100%) e phased release da Apple
para a primeira versao com monetizacao — permite reverter rapido se um bug critico de
cobranca aparecer.

### Etapa 73 — Dashboard de acompanhamento pos-lancamento

Configurar RevenueCat dashboard + Firebase Analytics para acompanhar: MRR, churn rate,
trial-to-paid conversion, ARPU — metricas minimas para saber se a monetizacao esta
saudavel nos primeiros 30 dias.

---

## Resumo de tecnicas/tecnologias de mercado usadas neste roteiro

| Categoria                            | Tecnica/Ferramenta                          | Onde entra       |
| ------------------------------------ | ------------------------------------------- | ---------------- |
| Gestao de assinatura cross-platform  | RevenueCat                                  | Fase 3-4         |
| Pagamento nativo obrigatorio (lojas) | StoreKit / Google Play Billing              | Fase 10          |
| Autenticidade de webhook             | HMAC-SHA256 / RSA-SHA256                    | Etapas 14-16     |
| Idempotencia                         | Event log + dedupe por `event.id`           | Etapa 9, 56      |
| Consistencia financeira              | Firestore Transactions + optimistic locking | Etapas 7, 18, 20 |
| Auditoria financeira                 | Double-entry ledger (append-only)           | Etapa 8          |
| Antifraude de ads                    | Server-Side Verification (SSV)              | Etapa 16         |
| Antifraude de bot/scraper            | Firebase App Check                          | Etapa 60         |
| Reducao de custo de leitura          | Custom Claims JWT                           | Etapa 49         |
| Escala de analytics                  | Pub/Sub -> BigQuery                         | Etapa 50         |
| Cache de borda                       | Cloudflare Workers / Redis                  | Etapa 51         |
| Contadores de alta concorrencia      | Sharded counters                            | Etapa 52         |
| Privacidade/consentimento            | Google UMP SDK (LGPD/GDPR)                  | Etapa 43         |
| Lancamento seguro                    | Staged rollout / phased release             | Etapa 72         |

---

## Como usar este roteiro no dia a dia

1. Trabalhar uma etapa por vez, na ordem, dentro de cada fase.
2. Toda etapa que toca `firestore.rules` ou `core/api/*` passa pelo subagent
   `firestore-rules-reviewer` antes de merge (regra ja existente no `CLAUDE.md`).
3. Toda etapa de Cloud Function nova ganha teste no Firebase Emulator Suite antes de
   deploy real (Etapa 21).
4. Ao concluir uma fase inteira, atualizar a secao "Estado atual & memoria entre chats"
   do `CLAUDE.md` com o que foi decidido/concluido, do mesmo jeito que as fases
   anteriores do projeto ja foram registradas la.
