# Arquitetura do Frontend (BookRats)

O aplicativo é desenvolvido em **React Native** com **Expo (SDK 54)**, utilizando uma abordagem de **Atomic Design** e gerenciamento de estado via **Zustand**.

---

## 1. Estrutura de UI (`src/ui/`)

Seguimos a filosofia de Atomic Design adaptada:
- **`atoms/`**: Componentes básicos (Avatares, Skeletons, LoadingScreens).
- **`molecules/`**: Combinações de átomos (Cards de notas, Popups customizados).
- **`organisms/`**: Componentes complexos e auto-contidos (Deck de Echoes, Carregador de Livros, Error Boundary).

### Navegação (`src/ui/navigation/`)
Utilizamos o **React Navigation v7**:
- **AppNavigator:** Gerencia o fluxo de Autenticação vs App principal.
- **TabNavigator:** Define a estrutura de abas (Home, Library, Social, Profile).

---

## 2. Gerenciamento de Estado (`src/core/store/`)

Implementamos o padrão de **Slices** do Zustand 5 para escalabilidade.
- O estado é persistido via **AsyncStorage** em Slices selecionadas (como Tema e Preferências).
- As Slices de domínio (`library`, `social`, `auth`) lidam com a lógica de negócio e sincronização com o backend.

---

## 3. Design System (NativeWind + TailwindCSS)

O BookRats utiliza **NativeWind v4** para estilização utilitária.
- **Configuração:** `tailwind.config.js` contém a paleta de cores "Rat" (Neon Green, Dark Mode).
- **Responsividade:** Uso de breakpoints e classes condicionais para garantir que o app funcione bem em diferentes tamanhos de tela.

---

## 4. Imersão e UX Premium

- **Haptics (`expo-haptics`)**: Integrado profundamente nas interações. Centralizado em `src/utils/haptics.js`.
- **Animações (`Reanimated 4`)**: Galeria 3D (Cylindrical Gallery) e transições suaves de tela.
- **Performance**: Uso de `FlashList` (ou FlatList otimizado) para renderizar grandes coleções de ecos e livros.

---

## 5. Robustez e Tratamento de Erros

O frontend está protegido por um **Global Error Boundary**:
- Captura erros fatais de renderização.
- Loga o erro automaticamente via `Logger.js`.
- Permite ao usuário resetar a aplicação sem precisar fechá-la.
