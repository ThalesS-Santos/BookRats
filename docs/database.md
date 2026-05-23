# Banco de Dados e Regras

## Colecoes

1. `users/{userId}`

- perfil, estatisticas e `socialSummary`

2. `users/{userId}/books/{bookId}`

- dados de livro, progresso e status

3. `users/{userId}/books/{bookId}/annotations/{annotId}`

- Echoes, claps e replies

4. `users/{userId}/notifications/{notificationId}`

- notificacoes in-app

5. `friendships/{friendshipId}`

- fluxo de amizade (`pending`, `accepted`, `rejected`)

6. `groups/{groupId}` e `groups/{groupId}/messages/{messageId}`

- grupos e chat

## Seguranca Aplicada nas Rules

- Dono do documento so grava no proprio namespace.
- Atualizacao de ranking com limites de delta para reduzir fraude.
- Mensagens de grupo sem update/delete direto.
- `annotations` por terceiros apenas com incrementos controlados (`claps` e `replyCount`).

## Checklist Operacional

- Usuario so escreve seus livros: implementado.
- Echo publico sem edicao arbitraria por terceiro: implementado.
- Aceite de friend request por destinatario: implementado nas regras e validacao client.
- Ranking sem escrita livre em campos sensiveis: implementado.

Referencia oficial: `firestore.rules`.
