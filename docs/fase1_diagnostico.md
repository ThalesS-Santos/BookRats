# Fase 1 — Diagnóstico e Controle do Terreno

> Gerado em: 2026-06-11 | Base: commit `8756979`

---

## Etapa 1 — Inventário do que existe e do que está vivo

### Estrutura geral

```
src/
  core/
    api/          → 5 módulos (apiClient, auth, books, googleBooks, social)
    constants/    → 1 (bookStatus)
    firebase/     → 1 (firebase)
    observability/→ 7 (AppError, Logger, errorCatalog, globalHandlers, index, levels, redact, transports)
    services/     → 6 (BadgeListenerService, BookNormalizationService, BookService,
                       Logger¹, MilestoneService, NotificationService, UserNormalizationService)
    store/        → index + 4 slices (auth, gamification, library, social)
    types/        → 1 (index)
  hooks/          → 2 (useBookSearch, useTimer)
  store/          → 3 Zustand stores soltos (usePopupStore, useSocialStore², useThemeStore)
  ui/
    assets/       → 1 (index)
    components/   → atoms(3) + molecules(7) + organisms(4)
    constants/    → 2 (badges, colors)
    hooks/        → 1 (useHomeLogic)
    navigation/   → 2 (AppNavigator, TabNavigator)
    screens/      → 15
  utils/          → 7 (debounce, errorMapper, haptics, sanitize, streak, streakEngine, time, validators)
tests/
  suites/         → 65 arquivos de teste
  factories/      → 2 (BookFactory, UserFactory)
  mocks/          → 2 (handlers, server)
  e2e/            → 3 fluxos CUJ (yaml)
```

### Estado da suíte de testes

| Métrica          | Valor |
|------------------|-------|
| Test suites      | 57    |
| Testes           | 484   |
| Aprovados        | 484 ✅ |
| Falhos           | 0     |
| Tempo médio      | ~10s  |

**Cobertura por camada:**

| Camada            | Cobertura  | Observação                             |
|-------------------|-----------|----------------------------------------|
| `core/api`        | Alta      | api_auth, api_books, api_social, apiClient |
| `core/services`   | Alta      | BadgeListener, MilestoneService, NotificationService |
| `core/store`      | Alta      | todos os 4 slices + store_index        |
| `core/observability` | Alta   | logger, transports                     |
| `ui/components`   | Média-alta | atoms e molecules cobertos; organisms parcial |
| `ui/screens`      | **Frágil** | 13 de 15 screens sem arquivo de teste  |
| `utils`           | Alta      | streak, streakEngine, errorMapper, haptics |

---

## Etapa 2 — Classificação por responsabilidade dominante

### Camada de Apresentação (UI)

Arquivos cuja função principal é renderizar e reagir ao usuário.

| Arquivo | Tipo | Responsabilidade | Mistura? |
|---------|------|-----------------|----------|
| `ui/screens/HomeScreen.js` | Screen | Apresentação | Importa `UserNormalizationService` |
| `ui/screens/GroupsScreen.js` | Screen | Apresentação | **⚠️ Deus** — UI + estado async + animações + modal + search |
| `ui/screens/GroupDetailsScreen.js` | Screen | Apresentação | 12 hooks, importa normalization |
| `ui/screens/TimerScreen.js` | Screen | Apresentação | Importa `addAnnotation` de `@core/api/books` diretamente |
| `ui/screens/EchoDetailScreen.js` | Screen | Apresentação | Importa `getEchoReplies` de `@core/api/social` diretamente |
| `ui/screens/GalleryScreen.js` | Screen | Apresentação | Importa `getPublicEchoes` de `@core/api/social` diretamente |
| `ui/screens/UserProfileScreen.js` | Screen | Apresentação | 521 linhas, importa `getUserDetails` de api diretamente |
| `ui/screens/ProfileScreen.js` | Screen | Apresentação | 466 linhas |
| `ui/screens/BookDetailsScreen.js` | Screen | Apresentação | 463 linhas |
| `ui/screens/RankingScreen.js` | Screen | Apresentação | 9 hooks |
| `ui/components/organisms/BookLoader.js` | Organismo | Apresentação | 260 linhas — candidato a dividir |
| `ui/components/organisms/EchoDeck.js` | Organismo | Apresentação | 252 linhas |
| `ui/hooks/useHomeLogic.js` | Hook de UI | Apresentação | Bem isolado |

