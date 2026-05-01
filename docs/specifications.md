# Especificações e Funcionalidades (BookRats)

Este documento centraliza as definições de escopo e stack tecnológico do BookRats.

---

## 1. Stack Tecnológico

- **Framework Front-End:** React Native 0.81 (via Expo SDK 54)
- **Gerenciamento de Estado:** Zustand 5.0
- **Estilização:** NativeWind v4 (TailwindCSS)
- **Navegação:** React Navigation v7
- **Animações e Gestos:** React Native Reanimated v4 + React Native Gesture Handler
- **Backend / Database:** Firebase (Auth, Firestore, Cloud Rules)
- **Testes:** Jest v29, React Native Testing Library v13, MSW (Mock Service Worker)

## 2. Pilares Funcionais (Features Principais)

### 2.1 Echoes (Rastros Literários)
A grande inovação do BookRats. Não são apenas resenhas no final do livro; são anotações atreladas a uma página específica.
- **Filtro Anti-Spoiler:** O usuário só vê as anotações feitas até a página que ele mesmo já alcançou.
- **Threads:** Capacidade de responder a um Rastro (Comentários aninhados).
- **Gamificação:** Rastros bem avaliados geram pontos de "Rat Claps" (reações).

### 2.2 Cronômetro de Leitura
Um temporizador imersivo integrado ao app que acompanha o tempo focado de leitura de um usuário.
- O timer gera notificações táteis (Haptics) e armazena o histórico (streaks e badges de conquistas de tempo).

### 2.3 Clubes do Livro (Grupos e Bate-papo)
Sistema social robusto onde grupos podem ser criados baseados num gênero ou num livro em comum.
- Contém Chat em Tempo Real construído sobre o Firestore.
- Inclui um "Ranking de Nicho" interno (ex: quem lê mais no Grupo de Ficção Científica).

### 2.4 Temas Dinâmicos e Acessibilidade
- Modo Escuro (Dark Mode) sofisticado.
- Controles de acessibilidade física, permitindo que o usuário desligue todo o sistema háptico (vibrações) ou animações intensas.

## 3. Requisitos Ambientais

Para contribuir com o projeto, a máquina deve possuir:
- Node.js (v18 ou superior).
- Conta no Expo (para builds EAS, se necessário).
- Conta no Firebase (ou chaves de acesso no `env` caso a comunicação exija variáveis de ambiente ocultas).
