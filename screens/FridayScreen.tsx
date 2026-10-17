// screens/FridayScreen.tsx
// « Vendredi » (gratuit) : rappel complet du jour de Jumu'a, accès direct à la sourate
// Al-Kahf et réglage de la notification du vendredi.

import React, { useCallback } from "react";
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "@/components/ui/LinearGradientView";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import ThemedImageBackground from "../components/ThemedImageBackground";
import { RamadanButton, RamadanCard, RamadanStepper } from "../components/ramadan/RamadanUI";
import { useSettings } from "../contexts/SettingsContext";
import { useFridaySettings } from "../hooks/useFridaySettings";
import { useOverlayTextColor, useThemeColors } from "../hooks/useThemeColor";
import { useFridayT, type FridayTranslate } from "../utils/friday/i18n";
import { formatHourMinute } from "../utils/ramadan/format";

const AL_KAHF_SURAH = 18;
const REMINDER_STEP_MINUTES = 30;

const TIPS: { code: string; icon: string; hasArabic?: boolean }[] = [
  { code: "ghusl", icon: "shower-head" },
  { code: "perfume", icon: "flower-tulip-outline" },
  { code: "early", icon: "walk" },
  { code: "silence", icon: "volume-off" },
  { code: "salawat", icon: "heart-outline", hasArabic: true },
  { code: "hour", icon: "hands-pray" },
  { code: "fasting", icon: "information-outline" },
];

export default function FridayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const t = useFridayT();
  const { notificationsEnabled } = useSettings();
  const { settings, updateSettings } = useFridaySettings();

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  const openAlKahf = useCallback(() => {
    router.push({
      pathname: "/quran",
      params: { surah: String(AL_KAHF_SURAH), ts: String(Date.now()) },
    });
  }, [router]);

  const shiftTime = (deltaMinutes: number) => {
    const total = settings.hour * 60 + settings.minute;
    const next = (total + deltaMinutes + 24 * 60) % (24 * 60);
    updateSettings({ hour: Math.floor(next / 60), minute: next % 60 });
  };

  const time = formatHourMinute(settings.hour, settings.minute);
  const hadithText = t("hero.hadithText");
  const kahfTranslation = t("kahf.translation");

  return (
    <ThemedImageBackground style={styles.background}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("back")}
            style={styles.backButton}
          >
            <MCIcon name="chevron-left" size={30} color={overlayTextColor} />
          </Pressable>
          <Text
            style={[styles.headerTitle, { color: overlayTextColor }]}
            accessibilityRole="header"
          >
            {t("title")}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(100, insets.bottom + 80) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={["#7C5E10", "#B8932B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <MCIcon name="mosque" size={38} color="#FFFFFF" />
            <Text style={styles.heroTitle} accessibilityRole="header">
              {t("hero.greeting")}
            </Text>
            <Text style={styles.heroSubtitle}>{t("hero.subtitle")}</Text>
            <View style={styles.heroDivider} />
            <Text style={styles.heroArabic}>{t("hero.hadithArabic")}</Text>
            {hadithText ? <Text style={styles.heroHadith}>{hadithText}</Text> : null}
            <Text style={styles.heroSource}>{t("hero.hadithSource")}</Text>
          </LinearGradient>

          <RamadanCard title={t("kahf.title")} icon="book-open-page-variant">
            <Text style={[styles.text, { color: colors.text }]}>{t("kahf.intro")}</Text>
            <Text style={[styles.arabic, { color: colors.text }]}>{t("kahf.arabic")}</Text>
            {kahfTranslation ? (
              <Text style={[styles.text, { color: colors.text }]}>{kahfTranslation}</Text>
            ) : null}
            <Text style={[styles.source, { color: colors.textSecondary }]}>
              {t("kahf.source")}
            </Text>
            <View style={styles.buttonWrap}>
              <RamadanButton
                label={t("kahf.button")}
                icon="book-open-variant"
                onPress={openAlKahf}
              />
            </View>
          </RamadanCard>

          <Text style={[styles.sectionTitle, { color: overlayTextColor }]}>
            {t("tips.title")}
          </Text>
          {TIPS.map((tip) => (
            <TipCard key={tip.code} code={tip.code} icon={tip.icon} hasArabic={tip.hasArabic} t={t} />
          ))}

          <RamadanCard title={t("settings.title")} icon="bell-ring">
            {!notificationsEnabled ? (
              <Text style={[styles.warning, { color: colors.warning }]}>
                {t("settings.needNotifications")}
              </Text>
            ) : null}
            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>
                  {t("settings.toggle")}
                </Text>
                <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                  {t("settings.toggleDesc", { time })}
                </Text>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={(value) => updateSettings({ enabled: value })}
                accessibilityLabel={t("settings.toggle")}
                trackColor={{ true: colors.primary }}
              />
            </View>
            {settings.enabled ? (
              <View style={styles.stepper}>
                <RamadanStepper
                  label={time}
                  decrementLabel={t("settings.earlier")}
                  incrementLabel={t("settings.later")}
                  onDecrement={() => shiftTime(-REMINDER_STEP_MINUTES)}
                  onIncrement={() => shiftTime(REMINDER_STEP_MINUTES)}
                />
              </View>
            ) : null}
          </RamadanCard>
        </ScrollView>
      </View>
    </ThemedImageBackground>
  );
}

function TipCard({
  code,
  icon,
  hasArabic,
  t,
}: {
  code: string;
  icon: string;
  hasArabic?: boolean;
  t: FridayTranslate;
}) {
  const colors = useThemeColors();
  return (
    <RamadanCard title={t(`tips.${code}.title`)} icon={icon}>
      {hasArabic ? (
        <Text style={[styles.arabic, { color: colors.text }]}>{t(`tips.${code}.arabic`)}</Text>
      ) : null}
      <Text style={[styles.text, { color: colors.text }]}>{t(`tips.${code}.text`)}</Text>
      <Text style={[styles.source, { color: colors.textSecondary }]}>
        {t(`tips.${code}.source`)}
      </Text>
    </RamadanCard>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: "100%", height: "100%" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 24, fontWeight: "800", flex: 1 },
  content: { padding: 16 },
  hero: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    overflow: "hidden",
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
  },
  heroDivider: {
    alignSelf: "stretch",
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginVertical: 14,
  },
  heroArabic: {
    fontSize: 24,
    lineHeight: 44,
    color: "#FFFFFF",
    textAlign: "center",
    writingDirection: "rtl",
  },
  heroHadith: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#FFFFFF",
    textAlign: "center",
  },
  heroSource: {
    marginTop: 6,
    fontSize: 12,
    fontStyle: "italic",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  sectionTitle: { fontSize: 20, fontWeight: "800", marginVertical: 8 },
  text: { fontSize: 14, lineHeight: 21, marginTop: 4 },
  arabic: {
    fontSize: 22,
    lineHeight: 42,
    textAlign: "center",
    writingDirection: "rtl",
    marginVertical: 8,
  },
  source: { marginTop: 8, fontSize: 12, fontStyle: "italic" },
  buttonWrap: { marginTop: 14 },
  warning: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleText: { flex: 1 },
  toggleTitle: { fontSize: 15, fontWeight: "700" },
  toggleDesc: { fontSize: 13, marginTop: 2 },
  stepper: { marginTop: 12 },
});
