# Testes e Qualidade

## Ferramentas

- Jest
- React Native Testing Library
- MSW

## Estrutura

- `tests/suites`: unitarios e integracao
- `tests/mocks`: mocks de rede e firebase
- `tests/factories`: fixtures e builders
- `tests/config`: setup global

## Estado Atual Validado

- Execucao completa local: `56/56` suites e `456/456` testes aprovados.
- Ainda existe backlog de lint global fora do escopo dos testes.

## Comandos

```bash
npm test -- --runInBand
npm run test:coverage -- --runInBand
```

## Politica de Regressao

1. Bug corrigido deve ganhar teste.
2. Falha em teste bloqueia merge.
3. Cobertura deve crescer em modulos de maior risco (`core/api`, `core/store`).
