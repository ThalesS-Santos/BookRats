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

## Próximos Passos de Backend (Fase de Monetização)
1. **Cloud Functions de Pagamento**: Criação de funções serverless em Node.js para receber e assinar Webhooks do *RevenueCat* / *Stripe* para validações atômicas de status de assinantes.
2. **Server-Side Verification (SSV)**: Habilitação de funções de validação de criptografia RSA da AdMob para credenciamento seguro de RatsCoins em vídeos premiados.
3. **Data Lake de Métricas**: Estruturação de ingestão assíncrona de eventos via Cloud Pub/Sub para Google BigQuery visando o fornecimento de dashboards corporativos para editoras parceiras.
