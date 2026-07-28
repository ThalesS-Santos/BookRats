import React from 'react';

import { render, renderHook, screen } from '@testing-library/react-native';

import { useMainStore } from '@core/store';
import { formatPriceLike, usePaywallPlans } from '@ui/hooks/usePaywallPlans';
import PaywallScreen from '@ui/screens/PaywallScreen';

/**
 * Cobertura do paywall próprio (PaywallScreen + usePaywallPlans), que substituiu
 * o template hospedado da RevenueCatUI.
 *
 * O foco é a lógica que é fácil de errar em silêncio: ordenação dos planos,
 * cálculo de economia, equivalente mensal e preservação do formato de moeda que
 * a loja devolveu — além de um smoke de render para pegar erro de integração.
 */

const makePackage = (packageType, identifier, product) => ({
  identifier,
  packageType,
  product,
});

const OFFERING = {
  availablePackages: [
    // Fora de ordem de propósito: a ordenação é responsabilidade do hook.
    makePackage('LIFETIME', 'lifetime', {
      identifier: 'lifetime',
      price: 99.99,
      priceString: '$99.99',
      pricePerMonth: null,
    }),
    makePackage('MONTHLY', 'monthly', {
      identifier: 'monthly',
      price: 9.99,
      priceString: '$9.99',
      pricePerMonth: 9.99,
    }),
    makePackage('ANNUAL', 'yearly', {
      identifier: 'yearly',
      price: 79.99,
      priceString: '$79.99',
      pricePerMonth: 6.6658,
    }),
  ],
};

const navigation = { goBack: jest.fn(), navigate: jest.fn() };

const setStore = overrides => {
  useMainStore.setState({
    currentOffering: null,
    offeringsLoading: false,
    purchaseInProgress: false,
    restoreInProgress: false,
    isPro: false,
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    loadOfferings: jest.fn(),
    ...overrides,
  });
};

describe('formatPriceLike', () => {
  it('preserva prefixo e separador decimal da loja', () => {
    expect(formatPriceLike('$79.99', 6.6658)).toBe('$6.67');
    expect(formatPriceLike('R$ 79,99', 6.6658)).toBe('R$ 6,67');
  });

  it('preserva sufixo de moeda', () => {
    expect(formatPriceLike('79,99 €', 6.5)).toBe('6,50 €');
  });

  it('devolve null para entradas inutilizáveis', () => {
    expect(formatPriceLike('$79.99', 0)).toBeNull();
    expect(formatPriceLike('$79.99', NaN)).toBeNull();
    expect(formatPriceLike('', 5)).toBeNull();
    expect(formatPriceLike(null, 5)).toBeNull();
  });
});

describe('usePaywallPlans', () => {
  it('ordena por compromisso crescente, não pela ordem do SDK', () => {
    const { result } = renderHook(() => usePaywallPlans(OFFERING));

    expect(result.current.plans.map(p => p.label)).toEqual([
      'Mensal',
      'Anual',
      'Vitalício',
    ]);
  });

  it('recomenda e pré-seleciona o plano anual', () => {
    const { result } = renderHook(() => usePaywallPlans(OFFERING));

    expect(result.current.defaultPlanId).toBe('yearly');
    expect(result.current.plans.filter(p => p.isRecommended)).toHaveLength(1);
    expect(result.current.plans.find(p => p.isRecommended).label).toBe('Anual');
  });

  it('calcula a economia do anual contra 12x o mensal', () => {
    const { result } = renderHook(() => usePaywallPlans(OFFERING));
    const annual = result.current.plans.find(p => p.label === 'Anual');

    // 1 - 79.99 / (9.99 * 12) = 33.3% → 33%
    expect(annual.savingsLabel).toBe('Economize 33%');
  });

  it('mostra o equivalente mensal do anual na moeda da loja', () => {
    const { result } = renderHook(() => usePaywallPlans(OFFERING));
    const annual = result.current.plans.find(p => p.label === 'Anual');

    expect(annual.tagline).toBe('Equivale a $6.67/mês');
  });

  it('não anuncia economia quando não há mensal para comparar', () => {
    const onlyAnnual = {
      availablePackages: [
        makePackage('ANNUAL', 'yearly', {
          identifier: 'yearly',
          price: 79.99,
          priceString: '$79.99',
          pricePerMonth: 6.66,
        }),
      ],
    };

    const { result } = renderHook(() => usePaywallPlans(onlyAnnual));

    expect(result.current.plans).toHaveLength(1);
    expect(result.current.plans[0].savingsLabel).toBeNull();
  });

  it('classifica pelo identificador quando o packageType é CUSTOM', () => {
    const custom = {
      availablePackages: [
        makePackage('CUSTOM', 'bookrats_anual_promo', {
          identifier: 'yearly',
          price: 79.99,
          priceString: '$79.99',
          pricePerMonth: 6.66,
        }),
      ],
    };

    const { result } = renderHook(() => usePaywallPlans(custom));

    expect(result.current.plans).toHaveLength(1);
    expect(result.current.plans[0].label).toBe('Anual');
  });

  it('devolve lista vazia sem offering (não quebra a tela)', () => {
    const { result } = renderHook(() => usePaywallPlans(null));

    expect(result.current.plans).toEqual([]);
    expect(result.current.defaultPlanId).toBeNull();
  });
});

describe('PaywallScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza os três planos e a chamada de ação', () => {
    setStore({ currentOffering: OFFERING });

    render(<PaywallScreen navigation={navigation} />);

    expect(screen.getByText('BookRats Pro')).toBeTruthy();
    expect(screen.getByText('Mensal')).toBeTruthy();
    expect(screen.getByText('Anual')).toBeTruthy();
    expect(screen.getByText('Vitalício')).toBeTruthy();
    expect(screen.getByText('Assinar Agora')).toBeTruthy();
    expect(screen.getByText('Restaurar Compras')).toBeTruthy();
  });

  it('marca o plano recomendado como selecionado por padrão', () => {
    setStore({ currentOffering: OFFERING });

    render(<PaywallScreen navigation={navigation} />);

    const annual = screen.getByLabelText('Anual, $79.99');
    const monthly = screen.getByLabelText('Mensal, $9.99');

    expect(annual.props.accessibilityState.selected).toBe(true);
    expect(monthly.props.accessibilityState.selected).toBe(false);
  });

  it('busca as offerings quando ainda não estão em memória', () => {
    const loadOfferings = jest.fn();
    setStore({ currentOffering: null, loadOfferings });

    render(<PaywallScreen navigation={navigation} />);

    expect(loadOfferings).toHaveBeenCalled();
  });

  it('não busca de novo enquanto uma busca está em andamento', () => {
    const loadOfferings = jest.fn();
    setStore({ currentOffering: null, offeringsLoading: true, loadOfferings });

    render(<PaywallScreen navigation={navigation} />);

    expect(loadOfferings).not.toHaveBeenCalled();
  });

  it('oferece nova tentativa quando não há planos para exibir', () => {
    setStore({ currentOffering: null, offeringsLoading: false });

    render(<PaywallScreen navigation={navigation} />);

    expect(screen.getByText('Tentar novamente')).toBeTruthy();
    // Sem planos, não faz sentido oferecer a compra.
    expect(screen.queryByText('Assinar Agora')).toBeNull();
  });
});
