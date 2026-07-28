# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão Geral

BookRats é um app social de leitura mobile-first (Expo + React Native), com autenticação, persistência e sincronização em tempo real via Firebase/Firestore, estado global em Zustand (slices) e estilização com NativeWind (Tailwind). Funcionalidades nucleares: biblioteca/progresso de leitura, anotações contextuais por página ("Echoes" com claps e respostas), rede de amizades, grupos com chat em tempo real, ranking semanal, gamificação (streaks, badges/conquistas via `MilestoneService`) e estatísticas de leitura. Há uma fase de monetização em planejamento ativo (assinaturas, afiliados, microtransações, ads, parcerias B2B) documentada em `docs/monetizacao/`.

## Estado atual & memória entre chats (LER PRIMEIRO)

> Esta seção é a "memória" que persiste entre chats. Atualize-a ao concluir um bloco de trabalho. Para o histórico linha a linha, use `git log`.

### ⏳ Pendências ativas (fazer / não esquecer)

- **DEPLOY das regras do Firestore**: `firebase deploy --only firestore:rules`. Várias correções de segurança já estão no `firestore.rules` local mas **só valem depois do deploy** (ficam inertes no servidor até lá). Um único deploy leva todas.
- **Monetização — Fase 3/4 do roteiro (SDK do RevenueCat + Paywall) concluída no cliente; backend (Fase 1/2) ainda não existe**. Roteiro completo de 73 etapas em `docs/monetizacao/0_ROADMAP_IMPLEMENTACAO.md`; ameaças e controles específicos em `docs/monetizacao/6_seguranca_monetizacao.md`. **O que já funciona** (2026-07-28): SDK do RevenueCat integrado (`src/core/api/monetization.js`, `src/core/store/slices/monetizationSlice.js`, `src/core/constants/products.js`), ciclo de vida amarrado ao `authSlice` (login → `initializeMonetization(uid)`, logout → `teardownMonetization()`), e uma **PaywallScreen própria** (não usa o template hospedado `react-native-purchases-ui`) — detalhes no próximo bullet. **Ressalva importante de arquitetura**: como as Cloud Functions ainda não existem, `isPro` é derivado **direto do `CustomerInfo` do SDK RevenueCat** (`entitlements.active`), não de um doc `users/{uid}.subscription` espelhado via webhook como o roteiro original desenhava (Etapa 6/24) — é um estado transitório aceitável (a RevenueCat já valida a assinatura do lado dela), mas **não é a arquitetura final**: qualquer lógica de servidor que precise saber se um usuário é Pro (ex: liberar conteúdo via Cloud Function) ainda não tem onde ler isso no Firestore. Isso só se resolve com a Fase 2 (webhook `revenueCatWebhook.js` gravando `users/{uid}.subscription`). Pasta `functions/` (projeto Node separado, `firebase-admin@14.2.0` + `firebase-functions@7.3.0` — pinado em versão estável porque o dist-tag `latest` do npm estava numa release candidate `7.3.2-rc.0` no momento da instalação; reverificar se já saiu uma estável mais nova antes de repinar) já existe com lint/test próprios (`npm run functions:check` na raiz) e `firebase.json` já registrando `functions`/`emulators`, mas **está vazia de lógica de negócio** — é só o scaffold da Etapa 3. `functions/` tem 12 vulnerabilidades `high`/`moderate` no `npm audit` (mesma cadeia transitiva `brace-expansion`→`minimatch`→`glob`/`rimraf` de dentro do `google-gax`, usado pelo `firebase-admin`) — só corrigem com downgrade grande do `firebase-admin` (não vale a pena); mesmo padrão de pendência aceita que o projeto já documenta em `docs/security.md`. **Falta antes de publicar nas lojas**: preencher `LEGAL_LINKS` (Termos/Privacidade) em `PaywallScreen.js` — hoje é `{ terms: null, privacy: null }` porque o BookRats **ainda não tem site nem domínio**; sem essas URLs a Apple/Google rejeitam o app no review. Também faltam: contas externas (RevenueCat em produção — hoje só tem chave de teste `test_OOHgPoyoRISjSVNHXKMlCHjkOFk`, AdMob, Play Console, Apple Developer), ativar plano Blaze no Firebase (**exige o usuário fazer manualmente** — envolve cartão de pagamento), produtos cadastrados na Play Console/App Store Connect e importados pro RevenueCat, e todo o código de webhooks/callables/Firestore rules novas (Fase 1 em diante do roteiro). Princípio inegociável do roteiro, que continua valendo mesmo com o cliente lendo `isPro` do SDK: **nenhum campo financeiro pode ser escrito pelo cliente direto no Firestore** — quando a Fase 2 existir, sempre via Cloud Function validando assinatura de webhook.
- **Paywall é tela própria do app, não o template hospedado da RevenueCat**: `src/ui/screens/PaywallScreen.js` + `src/ui/components/molecules/PlanCard.js` + `src/ui/hooks/usePaywallPlans.js`. Decisão tomada a pedido do usuário (visual consistente com o design system do app, sem depender de configuração no dashboard de terceiros, e elimina uma etapa de rede lenta — o fetch da config visual/imagens do paywall hospedado). O **Customer Center** (gerenciar/cancelar assinatura) continua **nativo** (`presentCustomerCenter()` da `react-native-purchases-ui`) — não vale reconstruir isso, tem integração profunda com reembolso da Apple/gerenciamento do Google Play. Regras de animação que essa tela segue (evita o crash do css-interop) estão no bullet sobre Reanimated, na seção de invariantes abaixo.
- **Expo Go não roda o paywall (nem qualquer coisa que use `react-native-purchases`)**: é um app pré-compilado sem esse módulo nativo. `core/api/monetization.js` detecta isso via `NativeModules` (`SUPPORTED_CORE`/`SUPPORTED_UI`) e vira NO-OP em vez de crashar — mas pra **testar de verdade** precisa de development build (`npx expo run:android`/`ios`), mesma exigência já documentada abaixo para `expo-notifications`. Pra testar num celular físico sem instalar o `expo-dev-client`: o debug APK do emulador (`android/app/build/outputs/apk/debug/app-debug.apk`) já inclui `arm64-v8a` — só `adb install -r` + `adb reverse tcp:8081 tcp:8081` + `npx expo start`, sem rebuild.
- **Expo 54 é estável — manter por enquanto** (testado 2026-07-15: Expo 55+ quebra por conflitos de `react-native-worklets` vs `expo-modules-core`, e Expo 57 requer RN 0.83+ mas projeto tá em 0.81.5). Upgrade futuro: planejado pra quando a stack estiver mais madura; fazer gradual 54→55→56→57 com testes a cada passo.

