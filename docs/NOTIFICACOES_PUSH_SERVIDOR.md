# Notificações Push pelo Servidor — Guia de Implementação

> Documento de planejamento técnico. Descreve **como evoluir** o sistema de
> notificações do BookRats de "100% local" para um modelo **completo com push
> remoto** (disparado pelo servidor, mesmo com o app fechado).
>
> Status: **planejamento** (ainda não implementado). O sistema local já existe
> e continua valendo — o push remoto é uma camada **adicional**, não um
> substituto.

---

## 1. Objetivo

Hoje o app só consegue notificar o usuário a partir de gatilhos **no próprio
aparelho** (lembretes agendados, conquistas desbloqueadas durante o uso). Isso
cobre engajamento individual, mas **não** cobre eventos que nascem no servidor
e precisam alcançar o usuário com o app fechado, por exemplo:

- "Seu amigo **João** te ultrapassou no ranking 🏆"
- "**Maria** aceitou seu pedido de amizade"
- "Alguém comentou / deu clap na sua anotação (Echo)"
- "Você ficou 3 dias sem ler — seus amigos estão na sua frente!"
- Campanhas/comunicados do app (novidades, eventos sazonais de leitura)

Esses casos exigem **push remoto**. Este documento detalha a arquitetura, o
passo a passo, o modelo de dados, segurança, custos e um roadmap faseado.

---

## 2. O que já temos (local) e por que não basta

Arquivo: `src/core/services/PushNotificationService.js`

Já implementado, 100% local, sem servidor:

- Permissão via diálogo nativo do SO (`requestPermissionsAsync`).
- Lembrete diário inteligente ("Já leu hoje?"), re-ancorado na atividade.
- Lembretes escalonados de "volta aí" (3 e 7 dias de inatividade).
- Notificação imediata de conquista (badge) e de livro concluído.
- Bloqueio total quando o usuário nega a permissão.

**Limitação fundamental:** todos os gatilhos são locais. O aparelho não tem
como saber, sozinho e offline, que "um amigo te ultrapassou" — esse fato existe
apenas no Firestore/servidor. Logo, precisamos de uma peça que rode **no
servidor** e envie a notificação para o dispositivo certo.

### 2.1 Local vs Remoto — regra de decisão

| Critério | Local (`expo-notifications`) | Remoto (Expo Push / FCM) |
|---|---|---|
| Gatilho nasce no aparelho | ✅ | — |
| Gatilho nasce no servidor (outro usuário, cron) | ❌ | ✅ |
| Funciona offline | ✅ | ❌ (precisa de rede no envio) |
| Precisa de backend | Não | Sim (Cloud Functions) |
| Precisa de token de dispositivo | Não | Sim |
| Custo | Zero | ~Zero (Expo Push grátis; Functions tem cota) |

Regra prática: **continue usando local para tudo que o app consegue detectar
sozinho**; use remoto **apenas** para eventos server-side. Não duplicar o mesmo
aviso nas duas vias.

---

## 3. Arquitetura escolhida: Expo Push Service

Existem dois caminhos para push remoto em React Native/Expo:

1. **Expo Push Service (RECOMENDADO).** O Expo expõe um endpoint único
   (`https://exp.host/--/api/v2/push/send`) que abstrai FCM (Android) e APNs
   (iOS). Você manda um token `ExponentPushToken[...]` e o Expo entrega.
2. **FCM puro via `@react-native-firebase/messaging`.** SDK nativo separado do
   `firebase` (JS) que já usamos. Mais controle, porém **muito mais setup** e um
   segundo SDK Firebase no projeto. **Não recomendado** para o nosso caso.

**Decisão:** usar **Expo Push Service**. Motivos:

- Já usamos Expo (SDK 54) e dev builds (`expo run:android`).
- O mesmo `expo-notifications` que já está no projeto gera o token de push.
- Um endpoint só para Android + iOS; o Expo cuida de FCM/APNs nos bastidores.
- Mantém o `firebase` JS SDK atual sem adicionar `@react-native-firebase`.

