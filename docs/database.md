# Banco de Dados (Firestore) - Schema e Regras

O **BookRats** utiliza o [Cloud Firestore](https://firebase.google.com/docs/firestore) como banco de dados NoSQL. A segurança e modelagem de dados são garantidas pelo arquivo `firestore.rules`.

---

## 1. Schema das Coleções

### `users` (Coleção Global)
Perfil público/privado do leitor.
- **Campos Principais:** `displayName`, `photoURL`, `isInfluencer`, `current_streak`, `total_pages_read`.
- **`socialSummary`:** Objeto denormalizado para acesso rápido às estatísticas sociais.

### `users/{userId}/books` (Subcoleção)
Biblioteca pessoal.
- **Campos Principais:** `title`, `authors`, `thumbnail`, `currentPage`, `totalPages`, `status` (reading, finished, want_to_read).
- **`readingSessions`:** Subcoleção de logs diários de tempo e páginas lidas.

### `users/{userId}/books/{bookId}/annotations` (Subcoleção)
Os famosos **Echoes**.
- **Campos Principais:** `text`, `pageLocation`, `isPublic`, `reactions` (claps), `replyCount`.
- **Relacionamentos:** `parentEchoId` permite aninhamento infinito de respostas.

### `notifications` (Coleção Global / Collection Group)
Notificações in-app.
- **Tipos:** `reply`, `clap`, `friend_request`, `group_invite`.
- **Status:** `read` (boolean) para controle de visualização.

### `groups` (Coleção Global)
Clubes do livro.
- **Campos Principais:** `name`, `description`, `category`, `members` (Array de UIDs).
- **Subcoleção `messages`:** Chat em tempo real com persistência de histórico.

---

## 2. Lógica Anti-Spoiler e Filtragem

A principal regra de negócio do app é o filtro de visibilidade:
- `QUERY: collectionGroup('annotations').where('isPublic', '==', true).where('pageLocation', '<=', currentUserPage)`
- Isso garante que a jornada literária seja respeitada, permitindo que a comunidade interaja sem estragar surpresas do enredo.

---

## 3. Integridade e Sincronização

Implementamos uma camada de **Reparo de Dados** no frontend (`librarySlice`):
- Se houver derivação entre os dados do documento do usuário e o somatório dos seus livros (drift), o app detecta e sugere/executa um "Data Sync" para manter o Firestore consistente.

---

## 4. Regras de Segurança (Firestore Rules)

As regras são divididas por responsabilidade:
- **`match /users/{userId}`**: Apenas o dono pode escrever; todos podem ler o perfil público.
- **`match /groups/{groupId}`**: Apenas usuários presentes no array `members` podem ler mensagens do grupo.
- **`match /friendships/{id}`**: Apenas `sender` ou `receiver` têm acesso ao status da amizade.
