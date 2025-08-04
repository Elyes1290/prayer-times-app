import React from "react";
import { View, Text, Switch } from "react-native";
import { Picker } from "@react-native-picker/picker";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";

interface GeneralSectionProps {
  // États général
  notificationsEnabled: boolean;
  remindersEnabled: boolean;
  reminderOffset: number;
  selectedLang: string;
  languages: { code: string; label: string }[];

  // Fonctions général
  handleNotificationsToggle: (value: boolean) => Promise<void>;
  onChangeLanguage: (langCode: string) => void;
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
  selectedLang,
  languages,
  handleNotificationsToggle,
  onChangeLanguage,
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
            </>
          ),
        },
        {
          key: "language_select",
          component: (
            <View style={styles.row}>
              <Text style={styles.label}>{t("language", "Langue")}</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedLang}
                  style={styles.picker}
                  onValueChange={(itemValue) => onChangeLanguage(itemValue)}
                  itemStyle={styles.pickerItem}
                  mode="dropdown"
                >
                  {languages.map((lang) => (
                    <Picker.Item
                      key={lang.code}
                      label={lang.label}
                      value={lang.code}
                    />
                  ))}
                </Picker>
              </View>
            </View>
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