> Observação: mesmo usando Expo Push, em **produção Android** é necessário
> registrar as credenciais do FCM no projeto Expo (via EAS). O Expo usa essas
> credenciais por baixo dos panos. Em desenvolvimento (dev build) já funciona.

### 3.1 Visão geral do fluxo

```
[App]  getExpoPushToken() ──► salva token em Firestore (users/{uid}/pushTokens)
                                          │
                                          ▼
[Evento no servidor]  (ex: ranking muda, amizade aceita, cron de inatividade)
        │  dispara
        ▼
[Cloud Function]  lê tokens do destinatário ──► chama Expo Push API
        │
        ▼
[Expo Push Service] ──► FCM (Android) / APNs (iOS) ──► [Dispositivo]
        │
        ▼
[App recebe]  foreground: handler exibe; background: SO exibe na bandeja
              tap ► deep-link para a tela relevante
```

---

## 4. Pré-requisitos

1. **Conta Expo + EAS** (`eas-cli`). O token de push precisa do `projectId` do
   EAS. Rodar `eas init` para vincular o projeto e obter o `projectId`.
2. **Credenciais FCM (Android):** criar projeto no Firebase (já temos), habilitar
   Cloud Messaging e enviar a chave/service account ao Expo via
   `eas credentials`. Para iOS, configurar APNs key na conta Apple Developer.
3. **Firebase Functions** habilitado (plano Blaze, pois Functions exige billing
   para chamadas de rede externas como a Expo Push API).
4. **`expo-server-sdk`** instalado no projeto de Functions (Node) para fazer
   chunking de mensagens e checar recibos.

---

## 5. Etapa 1 — Registro do token de push no app

O token identifica unicamente o dispositivo. Precisa ser obtido após a permissão
e **salvo no Firestore** para o servidor poder enviar.

### 5.1 Obtendo o token (adicionar ao `PushNotificationService`)

```js
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function getExpoPushToken() {
  // Só funciona em dispositivo físico (emulador não recebe push remoto).
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data; // formato: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
  } catch (e) {
    // logar via observability
    return null;
  }
}
```

### 5.2 Salvando o token no Firestore

Modelo: **um documento por dispositivo** em uma subcoleção, para suportar
múltiplos aparelhos por usuário e remover tokens inválidos individualmente.

```
users/{uid}/pushTokens/{token}
  ├─ token: "ExponentPushToken[...]"
  ├─ platform: "android" | "ios"
  ├─ deviceName: "Galaxy S23"
  ├─ createdAt: serverTimestamp()
  └─ lastSeenAt: serverTimestamp()
```

```js
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@core/firebase/firebase';

export async function registerPushToken(uid, token) {
  if (!uid || !token) return;
  const ref = doc(db, 'users', uid, 'pushTokens', token);
  await setDoc(
    ref,
    {
      token,
      platform: Platform.OS,
      lastSeenAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}
```

### 5.3 Quando registrar

No `App.js`, dentro do mesmo efeito que já chama `configure()` após o login:

```js
PushNotificationService.configure().then(async granted => {
  if (!granted) return;
  armReminders(); // lembretes locais (já existe)
  const token = await getExpoPushToken();
  if (token) await registerPushToken(user.uid, token);
});
```

### 5.4 Ciclo de vida do token

- **Refresh:** o token pode mudar. Use
  `Notifications.addPushTokenListener(cb)` para re-salvar quando rotacionar.
- **Logout:** **remover** o token do dispositivo atual do Firestore para o
  usuário não receber push após sair.
- **Token inválido:** quando o Expo retornar `DeviceNotRegistered` no envio
  (ver §7.3), o backend remove o documento do token.

---

## 6. Etapa 2 — Permissões

Reaproveitar o que já existe: a permissão é concedida pelo **SO** e tratada em
`PushNotificationService.configure()`. Para push remoto valem as mesmas regras:

