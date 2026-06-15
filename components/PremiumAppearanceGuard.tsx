import { useEffect } from "react";
import { usePremium } from "../contexts/PremiumContext";
import { useSettings } from "../contexts/SettingsContext";
import { runPremiumAppearanceReset } from "../utils/premiumAppearanceSync";

/**
 * Réinitialise thème / fond / adhan premium quand l'abonnement n'est plus actif.
 */
export function PremiumAppearanceGuard() {
  const { user, loading } = usePremium();
  const { themeMode, backgroundImageType, adhanSound } = useSettings();

  useEffect(() => {
    const hasPremiumAccess = user.isPremium || user.isVip === true;

    if (loading && hasPremiumAccess) {
      return;
    }

    if (hasPremiumAccess) {
      return;
    }

    void runPremiumAppearanceReset();
  }, [
    loading,
    user.isPremium,
    user.isVip,
    themeMode,
    backgroundImageType,
    adhanSound,
  ]);

  return null;
}
