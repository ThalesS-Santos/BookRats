# Arquitetura do Sistema

## Visão Geral

O **BookRats** é estruturado seguindo uma arquitetura mobile-first moderna com Expo + React Native, persistência e autenticação serverless integradas ao Firebase (com regras robustas no Cloud Firestore) e controle de estado global baseado no Zustand com slices.

---

## Estrutura do Código (`src/`)

```text
src/
  core/
    api/            # Serviços de chamadas ao Firebase e Google Books API
    constants/      # Constantes de domínio compartilhadas (ex: BOOK_STATUS)
    firebase/       # Configuração e inicialização singleton do SDK Firebase
    observability/  # Framework de telemetria, logger estruturado e transports
    services/       # Lógicas de domínio puras (MilestoneService, ImageCacheService)
    store/          # Zustand store centralizada em slices (auth, gamification, library, social)
    types/          # Tipagens internas do app
    utils/          # Métodos utilitários de backend (normalizadores, conversores)
  hooks/            # React Hooks customizados reutilizáveis
  store/            # Stores de Zustand específicas da UI (popup, theme)
  ui/
    assets/         # Imagens, fontes e animações Lottie locais
    components/     # Elementos reutilizáveis (Atoms, Molecules, Organisms)
    constants/      # Tokens visuais de estilo, cores e espaçamentos
    navigation/     # Configuração de rotas, Tabs e Stacks nativos
    screens/        # Telas completas que compõem os fluxos do app
  utils/            # Validadores defensivos, sanitização de inputs e lógicas puras
```

---

## Estado e Fluxo de Dados

1. **Ação da UI**: O usuário interage com a tela (ex: registra progresso de leitura).
2. **Dispatch na Store**: A tela aciona um método exposto por um slice do Zustand (ex: `librarySlice.updateProgress`).
3. **Observabilidade e Telemetria**: O `Logger` registra a intenção e os dados sanitizados da operação.
4. **Chamada de API**: O slice delega a persistência para o módulo correspondente em `core/api/`.
5. **Validação Defensiva**: A API executa checagens preventivas (`utils/validators`) e sanitiza strings.
6. **Persistência**: Gravação atômica no Firestore (que replica em tempo real graças aos listeners e mantém cache local em SQLite offline).
7. **Sincronização de Estado**: A UI é redesenhada com base no retorno reativo da Zustand store.

---

## Confiabilidade e Robustez

- **Error Boundary Global**: Captura exceções de renderização no aplicativo móvel, exibindo fallback amigável ao usuário e notificando logs sanitizados.
- **ImageCacheService**: Garante carregamento instantâneo de capas de livros e reduz requisições de rede.
- **Suíte Extensa de Testes**: Mais de 890 testes automatizados cobrem comportamentos de estado, lógicas de streak e integrações com o Firebase.
