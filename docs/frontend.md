# Frontend

## Stack

- React Native 0.81
- Expo SDK 54
- React Navigation 7
- NativeWind
- Zustand

## Organizacao de UI

- Atoms: blocos pequenos reutilizaveis
- Molecules: composicoes funcionais de atoms
- Organisms: componentes complexos de tela
- Screens: fluxo de negocio e composicao final

## Padrões de Qualidade

- Fallback global com `ErrorBoundary`
- Componentes com normalizacao defensiva de dados de usuario/avatar
- Reducao de side-effects nas telas com hooks e stores

## Riscos Atuais

- Backlog de lint em varios arquivos (prettier/import-order/react-hooks rules).
- Necessario ciclo de saneamento de estilo para gate completo no CI.
