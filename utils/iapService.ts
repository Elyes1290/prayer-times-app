import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesPackage,
} from "react-native-purchases";
import { IAP_CONFIG } from "./iapConfig";

export interface AppleEntitlementSnapshot {
  expirationAtMs: number;
  productId: string;
  originalTransactionId: string | null;
}

type StoreTransaction = {
  transactionIdentifier?: string;
};

type SubscriptionInfo = {
  storeTransactionId?: string | null;
};

type PurchasesWithAttributes = typeof Purchases & {
  setEmail?: (email: string) => Promise<void>;
  setAttributes?: (attributes: Record<string, string | null>) => Promise<void>;
};

export class IapService {
  private static instance: IapService;
  private isConfigured = false;
  private initPromise: Promise<void> | null = null;
  private linkChain: Promise<void> = Promise.resolve();
  private lastLinkedEmail: string | null = null;

  private constructor() {}

  static getInstance(): IapService {
    if (!IapService.instance) {
      IapService.instance = new IapService();
    }
    return IapService.instance;
  }

  // Initialiser RevenueCat (iOS uniquement) — une seule configure() (sinon crash natif)
  async init(): Promise<void> {
    if (this.isConfigured || Platform.OS !== "ios") return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        Purchases.configure({ apiKey: IAP_CONFIG.appleApiKey });
        this.isConfigured = true;
        console.log("✅ RevenueCat configuré avec succès");
      } catch (error) {
        this.initPromise = null;
        console.error("❌ Erreur configuration RevenueCat:", error);
      }
    })();

    return this.initPromise;
  }

  /** Lie le compte MyAdhan (email) à RevenueCat : app_user_id + attribut $email */
  async linkAccount(email: string): Promise<void> {
    const normalized = email.trim();
    if (!normalized || Platform.OS !== "ios") return;
    if (this.lastLinkedEmail === normalized && this.isConfigured) return;

    const run = async () => {
      if (!this.isConfigured) {
        await this.init();
      }
      if (!this.isConfigured) return;

      try {
        await Purchases.logIn(normalized);
        const purchases = Purchases as PurchasesWithAttributes;
        if (typeof purchases.setEmail === "function") {
          await purchases.setEmail(normalized);
        }
        this.lastLinkedEmail = normalized;
      } catch (error) {
        console.error("❌ Erreur liaison RevenueCat:", error);
      }
    };

    this.linkChain = this.linkChain.then(run, run);
    return this.linkChain;
  }

  // Identifier l'utilisateur dans RevenueCat (alias de linkAccount)
  async login(userId: string): Promise<void> {
    await this.linkAccount(userId);
  }

  // Récupérer les offres (offering)
  async getOfferings(): Promise<any> {
    if (!this.isConfigured) await this.init();
    if (Platform.OS !== "ios") return null;

    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null) {
        return offerings.current;
      }
      return null;
    } catch (error) {
      console.error("❌ Erreur récupération offres RevenueCat:", error);
      return null;
    }
  }

  private buildSnapshotFromCustomerInfo(
    customerInfo: CustomerInfo,
    purchaseTransaction?: StoreTransaction | null
  ): AppleEntitlementSnapshot | null {
    const ent = customerInfo.entitlements.active[
      IAP_CONFIG.entitlementId
    ] as {
      expirationDate?: string | null;
      productIdentifier?: string;
      storeTransactionId?: string | null;
    };

    if (!ent) return null;

    const iso = ent.expirationDate;
    let expirationAtMs: number | null = null;
    if (iso && typeof iso === "string") {
      const t = new Date(iso).getTime();
      if (!Number.isNaN(t)) expirationAtMs = t;
    }
    if (expirationAtMs === null) return null;

    const productId = ent.productIdentifier ?? "";
    if (!productId) return null;

    const subs = (
      customerInfo as {
        subscriptionsByProductIdentifier?: Record<string, SubscriptionInfo>;
      }
    ).subscriptionsByProductIdentifier;

    const originalTransactionId =
      purchaseTransaction?.transactionIdentifier ??
      subs?.[productId]?.storeTransactionId ??
      ent.storeTransactionId ??
      null;

    return {
      expirationAtMs,
      productId,
      originalTransactionId,
    };
  }

  // Effectuer un achat — retourne les infos store pour register-iap / webhooks
  async purchasePackage(
    pack: PurchasesPackage
  ): Promise<AppleEntitlementSnapshot | null> {
    if (!this.isConfigured) await this.init();
    if (Platform.OS !== "ios") return null;

    try {
      const result = await Purchases.purchasePackage(pack);
      const transaction = (result as { transaction?: StoreTransaction })
        .transaction;
      return this.buildSnapshotFromCustomerInfo(
        result.customerInfo,
        transaction ?? null
      );
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error("❌ Erreur achat RevenueCat:", error);
      }
      return null;
    }
  }

  /** Dates réelles côté store (pour sync serveur lors des renouvellements Apple) */
  async getActiveEntitlementSnapshot(): Promise<AppleEntitlementSnapshot | null> {
    if (!this.isConfigured) await this.init();
    if (Platform.OS !== "ios") return null;

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return this.buildSnapshotFromCustomerInfo(customerInfo);
    } catch (error) {
      console.error("❌ Erreur snapshot entitlement RevenueCat:", error);
      return null;
    }
  }

  // Vérifier le statut premium
  async checkPremiumStatus(): Promise<boolean> {
    if (!this.isConfigured) await this.init();
    if (Platform.OS !== "ios") return false;

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return (
        customerInfo.entitlements.active[IAP_CONFIG.entitlementId] !== undefined
      );
    } catch (error) {
      console.error("❌ Erreur vérification statut RevenueCat:", error);
      return false;
    }
  }

  // Restaurer les achats
  async restorePurchases(): Promise<boolean> {
    if (!this.isConfigured) await this.init();
    if (Platform.OS !== "ios") return false;

    try {
      const customerInfo = await Purchases.restorePurchases();
      return (
        customerInfo.entitlements.active[IAP_CONFIG.entitlementId] !== undefined
      );
    } catch (error) {
      console.error("❌ Erreur restauration RevenueCat:", error);
      return false;
    }
  }
}
