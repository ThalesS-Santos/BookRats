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

- **`critical` corrigido**: `npm audit fix` (sem `--force`) resolveu o `websocket-driver`
  (`firebase@12.10.0` → `@firebase/database` → `faye-websocket` → `websocket-driver`
  0.7.4 → 0.7.5) junto com mais 6 pacotes bumpados em versao de patch
  (`brace-expansion`, `shell-quote`, `tar`) — `package.json` nao mudou, so
  `package-lock.json`. `0/0 low/critical` nesse ponto.
- **`npm run audit:high` continua nao-limpo, mas por um motivo diferente**: apos o fix
  acima, o `npm audit` passou a reportar **43 `high`** (antes reportava so 3 — o numero
  antigo estava sub-contando por causa de como o npm deduplica caminhos de vulnerabilidade
  antes de um `audit fix`; o diff do lockfile mostra que nenhum pacote novo foi
  introduzido, so patches). A cadeia e a mesma ja aceita em `functions/`:
  `brace-expansion`→`minimatch`→`glob`/`eslint`/`@expo/*`/`jest-config`. Toda correcao
  restante exige `npm audit fix --force`, que forcaria: downgrade de `eslint-plugin-react`
  para `7.22.0`, bump major do `msw` (2.x, breaking), e **Expo 57** — que o `CLAUDE.md` ja
  documenta como incompativel com a stack atual (RN 0.81.5, conflito com
  `react-native-worklets`). **Nao aplicar `--force`** ate o upgrade gradual do Expo (54→57)
  planejado no `CLAUDE.md` acontecer.
- `functions/` (projeto separado) tem 12 vulnerabilidades `high`/`moderate` aceitas,
  mesma cadeia `google-gax`/`firebase-admin` — ver `CLAUDE.md`.

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
