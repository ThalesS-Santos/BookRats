# Especificações e Funcionalidades (BookRats)

Este documento centraliza as definições de escopo, pilares de design e requisitos técnicos do projeto BookRats.

---

## 1. Visão Geral
BookRats não é apenas um tracker de leitura; é um ecossistema social focado na imersão literária. O objetivo é gamificar o hábito de leitura e permitir que pensamentos sejam compartilhados de forma contextual (atrelados à página do livro).

---

## 2. Pilares de Experiência (UX)

### 2.1 Contextualidade (Echoes)
Diferente de resenhas post-mortem, os **Echoes** permitem que o usuário interaja com o livro durante o processo. A experiência é protegida pelo filtro anti-spoiler.

### 2.2 Foco Imersivo (Timer)
A ferramenta de cronômetro é desenhada para minimizar distrações, mantendo a tela ativa e fornecendo feedbacks táteis que marcam o ritmo da leitura.

### 2.3 Reconhecimento (Gamificação)
O progresso é recompensado através de **Streaks**, **Badges** e o status de **Influenciador**, que é conquistado através da qualidade das interações sociais.

---

## 3. Requisitos Técnicos e Stack

### 3.1 Mobile First
- **Core:** React Native + Expo.
- **Estilo:** Design atômico com TailwindCSS (NativeWind).

### 3.2 Real-time & Serverless
- **Data:** Cloud Firestore para sincronização em tempo real.
- **Auth:** Firebase Authentication com suporte a múltiplos providers.

### 3.3 Qualidade e Estabilidade
- **Testes:** Cobertura de 100% em lógica de domínio.
- **Segurança:** Regras de acesso baseadas em tokens JWT via Firestore Security Rules.

---

## 4. Requisitos de Contribuição
Para desenvolvedores interessados em contribuir:
- **Node.js 18+**
- **Git**
- **Cultura de Testes:** Todo PR deve incluir testes que mantenham a cobertura atual.
- **Design:** Seguir os tokens definidos no [UI/UX Guide](./UI_UX_GUIDE.md).
