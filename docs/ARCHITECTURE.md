# Arquitetura

## Visao Geral

BookRats segue arquitetura mobile-first com Expo + React Native, backend serverless no Firebase e estado global com Zustand em slices.

## Estrutura

```text
src/
  core/
    api/         # Integracao Firebase e APIs externas
    constants/   # Constantes de dominio (ex: BOOK_STATUS)
    firebase/    # Bootstrap e singleton Firebase
    services/    # Logger, normalizadores e servicos de dominio
    store/       # Store principal com slices
  hooks/         # Hooks reutilizaveis de logica
  store/         # Stores auxiliares (theme, popup, social local)
  ui/
    components/  # Atoms / Molecules / Organisms
    constants/   # Tokens e configuracao visual
    navigation/  # Stack/Tab navigation
    screens/     # Telas
  utils/         # Utilitarios puros (sanitize, validators, streak, etc)
```

## Estado e Fluxo de Dados

1. Tela dispara acao no store.
2. Slice chama modulo de `core/api`.
3. API valida/sanitiza e grava no Firebase.
4. Store sincroniza estado local e UI atualiza.

## Confiabilidade

- Error boundary global com contexto de rota/usuario.
- Logger centralizado com sanitizacao de dados sensiveis.
- Suite de testes extensa com mocks de Firebase e rede.

## Seguranca

- Firestore Rules com principio de menor privilegio.
- Validacao defensiva de status, ids, ranges e campos protegidos.
- Sanitizacao de texto antes de persistencia.