### Camada de Domínio (Regras de negócio)

Arquivos que expressam o que o sistema sabe e faz, sem depender de UI ou infraestrutura.

| Arquivo | Tipo | Notas |
|---------|------|-------|
| `core/store/slices/librarySlice.js` | Store/Domínio | 515 linhas — mais gordo do store |
| `core/store/slices/gamificationSlice.js` | Store/Domínio | badges, claps, unlocks |
| `core/store/slices/socialSlice.js` | Store/Domínio | 368 linhas |
| `core/services/MilestoneService.js` | Domínio puro | 177 linhas — bem isolado |
| `core/services/BookNormalizationService.js` | Domínio | Normalização de livros |
| `core/services/UserNormalizationService.js` | Domínio | Importado por **8 screens** |
| `core/services/NotificationService.js` | Domínio/Infra | Limite difuso com Firestore |
| `utils/streakEngine.js` | Domínio puro | Bem isolado, usa `streak.js` |
| `utils/streak.js` | Utilitário de domínio | Funções de data |
| `core/constants/bookStatus.js` | Domínio | Enum de status |
| `ui/constants/badges.js` | Domínio/UI | Dados de badges misturados com assets |

### Camada de Infraestrutura (Integração externa)

Arquivos que falam com Firestore, APIs externas, AsyncStorage, etc.

| Arquivo | Tipo | Notas |
|---------|------|-------|
| `core/api/social.js` | Infra | **866 linhas** — maior do projeto |
| `core/api/books.js` | Infra | 390 linhas |
| `core/api/auth.js` | Infra | 160 linhas |
| `core/api/apiClient.js` | Infra | 168 linhas — HTTP client com retry |
| `core/api/googleBooks.js` | Infra | 113 linhas — API externa |
| `core/firebase/firebase.js` | Infra | Inicialização do SDK |
| `core/services/BadgeListenerService.js` | Infra | Listener Firestore em tempo real |
| `core/observability/` | Infra | Logger estruturado — bem encapsulado |
| **`store/useSocialStore.js`** | Infra + Estado | **⚠️ Duplicação** com `socialSlice` |

### Arquivos candidatos a modularização (misturam 3 camadas)

| Arquivo | Linhas | Problema |
|---------|--------|---------|
| `ui/screens/GroupsScreen.js` | 716 | UI + estado local + search async + modal + animações |
| `ui/screens/UserProfileScreen.js` | 521 | UI + chamada direta à API |
| `ui/screens/TimerScreen.js` | 442 | UI + escrita direta em `@core/api/books` |
| `store/useSocialStore.js` | 322 | Estado + infra Firestore + lazy circular dep |
| `core/api/social.js` | 866 | Módulo monolítico: amizades + grupos + ranking + echoes |

---

## Etapa 3 — Matriz de Prioridade (Impacto × Risco × Esforço)

### Legenda
- **Impacto**: quanto essa área afeta features críticas e estabilidade
- **Risco**: probabilidade de produzir bugs durante mudança
- **Esforço**: complexidade da intervenção

| # | Área | Impacto | Risco | Esforço | Ação recomendada |
|---|------|---------|-------|---------|-----------------|
| 1 | `store/useSocialStore.js` vs `core/store/slices/socialSlice.js` | 🔴 Alto | 🔴 Alto | 🟡 Médio | Consolidar: ranking em `useSocialStore` ou migrar para `socialSlice` |
| 2 | `ui/screens/GroupsScreen.js` (716 linhas, 19 hooks) | 🔴 Alto | 🟡 Médio | 🟡 Médio | Extrair hook `useGroupsLogic` + componentes |
| 3 | Screens importando `@core/api` diretamente (EchoDetail, Gallery, Timer, UserProfile) | 🔴 Alto | 🟡 Médio | 🟢 Baixo | Mover chamadas para services ou store actions |
| 4 | `core/api/social.js` (866 linhas — monolítico) | 🟡 Médio | 🟡 Médio | 🔴 Alto | Dividir em `api/friends.js`, `api/groups.js`, `api/ranking.js`, `api/echoes.js` |
| 5 | 13 screens sem cobertura de testes | 🔴 Alto | 🟡 Médio | 🟡 Médio | Criar testes de integração para fluxos críticos |
| 6 | `core/services/Logger.js` (shim legado) | 🟢 Baixo | 🟢 Baixo | 🟢 Baixo | Migrar call sites restantes; já documentado |
| 7 | `librarySlice.js` (515 linhas) | 🟡 Médio | 🟡 Médio | 🟡 Médio | Avaliar split em fases posteriores |
| 8 | `UserNormalizationService` em 8 screens | 🟢 Baixo | 🟢 Baixo | 🟢 Baixo | Aceitável — serviço utilitário sem side effects |

