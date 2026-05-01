# Guia de Testes Automatizados (BookRats)

O projeto conta com uma infraestrutura rica para testes automatizados, desenhada para garantir a estabilidade do Frontend e das integrações simuladas com o Firebase.

---

## 1. Ferramentas e Frameworks
- **[Jest](https://jestjs.io/):** O test runner principal. Configurado em `jest.config.js` e preenchido no ambiente através de `jest.setup.js`.
- **[React Native Testing Library](https://callstack.github.io/react-native-testing-library/):** Usado para testar renderização de componentes e simular interações de usuários (como clicks e digitação).
- **[MSW (Mock Service Worker)](https://mswjs.io/):** Intercepta e simula requisições de rede feitas pela API do projeto. Permite que testes sejam executados de forma determinística, sem bater no servidor real do Firebase.

## 2. Estrutura de Pastas de Teste

Todos os testes estão centralizados na pasta `src/__tests__/`.
- `auth_integration.test.js`: Testa fluxos completos de login, garantindo que o Firebase Mock retorne tokens válidos e mude o estado global da aplicação.
- `badge_logic.test.js` / `streak.test.js`: Testes unitários para regras de negócio (gamificação e sequência de leitura).
- `gallery_integration.test.js`: Garante que a galeria 3D carrega e mapeia as posições adequadamente (renderizando os mocks corretamente).
- `timer.test.js`: Valida o comportamento do relógio, se os haptics são disparados e se o registro no fim do tempo está correto.

## 3. Servidor de Mocks (MSW)

Em `src/mocks/`, encontram-se as definições de rotas fictícias e do servidor:
- **`handlers.js`:** Descreve os comportamentos de endpoint (ex: `auth/login` retorna 200 e um JSON de sucesso).
- **`server.js`:** Inicializa e expõe os utilitários de mock.
- O `jest.setup.js` foi configurado para iniciar o servidor mock **antes** de todos os testes começarem, e **reseta** o servidor ao final de cada teste.

## 4. Como Executar os Testes

No terminal, na pasta raiz (`BookRats`), utilize os seguintes comandos baseados no `package.json`:

### 4.1 Rodar a Suíte Completa
```bash
npm run test
```
*(Executa o Jest passando por todos os arquivos `*.test.js` ou `*.spec.js`).*

### 4.2 Rodar Testes em Modo Watch (Desenvolvimento)
```bash
npx jest --watch
```
*(Mantém o Jest aberto. Sempre que você salvar um arquivo, ele rodará os testes correspondentes novamente).*

### 4.3 Gerar Relatório de Cobertura (Coverage)
```bash
npm run test:coverage
```
- Este comando avalia quantas linhas de código estão cobertas por testes.
- Um relatório visual e interativo em HTML será gerado na pasta `coverage/lcov-report/index.html`.
- Você pode abrir este arquivo no navegador para ver visualmente quais trechos de código ("ifs", "loops", arquivos) não possuem cobertura de testes.
