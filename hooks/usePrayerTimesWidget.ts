import { useEffect, useCallback, useState } from "react";
import { NativeModules, Platform } from "react-native";

const { PrayerTimesWidgetModule } = NativeModules;

interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface PrayerTimesWithTomorrow {
  today: PrayerTimes;
  tomorrow: PrayerTimes;
}

export const usePrayerTimesWidget = () => {
  const [isWidgetAvailable, setIsWidgetAvailable] = useState(false);

  // Vérifier si le widget est disponible
  const checkWidgetAvailability = useCallback(async () => {
    console.log("🔍 Vérification disponibilité widget iOS...");
    console.log("  - Platform.OS:", Platform.OS);
    console.log("  - PrayerTimesWidgetModule existe:", !!PrayerTimesWidgetModule);
    
    if (Platform.OS !== "ios") {
      console.log("⚠️ Widget non disponible (pas sur iOS)");
      setIsWidgetAvailable(false);
      return;
    }

    if (!PrayerTimesWidgetModule) {
      console.error("❌ PrayerTimesWidgetModule n'est pas chargé !");
      console.error("   Vérifiez que le module natif est bien compilé et lié.");
      setIsWidgetAvailable(false);
      return;
    }

    try {
      const available = await PrayerTimesWidgetModule.isWidgetAvailable();
      setIsWidgetAvailable(available);
      console.log("✅ Widget Horaires de Prière disponible:", available);
    } catch (error) {
      console.error("❌ Erreur vérification widget horaires:", error);
      setIsWidgetAvailable(false);
    }
  }, []);

  // Mettre à jour les horaires de prière dans le widget
  const updatePrayerTimes = useCallback(
    async (prayerTimes: PrayerTimesWithTomorrow | PrayerTimes) => {
      if (!isWidgetAvailable || !PrayerTimesWidgetModule) {
        console.log("⚠️ Widget non disponible ou module natif absent");
        return;
      }

      try {
        // Support de l'ancien format (PrayerTimes) et du nouveau format (PrayerTimesWithTomorrow)
        const todayTimes = 'today' in prayerTimes ? prayerTimes.today : prayerTimes;
        const tomorrowTimes = 'tomorrow' in prayerTimes ? prayerTimes.tomorrow : todayTimes;
        
        console.log("🕌 Mise à jour du widget avec les horaires:", { todayTimes, tomorrowTimes });
        
        await PrayerTimesWidgetModule.updatePrayerTimes(
          todayTimes.Fajr,
          todayTimes.Sunrise,
          todayTimes.Dhuhr,
          todayTimes.Asr,
          todayTimes.Maghrib,
          todayTimes.Isha,
          tomorrowTimes.Fajr,
          tomorrowTimes.Sunrise,
          tomorrowTimes.Dhuhr,
          tomorrowTimes.Asr,
          tomorrowTimes.Maghrib,
          tomorrowTimes.Isha
        );
        
        console.log("✅ Widget mis à jour avec succès (aujourd'hui + demain)");
      } catch (error) {
        console.error("❌ Erreur mise à jour widget horaires:", error);
      }
    },
    [isWidgetAvailable]
  );

  // Récupérer les horaires stockés dans le widget
  const getPrayerTimes = useCallback(async (): Promise<PrayerTimes | null> => {
    if (!isWidgetAvailable || !PrayerTimesWidgetModule) {
      return null;
    }

    try {
      const times = await PrayerTimesWidgetModule.getPrayerTimes();
      return times as PrayerTimes;
    } catch (error) {
      console.error("❌ Erreur récupération horaires widget:", error);
      return null;
    }
  }, [isWidgetAvailable]);

  // Forcer le rafraîchissement du widget
  const forceWidgetRefresh = useCallback(async () => {
    if (!isWidgetAvailable || !PrayerTimesWidgetModule) {
      return;
    }

    try {
      await PrayerTimesWidgetModule.forceWidgetRefresh();
      console.log("🔄 Widget forcé à se rafraîchir");
    } catch (error) {
      console.error("❌ Erreur rafraîchissement widget:", error);
    }
  }, [isWidgetAvailable]);

  // Vérifier la disponibilité au démarrage
  useEffect(() => {
    checkWidgetAvailability();
  }, [checkWidgetAvailability]);

  return {
    isWidgetAvailable,
    updatePrayerTimes,
    getPrayerTimes,
    forceWidgetRefresh,
    checkWidgetAvailability,
  };
};
