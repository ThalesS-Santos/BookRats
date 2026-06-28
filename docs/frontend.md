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

## Próximos Desafios
- Saneamento completo de regras estéticas do ESLint em componentes legados de UI.
- Início de automação de fluxo de visualização (testes visuais de snapshot).
