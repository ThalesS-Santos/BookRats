# Segurança da Monetização — BookRats

## Objetivo deste documento

Complementa `docs/security.md` (controles gerais do app) e a Fase 9 de
`0_ROADMAP_IMPLEMENTACAO.md` (checklist transversal). Aqui o foco é **ameaça por
ameaça**: o que pode dar errado especificamente em dinheiro/moedas/entitlements, como um
atacante exploraria, e o controle exato que fecha a brecha. Este documento deve ser
revisado sempre que uma nova etapa de monetização tocar pagamento, wallet ou webhooks.

Convenção: cada seção segue **Ameaça → Vetor de ataque → Controle → Onde é aplicado**.

---

## 1. Modelo de ameaças (visão geral)

```
Atores maliciosos possíveis:
├── Usuário comum tentando se auto-beneficiar (ex: dar premium pra si mesmo)
├── Usuário técnico com proxy/Postman/app decompilado forjando requests
├── Bot/script automatizado abusando de rewarded ads ou cliques de afiliado
├── Terceiro interceptando webhook (spoofing de pagamento)
└── Insider/vazamento de credencial (Service Account, secret de webhook)
```

Superfícies de ataque relevantes:

- Firestore (via SDK client, se as rules permitirem).
- Cloud Functions HTTPS (webhooks e callables).
- Comunicação app ↔ RevenueCat/AdMob/lojas.
- Secrets/credenciais de backend.

---

## 2. Ameaça: usuário edita o próprio status premium

**Vetor de ataque**: usuário abre o app decompilado ou usa uma ferramenta de proxy
(Charles/Burp) e envia um `updateDoc(userRef, { subscription: { status: 'active' } })`
diretamente via SDK do Firestore, sem nunca ter pagado.

**Controle**: Firestore Rules bloqueiam qualquer `update` em `users/{userId}` que toque a
chave `subscription`:

```javascript
allow update: if isOwner(userId)
  && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['subscription']);
```

A única forma de escrever nesse campo é via `firebase-admin` (Cloud Functions), que
ignora rules por design — e essas Functions só escrevem depois de validar assinatura de
webhook (seção 5).

**Onde é aplicado**: `firestore.rules` (Etapa 11 do roadmap), revisado pelo subagent
`firestore-rules-reviewer` antes de qualquer merge.

**Teste de verificação**: tentar `updateDoc` client-side em `subscription` num teste
de integração contra o Firebase Emulator — deve rejeitar com `permission-denied`.

---

## 3. Ameaça: double-spending / corrida de cliques na wallet

**Vetor de ataque**: usuário clica 5x rápido em "Comprar Streak Freeze" com saldo
suficiente para apenas 1 compra. Sem controle de concorrência, as 5 requisições podem ler
o mesmo saldo antes de qualquer uma escrever, e todas passam.

**Controle**: toda escrita de `wallet.balance` acontece dentro de
`db.runTransaction()`, que:

1. Lê o documento (`balance`, `version`).
2. Confere saldo suficiente **dentro da transação**.
3. Escreve o novo saldo, incrementa `version`, e grava a linha correspondente no
   `coin_ledger` — tudo atomicamente.

Se duas transações colidirem, o Firestore aborta e re-executa automaticamente uma delas
com os dados frescos — a segunda tentativa vê o saldo já debitado e falha corretamente
com "saldo insuficiente".

**Onde é aplicado**: `functions/src/callable/spendCoins.js` (Etapa 18). O client nunca
tem permissão de `write` em `wallets/{userId}` (rule `allow write: if false`), então nem
uma tentativa de bypass client-side é possível — só a Function pode escrever, e ela usa
transaction.

**Teste de verificação**: disparar `spendCoins` 5x em paralelo com saldo para 1 compra
(Etapa 20 do roadmap) — exatamente 1 deve suceder.

---

## 4. Ameaça: forjar recompensa de anúncio (rewarded ad fraud)

**Vetor de ataque**: usuário intercepta o callback `EARNED_REWARD` do SDK de ads no
cliente e chama uma function fictícia "creditar moedas" sem realmente ter assistido ao
anúncio até o fim — ou nunca carrega o anúncio de verdade e só simula o evento local.

**Controle**: o crédito de moedas por anúncio **nunca** depende do callback client-side.
A única fonte de verdade é o webhook **Server-Side Verification (SSV)** do Google AdMob,
que:

1. É disparado pelo servidor do Google (não pelo dispositivo do usuário) quando o vídeo
   é confirmado como assistido integralmente.
2. Vem assinado com RSA-SHA256, usando uma chave pública que o Google rotaciona
   periodicamente (a Cloud Function busca e cacheia essas chaves).
3. É validado criptograficamente antes de qualquer crédito.

O callback local (`RewardedAdEventType.EARNED_REWARD`) só serve para dar feedback visual
otimista ("Parabéns! +15 moedas") — o saldo real só muda quando o webhook SSV chega e
passa na validação de assinatura.

**Onde é aplicado**: `functions/src/webhooks/admobSsvWebhook.js` (Etapa 16).

