# Arquitetura do Frontend (BookRats)

O aplicativo é desenvolvido majoritariamente em **React Native**, envolto no ecossistema do **Expo (SDK 54)**, o que permite o desenvolvimento simultâneo e facilitado para iOS, Android e Web.

---

## 1. Estrutura de Navegação (`src/navigation/` e `src/screens/`)

A navegação é orquestrada pela biblioteca `@react-navigation`.
- **Rotas e Stack:** O aplicativo transita entre telas usando componentes nativos de stack e abas de navegação de fundo (`@react-navigation/bottom-tabs`).
- **Principais Telas:**
  - `HomeScreen.js`: O Dashboard principal, mostrando o livro em andamento e o "Deck" de Echoes (Flashcards de anotações 3D).
  - `TimerScreen.js`: Interface para cronometrar sessões de leitura, com feedbacks visuais e hápticos.
  - `GalleryScreen.js`: Galeria interativa (3D Echo Gallery) de rastros literários.
  - `GroupsScreen.js` / `GroupDetailsScreen.js` / `GroupChatScreen.js`: Módulos de Clubes do Livro, gerenciamento de grupos e chat em tempo real.
  - `ProfileScreen.js` e `UserProfileScreen.js`: Perfis de usuário (pessoal e de terceiros) e customização de tema.

## 2. Gerenciamento de Estado (`src/store/`)

Ao invés de Redux ou Context API complexos, o projeto brilha usando o **Zustand** para o estado global. Isso propicia stores pequenos, leves e sem boilerplate.
- **`useBookStore.js`:** Gerencia o acervo local do usuário e as estantes virtuais.
- **`useSocialStore.js`:** Centraliza a lógica de amigos, Echoes da comunidade e Clubes do Livro.
- **`useThemeStore.js`:** Lida com a persistência de temas e preferências sensoriais (como o toggle do Haptics).
- **`useUserStore.js` / `usePopupStore.js`:** Dados da sessão atual e gatilhos de modais globais.

## 3. Estilização Visual (NativeWind + TailwindCSS)

O aplicativo usa o [NativeWind (v4)](https://www.nativewind.dev/) para estilização. 
- Permite escrever utilitários familiares do TailwindCSS (como `flex`, `p-4`, `bg-blue-500`) diretamente nas propriedades `className` dos componentes React Native.
- Há um arquivo global de configuração `tailwind.config.js` onde as cores oficiais da marca (ex: Neon Green, Dark Blue) e os espaçamentos estão centralizados.

## 4. Componentes e Interações Nativas

A UI foca fortemente na imersão e gamificação:
- **Haptics (`expo-haptics`):** Módulo centralizado em `src/utils/haptics.js` e ativado pelo `useThemeStore.js`. As vibrações táteis do dispositivo ocorrem em botões, finalizações de timer e interações na galeria.
- **Animações (`react-native-reanimated` e Gesture Handler):** O app possui swipes, cards em 3D estilo flashcards, e animações orgânicas projetadas para passar a sensação de um aplicativo "Premium" e moderno.
