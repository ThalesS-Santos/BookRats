# Executando o Projeto Localmente (Local Setup)

Este guia prático mostra como clonar, instalar dependências e rodar o projeto BookRats no seu ambiente de desenvolvimento.

---

## 1. Pré-Requisitos
Certifique-se de que sua máquina possui as seguintes ferramentas instaladas:
- **Node.js**: Versão 18 ou superior. Recomendado o uso do [NVM (Node Version Manager)](https://github.com/nvm-sh/nvm).
- **Git**: Para clonar o projeto.
- **Expo Go (Celular)**: Baixe o aplicativo "Expo Go" no seu dispositivo (disponível para Android e iOS) se desejar testar direto no celular real sem necessidade de emuladores pesados.

---

## 2. Instalação

Abra o seu terminal (Prompt de Comando, PowerShell, Git Bash ou terminal do MacOS/Linux) e execute:

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/App_leitura.git

# Acesse a pasta raiz do projeto React Native
cd App_leitura/BookRats

# Instale todas as dependências do projeto
npm install
```

> **Aviso de Firebase:**
> O aplicativo pode exigir variáveis de ambiente para a conexão com o banco de dados. Caso o repositório venha sem as chaves, peça ao desenvolvedor líder ou verifique se um arquivo `.env` (com valores `EXPO_PUBLIC_FIREBASE_API_KEY`, etc.) precisa ser criado na raiz do projeto.

---

## 3. Rodando a Aplicação (Servidor Expo)

Para ligar o empacotador JavaScript e o servidor de desenvolvimento do Expo:

```bash
npm run start
```

Isso abrirá um menu no terminal (e possivelmente no navegador) apresentando um **QR Code**.

### 3.1 Testando no Celular Físico
1. Certifique-se de que seu celular e o PC estão na mesma rede Wi-Fi.
2. Abra a câmera do celular (iOS) ou o app do Expo Go (Android/iOS) e leia o QR Code.
3. O aplicativo será carregado. Qualquer mudança no código no seu PC irá atualizar o app instantaneamente (Hot Reloading).

### 3.2 Testando no Emulador (PC)
Se o terminal do Expo estiver rodando, você pode pressionar botões atalho para abrir simuladores (se eles já estiverem configurados na máquina):
- Pressione **`a`** para abrir o aplicativo num emulador **Android** (Requer Android Studio e AVD instalados).
- Pressione **`i`** para abrir o aplicativo no simulador **iOS** (Requer Mac e Xcode instalados).
- Pressione **`w`** para rodar na **Web** no seu próprio navegador.

---

## 4. Dicas Úteis

- **Limpando Cache do Metro Bundler:** Se você instalar uma nova biblioteca ou estiver tendo erros esquisitos de "module not found" para arquivos existentes, encerre o servidor (`Ctrl + C`) e rode:
  ```bash
  npx expo start -c
  ```
- **Rodando Testes:** Enquanto o servidor roda em uma aba do terminal, você pode abrir outra aba no mesmo diretório e rodar `npm run test` para certificar-se de que nada quebrou.
