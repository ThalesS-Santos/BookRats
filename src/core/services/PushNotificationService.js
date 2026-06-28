import { getLocalDateString } from '@utils/streak';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { createLogger } from '@core/observability';

const log = createLogger('core.services.push');

const ANDROID_CHANNEL_ID = 'reading-reminders';

// Horário em que os lembretes de leitura são entregues (20h, local).
const REMINDER_HOUR = 20;
const REMINDER_MINUTE = 0;

// Lembretes de engajamento, re-ancorados na atividade do usuário. Cada um tem
// um identificador fixo para ser cancelado/substituído sem duplicar.
const REMINDER_IDS = {
  DAILY: 'reminder-daily',
  COMEBACK_3: 'reminder-comeback-3',
  COMEBACK_7: 'reminder-comeback-7',
};

// ⛔ expo-notifications perdeu suporte no Expo Go a partir do SDK 53. Detectamos
// o ambiente e viramos NO-OP no Expo Go: assim o módulo nem é importado lá
// (evitando o erro/aviso de carregamento), e tudo funciona normalmente num
// development/production build.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';
const SUPPORTED = !IS_EXPO_GO;

// Import preguiçoso: só carrega expo-notifications quando suportado. Na primeira
// carga, registra o handler de primeiro plano uma única vez.
let _Notifications = null;
function notif() {
  if (!SUPPORTED) return null;
  if (!_Notifications) {
    _Notifications = require('expo-notifications');
    _Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
  return _Notifications;
}

// Permissão é concedida pelo SISTEMA OPERACIONAL (diálogo nativo). Guardamos só
// o resultado para bloquear envios quando o usuário negou.
let permissionGranted = false;

/** Próxima ocorrência de HH:MM. Pula hoje se já leu ou se o horário já passou. */
function nextDailyDate(skipToday) {
  const d = new Date();
  d.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
  if (skipToday || d.getTime() <= Date.now()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/** HH:MM daqui a `daysAhead` dias (sempre no futuro para daysAhead >= 1). */
function dateInDays(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
  return d;
}

function withChannel(content) {
  return Platform.OS === 'android'
    ? { ...content, channelId: ANDROID_CHANNEL_ID }
    : content;
}

async function schedule(N, identifier, content, date) {
  // Datas no passado fazem o expo lançar — guarda defensiva.
  if (date.getTime() <= Date.now()) return;
  await N.scheduleNotificationAsync({
    identifier,
    content: withChannel(content),
    trigger: { type: N.SchedulableTriggerInputTypes.DATE, date },
  });
}

/**
 * PushNotificationService — notificações LOCAIS de engajamento (sem servidor /
 * sem FCM). Distinto do `NotificationService` (notificações in-app no
 * Firestore). Tudo agendado no próprio aparelho e funciona offline.
 *
 * No Expo Go é um NO-OP seguro (use um development build para vê-las).
 *
 * Estratégia (re-ancorada na atividade, sem spam diário):
 *  - Lembrete do dia: só dispara se o usuário ainda NÃO leu hoje.
 *  - Lembretes de "volta aí": 3 e 7 dias de inatividade (escalonado).
 *  - Conquistas e livro concluído: notificação imediata.
 */
const PushNotificationService = {
  /** Indica se o ambiente atual suporta notificações (false no Expo Go). */
  isSupported() {
    return SUPPORTED;
  },

  /**
   * Cria o canal Android e pede a permissão ao SISTEMA (diálogo nativo, só na
   * 1ª vez). Se o usuário negar, limpa qualquer agendamento e passa a bloquear.
   * @returns {Promise<boolean>} true se a permissão foi concedida.
   */
  async configure() {
    const N = notif();
    if (!N) return false;
    try {
      if (Platform.OS === 'android') {
        await N.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
          name: 'Lembretes de leitura',
          importance: N.AndroidImportance.DEFAULT,
          lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC,
        });
      }

      const current = await N.getPermissionsAsync();
      let granted =
        current.granted ||
        current.ios?.status === N.IosAuthorizationStatus.PROVISIONAL;

      // Só dispara o diálogo nativo se ainda não foi decidido.
      if (!granted && current.canAskAgain !== false) {
        const requested = await N.requestPermissionsAsync();
        granted = requested.granted;
      }

      permissionGranted = granted;
      if (!granted) {
        // Usuário negou → garante que nada fique agendado para ele.
        await this.cancelAll();
      }
      return granted;
    } catch (error) {
      log.exception(error, {
        op: 'configure',
        action: 'init',
        resource: 'notifications',
        message: 'Falha ao configurar notificações locais',
      });
      return false;
    }
  },

  /**
   * (Re)agenda os lembretes de engajamento com base no estado de leitura.
   * Chamar no login, ao voltar ao app e após cada sessão de leitura.
   *
   * @param {{ streak?: number, lastReadDate?: string|null }} opts
   */
  async refreshReminders({ streak = 0, lastReadDate = null } = {}) {
    const N = notif();
    if (!N || !permissionGranted) return;
    try {
      // Remove os lembretes anteriores para re-ancorar a partir de agora.
      await Promise.all(
        Object.values(REMINDER_IDS).map(id =>
          N.cancelScheduledNotificationAsync(id).catch(() => {}),
        ),
      );

      const hasReadToday = lastReadDate === getLocalDateString();

      // Lembrete do dia — só faz sentido se ainda não leu hoje.
      const dailyBody =
        streak > 0
          ? `🔥 Sua sequência de ${streak} dia${streak > 1 ? 's' : ''} continua! Leia um pouco hoje para não perdê-la.`
          : '📚 Já leu hoje? Dois minutinhos de leitura já contam!';

      await schedule(
        N,
        REMINDER_IDS.DAILY,
        { title: '📚 Hora da leitura', body: dailyBody },
        nextDailyDate(hasReadToday),
      );

      // "Volta aí" escalonado — só dispara em inatividade sustentada.
      await schedule(
        N,
        REMINDER_IDS.COMEBACK_3,
        {
          title: '📖 Sentimos sua falta',
          body: 'Seus livros estão te esperando. Que tal retomar a leitura hoje?',
        },
        dateInDays(3),
      );

      await schedule(
        N,
        REMINDER_IDS.COMEBACK_7,
        {
          title: '🌙 Bora voltar a ler?',
          body: 'Faz alguns dias... reative seu hábito de leitura no BookRats!',
        },
        dateInDays(7),
      );
    } catch (error) {
      log.exception(error, {
        op: 'refreshReminders',
        action: 'schedule',
        resource: 'notifications',
        context: { streak, lastReadDate },
      });
    }
  },

  /** Notificação imediata: meta/conquista (badge) desbloqueada. */
  async notifyGoalReached(title, body) {
    const N = notif();
    if (!N || !permissionGranted) return;
    try {
      await N.scheduleNotificationAsync({
        content: withChannel({ title, body }),
        trigger: null, // entrega imediata
      });
    } catch (error) {
      log.exception(error, {
        op: 'notifyGoalReached',
        action: 'notify',
        resource: 'notifications',
        context: { title },
      });
    }
  },

  /** Notificação imediata: usuário concluiu um livro. */
  async notifyBookFinished(bookTitle) {
    return this.notifyGoalReached(
      '🎉 Livro concluído!',
      `Você terminou "${bookTitle}". Qual é a próxima leitura?`,
    );
  },

  /** Cancela todos os lembretes agendados (logout / permissão negada). */
  async cancelAll() {
    const N = notif();
    if (!N) return;
    try {
      await N.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      log.exception(error, {
        op: 'cancelAll',
        action: 'cancel',
        resource: 'notifications',
      });
    }
  },
};

export default PushNotificationService;
