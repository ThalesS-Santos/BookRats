# Testes e Qualidade

## Ferramentas

- Jest (com `jest-expo`)
- React Native Testing Library
- MSW (Mock Service Worker) para interceptação de requisições à API do Google Books

## Estrutura

- `tests/suites`: testes unitários e de integração
- `tests/mocks`: mocks de rede (MSW) e mocks globais do ecossistema Firebase/Firestore
- `tests/factories`: fixtures e builders para dados de usuários, livros e interações sociais
- `tests/config`: setup e configuração global do ambiente de teste Jest

## Estado Atual Validado (2026-06-27)

- **Testes**: Execução completa local com `69/69` suítes e `893/893` testes unitários/integração 100% aprovados.
- **Ambiente**: Testes executam em modo sequencial com o comando `npm test -- --runInBand` para evitar colisões de estado nos mocks de banco.
- **Ponto de Atenção**: O linter de código (`eslint .`) reporta problemas estéticos e de formatação legados. Os testes passam perfeitamente, mas a esteira de CI exige o saneamento prévio de lint.

## Comandos

```bash
# Rodar todos os testes
npm test -- --runInBand

# Rodar testes com relatório de cobertura de código
npm run test:coverage -- --runInBand

# Rodar validação completa de qualidade (Lint + Testes + Auditoria)
npm run check:gate
```

## Política de Regressão

1. **Test-Driven Corrections**: Qualquer bug relatado e corrigido deve obrigatoriamente receber uma suíte de testes de regressão correspondente.
2. **Qualidade Impeditiva**: Testes quebrados bloqueiam o merge em branch principal (`main`).
3. **Cobertura por Risco**: Abertura de novos recursos em `core/api`, `core/store` e novos cálculos de gamificação devem possuir cobertura mínima de 90%.
