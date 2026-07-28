import { NativeModules, Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { ENTITLEMENT_ID, REVENUECAT_API_KEY } from '@core/constants/products';
import { createLogger } from '@core/observability';

export { PAYWALL_RESULT };

const log = createLogger('core.api.monetization');

// ⛔ O RevenueCat depende de módulos nativos que o Expo Go não embarca. Em vez de
// falhar limpo, os SDKs caem num fallback de web ("Browser Mode" / "Preview API
// Mode") que tenta usar `document` — inexistente no React Native. O sintoma é
// "document is not available. This SDK requires a browser environment".
//
// A checagem abaixo é de CAPACIDADE, não de ambiente: pergunta se os módulos
// nativos existem de fato. É exatamente a mesma verificação que os próprios SDKs
// fazem para decidir entrar no modo fallback:
//   react-native-purchases/dist/utils/environment.js    → NativeModules.RNPurchases
//   react-native-purchases-ui/src/utils/environment.ts  → RNPaywalls + RNCustomerCenter
// Preferida a uma heurística de ambiente (`Constants.executionEnvironment`) porque
// também cobre web e um development build em que o linking nativo falhou.
const SUPPORTED_CORE =
  Platform.OS !== 'web' && Boolean(NativeModules.RNPurchases);
const SUPPORTED_UI =
  Platform.OS !== 'web' &&
  Boolean(NativeModules.RNPaywalls) &&
  Boolean(NativeModules.RNCustomerCenter);

/**
 * Exposto para a UI explicar ao usuário por que o botão de assinatura não abre nada.
 * Conservador de propósito: o fluxo de assinatura precisa das duas metades (comprar
 * via core + apresentar paywall/customer center via UI), então se qualquer uma
 * faltar a experiência está quebrada de todo jeito.
 */
export const IS_PURCHASES_SUPPORTED = SUPPORTED_CORE && SUPPORTED_UI;

// Distingue "estou no Expo Go" (esperado, informativo) de "os módulos sumiram num
// build que deveria tê-los" (aí sim é um aviso de verdade). Mesma checagem que os
// SDKs usam. Sem isso, todo `npx expo start` cospe um WARN que parece problema.
const IS_EXPO_GO = Boolean(
  typeof global !== 'undefined' && global.expo?.modules?.ExpoGo,
);

let notifiedUnsupported = false;

/** Registra uma única vez por sessão que o ambiente não suporta compras. */
function warnUnsupported(op) {
  if (notifiedUnsupported) return;
  notifiedUnsupported = true;

  const fields = { op, action: 'read' };
  if (IS_EXPO_GO) {
    log.info(
      'Compras desativadas no Expo Go (sem módulos nativos) — esperado; use um development build',
      fields,
    );
  } else {
    log.warn(
      'Módulos nativos do RevenueCat ausentes — verifique o linking nativo do build',
      fields,
    );
  }
}

let isConfigured = false;

/**
 * Configura o SDK do RevenueCat. Idempotente — seguro chamar mais de uma vez (ex:
 * Fast Refresh, ou múltiplos pontos de entrada chamando antes do login).
 */
export function configurePurchases() {
  if (isConfigured) return;

  if (!SUPPORTED_CORE) {
    warnUnsupported('configurePurchases');
    return;
  }

  if (!REVENUECAT_API_KEY) {
    log.exception(new Error('REVENUECAT_API_KEY ausente'), {
      op: 'configurePurchases',
      action: 'read',
    });
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  isConfigured = true;
}

/**
 * Vincula o SDK ao usuário logado (Firebase uid). É assim que o RevenueCat sabe
 * "quem" está comprando — usar sempre o mesmo uid do Firebase Auth, nunca um id
 * gerado no cliente, para o histórico de compras seguir o usuário entre dispositivos.
 */
export async function identifyPurchasesUser(uid) {
  if (!SUPPORTED_CORE) {
    warnUnsupported('identifyPurchasesUser');
    return null;
  }
  configurePurchases();
  try {
    const { customerInfo } = await Purchases.logIn(uid);
    return customerInfo;
  } catch (error) {
    throw log.failure(error, {
      op: 'identifyPurchasesUser',
      action: 'authenticate',
      context: { uid },
    });
  }
}

/** Desvincula o SDK do usuário (chamar no logout). */
export async function resetPurchasesUser() {
  if (!isConfigured) return;
  try {
    await Purchases.logOut();
  } catch (error) {
    // logOut lança se o usuário já está anônimo (ex: logout duplo) — não é um erro
    // real de negócio, só registra para diagnóstico.
    log.exception(error, { op: 'resetPurchasesUser', action: 'authenticate' });
  }
}

export async function fetchCustomerInfo() {
  if (!SUPPORTED_CORE) {
    warnUnsupported('fetchCustomerInfo');
    return null;
  }
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    throw log.failure(error, { op: 'fetchCustomerInfo', action: 'read' });
  }
}

/** Retorna o offering atual (pacotes configurados no painel do RevenueCat). */
export async function fetchCurrentOffering() {
  if (!SUPPORTED_CORE) {
    warnUnsupported('fetchCurrentOffering');
    return null;
  }
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    throw log.failure(error, { op: 'fetchCurrentOffering', action: 'read' });
  }
}

