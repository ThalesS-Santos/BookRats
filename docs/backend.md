# Backend (Serverless)

## Plataforma

- Firebase Authentication
- Cloud Firestore
- Sem API REST dedicada no momento

## Modulos Principais

- `src/core/api/auth.js`: login, cadastro e sessao
- `src/core/api/books.js`: biblioteca, progresso, anotacoes
- `src/core/api/social.js`: amizades, grupos, ranking, echoes

## Regras de Negocio no Client

- Validacao de status, ids e ranges
- Sanitizacao de texto e nome antes de escrita
- Campos sensiveis bloqueados para update direto

## Observabilidade

- `Logger` padroniza logs por nivel (`info`, `warn`, `error`)
- ErrorBoundary captura erros de render com contexto

## Proximos Passos

1. Definir camada opcional de Cloud Functions para operacoes criticas.
2. Mover parte da validacao de ranking para backend dedicado quando necessario.
