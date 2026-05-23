# Security Guide

## Objetivo

Definir controles minimos de seguranca para dados, regras, validacao e dependencias.

## 1. Firestore Rules

Arquivo fonte: `firestore.rules`

Controles implementados:

- principio de menor privilegio (`signedIn`, `isOwner`)
- update protegido para campos de ranking
- restricao de update em `annotations` para incrementos controlados
- fluxo de amizade sem auto-relacao
- mensagens de grupo sem update/delete cliente

## 2. Validacao Defensiva

Arquivos:

- `src/utils/validators.js`
- `src/core/api/books.js`
- `src/core/api/social.js`

Regras:

- status em `VALID_STATUSES`
- ids obrigatorios para update/delete
- pagina nao negativa e nao acima do total
- friend request com sender != receiver

## 3. Sanitizacao

Arquivo: `src/utils/sanitize.js`

- trim
- compactacao de espacos
- limite de tamanho
- filtros de username

## 4. Dependencias

Comando:

```bash
npm run audit:high
```

Estado atual:

- sem `high` e sem `critical`
- existem pendencias `low/moderate` que dependem de upgrades maiores (ex: Expo/MSW)

## 5. Logging Seguro

Arquivo: `src/core/services/Logger.js`

- mascara dados sensiveis
- separa niveis (`info`, `warn`, `error`)
- reduz exposicao de detalhes em producao
