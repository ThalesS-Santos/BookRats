import {
  configurePurchases,
  fetchCurrentOffering,
  identifyPurchasesUser,
  isEntitlementActive,
  IS_PURCHASES_SUPPORTED,
  presentCustomerCenter as presentCustomerCenterApi,
  presentPaywall as presentPaywallApi,
  presentPaywallIfNeeded as presentPaywallIfNeededApi,
  purchasePackage as purchasePackageApi,
  resetPurchasesUser,
  restorePurchases as restorePurchasesApi,
  subscribeToCustomerInfoUpdates,
} from '@core/api/monetization';
import { createLogger } from '@core/observability';

const log = createLogger('core.store.monetization');

/**
 * Monetization Slice — assinatura RevenueCat (BookRats Pro).
 *
 * Estado 100% de SESSÃO (nunca entra no `partialize` de core/store/index.js):
 * `customerInfo`/`isPro` são espelhados ao vivo pelo listener do SDK do RevenueCat
 * (`subscribeToCustomerInfoUpdates`), que já sincroniza entre dispositivos e após
 * renovação/expiração — persistir localmente arriscaria mostrar acesso Pro obsoleto.
 *
 * `isPro` é sempre DERIVADO de `customerInfo.entitlements.active`, nunca setado
 * manualmente — mesmo princípio das outras camadas "Derivado" do store.
 *
 * @param {Function} set
 * @param {Function} get
 */
export const createMonetizationSlice = (set, get) => ({
  customerInfo: null,
  isPro: false,
  currentOffering: null,
  offeringsLoading: false,
  purchaseInProgress: false,
  restoreInProgress: false,
  unsubCustomerInfo: null,

  // Falso no Expo Go (sem módulos nativos do RevenueCat). A UI usa isso para
  // explicar ao usuário em vez de deixar o botão de assinatura "morto".
  purchasesSupported: IS_PURCHASES_SUPPORTED,

  /** Chamar quando o usuário loga (uid do Firebase Auth). */
  initializeMonetization: async uid => {
    configurePurchases();

    // 🧹 Evita listener duplicado se chamado mais de uma vez (mesmo padrão do
    // authSlice.setAuthUser para os listeners do Firestore).
    const { unsubCustomerInfo: prevUnsub } = get();
    if (prevUnsub) prevUnsub();

    const unsub = subscribeToCustomerInfoUpdates(customerInfo => {
      set({ customerInfo, isPro: isEntitlementActive(customerInfo) });
    });
    set({ unsubCustomerInfo: unsub });

    try {
      const customerInfo = await identifyPurchasesUser(uid);
      set({ customerInfo, isPro: isEntitlementActive(customerInfo) });
    } catch (error) {
      log.exception(error, {
        op: 'initializeMonetization',
        action: 'authenticate',
        context: { uid },
      });
    }

    if (get().loadOfferings) get().loadOfferings();
  },

  /** Chamar no logout — desvincula o SDK e limpa o estado local. */
  teardownMonetization: async () => {
    const { unsubCustomerInfo } = get();
    if (unsubCustomerInfo) unsubCustomerInfo();

    await resetPurchasesUser();

    set({
      customerInfo: null,
      isPro: false,
      currentOffering: null,
      unsubCustomerInfo: null,
    });
  },

  loadOfferings: async () => {
    set({ offeringsLoading: true });
    try {
      const currentOffering = await fetchCurrentOffering();
      set({ currentOffering });
    } catch (error) {
      log.exception(error, { op: 'loadOfferings', action: 'read' });
    } finally {
      set({ offeringsLoading: false });
    }
  },

  /**
   * Compra um `rc_package`. Lança em erro real (a UI decide como exibir); retorna
   * `null` silenciosamente se o usuário só cancelou o fluxo nativo.
   */
  purchasePackage: async pkg => {
    set({ purchaseInProgress: true });
    try {
      const customerInfo = await purchasePackageApi(pkg);
      if (customerInfo) {
        set({ customerInfo, isPro: isEntitlementActive(customerInfo) });
      }
      return customerInfo;
    } finally {
      set({ purchaseInProgress: false });
    }
  },

  restorePurchases: async () => {
    set({ restoreInProgress: true });
    try {
      const customerInfo = await restorePurchasesApi();
      set({ customerInfo, isPro: isEntitlementActive(customerInfo) });
      return customerInfo;
    } finally {
      set({ restoreInProgress: false });
    }
  },

  /**
   * Gatilho de paywall: só apresenta a tela nativa se o usuário ainda não é Pro.
   * `customerInfo`/`isPro` já são atualizados automaticamente pelo listener do
   * SDK (`subscribeToCustomerInfoUpdates`) se a compra for concluída dentro do
   * paywall — não precisa refazer o fetch aqui.
   */
  presentPaywallIfNeeded: () => presentPaywallIfNeededApi(),

  /** Apresenta o paywall sem checar entitlement (navegação explícita "Seja Pro"). */
  presentPaywall: offering => presentPaywallApi(offering),

  /** Abre o Customer Center nativo (gerenciar/cancelar assinatura, reembolso). */
  presentCustomerCenter: () => presentCustomerCenterApi(),
});
