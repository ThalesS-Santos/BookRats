# Especificações do Projeto

## Objetivo

Transformar a leitura em uma experiência social rica: controle refinado de progresso, anotações contextuais (Echoes), interações gamificadas e comunidade ativa de leitores.

## Funcionalidades Nucleares

1. **Biblioteca e Leitura**
   - Adicionar, remover e catalogar livros físicos ou digitais.
   - Atualizar páginas lidas e tempo decorrido.
   - Status de leitura padronizado (`BOOK_STATUS`).
   - Caching inteligente offline de capas de livros (`ImageCacheService`).

2. **Anotações Contextuais (Echoes)**
   - Notas rápidas por página.
   - Respostas em threads sociais de discussão.
   - Reação com claps (palmas) dinâmicas.

3. **Social e Interações**
   - Rede de amizades (solicitar, aceitar, recusar).
   - Grupos de leitura pública e privada com chat real-time.
   - Painel de notificações in-app instantâneas.
   - Ranking semanal de leitura entre amigos.
   - HomeScreen dinâmica com Pager Horizontal (estilo Clash Royale) e telemetria.

4. **Gamificação**
   - Ofensivas diárias (Streaks).
   - Conquistas e Badges desbloqueáveis por leitura (via `MilestoneService`).
   - Efeitos comemorativos visuais (confetes no desbloqueio).

5. **Analytics e Estatísticas**
   - Gráficos de velocidade de leitura, páginas por mês e estatísticas de gênero literário.
   - Tracking analítico de cliques e engajamento.

6. **Monetização (Fase de Planejamento Ativo)**
   - Plano de assinatura "BookRats Club" (mensal/anual).
   - Links afiliados para e-commerce (Amazon Associates).
   - Microtransações para Streak Freeze e presentes virtuais.
   - Publicidade in-app programática e parcerias de marketing literário.

## Requisitos Técnicos

- Interface mobile nativa com Expo e React Native.
- Persistência e sincronização de dados no Cloud Firestore (com cache local offline).
- Validação defensiva completa contra fraudes e inconsistências.
- Suíte robusta de testes automatizados com Jest e MSW.