### ✅ Decisões e invariantes recentes (não quebrar)

- **Grupos multi-admin**: o campo autoritativo é `admins` (array de uids); grupos legados caem no fallback `[adminId]`. A lógica vive em `src/utils/groupRoles.js` (`getGroupAdmins`/`isGroupAdmin`/`getOldestMemberId`) e **precisa espelhar** o helper `groupAdmins()` no `firestore.rules`. Papéis: membro comum só **sai** (remove a si mesmo) e **convida** (adiciona outros); admin tem controle total (expulsar, convidar, promover admins, editar). Invariantes das regras: grupo nunca fica sem admin (`admins.size() >= 1`) e todo admin é membro (`members.hasAll(admins)`). Sucessão: quando o **último** admin sai, o membro mais antigo (`members[0]` restante) vira admin — isso é **política do cliente** no `leaveGroup`, não é forçado pela regra (regra só garante "sempre há admin").
- **Regras do Firestore corrigidas** (motivo: eram estritas demais para gravações legítimas): `safeIntDelta` agora permite **decréscimos** (editar páginas p/ baixo, des-concluir livro) e só limita aumentos; `readingLogs` permite UPDATE do dono (com `pagesRead` monotônico) — antes bloqueava a 2ª leitura do dia; `safeStreakDelta` aceita `next == 1` (retomar após falha).
- **Repair de `socialSummary`** (`librarySlice.fetchUserData`) ignora snapshots de cache (`docSnap.metadata?.fromCache`) — só repara com dados do servidor, evitando `permission-denied` no cold start.
- **Notificações**: `PushNotificationService` (`core/services/`) é 100% **local** (sem FCM), re-ancorado na atividade. É **NO-OP no Expo Go** (SDK 53+ perde suporte) via detecção com `expo-constants` + `require` preguiçoso de `expo-notifications`. Para VER notificações é preciso um **development build** (`npx expo run:android`), não Expo Go. Doc de push por servidor (futuro): `docs/NOTIFICACOES_PUSH_SERVIDOR.md`.
- **Escalabilidade**: listener de chat usa `limit(50)`; FlatLists de Notifications/EchoDetail/GroupChat têm props de virtualização (chat invertido **sem** `removeClippedSubviews` — bug de células em branco no Android).
- **Deduplicações**: `TrophyWallSection` (organism) é usado por `ProfileScreen` e `UserProfileScreen`; `subscribeFriendshipsByField` unifica sent/received em `social.js`.
- **`updateBook` (`librarySlice`) é atômico**: usa `updateBookWithStats` (`core/api/books.js`), que agrupa doc do livro + stats do usuário (`users/{uid}`) + reading log do dia numa única `writeBatch` — ou tudo aplica, ou nada aplica. Substituiu o padrão antigo de 3 escritas independentes (`updateDoc` + `updateDoc` + `addReadingLog`) que podia deixar estado parcial se a conexão caísse no meio. `updateBookStatus`/`markAsDNF` continuam usando o `updateBook` simples (1 escrita só, sem stats) — não precisam de batch.
- **Firestore lento / listeners demorados no React Native**: causa é o transporte WebChannel/streaming padrão do SDK JS, que a stack de rede do RN não suporta bem. Corrigido com `experimentalForceLongPolling: true` em `initializeFirestore` (`core/firebase/firebase.js`) — essa flag só é lida na inicialização do app, então **Fast Refresh não pega a mudança**; é preciso reiniciar o Metro (`npx expo start -c`) e recarregar o app inteiro para testar.
- **Skeleton da Home nunca detectar por prefixo de id**: `useHomeLogic`/`HomeScreen` usam a flag explícita `item.isSkeleton` (mesmo padrão do `GroupsScreen`). Um bug antigo detectava skeleton via `item.id.startsWith('s')`, o que renderizava como skeleton permanente qualquer livro real cujo ID do Google Books começasse com "s". A Home também já renderiza os livros do cache local (`AsyncStorage`, via `persist`) imediatamente no cold start, sem esperar o listener do Firestore responder.
- **Paleta visual é neutro-quente, não slate/azul**: dark = preto/`#121212`/`#262626`, light = `#F5F3E7`/`#FDFCF5`, acento sage `#A7C9A7`/`#5B8C5A`. Tokens da família slate/navy (`#0F172A`, `#1E293B`, `#111827`, `#020617`) foram removidos de `tailwind.config.js`/`colors.js` e de dezenas de telas — não reintroduzir. `shadow-*` (vira `elevation` no Android) foi removido de elementos animados/pressionáveis porque a combinação elevation+opacity renderiza como retângulo preto sólido no Android; se precisar de sombra num card assim, usar `Platform.OS === 'ios'` para aplicar só em iOS.
- **Animação em componentes novos: sempre Reanimated na prop `style`, nunca em `className` condicional**. Regra já existente (ver bug de upgrade do css-interop acima) mas reforçada com a `PaywallScreen`/`PlanCard`: qualquer classe que dispare upgrade do css-interop (`shadow-*`, `scale-*`, `translate-*`, `rotate-*`, `animate-*`, `transition-*`, `from-*/via-*/to-*`) aparecendo só num branch de um `className` ternário/`&&` **crasha o dev build** — enforced por `tests/suites/classNameStability.test.js`, que escaneia `src/ui` inteiro. `PlanCard.js` é o exemplo mais completo do padrão correto: profundidade via `perspective`/`rotateX`, cores de estado via `interpolateColor` (não trocando classes), halo de opacidade animada em vez de `shadow-*`/elevation (mesmo motivo do retângulo preto no Android, ver item acima). Mutação de `sharedValue.value` em handlers (`onPressIn`/`onPressOut`) precisa passar por `useRef` (não escrever a variável direto) — regra ESLint `react-hooks/immutability`; ver `BadgeUnlockPopup.js` ou `PlanCard.js` para o idioma (`animRef.current.x.value = ...`).
- **`updatePresence` (`core/api/auth.js`) só escreve se `auth.currentUser.uid` bate com o uid alvo**: corrige um `permission-denied` (nível ERROR, mas inofensivo) que aparecia no logout — o cleanup do listener de `AppState` em `App.js` roda *depois* que o token já foi revogado, disparando uma segunda escrita de presença sem sessão. O `isOnline: false` real já tinha sido gravado por `authSlice.signOut` antes de derrubar o token; o guard só suprime a tentativa redundante e sem permissão. Padrão a repetir: qualquer escrita que possa ser chamada depois de um signOut (via cleanup de efeito, listener assíncrono, etc.) deveria ter esse mesmo guard na fronteira da API.

