# Arquitetura e Estrutura Frontend

## Stack Tecnológica

- **Framework**: React Native 0.81 (Mobile-first)
- **Runtime**: Expo SDK 54
- **Roteamento**: React Navigation 7
- **Estilização**: NativeWind v4 (Tailwind CSS integrado)
- **Gerenciamento de Estado**: Zustand v5 (com separação em fatias / slices)

## Organização de UI

- **Atoms**: Componentes atômicos e reutilizáveis sem regras de negócio (ex: botões base, inputs).
- **Molecules**: Combinações de átomos que executam funções pequenas (ex: cards de livros simples, itens de ranking).
- **Organisms**: Componentes estruturais e complexos compostos por moléculas (ex: cabeçalhos interativos, formulários).
- **Screens**: Telas que encapsulam fluxos de negócio e chamam stores globais.
- **Navigation**: Configurações de Stack e Tabs nativos.

## Padrões e Otimizações Realizadas (Phase 4 & 5)

1. **Performance de Listas Grandes**:
   - Virtualização robusta utilizando componentes estáveis para renderização do feed e biblioteca.
   - Memoização sistemática de itens de renderização (`React.memo`) e callbacks (`useCallback`) para evitar repinturas desnecessárias de componentes filhos.
2. **UX Fluida**:
   - Integração do **Horizontal Pager** estilo Clash Royale na `HomeScreen` com transição suave entre abas e rastreamento analítico em tempo real.
   - Utilização de **Skeleton Loaders** unificados para evitar "layout shifts" durante requisições assíncronas do Firebase.
   - Efeitos visuais dinâmicos como a animação de confetes no popup de desbloqueio de badges (`BadgeUnlockPopup`).
3. **Robustez e Estilo**:
   - Correção de crashes de NativeWind em atualizações futuras pela remoção de estilos de sombra condicional (`shadow-*`).
   - `ErrorBoundary` global cobrindo toda a árvore de renderização do aplicativo com logs de erro automatizados.

## Monetização — UI (RevenueCat)

Estado: **2026-07-28**. SDK integrado e paywall próprio no ar; backend de pagamento (webhooks, Cloud Functions) ainda não existe — ver `docs/monetizacao/0_ROADMAP_IMPLEMENTACAO.md` para o status completo por etapa.

- **`src/ui/screens/PaywallScreen.js`**: tela própria, não usa o template hospedado `RevenueCatUI`/`react-native-purchases-ui`. Motivo: consistência visual total com o design system do app (paleta neutro-quente, tipografia) e remoção de uma etapa de rede (o template hospedado baixa config visual + imagens do dashboard da RevenueCat antes de renderizar; a tela própria não precisa disso). Consome só o SDK core (`getOfferings`/`purchasePackage`/`restorePurchases`) via `monetizationSlice`.
- **`src/ui/hooks/usePaywallPlans.js`**: normaliza o `PurchasesOffering` do SDK num view-model estável (ordenação Mensal→Anual→Vitalício, cópia pt-BR, cálculo de economia %, equivalente mensal do anual formatado na moeda da loja — sem usar `Intl`, cujo suporte no Hermes é inconsistente entre builds). Tem heurística de fallback por identificador do produto caso o `packageType` do RevenueCat venha `CUSTOM`/`UNKNOWN`.
- **`src/ui/components/molecules/PlanCard.js`**: cartão de plano com profundidade real (`perspective` + `rotateX`, sem `shadow-*`/elevation — ver regra abaixo). Referência de padrão para qualquer componente animado novo.
- **Customer Center continua nativo**: `presentCustomerCenter()` (gerenciar/cancelar assinatura) não foi reconstruído — tem integração profunda com fluxos de reembolso da Apple e gerenciamento de assinatura do Google Play que não vale a pena replicar.
- **Guard de ambiente**: `core/api/monetization.js` detecta ausência dos módulos nativos (`NativeModules.RNPurchases`/`RNPaywalls`/`RNCustomerCenter`) e vira NO-OP em vez de crashar — cobre Expo Go e web. Testar de verdade exige development build.

### Regra de animação (Reanimated, não `className`)

Qualquer componente que anima estado (seleção, entrada, press) **precisa** usar Reanimated na prop `style`, nunca alternar classes NativeWind (`shadow-*`, `scale-*`, `translate-*`, `rotate-*`, `animate-*`, `transition-*`, `from-*/via-*/to-*`) entre branches de um `className` condicional. Isso dispara um bug conhecido do `react-native-css-interop` (upgrade-warning path não seguro contra exceção, colide com `NavigationStateContext` do react-navigation) que crasha o dev build. Enforced por `tests/suites/classNameStability.test.js`, que escaneia `src/ui` inteiro e falha o CI se detectar violação. `PlanCard.js` é a referência mais completa: cor de borda/fundo animada via `interpolateColor`, halo de opacidade em vez de sombra, mutação de `sharedValue` via `useRef` (não escrever a variável direto num handler — regra ESLint `react-hooks/immutability`).

## Próximos Desafios

- Saneamento completo de regras estéticas do ESLint em componentes legados de UI.
- Início de automação de fluxo de visualização (testes visuais de snapshot).
- Preencher `LEGAL_LINKS` (Termos/Privacidade) em `PaywallScreen.js` antes de publicar nas lojas — hoje `null`, o BookRats ainda não tem site/domínio.
