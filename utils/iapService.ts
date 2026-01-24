import { Platform } from "react-native";
import Purchases, { LOG_LEVEL, PurchasesPackage } from "react-native-purchases";
import { IAP_CONFIG, IapSubscriptionType } from "./iapConfig";

export class IapService {
  private static instance: IapService;
  private isConfigured = false;

  private constructor() {}

  static getInstance(): IapService {
    if (!IapService.instance) {
      IapService.instance = new IapService();
    }
    return IapService.instance;
  }

  // Initialiser RevenueCat (iOS uniquement)
  async init(): Promise<void> {
    if (this.isConfigured || Platform.OS !== "ios") return;

    try {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      Purchases.configure({ apiKey: IAP_CONFIG.appleApiKey });
      this.isConfigured = true;
      console.log("✅ RevenueCat configuré avec succès");
    } catch (error) {
      console.error("❌ Erreur configuration RevenueCat:", error);
    }
  }

  // Identifier l'utilisateur dans RevenueCat
  async login(userId: string): Promise<void> {
    if (!this.isConfigured) await this.init();
    if (Platform.OS !== "ios") return;

    try {
      await Purchases.logIn(userId);
    } catch (error) {
      console.error("❌ Erreur login RevenueCat:", error);
    }
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

  // Effectuer un achat
  async purchasePackage(pack: PurchasesPackage): Promise<boolean> {
    if (!this.isConfigured) await this.init();
    if (Platform.OS !== "ios") return false;

    try {
      const { customerInfo } = await Purchases.purchasePackage(pack);
      return customerInfo.entitlements.active[IAP_CONFIG.entitlementId] !== undefined;
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error("❌ Erreur achat RevenueCat:", error);
      }
      return false;
    }
  }

  // Vérifier le statut premium
  async checkPremiumStatus(): Promise<boolean> {
    if (!this.isConfigured) await this.init();
    if (Platform.OS !== "ios") return false;

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo.entitlements.active[IAP_CONFIG.entitlementId] !== undefined;
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
      return customerInfo.entitlements.active[IAP_CONFIG.entitlementId] !== undefined;
    } catch (error) {
      console.error("❌ Erreur restauration RevenueCat:", error);
      return false;
    }
  }
}