- Sem permissão → não registrar token, não enviar.
- Android 13+ exige `POST_NOTIFICATIONS` (já coberto por `requestPermissionsAsync`).
- iOS exige aceitação no diálogo nativo (idem).

Nada novo a construir aqui além de **só registrar o token se `granted === true`**.

---

## 7. Etapa 3 — Backend (Cloud Functions)

O cérebro do push remoto. Duas categorias de gatilho:

- **Reativo:** Firestore triggers (algo mudou → notifica).
- **Proativo/agendado:** Scheduled functions (cron) para re-engajamento.

### 7.1 Setup do projeto de Functions

```
firebase init functions      # Node 20, JavaScript ou TypeScript
cd functions
npm i expo-server-sdk
```

### 7.2 Helper de envio (Expo Push API)

```js
const { Expo } = require('expo-server-sdk');
const admin = require('firebase-admin');
admin.initializeApp();
const expo = new Expo();

/** Busca todos os tokens de um usuário. */
async function getUserTokens(uid) {
  const snap = await admin
    .firestore()
    .collection(`users/${uid}/pushTokens`)
    .get();
  return snap.docs.map(d => d.data().token).filter(Expo.isExpoPushToken);
}

/** Envia uma notificação para um usuário (todos os dispositivos dele). */
async function sendPushToUser(uid, { title, body, data }) {
  const tokens = await getUserTokens(uid);
  if (!tokens.length) return;

  const messages = tokens.map(to => ({
    to,
    sound: 'default',
    title,
    body,
    data: data || {}, // payload p/ deep-link
    channelId: 'social', // canal Android (criar no app)
  }));

  // O SDK divide em lotes de 100 automaticamente.
  const chunks = expo.chunkPushNotificationsAsync
    ? expo.chunkPushNotifications(messages)
    : [messages];

  const tickets = [];
  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...receipts);
    } catch (err) {
      console.error('Expo push error', err);
    }
  }
  return tickets;
}
```

### 7.3 Recibos e limpeza de tokens inválidos

O envio retorna **tickets**; alguns minutos depois consulte os **receipts**
para detectar `DeviceNotRegistered` e remover o token morto:

```js
async function handleReceipts(ticketIds) {
  const chunks = expo.chunkPushNotificationReceiptIds(ticketIds);
  for (const chunk of chunks) {
    const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
    for (const [id, receipt] of Object.entries(receipts)) {
      if (
        receipt.status === 'error' &&
        receipt.details?.error === 'DeviceNotRegistered'
      ) {
        // localizar e apagar o doc do token correspondente
        // (mapear ticketId → token no momento do envio)
      }
    }
  }
}
```

### 7.4 Exemplos de gatilhos reativos (Firestore triggers)

**Pedido de amizade aceito** — quando `friendships/{id}.status` vira `accepted`:

```js
exports.onFriendshipAccepted = functions.firestore
  .document('friendships/{id}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.status !== 'accepted' && after.status === 'accepted') {
      await sendPushToUser(after.senderId, {
        title: 'Pedido aceito 🤝',
        body: 'Vocês agora são amigos de leitura!',
        data: { type: 'FRIEND_ACCEPT', userId: after.receiverId },
      });
    }
  });
```

**Novo clap/comentário em Echo** — reaproveita a subcoleção
`users/{uid}/notifications` que o `NotificationService` (in-app) já popula:

```js
exports.onInAppNotification = functions.firestore
  .document('users/{uid}/notifications/{nid}')
  .onCreate(async (snap, ctx) => {
    const n = snap.data();
    await sendPushToUser(ctx.params.uid, {
      title: tituloPorTipo(n.type),
      body: n.message,
      data: { type: n.type, relatedId: n.relatedId },
    });
  });
```

> 💡 Padrão poderoso: o app já grava notificações in-app no Firestore
> (`NotificationService.sendNotification`). Basta **um** trigger
> `onCreate` nessa subcoleção para "espelhar" toda notificação in-app como push.
> Assim o app continua gravando como sempre e o push vem "de graça".

