# 🧪 Guia de Testes e Qualidade

O BookRats orgulha-se de possuir uma cobertura de testes de **100% de linhas** nos módulos core, garantindo uma aplicação extremamente estável e livre de bugs regressivos.

---

## 🛠️ Ferramentas Utilizadas

- **Jest:** O test runner principal.
- **React Native Testing Library (RNTL):** Para testar componentes e interações de UI.
- **MSW (Mock Service Worker):** Para interceptar requisições de rede (Google Books API) sem precisar de mocks manuais do `fetch`.
- **Zustand Mocks:** Lógica customizada para testar as Slices de estado de forma isolada.

---

## 📂 Estrutura de Testes

Os testes estão localizados na pasta raiz `/tests`:

- `tests/suites/`: Contém os arquivos `.test.js` para APIs, Stores, Services e Screens.
- `tests/mocks/`: Configurações do servidor MSW e mocks globais.
- `tests/factories/`: Helpers para gerar dados de teste (ex: `BookFactory.js`, `UserFactory.js`) seguindo o padrão de design Factory.
- `tests/config/`: Configurações de setup do Jest.

---

## 🏃 Como Rodar os Testes

Para rodar todos os testes:
```bash
npm test
```

Para gerar o relatório de cobertura:
```bash
npm run test:coverage
```

O relatório será gerado na pasta `/coverage`. Você pode abrir o arquivo `coverage/lcov-report/index.html` no seu navegador para ver o detalhamento visual das linhas cobertas.

---

## 🎯 Filosofia de Teste

1. **Testes Unitários:** Focados em funções puras, utilitários e serviços (`core/services`, `utils`).
2. **Testes de Integração de Store:** Validamos que o disparo de uma ação no Zustand atualiza o estado corretamente e, se necessário, chama a API.
3. **Testes de Componentes:** Verificamos se a UI renderiza corretamente e responde aos gestos do usuário.
4. **Mocking de Firebase:** O Firebase é mockado em nível de módulo para garantir que os testes não dependam de uma conexão real com a internet ou alterem dados reais.

---

## 🛡️ Camada de Segurança (Error Boundary)

Além dos testes, o app conta com um **Global Error Boundary** (`src/ui/components/organisms/ErrorBoundary.js`).
- Ele captura erros de renderização que passariam despercebidos pelos testes unitários.
- Fornece uma UI de fallback amigável ("Ops! Algo deu errado") e um botão de reset para recuperar o estado da aplicação.
