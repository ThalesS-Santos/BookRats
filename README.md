# BookRats

BookRats e um app social de leitura com foco em progresso, anotacoes por pagina (Echoes), gamificacao e interacao entre leitores.

## Estado Atual (2026-06-27)

- Stack principal: Expo 54, React 19, React Native 0.81, Zustand 5, Firebase.
- Suíte de testes: `69/69` suítes e `893/893` testes passando em execução completa local.
- Segurança: regras do Firestore atualizadas com princípio de menor privilégio e segurança adicional via Cloud Functions.
- Qualidade: pipeline de quality gates locais e CI prontos (CI desativado temporariamente para manutenção de linting).
- Auditoria de dependências (`npm audit --audit-level=high`): sem vulnerabilidades `high` e `critical`.
- Monetização: Planejamento detalhado e guias técnicos de engenharia criados em `docs/monetizacao/`.

## Como Rodar

```bash
npm install
npm run start
```

## Comandos de Qualidade

```bash
npm run lint
npm test -- --runInBand
npm run test:coverage -- --runInBand
npm run audit:high
npm run check:gate
```

## Documentacao

- Arquitetura: `docs/ARCHITECTURE.md`
- Frontend: `docs/frontend.md`
- Backend: `docs/backend.md`
- Banco e regras: `docs/database.md`
- Testes e qualidade: `docs/testing.md`
- Seguranca: `docs/security.md`
- Setup local: `docs/local_setup.md`
- Status executivo: `docs/project_status.md`
- Monetização: `docs/monetizacao/` (Guias detalhados de 1 a 5)