**Controle complementar — rate limiting**: mesmo com SSV, um usuário poderia assistir
centenas de anúncios reais em sequência (não é fraude criptográfica, mas é abuso
econômico — cada view custa dinheiro ao anunciante e gera pouco eCPM em excesso).
Limite de 5 rewarded ads/dia por usuário, verificado **dentro da própria Function SSV**
antes de creditar (documento `ad_view_counters/{userId}_{date}`, Etapa 42).

---

## 5. Ameaça: spoofing de webhook de pagamento

**Vetor de ataque**: atacante descobre (ou adivinha) a URL pública da Cloud Function de
webhook (`handlePaymentWebhook`) e envia um POST forjado simulando "assinatura ativada"
para o próprio `userId`, sem nunca ter pago.

**Controle**: toda Cloud Function de webhook valida a assinatura/segredo **antes** de
processar qualquer dado:

- RevenueCat: valida o header `Authorization` contra o secret configurado no painel do
  RevenueCat, armazenado no Secret Manager (nunca hardcoded, nunca em `.env` commitado).
- Stripe (se usado): valida `Stripe-Signature` com `stripe.webhooks.constructEvent()`.
- AdMob SSV: valida assinatura RSA-SHA256 (seção 4).

Se a validação falhar, a Function responde `401` e **não grava nada** — nem mesmo em
`entitlement_events` (log de auditoria só grava eventos autênticos, para não poluir com
tentativas de ataque; tentativas falhas vão para log de erro do Cloud Functions, não para
Firestore).

**Onde é aplicado**: `functions/src/lib/verifySignature.js` (Etapa 14), usado por todos
os webhooks (Etapa 15-16).

**Teste de verificação**: Etapa 62 do roadmap — enviar webhook forjado com secret
incorreto manualmente (Postman/curl) contra o emulador e contra staging, confirmar `401`
e nenhuma escrita no Firestore.

---

## 6. Ameaça: replay attack (reenvio de evento legítimo)

**Vetor de ataque**: um webhook legítimo (assinatura válida) é capturado (ex: rede
comprometida, log vazado) e reenviado depois — ou o próprio provedor reenvia por retry de
rede, e sem proteção o sistema credita duas vezes.

**Controle**: cada evento de webhook processado tem um `event.id` único (fornecido pelo
RevenueCat/Stripe/AdMob). Antes de processar:

1. Verifica se `entitlement_events/{event.id}` já existe com `processed: true`.
2. Se sim, responde `200` imediatamente sem reprocessar (idempotência — importante
   também para retries legítimos de rede, que são comuns e esperados).
3. Se não, processa e marca `processed: true` na mesma transação que credita o usuário.

**Onde é aplicado**: `functions/src/webhooks/*` + colecão `entitlement_events`
(Etapas 9, 56).

---

## 7. Ameaça: scripts/bots abusando de Callable Functions

**Vetor de ataque**: um atacante extrai as credenciais de Firebase Auth do app
(possível via engenharia reversa de app decompilado) e escreve um script que chama
`spendCoins`, `claimAffiliateClick` ou `purchaseCoinPackage` em loop, fora do app real,
para gerar cliques falsos de afiliado (fraude de comissão) ou testar exploits.

**Controle em camadas**:

1. **Autenticação obrigatória**: toda Callable Function confere `context.auth` — se nulo,
   rejeita. Isso já impede acesso anônimo, mas não impede um usuário autenticado real
   rodando um script.
2. **Firebase App Check**: valida que a chamada vem do binário real do app (Play
   Integrity API no Android, App Attest no iOS), não de um script standalone com um
   token de auth roubado ou de um app clonado/modificado. Rejeita chamadas sem um token
   de App Check válido.
3. **Rate limiting por usuário**: contador em Firestore com janela de tempo (ex: máximo
   10 chamadas de `claimAffiliateClick` por minuto por `uid`), verificado dentro da
   própria Function antes de processar.

**Onde é aplicado**: `functions/src/lib/rateLimiter.js` (Etapa 58) +
configuração de App Check nas Functions de monetização (Etapa 60).

---

## 8. Ameaça: vazamento de secret/credencial

**Vetor de ataque**: um secret (chave de webhook, API key de afiliado) é commitado por
engano no repositório, ou a Service Account das Cloud Functions tem permissões amplas
demais e, se comprometida, dá acesso a todo o projeto GCP.

**Controles**:

- **Nunca commitar secrets**: usar exclusivamente `firebase functions:secrets:set`
  (Google Secret Manager). `.env.example` no repo documenta as chaves necessárias, nunca
  os valores reais (mesmo padrão já usado pelo projeto para `EXPO_PUBLIC_FIREBASE_*`).
- **Least privilege na Service Account**: a Service Account usada pelas Functions de
  monetização recebe apenas os roles IAM estritamente necessários (`Cloud Datastore
User` para Firestore, `Secret Manager Secret Accessor` para os secrets específicos) —
  nunca `Editor`/`Owner` do projeto.
