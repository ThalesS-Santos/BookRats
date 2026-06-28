/**
 * PushNotificationService — unit tests
 *
 * expo-notifications é mockado globalmente em tests/config/jest.setup.js.
 * Aqui sobrescrevemos os retornos por cenário (permissão concedida/negada) e
 * inspecionamos o que foi agendado.
 */
import { getLocalDateString } from '@utils/streak';
import * as Notifications from 'expo-notifications';

import PushNotificationService from '@core/services/PushNotificationService';

const grantPermission = () => {
  Notifications.getPermissionsAsync.mockResolvedValue({
    granted: true,
    canAskAgain: true,
  });
  Notifications.requestPermissionsAsync.mockResolvedValue({ granted: true });
};

describe('PushNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    grantPermission();
  });

  describe('configure (permissão é do SO)', () => {
    it('retorna true e NÃO re-pergunta quando já concedida', async () => {
      const granted = await PushNotificationService.configure();
      expect(granted).toBe(true);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('dispara o diálogo nativo quando ainda não decidido', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({
        granted: false,
        canAskAgain: true,
      });
      Notifications.requestPermissionsAsync.mockResolvedValue({
        granted: true,
      });

      const granted = await PushNotificationService.configure();

      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(granted).toBe(true);
    });

    it('bloqueia (cancela tudo) quando o usuário nega', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({
        granted: false,
        canAskAgain: true,
      });
      Notifications.requestPermissionsAsync.mockResolvedValue({
        granted: false,
      });

      const granted = await PushNotificationService.configure();

      expect(granted).toBe(false);
      expect(
        Notifications.cancelAllScheduledNotificationsAsync,
      ).toHaveBeenCalled();
    });

    it('não re-pergunta quando canAskAgain é false', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({
        granted: false,
        canAskAgain: false,
      });

      const granted = await PushNotificationService.configure();

      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
      expect(granted).toBe(false);
    });
  });

  describe('refreshReminders', () => {
    beforeEach(async () => {
      grantPermission();
      await PushNotificationService.configure();
      jest.clearAllMocks();
    });

    it('agenda lembrete diário (streak-aware) + 2 comebacks', async () => {
      await PushNotificationService.refreshReminders({
        streak: 5,
        lastReadDate: null,
      });

      // daily + comeback(3) + comeback(7)
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);

      const scheduled = Notifications.scheduleNotificationAsync.mock.calls.map(
        c => c[0],
      );
      const daily = scheduled.find(s => s.identifier === 'reminder-daily');
      expect(daily).toBeDefined();
      expect(daily.content.body).toContain('5 dias');
    });

    it('usa copy neutra quando não há streak', async () => {
      await PushNotificationService.refreshReminders({
        streak: 0,
        lastReadDate: null,
      });

      const daily = Notifications.scheduleNotificationAsync.mock.calls
        .map(c => c[0])
        .find(s => s.identifier === 'reminder-daily');
      expect(daily.content.body).toContain('Já leu hoje');
    });

    it('cancela os lembretes anteriores antes de reagendar (idempotente)', async () => {
      await PushNotificationService.refreshReminders({
        streak: 1,
        lastReadDate: null,
      });
      // 3 ids fixos cancelados
      expect(
        Notifications.cancelScheduledNotificationAsync,
      ).toHaveBeenCalledTimes(3);
    });

    it('continua agendando o diário mesmo já tendo lido hoje (apenas adia)', async () => {
      await PushNotificationService.refreshReminders({
        streak: 2,
        lastReadDate: getLocalDateString(),
      });
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
    });

    it('não agenda nada quando a permissão foi negada', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({
        granted: false,
        canAskAgain: false,
      });
      await PushNotificationService.configure(); // permissionGranted = false
      jest.clearAllMocks();

      await PushNotificationService.refreshReminders({
        streak: 9,
        lastReadDate: null,
      });

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('notificações imediatas', () => {
    beforeEach(async () => {
      grantPermission();
      await PushNotificationService.configure();
      jest.clearAllMocks();
    });

    it('notifyGoalReached entrega imediatamente (trigger null)', async () => {
      await PushNotificationService.notifyGoalReached('Título', 'Corpo');

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({ title: 'Título', body: 'Corpo' }),
          trigger: null,
        }),
      );
    });

    it('notifyBookFinished inclui o título do livro', async () => {
      await PushNotificationService.notifyBookFinished('Duna');

      const arg = Notifications.scheduleNotificationAsync.mock.calls[0][0];
      expect(arg.content.body).toContain('Duna');
      expect(arg.trigger).toBeNull();
    });
  });

  describe('cancelAll', () => {
    it('cancela todos os agendamentos', async () => {
      await PushNotificationService.cancelAll();
      expect(
        Notifications.cancelAllScheduledNotificationsAsync,
      ).toHaveBeenCalled();
    });
  });
});
