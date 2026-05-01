# Banco de Dados (Firestore) - Schema e Regras

O **BookRats** utiliza o [Cloud Firestore](https://firebase.google.com/docs/firestore) como banco de dados NoSQL, focado em documentos e coleções em tempo real. A segurança e modelagem de dados são garantidas pelo arquivo `firestore.rules`.

---

## 1. Schema das Coleções

O banco de dados segue uma hierarquia de coleções globais e subcoleções aninhadas.

### `users` (Coleção Global)
Documento central de cada usuário cadastrado.
- **ID:** `userId` (o mesmo UID do Firebase Auth).
- **Conteúdo Típico:** Nome, avatar, biografia, estatísticas de leitura.
- **Segurança:** Qualquer um logado pode ler um perfil. Apenas o dono pode criar/modificar.

### `users/{userId}/books` (Subcoleção)
A biblioteca pessoal de livros lidos ou em andamento.
- **ID:** `bookId` (geralmente gerado aleatoriamente ou o ID de um provedor como Google Books).
- **Conteúdo Típico:** Título, autor, capa, `userCurrentPage`, total de páginas, status (lendo, lido, quero ler).
- **Segurança:** Leitura e Escrita limitadas rigorosamente ao dono da biblioteca (o `userId`).

### `users/{userId}/books/{bookId}/annotations` (Subcoleção)
Anotações locais (privadas ou públicas) conhecidas como **Echoes** ou Rastros.
- **Conteúdo Típico:** Texto da anotação, número da página, `isPublic`, `reactions`, `replyCount`, e possivelmente um `parentEchoId` (se for uma resposta).
- **Collection Group Queries:** Esta subcoleção pode ser consultada globalmente (em todos os livros de todos os usuários) graças às Collection Group Rules do Firestore.
- **Segurança:** 
  - Se for privada (`isPublic == false`), só o dono (`userId`) pode ler.
  - Se for pública (`isPublic == true`), qualquer usuário logado pode ler.
  - Somente o dono pode alterar o conteúdo. Contudo, qualquer usuário logado pode incrementar o contador de "Reactions" (Rat Claps) ou o `replyCount`.

### `users/{userId}/notifications` (Subcoleção)
Onde as notificações in-app são recebidas (ex: quando alguém responde a um Echo ou envia pedido de amizade).
- **Segurança:** Apenas o dono da conta pode ler/atualizar suas notificações, mas **qualquer usuário** logado pode criar um documento aqui (ou seja, enviar uma notificação para você).

### `friendships` (Coleção Global)
Controla as amizades entre ratinhos leitores.
- **Conteúdo Típico:** `senderId`, `receiverId`, `status` (pending, accepted).
- **Segurança:** Apenas os usuários envolvidos na amizade (sender ou receiver) podem ler e atualizar.

### `groups` e `groups/{groupId}/messages` (Coleções Globais e Subcoleção)
Sistemas de Clubes do Livro e conversas.
- **`groups`:** Contém dados do grupo e o array de membros (ex: `members: [uid1, uid2]`). Apenas membros podem ler, e admins/membros podem alterar dependendo da regra.
- **`messages`:** Subcoleção para o bate-papo. Apenas usuários cujo UID está no array de `members` do documento pai (o grupo) podem ler as mensagens e enviar novas.

---

## 2. Paradigma Anti-Spoiler (Consulta Inteligente)

Para garantir que o usuário não tome spoilers das leituras da comunidade, o aplicativo roda queries complexas. As anotações/Echoes de outros usuários são filtrados de modo que o campo `pageLocation` (onde a anotação foi feita) seja menor ou igual à `userCurrentPage` do usuário atual.

## 3. Seguranças e Validações

O Firebase em aplicativos Web/Mobile fica exposto (já que as keys de API ficam no cliente). O coração da segurança do **BookRats** é o arquivo `firestore.rules`.
Ele garante que uma tentativa maliciosa de injetar anotações falsas em nome de outro usuário seja barrada diretamente no servidor do Google, antes da escrita.