- **Rotação de secrets**: em caso de suspeita de vazamento, rotacionar imediatamente via
  Secret Manager (gera nova versão, functions pegam a nova no próximo deploy/cold start)
  e revogar a versão antiga.
- **Scanner de secrets no CI** (quando o CI for reativado): adicionar um passo de
  detecção de segredos (ex: `gitleaks`) ao pipeline antes de merge.

**Onde é aplicado**: Etapa 4 (setup inicial) e Etapa 57 (least privilege) do roadmap.

---

## 9. Ameaça: manipulação de valor de produto no cliente

**Vetor de ataque**: o app envia `{ productId: 'coins_100', amount: 100 }` para uma
function de compra, e um atacante altera o payload para `{ productId: 'coins_100',
amount: 99999 }`, tentando receber muito mais moedas do que o produto realmente vale.

**Controle**: a Cloud Function **nunca confia em quantidade/valor vindos do corpo da
requisição**. Ela recebe apenas o `productId` (ou o recibo de compra, no caso de IAP), e
consulta uma tabela fixa no servidor (`functions/src/config/products.js`, espelhando
`src/core/constants/products.js` do app) para determinar quantas moedas aquele produto
específico vale. Qualquer campo de quantidade enviado pelo cliente é ignorado.

**Onde é aplicado**: `functions/src/callable/purchaseCoinPackage.js` (Etapa 17),
`functions/src/config/` (estrutura de pastas do roadmap).

---

## 10. Ameaça: chargeback / estorno abusivo

**Vetor de ataque**: usuário compra moedas, gasta tudo em itens/presentes, e depois
solicita chargeback no cartão (contesta a cobrança com o banco), ficando com o benefício
e o dinheiro de volta — a loja (Apple/Google) processa o estorno automaticamente.

**Controle**: RevenueCat/Stripe notificam a Cloud Function via webhook quando um
chargeback ou reembolso acontece (`REFUND` event type). A Function:

1. Rebaixa `subscription.status` para `refunded` (se assinatura) ou
2. Registra um débito no `coin_ledger` referente ao valor estornado (se compra de
   moedas), mesmo que isso deixe `wallet.balance` negativo no ledger — o saldo exibido
   ao usuário pode ser zerado/travado até resolução, mas o **ledger histórico nunca é
   apagado ou editado** (é a fonte de verdade auditável).

Isso não impede 100% o abuso (o item pode já ter sido "gasto"/consumido), mas garante
rastreabilidade completa para decisões de banimento/suspensão de conta em casos
recorrentes.

**Onde é aplicado**: extensão do `revenueCatWebhook.js` para o evento `REFUND` (parte da
Etapa 15, documentar explicitamente ao implementar).

---

## 11. Ameaça: exposição de dados de outros usuários via query

**Vetor de ataque**: usuário tenta ler `wallets/{outroUserId}` ou listar toda a coleção
`coin_ledger` para ver saldos/transações de terceiros.

**Controle**: rules restringem leitura estritamente ao dono:

```javascript
match /wallets/{userId} {
  allow read: if isOwner(userId);
}
match /coin_ledger/{txId} {
  allow read: if isOwner(resource.data.userId);
}
```

Nenhuma query de listagem (`collection('coin_ledger').get()`) é permitida sem filtro por
`userId` do próprio usuário — as rules do Firestore aplicam a checagem por documento, não
por coleção inteira, então uma query sem filtro correto simplesmente retorna vazio/erro
de permissão para os documentos que não pertencem ao usuário.

**Onde é aplicado**: `firestore.rules`, mesma etapa 11 do roadmap.

---

## 12. Checklist rápido pré-deploy (usar antes de todo `firebase deploy`)

- [ ] Nenhum secret hardcoded em `functions/src/**` (grep por `sk_live`, `whsec_`, etc).
- [ ] Toda Cloud Function HTTPS valida assinatura antes de tocar Firestore.
- [ ] Toda Callable Function confere `context.auth != null`.
- [ ] `firestore.rules` bloqueia `write` direto em `wallets`, `coin_ledger`,
      `entitlement_events`, e `subscription` dentro de `users/{userId}`.
- [ ] Rate limiting ativo nas Functions expostas a abuso (`spendCoins`,
      `claimAffiliateClick`, `purchaseCoinPackage`).
- [ ] App Check habilitado nas Functions de monetização.
- [ ] Logger nunca imprime saldo/token/recibo completo (checar `redact.js`).
- [ ] Testes de idempotência (webhook duplicado) e concorrência (double-spend) passando.
- [ ] Service Account das Functions com IAM mínimo, não `Editor`/`Owner`.
- [ ] `npm run audit:high` limpo em `functions/` também (não só na raiz do app).

---

## Referência cruzada

- Visão geral e ordem de implementação: `0_ROADMAP_IMPLEMENTACAO.md`.
- Specs de produto por vertical: `1_assinaturas_premium.md` a `5_parcerias_editoras.md`.
- Controles de segurança gerais do app (fora do escopo de monetização):
  `../security.md`.
