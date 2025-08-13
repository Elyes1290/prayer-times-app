// Mock de React Native et modules natifs
import {
  initNotifications,
  schedulePrayerNotifications,
} from "../../utils/notifications";
import { NativeModules } from "react-native";
import i18n from "../../locales/i18n";

jest.mock("react-native", () => ({
  NativeModules: {
    AdhanModule: {
      saveNotificationSettings: jest.fn(),
      schedulePrayerReminders: jest.fn(),
    },
  },
  Platform: {
    OS: "android",
  },
}));

// Mock de i18n
jest.mock("../../locales/i18n", () => ({
  t: jest.fn((key: string, params?: any) => {
    if (key === "prayer_reminder_title") return "Prayer Reminder";
    if (key === "prayer_reminder_body") {
      return `${params?.prayer} prayer in ${params?.minutes} minutes`;
    }
    return key;
  }),
}));

describe("Notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initNotifications", () => {
    test("should initialize without errors", async () => {
      // Test simple car la fonction est vide côté Android
      await expect(initNotifications()).resolves.toBeUndefined();
    });
  });

  describe("schedulePrayerNotifications", () => {
    const mockPrayerTimes = {
      Fajr: new Date(Date.now() + 3600000), // +1 heure
      Dhuhr: new Date(Date.now() + 7200000), // +2 heures
      Asr: new Date(Date.now() + 10800000), // +3 heures
      Maghrib: new Date(Date.now() + 14400000), // +4 heures
      Isha: new Date(Date.now() + 18000000), // +5 heures
    };

    test("should schedule reminders when enabled", async () => {
      const adhanSound = "misharyrachid.mp3";
      const remindersEnabled = true;
      const reminderOffset = 15; // 15 minutes avant

      await schedulePrayerNotifications(
        mockPrayerTimes,
        adhanSound,
        remindersEnabled,
        reminderOffset
      );

      // Vérifier que les paramètres sont sauvegardés
      expect(
        NativeModules.AdhanModule.saveNotificationSettings
      ).toHaveBeenCalledWith({
        reminderOffset: 15,
      });

      // Vérifier que les rappels sont programmés
      expect(
        NativeModules.AdhanModule.schedulePrayerReminders
      ).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            prayer: expect.any(String),
            triggerMillis: expect.any(Number),
            title: "Prayer Reminder",
            body: expect.stringContaining("prayer in 15 minutes"),
            isToday: true,
          }),
        ])
      );
    });

    test("should not schedule reminders when disabled", async () => {
      const adhanSound = "misharyrachid.mp3";
      const remindersEnabled = false;
      const reminderOffset = 15;

      await schedulePrayerNotifications(
        mockPrayerTimes,
        adhanSound,
        remindersEnabled,
        reminderOffset
      );

      // Aucun appel aux modules natifs ne devrait être fait
      expect(
        NativeModules.AdhanModule.saveNotificationSettings
      ).not.toHaveBeenCalled();
      expect(
        NativeModules.AdhanModule.schedulePrayerReminders
      ).not.toHaveBeenCalled();
    });

    test("should filter out past prayer times", async () => {
      const pastPrayerTimes = {
        Fajr: new Date(Date.now() - 3600000), // -1 heure (passé)
        Dhuhr: new Date(Date.now() + 3600000), // +1 heure (futur)
        Asr: new Date(Date.now() - 1800000), // -30 minutes (passé)
      };

      await schedulePrayerNotifications(
        pastPrayerTimes,
        "misharyrachid.mp3",
        true,
        15
      );

      // Vérifier qu'au moins une prière future est programmée
      expect(
        NativeModules.AdhanModule.schedulePrayerReminders
      ).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            prayer: "Dhuhr", // Seule prière future
          }),
        ])
      );

      // Vérifier que seules les prières futures sont dans le tableau
      const scheduledReminders = (
        NativeModules.AdhanModule.schedulePrayerReminders as jest.Mock
      ).mock.calls[0][0];

      expect(scheduledReminders).toHaveLength(1);
      expect(scheduledReminders[0].prayer).toBe("Dhuhr");
    });

    test("should handle minimum time gap for very close reminders", async () => {
      const veryClosePrayerTimes = {
        Fajr: new Date(Date.now() + 60000), // +1 minute
      };

      await schedulePrayerNotifications(
        veryClosePrayerTimes,
        "misharyrachid.mp3",
        true,
        15 // 15 minutes avant, mais la prière est dans 1 minute
      );

      // Pour une prière dans 1 minute avec un rappel de 15 min avant,
      // le rappel serait dans le passé, donc aucun rappel n'est programmé
      expect(
        NativeModules.AdhanModule.schedulePrayerReminders
      ).not.toHaveBeenCalled();
    });

    test("should handle empty prayer times", async () => {
      await schedulePrayerNotifications({}, "misharyrachid.mp3", true, 15);

      // Aucun rappel ne devrait être programmé
      expect(
        NativeModules.AdhanModule.schedulePrayerReminders
      ).not.toHaveBeenCalled();
    });

    test("should handle different reminder offsets", async () => {
      const testOffsets = [5, 10, 15, 30, 60];

      for (const offset of testOffsets) {
        jest.clearAllMocks();

        await schedulePrayerNotifications(
          { Fajr: new Date(Date.now() + 7200000) }, // +2 heures
          "misharyrachid.mp3",
          true,
          offset
        );

        // Vérifier que l'offset correct est sauvegardé
        expect(
          NativeModules.AdhanModule.saveNotificationSettings
        ).toHaveBeenCalledWith({
          reminderOffset: offset,
        });

        // Vérifier que le texte du rappel contient le bon nombre de minutes
        const scheduledReminders = (
          NativeModules.AdhanModule.schedulePrayerReminders as jest.Mock
        ).mock.calls[0][0];

        expect(scheduledReminders[0].body).toContain(`${offset} minutes`);
      }
    });

    test("should calculate reminder time correctly", async () => {
      const prayerTime = new Date(Date.now() + 3600000); // +1 heure
      const reminderOffset = 15; // 15 minutes

      await schedulePrayerNotifications(
        { Fajr: prayerTime },
        "misharyrachid.mp3",
        true,
        reminderOffset
      );

      const scheduledReminders = (
        NativeModules.AdhanModule.schedulePrayerReminders as jest.Mock
      ).mock.calls[0][0];

      const expectedReminderTime =
        prayerTime.getTime() - reminderOffset * 60 * 1000;
      expect(scheduledReminders[0].triggerMillis).toBe(expectedReminderTime);
    });

    test("should handle all prayer types correctly", async () => {
      const allPrayers = {
        Fajr: new Date(Date.now() + 3600000),
        Sunrise: new Date(Date.now() + 7200000),
        Dhuhr: new Date(Date.now() + 10800000),
        Asr: new Date(Date.now() + 14400000),
        Maghrib: new Date(Date.now() + 18000000),
        Isha: new Date(Date.now() + 21600000),
      };

      await schedulePrayerNotifications(
        allPrayers,
        "misharyrachid.mp3",
        true,
        15
      );

      const scheduledReminders = (
        NativeModules.AdhanModule.schedulePrayerReminders as jest.Mock
      ).mock.calls[0][0];

      // Vérifier que tous les types de prières sont traités
      const prayerNames = scheduledReminders.map((r: any) => r.prayer);
      expect(prayerNames).toContain("Fajr");
      expect(prayerNames).toContain("Dhuhr");
      expect(prayerNames).toContain("Asr");
      expect(prayerNames).toContain("Maghrib");
      expect(prayerNames).toContain("Isha");

      // Vérifier que tous ont la structure correcte
      scheduledReminders.forEach((reminder: any) => {
        expect(reminder).toHaveProperty("prayer");
        expect(reminder).toHaveProperty("triggerMillis");
        expect(reminder).toHaveProperty("title");
        expect(reminder).toHaveProperty("body");
        expect(reminder).toHaveProperty("isToday");
        expect(reminder.isToday).toBe(true);
      });
    });

    test("should handle i18n translation calls", async () => {
      await schedulePrayerNotifications(
        { Fajr: new Date(Date.now() + 3600000) },
        "misharyrachid.mp3",
        true,
        15
      );

      // Vérifier que les traductions sont appelées
      expect(i18n.t).toHaveBeenCalledWith("prayer_reminder_title");
      expect(i18n.t).toHaveBeenCalledWith("prayer_reminder_body", {
        prayer: "Fajr",
        minutes: 15,
      });
    });
  });

  describe("Edge Cases", () => {
    test("should handle null/undefined prayer times", async () => {
      const invalidPrayerTimes = {
        Fajr: null as any,
        Dhuhr: undefined as any,
        Asr: new Date(Date.now() + 3600000),
      };

      // La fonction devrait gérer les erreurs gracieusement
      // ou lever une erreur pour les valeurs invalides
      await expect(
        schedulePrayerNotifications(
          invalidPrayerTimes,
          "misharyrachid.mp3",
          true,
          15
        )
      ).rejects.toThrow();
    });

    test("should handle very large reminder offsets", async () => {
      const largeOffset = 1440; // 24 heures

      await schedulePrayerNotifications(
        { Fajr: new Date(Date.now() + 86400000 * 2) }, // +2 jours
        "misharyrachid.mp3",
        true,
        largeOffset
      );

      expect(
        NativeModules.AdhanModule.saveNotificationSettings
      ).toHaveBeenCalledWith({
        reminderOffset: largeOffset,
      });
    });

    test("should handle zero reminder offset", async () => {
      const prayerTime = Date.now() + 3600000;
      
      await schedulePrayerNotifications(
        { Fajr: new Date(prayerTime) },
        "misharyrachid.mp3",
        true,
        0
      );

      const scheduledReminders = (
        NativeModules.AdhanModule.schedulePrayerReminders as jest.Mock
      ).mock.calls[0][0];

      // Le rappel devrait être programmé exactement au moment de la prière
      // Tolérance de 100ms pour les différences de timing
      expect(scheduledReminders[0].triggerMillis).toBeCloseTo(prayerTime, -2);
    });
  });
});