### 🤖 Subagents disponíveis (`.claude/agents/`)

- `firestore-rules-reviewer` — rodar após qualquer diff em `firestore.rules`, `core/api/*`, `validators.js`, `sanitize.js`.
- `test-writer` — só quando o usuário pedir testes explicitamente.

## Comandos

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento (Expo). Atalhos no terminal: a=Android, i=iOS, w=Web
npm run start
npm run android      # expo run:android
npm run ios          # expo run:ios
npm run web           # expo start --web

# Lint e formatação
npm run lint          # eslint .
npm run format         # prettier --write .

# Testes (sempre --runInBand — ver "Testes" abaixo para o porquê)
npm test -- --runInBand
npm run test:coverage -- --runInBand

# Rodar um único arquivo/suíte de teste
npx jest --config tests/config/jest.config.js --runInBand tests/suites/<arquivo>.test.js

# Rodar testes cujo nome bate com um padrão
npx jest --config tests/config/jest.config.js --runInBand -t "<nome do describe/it>"

# Auditoria de dependências (nível high/critical)
npm run audit:high

# Gate completo de qualidade (lint + testes + audit) — usar antes de qualquer PR
npm run check
npm run check:gate
```

Limpar cache do Metro em caso de comportamento estranho: `npx expo start -c`.

## Arquitetura

### Separação `core/` vs `ui/`

```
src/
  core/
    api/            # Chamadas ao Firebase e à Google Books API (auth.js, books.js, social.js, googleBooks.js)
    constants/       # Constantes de domínio (ex: BOOK_STATUS)
    firebase/        # Inicialização singleton do SDK Firebase (firebase.js)
    observability/   # Logger estruturado, catálogo de erros, sanitização, transports, handlers globais
    services/        # Lógica de domínio pura (MilestoneService, BookNormalizationService, ImageCacheService, BadgeListenerService, PushNotificationService)
    store/           # Store Zustand raiz (index.js) + slices (auth, library, gamification, social) + selectors
    types/            # Tipagens internas
    utils/            # Normalizadores/conversores de backend
  hooks/              # Hooks React reutilizáveis e agnósticos de UI
  store/              # Stores Zustand específicas de UI (popupStore, themeStore, useSocialStore) — separadas do core/store
  ui/
    components/       # Atomic Design: atoms/ → molecules/ → organisms/ (+ stats/ para gráficos)
    constants/         # Tokens visuais (cores, espaçamento)
    navigation/         # AppNavigator (stack) + TabNavigator
    screens/            # Telas completas, uma por fluxo de negócio
  utils/                # Validação defensiva e sanitização (validators.js, sanitize.js), lógica pura (streak.js, streakEngine.js, stats.js)
