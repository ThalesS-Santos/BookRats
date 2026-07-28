const { initializeApp } = require('firebase-admin/app');

initializeApp();

// Os exports de webhooks, callables e jobs agendados entram aqui conforme a Fase 2 do
// roteiro de monetização (docs/monetizacao/0_ROADMAP_IMPLEMENTACAO.md, Etapas 14-21).
//
// Exemplo (adicionado quando a Etapa 15 for implementada):
//   exports.revenueCatWebhook = require('./webhooks/revenueCatWebhook');
