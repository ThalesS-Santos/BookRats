# Arquitetura do Backend (BookRats)

O **BookRats** utiliza uma arquitetura **Serverless** sustentada pelo [Firebase](https://firebase.google.com/). Não há um servidor NodeJS/Python dedicado rodando na nuvem gerindo endpoints REST ou GraphQL tradicionais. Todas as lógicas de backend, armazenamento, e autenticação são consumidas diretamente pelo aplicativo usando o SDK Client do Firebase.

---

## 1. Módulos de API (`src/api/`)

A comunicação com o backend é abstraída em arquivos específicos na pasta `src/api/`. Eles funcionam como "Serviços" que envelopam o Firebase e deixam os componentes React limpos de lógicas complexas.

### 1.1 `auth.js` (Autenticação)
Responsável por lidar com o fluxo de usuários.
- **Firebase Auth:** Gerencia a criação de contas, login (com email/senha) e persistência de sessão.
- **Sincronização com Firestore:** Assim que um usuário se cadastra no Firebase Auth, um documento correspondente é criado na coleção `users/{userId}` do Firestore. Isso garante que o aplicativo tenha um perfil rico (nome, avatar, estatísticas de leitura) atrelado à conta de autenticação base.

### 1.2 `books.js` (Gerenciamento de Livros)
Gerencia o acervo pessoal do usuário.
- Comunica-se com a subcoleção `users/{userId}/books/{bookId}`.
- Contém lógicas para adicionar novos livros, atualizar o progresso de leitura (ex: atualizar a página atual, atualizar o status para "lido") e remover livros da biblioteca.

### 1.3 `social.js` (Relações e "Echoes")
O coração social do aplicativo.
- Lida com a criação e busca de **Echoes** (Anotações/Rastros Literais) que ficam na subcoleção `annotations`.
- Contém a infraestrutura de respostas (Threads), permitindo a funcionalidade de "comentários dentro de comentários" através do campo `parentEchoId` no schema dos Echoes.
- Realiza consultas (queries) complexas, como filtrar "Echoes" que pertençam apenas às páginas que o usuário atual já leu (lógica anti-spoiler).

---

## 2. Tratamento de Erros e Mapper (`src/utils/errorMapper.js`)

Como o Firebase retorna códigos de erro difíceis de apresentar diretamente ao usuário final (ex: `auth/email-already-in-use`), o sistema emprega um `errorMapper.js`. 
- **Objetivo:** Interceptar exceções de rede do Firebase e traduzi-las em mensagens amigáveis em português (ex: "Este e-mail já está em uso.").
- Esse sistema padroniza a interface de tratamento de erro do backend para o frontend inteiro.

---

## 3. Storage e Imagens

*(Caso aplicável)* O Firebase Storage ou um provedor externo serve para hospedar as imagens e capas de livro que não vêm diretamente da API do Google Books ou fontes abertas de metadados de livros.

---

## 4. Segurança

Toda a barreira de segurança não é feita por endpoints, mas sim através do **Firestore Security Rules**. O cliente solicita o dado, e as regras em `firestore.rules` avaliam o token JWT de autenticação atual e decidem se a operação de Leitura/Escrita é permitida (Ver mais em `database.md`).