### 7.5 Exemplos de gatilhos agendados (re-engajamento server-side)

**"Você foi ultrapassado no ranking"** — roda 1x/dia, compara posições:

```js
exports.dailyRankingCheck = functions.pubsub
  .schedule('every day 19:00')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    // 1. Ler ranking de amigos por usuário
    // 2. Comparar com snapshot anterior salvo
    // 3. Para quem caiu de posição, sendPushToUser(...)
  });
```

Esse é o caso que o **local não consegue** fazer: depende de comparar dados de
**vários** usuários no servidor.

---

## 8. Etapa 4 — Recebimento no app

### 8.1 Foreground vs background

- **Background/fechado:** o SO exibe a notificação na bandeja automaticamente.
- **Foreground:** o `setNotificationHandler` (já configurado em
  `PushNotificationService`) decide exibir banner/lista.

### 8.2 Deep-linking ao tocar

```js
import * as Notifications from 'expo-notifications';

// dentro de um useEffect global (App.js)
const sub = Notifications.addNotificationResponseReceivedListener(resp => {
  const data = resp.notification.request.content.data;
  switch (data.type) {
    case 'FRIEND_ACCEPT':
      navigation.navigate('UserProfile', { uid: data.userId });
      break;
    case 'CLAP_ECHO':
    case 'COMMENT_ECHO':
      navigation.navigate('EchoDetail', { echoId: data.relatedId });
      break;
    case 'RANKING_OVERTAKE':
      navigation.navigate('MainTabs', { tabIndex: 1 }); // Ranking
      break;
    default:
      navigation.navigate('Notifications');
  }
});
```

> Integra com o nosso navigator: `MainTabs` aceita `params.tabIndex` para saltar
> de aba (já implementado no `TabNavigator`).

### 8.3 Canais Android para push remoto

Criar um canal separado dos lembretes locais (ex: `social`, `ranking`) para o
usuário poder controlar cada tipo nas configurações do SO. Reusar o padrão de
`setNotificationChannelAsync` já presente no serviço.

---

## 9. Modelo de dados (Firestore)

```
users/{uid}
  ├─ pushTokens/{token}                # §5.2 — um doc por dispositivo
  │     ├─ token, platform, deviceName, createdAt, lastSeenAt
  │
  ├─ notifications/{nid}               # já existe (in-app) — vira fonte do push
  │
  └─ notificationPrefs                 # NOVO — preferências granulares
        ├─ social: true                # claps, comentários, amizades
        ├─ ranking: true               # ultrapassagens no ranking
        ├─ reminders: true             # lembretes (também controla os locais)
        └─ announcements: true         # comunicados do app
```

O backend deve **respeitar `notificationPrefs`** antes de enviar (não enviar
push de ranking se `ranking === false`).

---

## 10. Preferências do usuário (opt-in/out granular)

Construir uma tela de Ajustes (Perfil → Notificações) que:

1. Lê/grava `users/{uid}/notificationPrefs`.
2. Para `reminders`, também liga/desliga os lembretes **locais**
   (`PushNotificationService.cancelAll()` / `refreshReminders()`).
3. Permite escolher o horário do lembrete diário.

Isso unifica o controle de **local + remoto** num só lugar para o usuário.

---

## 11. Segurança (Firestore Rules)

- `users/{uid}/pushTokens/**`: **só o dono** lê/escreve.
- `users/{uid}/notificationPrefs`: **só o dono** lê/escreve.
- O **envio** roda em Cloud Functions com Admin SDK (ignora as rules), então o
  cliente **nunca** envia push diretamente — evita spam/abuso.

