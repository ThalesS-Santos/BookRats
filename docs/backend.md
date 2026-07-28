# Arquitetura Backend e Serviços Core

## Plataforma

- **Autenticação**: Firebase Authentication
- **Banco de Dados**: Cloud Firestore (Real-time Sync)
- **Persistência Local**: Firebase Local Cache (Offline capability)
- **APIs de Terceiros**: Integração via client com Google Books API (com caching local de capas)

## Módulos de Serviço e API Core

- `src/core/api/auth.js`: Fluxos de login, registro, recuperação de conta e sessão.
- `src/core/api/books.js`: Operações de biblioteca, registros de progresso e anotações.
- `src/core/api/social.js`: Controle de relacionamentos (amizades), grupos de leitura, feeds e anotações compartilhadas (Echoes).
- `src/core/services/MilestoneService.js`: Motor de regras de gamificação e desbloqueio assíncrono de Badges/Conquistas baseado no progresso de leitura.
- `src/core/services/ImageCacheService.js`: Serviço de download e cache offline de capas de livros para evitar consumo excessivo de tráfego de dados e requisições repetidas de imagens.

## Observabilidade e Diagnósticos

O BookRats implementa uma camada centralizada de telemetria localizada em `src/core/observability/`:

- **Logger Centralizado**: Encapsula logs formatados estruturados com diferentes níveis de depuração (`DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`).
- **Sanitização de Log**: Máscara automática para senhas, tokens de API e informações de identificação pessoal (PII) nas mensagens de erro.
- **Transports**: Suporta múltiplos destinos de logs (atualmente saídas console limpas e buffers locais).

## Monetização — API Client-Side (RevenueCat)

Estado: **2026-07-28**. `src/core/api/monetization.js` encapsula o SDK do RevenueCat (`react-native-purchases` + `react-native-purchases-ui`): `configurePurchases()`, `identifyPurchasesUser(uid)`/`resetPurchasesUser()` amarrados ao ciclo de vida do Firebase Auth (`authSlice`), `fetchCustomerInfo()`, `fetchCurrentOffering()`, `purchasePackage()`, `restorePurchases()`, `subscribeToCustomerInfoUpdates()`, `presentCustomerCenter()`. Detecta módulos nativos ausentes via `NativeModules` e vira NO-OP (Expo Go/web) em vez de lançar.

**Ressalva de arquitetura — leia antes de expandir isso**: hoje `isPro` (`monetizationSlice`) é derivado **direto do `CustomerInfo` do SDK** (`entitlements.active`), porque a Cloud Function que validaria o webhook do RevenueCat e gravaria `users/{uid}.subscription` no Firestore (Fase 1/2 do roteiro, ver `docs/monetizacao/0_ROADMAP_IMPLEMENTACAO.md`) **ainda não existe**. Isso é aceitável para o cliente decidir sua própria UI (a RevenueCat já validou a compra do lado dela), mas **qualquer lógica de servidor que precise saber se um usuário é Pro não tem hoje onde ler isso** — não há campo no Firestore refletindo assinatura. Não adicione checagem de `isPro` em Cloud Function nenhuma até a Fase 2 existir.

## Próximos Passos de Backend (Fase de Monetização)

1. **Cloud Functions de Pagamento** (ainda não implementado — `functions/` só tem o scaffold, sem lógica de negócio): Criação de funções serverless em Node.js para receber e assinar Webhooks do _RevenueCat_ / _Stripe_ para validações atômicas de status de assinantes, e gravar `users/{uid}.subscription` no Firestore (fecha a lacuna descrita acima).
2. **Server-Side Verification (SSV)**: Habilitação de funções de validação de criptografia RSA da AdMob para credenciamento seguro de RatsCoins em vídeos premiados.
3. **Data Lake de Métricas**: Estruturação de ingestão assíncrona de eventos via Cloud Pub/Sub para Google BigQuery visando o fornecimento de dashboards corporativos para editoras parceiras.
