# Executando o Projeto Localmente (Local Setup)

Este guia prático mostra como clonar, instalar dependências e rodar o projeto **BookRats** no seu ambiente de desenvolvimento.

---

## 1. Pré-Requisitos

- **Node.js**: v18+.
- **Git**: Para controle de versão.
- **Expo Go (Celular)**: Baixe no seu dispositivo para testes rápidos sem emulador.
- **Ambiente de Simulação**: Android Studio (AVD) ou Xcode Simulator (opcional).

---

## 2. Instalação

```bash
# Clone o repositório
git clone https://github.com/ThalesS-Santos/BookRats.git

# Acesse a pasta do projeto
cd BookRats

# Instale as dependências
npm install
```

### Configuração do Firebase
O projeto utiliza o SDK do Firebase. Certifique-se de configurar as chaves no seu ambiente local se necessário (geralmente injetadas via `src/core/firebase/firebase.js`).

---

## 3. Rodando a Aplicação

```bash
# Inicia o servidor de desenvolvimento
npm run start
```

- **Android:** Pressione `a`.
- **iOS:** Pressione `i`.
- **Web:** Pressione `w`.

### Testando no Celular Físico
Escaneie o QR Code gerado pelo terminal usando o app **Expo Go**. Lembre-se: o computador e o celular devem estar na mesma rede Wi-Fi.

---

## 4. Testes e Qualidade

Nossa suíte de testes é rigorosa. Execute antes de qualquer commit:

```bash
# Roda todos os testes unitários e de integração
npm test

# Roda testes com relatório de cobertura (100% target)
npm run test:coverage
```

### Problemas Comuns
- **Cache do Metro:** Se encontrar erros estranhos após instalar pacotes, tente `npx expo start -c`.
- **Módulos Nativos:** Se o app fechar sozinho em simuladores, certifique-se de que os pacotes nativos (Reanimated, Gesture Handler) estão vinculados corretamente (`npx expo prebuild`).

---

## 5. Scripts Disponíveis

- `npm run start`: Inicia o Expo.
- `npm run android`: Build e execução no Android.
- `npm run ios`: Build e execução no iOS.
- `npm run web`: Execução no navegador.
- `npm run test`: Execução de testes Jest.
- `npm run test:coverage`: Relatório de cobertura.