---

## Etapa 4 — Rede de Segurança: Cobertura atual e lacunas

### Fluxos cobertos (seguros para refatorar)

| Fluxo | Arquivos de teste | Tipo |
|-------|------------------|------|
| Auth (login/logout/token) | `api_auth.test.js`, `authSlice.test.js`, `auth_integration.test.js` | Unit + Integração |
| Biblioteca (adicionar/editar/status) | `api_books.test.js`, `librarySlice.test.js`, `library_status.test.js`, `library_integrity.test.js` | Unit + Integração |
| Gamificação (badges, claps, streak) | `gamificationSlice.test.js`, `badge_logic.test.js`, `badge_listener.test.js`, `streakEngine.test.js` | Unit |
| Social (amigos, notificações) | `api_social.test.js`, `socialSlice.test.js` | Unit |
| Milestone | `MilestoneService.test.js` | Unit |
| Store (persistência, migração) | `store_index.test.js` | Integração |
| API client (retry, erro) | `apiClient.test.js` | Unit |
| Logger/Observability | `logger.test.js`, `infrastructure.test.js` | Unit |

### Fluxos frágeis (sem rede de segurança)

| Fluxo | Risco | Observação |
|-------|-------|-----------|
| **GroupsScreen** — criar grupo, buscar amigos, trocar de tab | 🔴 Crítico | 716 linhas sem teste |
| **TimerScreen** — sessão de leitura, anotação, pausa | 🔴 Crítico | Escreve em Firestore via API direta |
| **ProfileScreen** — edição de perfil, exibição de badges | 🟡 Alto | 466 linhas sem teste |
| **BookDetailsScreen** — marcação de páginas, change de status | 🟡 Alto | 463 linhas sem teste |
| **UserProfileScreen** — follow, ranking, perfil público | 🟡 Alto | Chamada direta à API |
| **NotificationsScreen** — marcar como lida | 🟡 Alto | Sem teste |
| `useSocialStore` — ranking subscribe/unsubscribe | 🟡 Alto | Circular dependency manual com `require` |

### Foco de proteção antes de qualquer refatoração

Antes de mexer nos arquivos da prioridade 1–3 (social store, GroupsScreen, screens com API direta), criar ao menos:

1. **`GroupsScreen.test.js`** — testar: carregamento de grupos, busca de amigos, criação de grupo (mockado), mudança de tab
2. **`TimerScreen.test.js`** — testar: iniciar/pausar/finalizar sessão, dispatch de addAnnotation
3. **`useSocialStore.test.js`** (ou expandir `socialSlice.test.js`) — testar: subscribe ranking, unsubscribe cleanup, syncFromMain mirror

---

## Resumo executivo

O projeto está em estado **sólido na camada de infra/domínio** e tem uma **base de testes forte para o núcleo** (484 testes, 100% passando). A arquitetura em camadas está bem intencionada, mas dois problemas estruturais se destacam:

**Problema 1 — Estado social duplicado:** `useSocialStore.js` e `socialSlice.js` dividem responsabilidades sobrepostas (ranking, grupos, amigos) com um bridge circular manual via `require` lazy. Isso é a maior fonte de confusão de estado e risco de bugs silenciosos.

**Problema 2 — God screens sem testes:** GroupsScreen (716 linhas, 19 hooks) e TimerScreen (442 linhas com escrita direta em API) são as telas mais complexas e estão completamente descobertas por testes. Qualquer mudança aqui é no escuro.

**Próximo passo recomendado:** criar a rede de segurança (testes) para GroupsScreen e TimerScreen antes de qualquer refatoração estrutural.
