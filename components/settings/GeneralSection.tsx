import React from "react";
import { View, Text, Switch, Platform } from "react-native";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";

interface GeneralSectionProps {
  // États général
  notificationsEnabled: boolean;
  remindersEnabled: boolean;
  reminderOffset: number;
  duaAfterAdhanEnabled: boolean; // 🚀 NOUVEAU : Option pour la dua après l'adhan

  // Fonctions général
  handleNotificationsToggle: (value: boolean) => Promise<void>;
  setDuaAfterAdhanEnabled: (value: boolean) => void; // 🚀 NOUVEAU : Setter pour la dua après l'adhan
  markPendingChanges: () => void;
  setRemindersEnabled: (value: boolean) => void;
  setReminderOffset: (value: number) => void;

  // Styles
  styles: any;
}

export default function GeneralSection({
  notificationsEnabled,
  remindersEnabled,
  reminderOffset,
  duaAfterAdhanEnabled, // 🚀 NOUVEAU : Paramètre pour la dua après l'adhan
  handleNotificationsToggle,
  setDuaAfterAdhanEnabled, // 🚀 NOUVEAU : Setter pour la dua après l'adhan
  markPendingChanges,
  setRemindersEnabled,
  setReminderOffset,
  styles,
}: GeneralSectionProps) {
  const { t } = useTranslation();

  return [
    {
      key: "general",
      title: t("general_settings", "Réglages généraux"),
      data: [
        {
          key: "general_content",
          component: (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>{t("notifications")}</Text>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationsToggle}
                />
              </View>
              {notificationsEnabled && (
                <View style={styles.row}>
                  <Text style={styles.label}>
                    {t("dua_after_adhan", "Dua après l'adhan")}
                  </Text>
                  <Switch
                    value={
                      Platform.OS === "ios" ? false : duaAfterAdhanEnabled
                    }
                    disabled={Platform.OS === "ios"}
                    onValueChange={(value) => {
                      if (Platform.OS === "ios") return;
                      setDuaAfterAdhanEnabled(value);
                      markPendingChanges();
                    }}
                  />
                </View>
              )}
            </>
          ),
        },
        {
          key: "reminders",
          component: notificationsEnabled ? (
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("prayer_reminders_before", "Rappels avant la prière")}
              </Text>
              <Switch
                value={remindersEnabled}
                onValueChange={async (value) => {
                  // console.log(`🔔 Changement rappels: ${value}`);
                  setRemindersEnabled(value);
                  markPendingChanges();
                }}
              />
            </View>
          ) : null,
        },
        {
          key: "reminder_offset",
          component: remindersEnabled ? (
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("reminder_offset_minutes", "Délai (minutes)")}
              </Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={{ width: "80%", alignSelf: "center" }}
                  value={reminderOffset}
                  minimumValue={5}
                  maximumValue={30}
                  step={1}
                  onSlidingComplete={async (value) => {
                    // console.log(`🔔 Changement délai rappel: ${value} min`);
                    setReminderOffset(value);
                    markPendingChanges();
                  }}
                  minimumTrackTintColor="#D4AF37"
                  maximumTrackTintColor="rgba(148, 163, 184, 0.4)"
                />
                <Text style={styles.sliderValue}>{reminderOffset} min</Text>
              </View>
            </View>
          ) : null,
        },
      ],
    },
  ];
}
