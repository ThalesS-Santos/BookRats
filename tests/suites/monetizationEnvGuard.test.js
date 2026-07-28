import { NativeModules } from 'react-native';

/**
 * Regressão: em Expo Go (e na web) os módulos nativos do RevenueCat não existem.
 * Os SDKs, em vez de falhar limpo, caem num fallback de web que tenta usar
 * `document` e estoura:
 *   "document is not available. This SDK requires a browser environment"
 *
 * `core/api/monetization.js` faz uma checagem de capacidade em `NativeModules`
 * (a mesma dos SDKs) e vira NO-OP nesse caso. Estes testes carregam o módulo REAL
 * (sem mockar `@core/api/monetization`) com e sem os módulos nativos presentes.
 */

const NATIVE_KEYS = ['RNPurchases', 'RNPaywalls', 'RNCustomerCenter'];

/** Carrega uma instância fresca de monetization.js com/sem os módulos nativos. */
function loadMonetization({ nativeAvailable }) {
  // `@core/constants/products` lê a chave de process.env no load do módulo, e o
  // Jest não carrega o .env — sem isso `configurePurchases` abortaria na guarda
  // de "API key ausente" e mascararia o que estes testes querem medir.
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'test_key_ios';
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID = 'test_key_android';

  const saved = {};
  NATIVE_KEYS.forEach(key => {
    saved[key] = NativeModules[key];
    if (nativeAvailable) {
      NativeModules[key] = {};
    } else {
      delete NativeModules[key];
    }
  });

  let mod;
  jest.isolateModules(() => {
    mod = require('@core/api/monetization');
  });

  // Restaura para não vazar estado entre testes (NativeModules é global).
  NATIVE_KEYS.forEach(key => {
    NativeModules[key] = saved[key];
  });

  return mod;
}

describe('monetization — guarda de ambiente sem módulos nativos', () => {
  let Purchases;
  let RevenueCatUI;

  beforeEach(() => {
    jest.clearAllMocks();
    Purchases = require('react-native-purchases').default;
    RevenueCatUI = require('react-native-purchases-ui').default;
  });

  describe('sem módulos nativos (Expo Go / web)', () => {
    it('reporta compras como não suportadas', () => {
      const { IS_PURCHASES_SUPPORTED } = loadMonetization({
        nativeAvailable: false,
      });
      expect(IS_PURCHASES_SUPPORTED).toBe(false);
    });

    it('não inicializa o SDK (evita registrar usuário anônimo na conta RevenueCat)', () => {
      const { configurePurchases } = loadMonetization({
        nativeAvailable: false,
      });

      configurePurchases();

      expect(Purchases.configure).not.toHaveBeenCalled();
    });

    it('presentPaywallIfNeeded resolve NOT_PRESENTED em vez de lançar', async () => {
      const { presentPaywallIfNeeded, PAYWALL_RESULT } = loadMonetization({
        nativeAvailable: false,
      });

      await expect(presentPaywallIfNeeded()).resolves.toBe(
        PAYWALL_RESULT.NOT_PRESENTED,
      );
      expect(RevenueCatUI.presentPaywallIfNeeded).not.toHaveBeenCalled();
    });

    it('presentCustomerCenter não lança e não chama o SDK', async () => {
      const { presentCustomerCenter } = loadMonetization({
        nativeAvailable: false,
      });

      await expect(presentCustomerCenter()).resolves.toBeUndefined();
      expect(RevenueCatUI.presentCustomerCenter).not.toHaveBeenCalled();
    });

    it('identifyPurchasesUser resolve null sem chamar logIn', async () => {
      const { identifyPurchasesUser } = loadMonetization({
        nativeAvailable: false,
      });

      await expect(identifyPurchasesUser('user-123')).resolves.toBeNull();
      expect(Purchases.logIn).not.toHaveBeenCalled();
    });

    it('subscribeToCustomerInfoUpdates devolve unsubscribe inofensivo', () => {
      const { subscribeToCustomerInfoUpdates } = loadMonetization({
        nativeAvailable: false,
      });

      const unsub = subscribeToCustomerInfoUpdates(jest.fn());

      expect(typeof unsub).toBe('function');
      expect(Purchases.addCustomerInfoUpdateListener).not.toHaveBeenCalled();
      expect(() => unsub()).not.toThrow();
    });
  });

  describe('com módulos nativos (development build)', () => {
    it('reporta compras como suportadas', () => {
      const { IS_PURCHASES_SUPPORTED } = loadMonetization({
        nativeAvailable: true,
      });
      expect(IS_PURCHASES_SUPPORTED).toBe(true);
    });

    it('inicializa o SDK e delega o paywall ao RevenueCatUI', async () => {
      const { configurePurchases, presentPaywallIfNeeded } = loadMonetization({
        nativeAvailable: true,
      });

      configurePurchases();
      await presentPaywallIfNeeded();

      expect(Purchases.configure).toHaveBeenCalled();
      expect(RevenueCatUI.presentPaywallIfNeeded).toHaveBeenCalled();
    });
  });
});