```
match /users/{userId}/pushTokens/{tokenId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
match /users/{userId}/notificationPrefs {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

> ⚠️ Nunca expor a chave/credenciais do Expo ou FCM no app. O envio é
> exclusivamente server-side.

---

## 12. Tratamento de erros e robustez

- **`DeviceNotRegistered`** → remover o token (§7.3).
- **Rate limiting** do Expo → o `expo-server-sdk` já faz chunking de 100.
- **Idempotência** → guardar `notifiedAt` no evento para não reenviar em
  re-execuções de trigger.
- **Tokens duplicados** → o doc id é o próprio token (`setDoc` com merge), então
  não duplica.
- **Falhas de rede no envio** → try/catch + log via observability; o push é
  "best-effort", nunca deve quebrar o fluxo principal.

---

## 13. Custos

- **Expo Push Service:** gratuito.
- **FCM / APNs:** gratuitos.
- **Firebase Functions:** exige plano **Blaze**; há cota gratuita generosa
  (2M invocações/mês). O custo real vem de execuções e saída de rede, geralmente
  baixíssimo para o nosso volume.
- **Firestore:** leituras extras (tokens, prefs) — desprezível com bom design.

---

## 14. Testes

- **Token:** logar o `ExponentPushToken` em dev e enviar manualmente pelo
  [Expo Push Tool](https://expo.dev/notifications).
- **Functions:** Firebase Emulator Suite para triggers Firestore; testes
  unitários mockando `expo-server-sdk`.
- **Deep-link:** disparar notificação de teste de cada `type` e verificar a
  navegação.
- **Permissão negada:** garantir que nenhum token é registrado e nenhum envio
  ocorre.

---

## 15. Roadmap faseado de implementação

| Fase | Entrega | Depende de |
|---|---|---|
| 0 | (Feito) Notificações locais | — |
| 1 | Registro de token + `pushTokens` no Firestore | EAS projectId |
| 2 | Cloud Function "espelho" de `users/{uid}/notifications` → push | Fase 1 + Blaze |
| 3 | Deep-linking no app ao tocar a notificação | Fase 2 |
| 4 | Preferências granulares (`notificationPrefs`) + tela de Ajustes | Fase 2 |
| 5 | Gatilho agendado de ranking ("foi ultrapassado") | Fase 2 |
| 6 | Recibos + limpeza de tokens inválidos | Fase 2 |
| 7 | Canais Android por tipo + segmentação | Fases 2–5 |

Recomendação: implementar **Fase 1 → 2 → 3** primeiro (entrega o push social
real reaproveitando a infra in-app existente), depois 4–7.

---

## 16. Checklist de "pronto para produção"

- [ ] `eas init` feito e `projectId` disponível no app.
- [ ] Credenciais FCM (Android) e APNs (iOS) registradas no Expo.
- [ ] Token salvo/atualizado/removido corretamente (login, refresh, logout).
- [ ] Cloud Functions no plano Blaze, com `expo-server-sdk`.
- [ ] Envio respeita `notificationPrefs`.
- [ ] Recibos tratados e tokens inválidos removidos.
- [ ] Deep-linking testado para todos os `type`.
- [ ] Rules protegendo `pushTokens` e `notificationPrefs`.
- [ ] Sem chaves/segredos no cliente.
- [ ] Local e remoto não duplicam o mesmo aviso.

---

## 17. Referências

- Expo — Push Notifications Overview: <https://docs.expo.dev/push-notifications/overview/>
- Expo — Sending with the Push API: <https://docs.expo.dev/push-notifications/sending-notifications/>
- `expo-server-sdk` (Node): <https://github.com/expo/expo-server-sdk-node>
- Firebase Cloud Functions: <https://firebase.google.com/docs/functions>
- Expo Push Notifications Tool (teste manual): <https://expo.dev/notifications>

---

_Arquivos relacionados no projeto:_
- `src/core/services/PushNotificationService.js` — notificações **locais** (já feito).
- `src/core/services/NotificationService.js` — notificações **in-app** (Firestore) — fonte natural do "espelho" para push.
- `src/ui/navigation/TabNavigator.js` — suporta `params.tabIndex` para deep-link entre abas.
- `firestore.rules` — onde entram as regras de `pushTokens` e `notificationPrefs`.
