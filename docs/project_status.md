# Project Status

Data de referência: 2026-07-28

## Resumo Executivo

- **Estabilidade Elevada**: `75/75` suítes e `966/966` testes passando em execução completa local.
- **Monetização — SDK e Paywall no ar (cliente)**: RevenueCat integrado (`react-native-purchases`/`-ui`), ciclo de vida amarrado ao login/logout do Firebase Auth, e **PaywallScreen própria** (não o template hospedado) com animações Reanimated (profundidade via perspective/rotateX, sem sombra/elevation). Customer Center continua nativo. Backend de pagamento (Cloud Functions, webhooks, `functions/`) ainda **não tem lógica de negócio** — só o scaffold. Detalhe completo e ressalvas de arquitetura em `docs/monetizacao/0_ROADMAP_IMPLEMENTACAO.md` (seção "Status atual") e `docs/backend.md`.
- **Fix de logout**: corrigido um `permission-denied` (ERROR, mas inofensivo) no Firestore que aparecia ao sair da conta — escrita de presença duplicada após revogação do token. Ver `CLAUDE.md`.
- **Performance e Interface**: Finalizada a otimização de renderizações no mobile (Phase 4), incluindo memoização de listas e callbacks, virtualização de grandes listagens, skeletons padronizados, redução de overhead de animação e simplificação de layouts.
- **Novos Recursos (herdados de ciclos anteriores)**:
  - Pager horizontal (estilo Clash Royale) na HomeScreen com tracking de eventos em tempo real.
  - Animação de confetes no `BadgeUnlockPopup` ao desbloquear conquistas.
  - Sistema de Analytics, Estatísticas de Leitura detalhadas e Caching de Capas de livros.
- **Segurança**: Regras do Firestore reforçadas com princípio de menor privilégio.

## Indicadores

1. Testes

- `75/75` suítes aprovadas
- `966/966` testes individuais aprovados
- Cobertura nova: `monetizationSlice`, guard de ambiente (Expo Go/nativo) do RevenueCat, `PaywallScreen`/`usePaywallPlans`, regressão do fix de `updatePresence`.

2. Segurança de Dependência — **⚠️ regressão detectada em 2026-07-28, não presente na última verificação**

- `npm audit --audit-level=high` **NÃO está mais limpo**: `firebase@12.10.0` → `@firebase/database` → `faye-websocket` → `websocket-driver@<=0.7.4` traz **1 `critical` + 3 `high`** (21 vulnerabilidades no total, incluindo moderate/low). O npm reporta correção **não-destrutiva disponível** (`npm audit fix`, sem `--force`) — ainda não aplicada nesta sessão porque o pedido era só de documentação; validar e aplicar antes do próximo `check:gate`.
- `functions/` mantém as 12 vulnerabilidades `high`/`moderate` já conhecidas (cadeia `google-gax`/`firebase-admin`, aceitas — ver `CLAUDE.md`).

3. Governança e Qualidade

- Scripts locais de gate (`npm run check:gate`) configurados.
- Integração contínua (CI) desativada temporariamente para saneamento de linting do backlog de arquivos legados.

## Riscos Abertos

1. **Vulnerabilidade `websocket-driver` (novo, 2026-07-28)**: ver item 2 dos Indicadores acima — corrigir com `npm audit fix` (sem `--force`) e rodar a suíte completa antes de confiar no resultado.
2. **Backlog de Linting**: histórico de problemas reportados pelo ESLint/Prettier no backlog de arquivos legados que precisam ser saneados para restabelecer os bloqueios automáticos de CI.
3. **Ausência de Testes E2E**: Sem automação de ponta a ponta nativa (Detox/Maestro) e testes visuais de regressão.
4. **Dependências em Upgrade**: Expo 54 é a versão estável atual — Expo 55+ quebra por conflito `react-native-worklets`/`expo-modules-core`; upgrade planejado gradual (54→55→56→57) só quando a stack estiver mais madura.
5. **Monetização sem backend**: `isPro` é derivado direto do SDK RevenueCat no cliente, sem espelhamento em Firestore via webhook — nenhuma Cloud Function pode hoje verificar se um usuário é Pro. Bloqueia qualquer feature que precise dessa checagem no servidor.
6. **Paywall sem Termos/Privacidade**: `LEGAL_LINKS` em `PaywallScreen.js` está `null` — bloqueia publicação nas lojas (Apple/Google exigem esses links no review). BookRats ainda não tem site/domínio.

## Próximas Prioridades

1. **Corrigir `websocket-driver`**: `npm audit fix` + rodar suíte completa (`npm test -- --runInBand`) para confirmar que nada quebrou.
2. **Monetização — Fase 1/2 do roteiro**: modelagem de dados (`users/{uid}.subscription`) e Cloud Function de webhook do RevenueCat, para fechar a lacuna de `isPro` server-side.
3. **Resolver bloqueio de publicação**: site/domínio mínimo para hospedar Termos de Uso e Política de Privacidade do paywall.
4. **Saneamento de Linting**: Limpeza em massa dos arquivos de teste e componentes de UI para rodar o gate 100% livre de warnings.
5. **Automação E2E**: Setup básico do Detox ou Maestro para fluxos críticos de Auth e Registro de Leitura.
