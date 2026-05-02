# Arquitetura do Backend (BookRats)

O **BookRats** utiliza uma arquitetura **Serverless** sustentada pelo [Firebase](https://firebase.google.com/). Não há um servidor NodeJS/Python dedicado rodando na nuvem gerindo endpoints REST ou GraphQL tradicionais. Todas as lógicas de backend, armazenamento, e autenticação são consumidas diretamente pelo aplicativo usando o SDK Client do Firebase.

---

## 1. Módulos de API (`src/core/api/`)

A comunicação com o backend é abstraída em arquivos específicos na pasta `src/core/api/`. Eles funcionam como "Serviços" que envelopam o Firebase e deixam os componentes React limpos de lógicas complexas.

### 1.1 `auth.js` (Autenticação)
Responsável por lidar com o fluxo de usuários.
- **Firebase Auth:** Gerencia a criação de contas, login (com email/senha ou Google) e persistência de sessão.
- **Sincronização com Firestore:** Assim que um usuário se cadastra, um documento correspondente é criado na coleção `users/{userId}`. Isso garante que o app tenha um perfil rico (nome, avatar, estatísticas de leitura) atrelado à conta base.

### 1.2 `books.js` (Gerenciamento de Livros)
Gerencia o acervo pessoal do usuário.
- Comunica-se com a subcoleção `users/{userId}/books/{bookId}`.
- Contém lógicas para adicionar livros, atualizar o progresso de leitura e salvar logs de leitura diários.

### 1.3 `social.js` (Relações, Echoes e Notificações)
O coração social do aplicativo.
- **Echoes:** Lida com a criação e busca de anotações (Rastros Literários) através de `collectionGroup`, permitindo buscas transversais entre todos os usuários.
- **Sistema de Notificações:** Gerencia notificações in-app para interações como "Rat Claps" e respostas em ecos.
- **Clubes do Livro:** Gerencia a criação de grupos, membros e o chat em tempo real baseado no Firestore.

---

## 2. Tratamento de Erros e Mapper (`src/utils/errorMapper.js`)

Como o Firebase retorna códigos de erro técnicos (ex: `auth/email-already-in-use`), o sistema emprega um `errorMapper.js`. 
- **Objetivo:** Traduzir exceções em mensagens amigáveis em português.
- **Padronização:** Garante que todos os módulos de API retornem erros consistentes para a UI.

---

## 3. Segurança e Regras de Negócio

### Firestore Security Rules
A segurança é garantida pelas **Cloud Firestore Rules**.
- **Propriedade:** Usuários só podem editar seus próprios perfis e livros.
- **Privacidade:** Anotações marcadas como `isPublic: false` são invisíveis para outros usuários.
- **Spoiler Protection:** As regras (e lógica client-side) impedem a leitura de ecos de páginas que o usuário ainda não alcançou.

### Cloud Functions (Sugestão de Expansão)
Para lógicas que exigem poder de processamento fora do dispositivo (como processamento de imagens pesado ou agregações globais complexas), o projeto está preparado para integrar Firebase Cloud Functions.