```

Regra prática: lógica de negócio, chamadas de API e estado vivem em `core/`; `ui/` só compõe telas a partir do que `core/` expõe. `src/store/` (raiz) é diferente de `src/core/store/` — o primeiro é estado local de UI (tema, popups), o segundo é o estado global de domínio (`useMainStore`).

### Path aliases

Definidos em três lugares que precisam ficar sincronizados: `babel.config.js` (module-resolver), `jsconfig.json` e `tests/config/jest.config.js` (`moduleNameMapper`):

```
@core/*       → src/core/*
@ui/*         → src/ui/*
@utils/*      → src/utils/*
@hooks/*      → src/hooks/*
@constants/*  → src/ui/constants/*
@tests/*      → tests/*
```

Se adicionar um alias novo, atualize os três arquivos.

### Fluxo de dados

UI dispara método de um slice do Zustand (`useMainStore`) → slice chama `core/api/*` → API valida (`utils/validators.js`) e sanitiza (`utils/sanitize.js`) → grava no Firestore → listeners em tempo real atualizam a store → UI re-renderiza de forma reativa. Erros e eventos relevantes passam pelo `Logger` centralizado (`core/observability/`), que mascara dados sensíveis antes de logar.

### Store Zustand raiz (`src/core/store/index.js`)

Um único `useMainStore` (via `create` + `subscribeWithSelector` + `persist`) combina os 4 slices (`auth`, `library`, `gamification`, `social`). O dado é dividido em três camadas — respeite essa separação ao adicionar novo estado:

1. **Persistido** (`AsyncStorage`, sobrevive a restart): apenas o que está explicitamente na whitelist do `partialize` — dados de biblioteca (`books`, `streak`, `totalPagesRead`, `lastReadDate`, `maxReadingSession`, `totalBooksCompleted`, `announcedMilestones`) e gamificação (`totalClaps`, `unlockedBadges`).
2. **Sessão** (em memória, reconstruído a cada launch): tudo que não está no `partialize` — auth (usuário/tokens/loading) e todo o estado social/notificações/chat/ranking, porque são re-hidratados via listeners do Firestore no login; persistir arriscaria servir dado obsoleto.
3. **Derivado** (nunca armazenado): computado sob demanda em `core/store/selectors.js` ou via `useMemo`/hooks na UI, para nunca dessincronizar da fonte.

Há um `migrate()` versionado no `persist` (atualmente `version: 2`) para lidar com upgrades de schema local em usuários que já têm o app instalado — qualquer mudança no shape do estado persistido precisa de uma entrada de migração aqui.

### Firebase (`src/core/firebase/firebase.js`)

Inicialização singleton com guarda `getApps().length === 0` para sobreviver ao Fast Refresh do Expo sem duplicar o app. Auth usa `initializeAuth` com `getReactNativePersistence(AsyncStorage)` na primeira inicialização e `getAuth`/`getFirestore` nas subsequentes. Variáveis de ambiente via `EXPO_PUBLIC_FIREBASE_*` (ver `.env.example` — nunca commitar `.env` real).

### Modelo de dados Firestore

```
users/{userId}                                    → perfil, estatísticas, socialSummary
users/{userId}/books/{bookId}                      → progresso e status do livro
users/{userId}/books/{bookId}/annotations/{annotId} → Echoes (claps, replies)
users/{userId}/notifications/{notificationId}       → notificações in-app
friendships/{friendshipId}                          → pending | accepted | rejected
groups/{groupId} e groups/{groupId}/messages/{id}   → grupos e chat
```

Grupos têm `admins` (array, multi-admin; fallback legado `adminId`) e `members` (array, ordenado por entrada — usado para `array-contains` e para a sucessão de admin). Ver a seção "Estado atual" acima e `src/utils/groupRoles.js`.

Regras de segurança (`firestore.rules`, ver `docs/database.md` e `docs/security.md`): princípio de menor privilégio (`isOwner`), updates de ranking com limite de delta (antifraude — só limita **aumentos**, decréscimos são livres), mensagens de grupo sem update/delete direto pelo cliente, `annotations` de terceiros só com incrementos controlados (`claps`/`replyCount`), fluxo de amizade sem auto-relação, e grupos com papéis admin/membro (membro comum não expulsa terceiros nem esvazia `members`). Qualquer mudança em `firestore.rules` deve manter esses invariantes e ser revisada à parte com o subagent `firestore-rules-reviewer` (é a superfície mais sensível do repo).

### Observabilidade

`core/observability/` fornece um logger estruturado com níveis (`DEBUG`/`INFO`/`WARN`/`ERROR`/`FATAL`), `AppError`/`errorCatalog` para erros tipados, `redact.js` para mascarar PII/segredos antes de logar, e `globalHandlers` instalados no boot do `App.js` para capturar erros não tratados. Use o `Logger` central em vez de `console.log` direto em código novo.

## Testes

- Framework: Jest + `jest-expo`, React Native Testing Library, MSW para mockar a Google Books API.
- Estrutura em `tests/`: `suites/` (testes unitários/integração), `mocks/` (handlers MSW + mocks do Firebase/Firestore), `factories/` (`BookFactory`, `UserFactory`), `config/` (`jest.config.js`, `jest.setup.js`), `e2e/flows/*.yaml` (fluxos E2E declarativos por CUJ — auth, biblioteca, social — ainda não integrados ao CI).
- `jest.config.js` tem `rootDir: '../../'` (relativo à sua própria localização em `tests/config/`) e replica os mesmos path aliases do Babel via `moduleNameMapper`.
- **Sempre rode com `--runInBand`**: os mocks de Firebase/Firestore têm estado compartilhado entre testes e colidem em execução paralela.
- `tests/suites/BookCover.test.js` está em `testPathIgnorePatterns` — erro conhecido de interação Babel/NativeWind CSS-interop, fora do escopo para corrigir ad-hoc.
- Política de regressão: bug corrigido exige teste de regressão correspondente; `core/api`, `core/store` e cálculos novos de gamificação precisam de cobertura mínima de 90%; testes quebrados bloqueiam merge em `main`.

## Lint e CI

- ESLint (`eslint:recommended` + `react`/`react-hooks`/`react-native`/`import` + `eslint-config-prettier`) com `import/order` estrito: grupos `builtin → external → internal → parent/sibling → index`, `@core/**`/`@ui/**`/`@constants/**` tratados como `internal`, alfabetizado, com linha em branco entre grupos. Siga esse agrupamento ao escrever imports novos.
- **CI está desativado** (`.github/workflows/quality-gates.yml.disabled`) até o backlog de lint legado ser saneado — não assuma que `npm run lint` está limpo hoje; rode antes de confiar no gate.
- `npm run check:gate` é o gate local completo (lint + testes + audit) e é o comando de referência antes de abrir PR, mesmo com o CI remoto desligado.

## Documentação de referência

- `docs/ARCHITECTURE.md`, `docs/frontend.md`, `docs/backend.md`, `docs/database.md` — arquitetura por camada.
- `docs/security.md` — controles de segurança (rules, validação, sanitização, dependências, logging).
- `docs/testing.md`, `docs/specifications.md`, `docs/UI_UX_GUIDE.md` — qualidade, escopo funcional, princípios de UI.
- `docs/monetizacao/0_ROADMAP_IMPLEMENTACAO.md` — roteiro de 73 etapas com status por etapa (Fase 3/4 = SDK + Paywall concluídas; Fase 1/2 = backend, não iniciada).
- `docs/monetizacao/1..5` — specs de assinaturas, afiliados, microtransações/gamificação, ads in-app, parcerias com editoras (planejamento original; ver nota de status no topo do doc 1 sobre onde a implementação real diverge do exemplo de código do spec).
- `docs/monetizacao/6_seguranca_monetizacao.md` — ameaças e controles específicos de monetização (checklist pré-deploy do `functions/`).
- `ROADMAP.md` — fases concluídas/planejadas do projeto.
