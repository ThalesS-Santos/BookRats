# Setup Local

## Requisitos

- Node.js 18+
- npm 9+
- Expo CLI (via `npx expo`)

## Instalacao

```bash
npm install
```

## Execucao

```bash
npm run start
```

Atalhos no terminal Expo:

- `a`: Android
- `i`: iOS
- `w`: Web

## Qualidade Local

```bash
npm run lint
npm test -- --runInBand
npm run test:coverage -- --runInBand
npm run audit:high
npm run check:gate
```

## Diagnostico Rapido

1. Limpar cache Metro:

```bash
npx expo start -c
```

2. Verificar testes:

```bash
npm test -- --runInBand
```

3. Verificar auditoria de dependencia:

```bash
npm run audit:high
```
