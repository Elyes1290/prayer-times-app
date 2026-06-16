import { useEffect } from "react";
import { usePremium } from "../contexts/PremiumContext";
import { runPremiumAppearanceReset } from "../utils/premiumAppearanceSync";

/**
 * Réinitialise thème / fond / adhan premium quand l'abonnement n'est plus actif.
 */
export function PremiumAppearanceGuard() {
  const { user, loading } = usePremium();

  useEffect(() => {
    if (loading) {
      return;
    }

    const hasPremiumAccess = user.isPremium || user.isVip === true;
    if (hasPremiumAccess) {
      return;
    }

    void runPremiumAppearanceReset();
  }, [loading, user.isPremium, user.isVip]);

  return null;
}
