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

Estado atual (2026-07-28):

- **regressao aberta**: `firebase@12.10.0` traz `websocket-driver` com 1 `critical` + 3 `high`
  (cadeia `@firebase/database` → `faye-websocket` → `websocket-driver`). Correcao
  nao-destrutiva disponivel via `npm audit fix` (sem `--force`) — ainda nao aplicada,
  ver `docs/project_status.md`.
- `functions/` (projeto separado) tem 12 vulnerabilidades `high`/`moderate` aceitas,
  cadeia `google-gax`/`firebase-admin` — ver `CLAUDE.md`.
- existem pendencias `low/moderate` adicionais que dependem de upgrades maiores (ex:
  Expo/MSW)

## 5. Fronteira de autenticacao em escritas assincronas

Padrao a seguir em qualquer escrita que possa disparar depois de um `signOut` (cleanup de
efeito React, listener assincrono, callback atrasado): validar `auth.currentUser?.uid`
contra o uid alvo **antes** de escrever, mesmo que a regra do Firestore ja bloqueie —
evita erro `permission-denied` ruidoso (nivel ERROR) por uma tentativa que nunca deveria
ter sido feita. Exemplo: `updatePresence` em `src/core/api/auth.js` (corrigido
2026-07-28 — ver `CLAUDE.md`).

## 6. Logging Seguro

Arquivo: `src/core/services/Logger.js`

- mascara dados sensiveis
- separa niveis (`info`, `warn`, `error`)
- reduz exposicao de detalhes em producao
