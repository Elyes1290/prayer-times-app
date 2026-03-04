// Mock pour react-native-purchases
export const LOG_LEVEL = {
  VERBOSE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
};

export interface PurchasesPackage {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    description: string;
    title: string;
    price: number;
    priceString: string;
    currencyCode: string;
  };
}

export interface CustomerInfo {
  activeSubscriptions: string[];
  allPurchasedProductIdentifiers: string[];
  entitlements: {
    active: Record<string, any>;
    all: Record<string, any>;
  };
}

const Purchases = {
  configure: jest.fn(),
  setLogLevel: jest.fn(),
  getOfferings: jest.fn(() => Promise.resolve({ current: null })),
  purchasePackage: jest.fn(() => Promise.resolve({
    customerInfo: {
      activeSubscriptions: [],
      allPurchasedProductIdentifiers: [],
      entitlements: { active: {}, all: {} },
    },
  })),
  getCustomerInfo: jest.fn(() => Promise.resolve({
    activeSubscriptions: [],
    allPurchasedProductIdentifiers: [],
    entitlements: { active: {}, all: {} },
  })),
  restorePurchases: jest.fn(() => Promise.resolve({
    activeSubscriptions: [],
    allPurchasedProductIdentifiers: [],
    entitlements: { active: {}, all: {} },
  })),
  logIn: jest.fn(),
  logOut: jest.fn(),
  isAnonymous: false,
};

export default Purchases;