/**
 * Compra um pacote (`rc_package`, obtido de `fetchCurrentOffering`).
 * Retorna `null` quando o usuário simplesmente cancelou o fluxo nativo de compra —
 * isso não é um erro, então não é logado como falha.
 */
export async function purchasePackage(pkg) {
  if (!SUPPORTED_CORE) {
    warnUnsupported('purchasePackage');
    return null;
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (error) {
    if (error.userCancelled) return null;
    throw log.failure(error, {
      op: 'purchasePackage',
      action: 'write',
      context: {
        packageId: pkg?.identifier,
        productId: pkg?.product?.identifier,
      },
    });
  }
}

/** Restaura compras anteriores (obrigatório expor na UI — exigência das lojas). */
export async function restorePurchases() {
  if (!SUPPORTED_CORE) {
    warnUnsupported('restorePurchases');
    return null;
  }
  try {
    return await Purchases.restorePurchases();
  } catch (error) {
    throw log.failure(error, { op: 'restorePurchases', action: 'write' });
  }
}

/**
 * Assina atualizações de `CustomerInfo` (compra em outro dispositivo, renovação,
 * expiração, etc). Retorna a função de unsubscribe.
 */
export function subscribeToCustomerInfoUpdates(callback) {
  if (!SUPPORTED_CORE) {
    warnUnsupported('subscribeToCustomerInfoUpdates');
    return () => {};
  }
  configurePurchases();
  const listener = customerInfo => callback(customerInfo);
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

/** Deriva o status "é Pro?" a partir de um `CustomerInfo` — nunca setado manualmente. */
export function isEntitlementActive(customerInfo) {
  return Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]);
}

/**
 * Apresenta o paywall nativo do RevenueCat (template configurado no dashboard —
 * "Paywall Builder") só se o usuário AINDA NÃO tem o entitlement BookRats Pro.
 * Essa é a forma recomendada de "gatilho de paywall": chamar direto do ponto de
 * bloqueio (ex: botão "Adicionar 4º livro") sem precisar checar `isPro` manualmente
 * antes — o SDK já faz esse check e simplesmente não mostra nada se não precisar.
 *
 * @returns {Promise<PAYWALL_RESULT>} NOT_PRESENTED | CANCELLED | ERROR | PURCHASED | RESTORED
 */
export async function presentPaywallIfNeeded() {
  if (!SUPPORTED_UI) {
    warnUnsupported('presentPaywallIfNeeded');
    return PAYWALL_RESULT.NOT_PRESENTED;
  }
  try {
    return await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID,
    });
  } catch (error) {
    throw log.failure(error, {
      op: 'presentPaywallIfNeeded',
      action: 'write',
      context: { entitlementId: ENTITLEMENT_ID },
    });
  }
}

/**
 * Apresenta o paywall incondicionalmente (ex: tela dedicada "Seja Pro", acessada de
 * um botão nas Configurações — não é um gatilho de bloqueio, é navegação explícita).
 */
export async function presentPaywall(offering) {
  if (!SUPPORTED_UI) {
    warnUnsupported('presentPaywall');
    return PAYWALL_RESULT.NOT_PRESENTED;
  }
  try {
    return await RevenueCatUI.presentPaywall(
      offering ? { offering } : undefined,
    );
  } catch (error) {
    throw log.failure(error, { op: 'presentPaywall', action: 'write' });
  }
}

/**
 * Abre o Customer Center nativo (gerenciar assinatura, cancelar, pedir reembolso no
 * iOS, restaurar compras) — configurado no dashboard do RevenueCat. É o fluxo
 * recomendado pela RevenueCat para "gerenciar assinatura" em vez de construir uma
 * tela própria: cobre cancelamento/reembolso/downgrade sem código extra no app.
 */
export async function presentCustomerCenter() {
  if (!SUPPORTED_UI) {
    warnUnsupported('presentCustomerCenter');
    return;
  }
  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (error) {
    throw log.failure(error, { op: 'presentCustomerCenter', action: 'write' });
  }
}
