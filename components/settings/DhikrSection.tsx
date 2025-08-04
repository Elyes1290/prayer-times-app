import React from "react";
import { View, Text, Switch } from "react-native";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";
import { SettingsContextType } from "../../contexts/SettingsContext";

interface DhikrSectionProps {
  // États dhikr
  dhikrSettings: SettingsContextType["dhikrSettings"];
  allDhikrEnabled: boolean;
  notificationsEnabled: boolean;

  // Fonctions dhikr
  toggleAllDhikr: (value: boolean) => Promise<void>;
  markPendingChanges: () => void;

  // Fonctions setters dhikr (depuis les hooks optimisés)
  setEnabledAfterSalah: (value: boolean) => void;
  setEnabledMorningDhikr: (value: boolean) => void;
  setEnabledEveningDhikr: (value: boolean) => void;
  setEnabledSelectedDua: (value: boolean) => void;
  setDelayMorningDhikr: (value: number) => void;
  setDelayEveningDhikr: (value: number) => void;
  setDelaySelectedDua: (value: number) => void;

  // Styles
  styles: any;
}

export default function DhikrSection({
  dhikrSettings,
  allDhikrEnabled,
  notificationsEnabled,
  toggleAllDhikr,
  markPendingChanges,
  setEnabledAfterSalah,
  setEnabledMorningDhikr,
  setEnabledEveningDhikr,
  setEnabledSelectedDua,
  setDelayMorningDhikr,
  setDelayEveningDhikr,
  setDelaySelectedDua,
  styles,
}: DhikrSectionProps) {
  const { t } = useTranslation();

  return [
    {
      key: "dhikr",
      title: t("dhikr.title", "Notifications de Dhikr"),
      data: notificationsEnabled
        ? [
            {
              key: "dhikr_content",
              component: (
                <>
                  <View style={styles.row}>
                    <Text style={styles.label}>
                      {t("dhikr_settings", "Activer tous les Dhikrs")}
                    </Text>
                    <Switch
                      value={allDhikrEnabled}
                      onValueChange={toggleAllDhikr}
                    />
                  </View>

                  {allDhikrEnabled && (
                    <>
                      <View style={styles.row}>
                        <Text style={styles.subLabel}>
                          {t(
                            "dhikr.categories.afterSalah",
                            "Dhikr après la prière"
                          )}
                        </Text>
                        <Switch
                          value={dhikrSettings.enabledAfterSalah}
                          onValueChange={async (value) => {
                            setEnabledAfterSalah(value);
                            markPendingChanges();
                          }}
                        />
                      </View>

                      <View style={styles.row}>
                        <Text style={styles.subLabel}>
                          {t("dhikr.categories.morning", "Dhikr du matin")}
                        </Text>
                        <Switch
                          value={dhikrSettings.enabledMorningDhikr}
                          onValueChange={async (value) => {
                            setEnabledMorningDhikr(value);
                            markPendingChanges();
                          }}
                        />
                      </View>

                      {dhikrSettings.enabledMorningDhikr && (
                        <View style={styles.row}>
                          <Text style={styles.label}>
                            {t("morning_dhikr_delay", "Délai après Fajr (min)")}
                          </Text>
                          <View style={styles.sliderContainer}>
                            <Slider
                              style={{ width: "80%", alignSelf: "center" }}
                              value={dhikrSettings.delayMorningDhikr}
                              minimumValue={5}
                              maximumValue={60}
                              step={5}
                              onSlidingComplete={async (value) => {
                                setDelayMorningDhikr(value);
                                markPendingChanges();
                              }}
                              minimumTrackTintColor="#D4AF37"
                              maximumTrackTintColor="rgba(148, 163, 184, 0.4)"
                            />
                            <Text style={styles.sliderValue}>
                              {dhikrSettings.delayMorningDhikr} min
                            </Text>
                          </View>
                        </View>
                      )}

                      <View style={styles.row}>
                        <Text style={styles.subLabel}>
                          {t("dhikr.categories.evening", "Dhikr du soir")}
                        </Text>
                        <Switch
                          value={dhikrSettings.enabledEveningDhikr}
                          onValueChange={async (value) => {
                            setEnabledEveningDhikr(value);
                            markPendingChanges();
                          }}
                        />
                      </View>

                      {dhikrSettings.enabledEveningDhikr && (
                        <View style={styles.row}>
                          <Text style={styles.label}>
                            {t(
                              "evening_dhikr_delay",
                              "Délai après Maghrib (min)"
                            )}
                          </Text>
                          <View style={styles.sliderContainer}>
                            <Slider
                              style={{ width: "80%", alignSelf: "center" }}
                              value={dhikrSettings.delayEveningDhikr}
                              minimumValue={5}
                              maximumValue={60}
                              step={5}
                              onSlidingComplete={async (value) => {
                                setDelayEveningDhikr(value);
                                markPendingChanges();
                              }}
                              minimumTrackTintColor="#D4AF37"
                              maximumTrackTintColor="rgba(148, 163, 184, 0.4)"
                            />
                            <Text style={styles.sliderValue}>
                              {dhikrSettings.delayEveningDhikr} min
                            </Text>
                          </View>
                        </View>
                      )}

                      <View style={styles.row}>
                        <Text style={styles.subLabel}>
                          {t(
                            "dhikr.categories.selectedDua",
                            "Dua sélectionnée"
                          )}
                        </Text>
                        <Switch
                          value={dhikrSettings.enabledSelectedDua}
                          onValueChange={async (value) => {
                            setEnabledSelectedDua(value);
                            markPendingChanges();
                          }}
                        />
                      </View>

                      {dhikrSettings.enabledSelectedDua && (
                        <View style={styles.row}>
                          <Text style={styles.label}>
                            {t("selected_dua_delay", "Délai après Dhuhr (min)")}
                          </Text>
                          <View style={styles.sliderContainer}>
                            <Slider
                              style={{ width: "80%", alignSelf: "center" }}
                              value={dhikrSettings.delaySelectedDua}
                              minimumValue={5}
                              maximumValue={60}
                              step={5}
                              onSlidingComplete={async (value) => {
                                setDelaySelectedDua(value);
                                markPendingChanges();
                              }}
                              minimumTrackTintColor="#D4AF37"
                              maximumTrackTintColor="rgba(148, 163, 184, 0.4)"
                            />
                            <Text style={styles.sliderValue}>
                              {dhikrSettings.delaySelectedDua} min
                            </Text>
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </>
              ),
            },
          ]
        : [
            {
              key: "dhikr_disabled",
              component: (
                <View style={styles.row}>
                  <Text style={styles.label}>
                    {t(
                      "enable_notifications_first",
                      "Activez d'abord les notifications"
                    )}
                  </Text>
                </View>
              ),
            },
          ],
    },
  ];
}
