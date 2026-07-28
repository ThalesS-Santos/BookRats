import { Platform } from 'react-native';

/**
 * RevenueCat API key. Uma chave por plataforma (o painel do RevenueCat trata iOS e
 * Android como projetos separados). Hoje as duas env vars apontam para a mesma chave
 * de teste — trocar por chaves reais de produção antes de publicar nas lojas.
 */
export const REVENUECAT_API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
  android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID,
  default: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID,
});

/**
 * Identificador do entitlement configurado no painel do RevenueCat
 * (Project → Entitlements). Precisa bater exatamente (case/espacos) com o que está
 * cadastrado lá — é assim que sabemos se o usuário tem acesso premium.
 */
export const ENTITLEMENT_ID = 'BookRats Pro';

/** IDs de produto (App Store Connect / Google Play Console), espelhados no RevenueCat. */
export const PRODUCT_IDS = {
  LIFETIME: 'lifetime',
  YEARLY: 'yearly',
  MONTHLY: 'monthly',
};

/** Identificador do offering padrão a carregar (deixe null para usar o "current"). */
export const DEFAULT_OFFERING_ID = null;
