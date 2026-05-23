# BookRats

BookRats e um app social de leitura com foco em progresso, anotacoes por pagina (Echoes), gamificacao e interacao entre leitores.

## Estado Atual (2026-05-23)

- Stack principal: Expo 54, React 19, React Native 0.81, Zustand 5, Firebase.
- Suite de testes: `56/56` suites e `456/456` testes passando em execucao completa local.
- Seguranca: regras do Firestore atualizadas com principio de menor privilegio.
- Qualidade: workflow de CI com quality gates criado em `.github/workflows/quality-gates.yml`.
- Auditoria de dependencias (`npm audit --audit-level=high`): sem vulnerabilidades `high` e `critical`.

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
