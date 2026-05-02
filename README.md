# 🐭 BookRats: The Lit Social App for Rats

![BookRats Mockup](file:///C:/Users/Thales/.gemini/antigravity/brain/7fa6a268-f9bd-438c-bf4a-c101ba7f458d/bookrats_mockup_1777689367140.png)

> **"Transforme sua leitura em uma experiência coletiva e viciante."**

BookRats é uma rede social premium para leitores que desejam mais do que apenas uma lista de "lidos". Inspirado na cultura de anotações e compartilhamento, o app foca em **Echoes** (rastros literários), **Gamificação** e **Comunidade**.

---

## ✨ Funcionalidades Principais

### 🌟 Echoes (Rastros Literários)
Não espere até o final do livro para resenhar. Deixe seus pensamentos em páginas específicas.
- **Proteção Anti-Spoiler:** Você só vê anotações até a página que já leu.
- **Galeria 3D:** Explore os ecos da comunidade em uma galeria cilíndrica imersiva.
- **Rat Claps:** Reaja às melhores notas e suba no ranking de influência.

### ⏱️ Cronômetro Imersivo
Foque na sua leitura com o timer integrado.
- **Haptic Feedback:** Vibrações táteis para marcar o início e fim das sessões.
- **Keep Awake:** A tela não apaga enquanto você lê.
- **Stats Real-time:** Veja sua velocidade de leitura e progresso diário.

### 🏆 Gamificação e Social
- **Streaks & Badges:** Mantenha sua ofensiva de leitura e conquiste medalhas raras.
- **Clubes do Livro:** Crie grupos, participe de chats em tempo real e dispute rankings de nicho.
- **Ranking Global:** Veja quem são os maiores leitores da plataforma.

---

## 🛠️ Stack Tecnológica

O BookRats utiliza o que há de mais moderno no ecossistema mobile:

- **Frontend:** [React Native](https://reactnative.dev/) (Expo SDK 54) com [React 19](https://react.dev/).
- **Estilização:** [NativeWind v4](https://www.nativewind.dev/) (TailwindCSS para mobile).
- **Estado Global:** [Zustand 5](https://zustand-demo.pmnd.rs/) (Arquitetura baseada em Slices).
- **Backend:** [Firebase](https://firebase.google.com/) (Auth, Firestore, Storage).
- **Animações:** [Reanimated 4](https://docs.swmansion.com/react-native-reanimated/) & Gesture Handler.
- **Qualidade:** Suíte completa de testes com [Jest](https://jestjs.io/), [RNTL](https://callstack.github.io/react-native-testing-library/) e [MSW](https://mswjs.io/).

---

## 🚀 Como Começar

### Pré-requisitos
- Node.js v18+
- Expo Go (no celular) ou simulador configurado.

### Instalação
1. Clone o repositório:
   ```bash
   git clone https://github.com/ThalesS-Santos/BookRats.git
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o projeto:
   ```bash
   npm start
   ```

---

## 🏗️ Arquitetura e Documentação

Para detalhes técnicos profundos, consulte a pasta [`/docs`](./docs):

- 📐 [**Arquitetura do Sistema**](./docs/ARCHITECTURE.md): Entenda o fluxo de dados e a estrutura de pastas.
- 🎨 [**Guia de UI/UX**](./docs/frontend.md): Padrões de design e NativeWind.
- 🧪 [**Guia de Testes**](./docs/TESTING.md): Como mantemos nossa cobertura de 100%.
- 🔥 [**Infraestrutura Firebase**](./docs/backend.md): Regras de segurança e estrutura do banco.

---

## 🤝 Contribuição

Contribuições são o que fazem a comunidade open source um lugar incrível para aprender, inspirar e criar. Qualquer contribuição que você fizer será **muito apreciada**.

1. Faça um Fork do projeto
2. Crie sua Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

---

<p align="center">Feito com ❤️ pela comunidade BookRats</p>
