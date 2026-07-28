import {
  configurePurchases,
  fetchCurrentOffering,
  identifyPurchasesUser,
  isEntitlementActive,
  presentCustomerCenter,
  presentPaywall,
  presentPaywallIfNeeded,
  purchasePackage,
  resetPurchasesUser,
  restorePurchases,
  subscribeToCustomerInfoUpdates,
} from '@core/api/monetization';
import { createMonetizationSlice } from '@core/store/slices/monetizationSlice';

jest.mock('@core/api/monetization', () => ({
  configurePurchases: jest.fn(),
  fetchCurrentOffering: jest.fn(),
  identifyPurchasesUser: jest.fn(),
  isEntitlementActive: jest.fn(),
  IS_PURCHASES_SUPPORTED: true,
  presentCustomerCenter: jest.fn(),
  presentPaywall: jest.fn(),
  presentPaywallIfNeeded: jest.fn(),
  purchasePackage: jest.fn(),
  resetPurchasesUser: jest.fn(),
  restorePurchases: jest.fn(),
  subscribeToCustomerInfoUpdates: jest.fn(),
}));

describe('Monetization Slice', () => {
  let state;
  let setMock;
  let getMock;

  beforeEach(() => {
    jest.clearAllMocks();

    state = {};
    setMock = jest.fn(newState => {
      state = {
        ...state,
        ...(typeof newState === 'function' ? newState(state) : newState),
      };
    });

    getMock = jest.fn(() => state);

    const slice = createMonetizationSlice(setMock, getMock);
    state = {
      ...slice,
    };
  });

  it('should initialize with correct default state', () => {
    expect(state.customerInfo).toBeNull();
    expect(state.isPro).toBe(false);
    expect(state.currentOffering).toBeNull();
    expect(state.offeringsLoading).toBe(false);
    expect(state.purchaseInProgress).toBe(false);
    expect(state.restoreInProgress).toBe(false);
    expect(state.unsubCustomerInfo).toBeNull();
    expect(state.purchasesSupported).toBe(true);
  });

  describe('initializeMonetization', () => {
    it('should configure purchases, setup listener and identify user', async () => {
      const mockUnsub = jest.fn();
      subscribeToCustomerInfoUpdates.mockReturnValue(mockUnsub);

      const mockCustomerInfo = {
        entitlements: { active: { 'BookRats Pro': {} } },
      };
      identifyPurchasesUser.mockResolvedValue(mockCustomerInfo);
      isEntitlementActive.mockReturnValue(true);

      const loadOfferingsMock = jest.fn();
      state.loadOfferings = loadOfferingsMock;

      await state.initializeMonetization('user-123');

      expect(configurePurchases).toHaveBeenCalled();
      expect(subscribeToCustomerInfoUpdates).toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledWith({ unsubCustomerInfo: mockUnsub });
      expect(identifyPurchasesUser).toHaveBeenCalledWith('user-123');
      expect(isEntitlementActive).toHaveBeenCalledWith(mockCustomerInfo);
      expect(state.customerInfo).toEqual(mockCustomerInfo);
      expect(state.isPro).toBe(true);
      expect(loadOfferingsMock).toHaveBeenCalled();
    });

    it('should unsubscribe from previous listener if active', async () => {
      const mockPrevUnsub = jest.fn();
      state.unsubCustomerInfo = mockPrevUnsub;

      subscribeToCustomerInfoUpdates.mockReturnValue(jest.fn());
      identifyPurchasesUser.mockResolvedValue({});

      await state.initializeMonetization('user-123');

      expect(mockPrevUnsub).toHaveBeenCalled();
    });
  });

  describe('teardownMonetization', () => {
    it('should unsubscribe, reset user purchases, and clear state', async () => {
      const mockUnsub = jest.fn();
      state.unsubCustomerInfo = mockUnsub;

      await state.teardownMonetization();

      expect(mockUnsub).toHaveBeenCalled();
      expect(resetPurchasesUser).toHaveBeenCalled();
      expect(state.customerInfo).toBeNull();
      expect(state.isPro).toBe(false);
      expect(state.currentOffering).toBeNull();
      expect(state.unsubCustomerInfo).toBeNull();
    });
  });

  describe('loadOfferings', () => {
    it('should fetch and set current offering', async () => {
      const mockOffering = { id: 'default' };
      fetchCurrentOffering.mockResolvedValue(mockOffering);

      await state.loadOfferings();

      expect(setMock).toHaveBeenCalledWith({ offeringsLoading: true });
      expect(fetchCurrentOffering).toHaveBeenCalled();
      expect(state.currentOffering).toEqual(mockOffering);
      expect(setMock).toHaveBeenCalledWith({ offeringsLoading: false });
    });
  });

  describe('purchasePackage', () => {
    it('should purchase package and update state', async () => {
      const mockPkg = { identifier: 'pkg' };
      const mockCustomerInfo = { entitlements: { active: {} } };
      purchasePackage.mockResolvedValue(mockCustomerInfo);
      isEntitlementActive.mockReturnValue(false);

      const result = await state.purchasePackage(mockPkg);

      expect(setMock).toHaveBeenCalledWith({ purchaseInProgress: true });
      expect(purchasePackage).toHaveBeenCalledWith(mockPkg);
      expect(state.customerInfo).toEqual(mockCustomerInfo);
      expect(state.isPro).toBe(false);
      expect(setMock).toHaveBeenCalledWith({ purchaseInProgress: false });
      expect(result).toEqual(mockCustomerInfo);
    });
  });

  describe('restorePurchases', () => {
    it('should restore purchases and update state', async () => {
      const mockCustomerInfo = {
        entitlements: { active: { 'BookRats Pro': {} } },
      };
      restorePurchases.mockResolvedValue(mockCustomerInfo);
      isEntitlementActive.mockReturnValue(true);

      const result = await state.restorePurchases();

      expect(setMock).toHaveBeenCalledWith({ restoreInProgress: true });
      expect(restorePurchases).toHaveBeenCalled();
      expect(state.customerInfo).toEqual(mockCustomerInfo);
      expect(state.isPro).toBe(true);
      expect(setMock).toHaveBeenCalledWith({ restoreInProgress: false });
      expect(result).toEqual(mockCustomerInfo);
    });
  });

  describe('UI methods', () => {
    it('should call presentPaywallIfNeededApi', () => {
      state.presentPaywallIfNeeded();
      expect(presentPaywallIfNeeded).toHaveBeenCalled();
    });

    it('should call presentPaywallApi', () => {
      const offering = { id: 'offering' };
      state.presentPaywall(offering);
      expect(presentPaywall).toHaveBeenCalledWith(offering);
    });

    it('should call presentCustomerCenterApi', () => {
      state.presentCustomerCenter();
      expect(presentCustomerCenter).toHaveBeenCalled();
    });
  });
});
