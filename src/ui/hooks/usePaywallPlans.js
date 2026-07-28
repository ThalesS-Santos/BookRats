import { useMemo } from 'react';

/**
 * Normaliza o `PurchasesOffering` do RevenueCat num view-model estável para a UI.
 *
 * Por que existe: a tela não deve conhecer o shape do SDK (`availablePackages`,
 * `packageType`, `product.priceString`...). Aqui centralizamos ordenação, cópia
 * em pt-BR, cálculo de economia e o equivalente mensal do plano anual.
 */

const MONTHLY = 'MONTHLY';
const ANNUAL = 'ANNUAL';
const LIFETIME = 'LIFETIME';

// Ordem de exibição: compromisso crescente. O recomendado é o ANUAL.
const DISPLAY_ORDER = [MONTHLY, ANNUAL, LIFETIME];

const COPY = {
  [MONTHLY]: { label: 'Mensal', fallbackTagline: 'Cancele quando quiser' },
  [ANNUAL]: { label: 'Anual', fallbackTagline: 'Cobrado uma vez por ano' },
  [LIFETIME]: {
    label: 'Vitalício',
    fallbackTagline: 'Pague uma vez, para sempre',
  },
};

// Heurística de reserva: se o painel do RevenueCat usar identificadores custom
// (packageType vira CUSTOM/UNKNOWN), ainda conseguimos classificar pelo id do
// pacote/produto em vez de renderizar um paywall vazio.
const IDENTIFIER_HINTS = [
  [ANNUAL, /(annual|year|anual|ano)/i],
  [LIFETIME, /(lifetime|vital)/i],
  [MONTHLY, /(month|mensal|mes)/i],
];

const resolveType = pkg => {
  if (DISPLAY_ORDER.includes(pkg?.packageType)) return pkg.packageType;
  const haystack = `${pkg?.identifier ?? ''} ${pkg?.product?.identifier ?? ''}`;
  const hit = IDENTIFIER_HINTS.find(([, re]) => re.test(haystack));
  return hit ? hit[0] : null;
};

/**
 * Reformata um valor numérico preservando a apresentação de moeda que a loja já
 * devolveu em `priceString` (prefixo "R$ ", sufixo " €", separador decimal).
 * Evita `Intl`, cujo suporte no Hermes é inconsistente entre builds.
 */
export const formatPriceLike = (priceString, value) => {
  if (!priceString || !Number.isFinite(value) || value <= 0) return null;

  // Precisa começar E terminar em dígito: senão o espaço de "R$ 79,99" entraria
  // no match e seria comido na substituição. Separadores internos (inclusive
  // espaço de milhar, como em "1 234,56") continuam preservados.
  const numeric = priceString.match(/\d[\d\s.,]*\d|\d/);
  if (!numeric) return null;

  const sample = numeric[0];
  const decimalSeparator = /[.,](\d{1,2})$/.exec(sample)?.[0]?.charAt(0) ?? '.';

  return priceString.replace(
    sample,
    value.toFixed(2).replace('.', decimalSeparator),
  );
};

export function usePaywallPlans(offering) {
  return useMemo(() => {
    const packages = offering?.availablePackages ?? [];

    const byType = new Map();
    packages.forEach(pkg => {
      const type = resolveType(pkg);
      // Primeiro pacote de cada tipo ganha — evita que um duplicado sobrescreva.
      if (type && !byType.has(type)) byType.set(type, pkg);
    });

    const monthlyPrice = byType.get(MONTHLY)?.product?.price ?? null;

    const plans = DISPLAY_ORDER.map(type => {
      const pkg = byType.get(type);
      if (!pkg) return null;

      const product = pkg.product ?? {};
      const { fallbackTagline, label } = COPY[type];

      let tagline = fallbackTagline;
      let savingsLabel = null;

      if (type === ANNUAL) {
        const perMonth = product.pricePerMonth ?? (product.price ?? 0) / 12;
        const perMonthLabel = formatPriceLike(product.priceString, perMonth);
        if (perMonthLabel) tagline = `Equivale a ${perMonthLabel}/mês`;

        if (monthlyPrice > 0 && product.price > 0) {
          const percent = Math.round(
            (1 - product.price / (monthlyPrice * 12)) * 100,
          );
          if (percent > 0) savingsLabel = `Economize ${percent}%`;
        }
      }

      return {
        id: pkg.identifier || type,
        type,
        pkg,
        label,
        tagline,
        savingsLabel,
        priceString: product.priceString ?? '',
        isRecommended: type === ANNUAL,
      };
    }).filter(Boolean);

    const recommended = plans.find(p => p.isRecommended);

    return {
      plans,
      // Pré-seleção: o plano recomendado, ou o primeiro disponível.
      defaultPlanId: (recommended ?? plans[0])?.id ?? null,
    };
  }, [offering]);
}
