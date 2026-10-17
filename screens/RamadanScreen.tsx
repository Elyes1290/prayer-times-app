// screens/RamadanScreen.tsx
// « Mon Ramadan » : compagnon complet du mois béni.
//  - Gratuit : compte à rebours, horaires suhoor/iftar, dua, jeûne du jour, début ajustable.
//  - Premium : rappels, calendrier de jeûne complet + qada, plan de khatm, 10 dernières nuits,
//    suivi tarawih / sadaqa, badges, synchro.

import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import ThemedImageBackground from "../components/ThemedImageBackground";
import PremiumPromotion from "../components/PremiumPromotion";
import FastingCard from "../components/ramadan/FastingCard";
import KhatmCard from "../components/ramadan/KhatmCard";
import BadgesCard from "../components/ramadan/BadgesCard";
import LastTenNightsCard from "../components/ramadan/LastTenNightsCard";
import WorshipCard from "../components/ramadan/WorshipCard";
import RamadanHero from "../components/ramadan/RamadanHero";
import RamadanTimesCard, {
  type RamadanLocation,
} from "../components/ramadan/RamadanTimesCard";
import RamadanRecapCard from "../components/ramadan/RamadanRecapCard";
import RemindersCard from "../components/ramadan/RemindersCard";
import { isRecapAvailable } from "../utils/ramadan/recap";
import { RamadanCard, RamadanStepper } from "../components/ramadan/RamadanUI";
import { useSettings } from "../contexts/SettingsContext";
import { useRamadan } from "../hooks/useRamadan";
import { useOverlayTextColor, useThemeColors } from "../hooks/useThemeColor";
import { formatHourMinute, formatShortDate } from "../utils/ramadan/format";
import { useRamadanT, type RamadanTranslate } from "../utils/ramadan/i18n";
import {
  MAX_START_OFFSET_DAYS,
  MIN_START_OFFSET_DAYS,
} from "../utils/ramadan/season";

export default function RamadanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const { i18n } = useTranslation();
  const t = useRamadanT();
  const language = i18n.language;

  const {
    locationMode,
    manualLocation,
    autoLocation,
    calcMethod,
    notificationsEnabled,
  } = useSettings();

  const ramadan = useRamadan();
  const { season, settings, data, stats, isPremium, ready, now, todayKey } = ramadan;

  const source = locationMode === "manual" ? manualLocation : autoLocation;
  const location: RamadanLocation | null = source
    ? { latitude: source.lat, longitude: source.lon }
    : null;

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  const seasonActive = season.phase === "ramadan" || season.phase === "countdown";
  const showFasting = season.phase === "ramadan" || season.phase === "eid";
  // Prière de nuit : dès la veille du premier jeûne (la nuit 1 commence ce soir-là).
  const showWorship =
    season.phase === "ramadan" ||
    (season.phase === "countdown" && season.daysUntilStart === 1);
  // 10 dernières nuits : dès le 20e jour (la nuit 21 commence le soir de ce jour).
  const showLastTen = season.phase === "ramadan" && season.dayNumber >= 20;

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
          <Text style={[styles.headerTitle, { color: overlayTextColor }]} accessibilityRole="header">
            {t("title")}
          </Text>
        </View>

        {!ready ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: Math.max(100, insets.bottom + 80) },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <RamadanHero season={season} t={t} language={language} />

            {seasonActive ? (
              <OffsetCard
                offset={settings.startOffsetDays}
                startDate={season.startDate}
                t={t}
                language={language}
                onChange={(next) => ramadan.updateSettings({ startOffsetDays: next })}
              />
            ) : null}

            {season.phase === "ramadan" ? (
              <RamadanTimesCard
                now={now}
                location={location}
                calcMethod={calcMethod}
                t={t}
                language={language}
              />
            ) : null}

            {seasonActive ? <DuaCard t={t} /> : null}

            {showFasting ? (
              <FastingCard
                season={season}
                data={data}
                stats={stats}
                todayKey={todayKey}
                isPremium={isPremium}
                t={t}
                language={language}
                onSetStatus={ramadan.setFastStatus}
                onSetQadaDone={ramadan.setQadaDoneCount}
              />
            ) : null}

            {isPremium && showLastTen ? (
              <LastTenNightsCard
                season={season}
                data={data}
                todayKey={todayKey}
                worship={ramadan.worship}
                t={t}
                onSetTarawih={ramadan.setTarawih}
              />
            ) : null}

            {isPremium && showWorship ? (
              <WorshipCard
                season={season}
                data={data}
                todayKey={todayKey}
                worship={ramadan.worship}
                t={t}
                onSetTarawih={ramadan.setTarawih}
                onSetSadaqa={ramadan.setSadaqa}
              />
            ) : null}

            {seasonActive && isPremium ? (
              <>
                <KhatmCard
                  season={season}
                  data={data}
                  todayKey={todayKey}
                  now={now}
                  t={t}
                  language={language}
                  reminderTime={
                    settings.khatmReminderEnabled
                      ? formatHourMinute(
                          settings.khatmReminderHour,
                          settings.khatmReminderMinute,
                        )
                      : null
                  }
                  onCreatePlan={ramadan.createKhatmPlan}
                  onDeletePlan={ramadan.deleteKhatmPlan}
                  onSetProgress={ramadan.setKhatmProgress}
                />
                <RemindersCard
                  settings={settings}
                  notificationsEnabled={notificationsEnabled}
                  t={t}
                  onChange={ramadan.updateSettings}
                />
              </>
            ) : null}

            {isPremium && showFasting ? <BadgesCard badges={ramadan.badges} t={t} /> : null}

            {isPremium && isRecapAvailable(season) ? (
              <RamadanRecapCard recap={ramadan.recap} t={t} />
            ) : null}

            {(seasonActive || showFasting) && !isPremium ? (
              <PremiumPromotion
                variant="full"
                title={t("premium.title")}
                message={t("premium.message")}
                cta={t("premium.cta")}
              />
            ) : null}

          </ScrollView>
        )}
      </View>
    </ThemedImageBackground>
  );
}

// ---------------------------------------------------------------------------
// Dua de l'iftar (gratuit)
// ---------------------------------------------------------------------------

function DuaCard({ t }: { t: RamadanTranslate }) {
  const colors = useThemeColors();
  return (
    <RamadanCard title={t("dua.title")} icon="hands-pray">
      <DuaBlock
        t={t}
        label={t("dua.before")}
        arabicKey="dua.arabic"
        transliterationKey="dua.transliteration"
        translationKey="dua.translation"
        sourceKey="dua.source"
      />
      <View style={[styles.duaSeparator, { backgroundColor: colors.border }]} />
      <DuaBlock
        t={t}
        label={t("dua.after")}
        arabicKey="dua.arabic2"
        transliterationKey="dua.transliteration2"
        translationKey="dua.translation2"
        sourceKey="dua.source2"
      />
    </RamadanCard>
  );
}

function DuaBlock({
  t,
  label,
  arabicKey,
  transliterationKey,
  translationKey,
  sourceKey,
}: {
  t: RamadanTranslate;
  label: string;
  arabicKey: string;
  transliterationKey: string;
  translationKey: string;
  sourceKey: string;
}) {
  const colors = useThemeColors();
  const transliteration = t(transliterationKey);
  const translation = t(translationKey);
  return (
    <View>
      <Text style={[styles.duaLabel, { color: colors.primary }]}>{label}</Text>
      <Text style={[styles.arabic, { color: colors.text }]}>{t(arabicKey)}</Text>
      {transliteration ? (
        <Text style={[styles.transliteration, { color: colors.textSecondary }]}>
          {transliteration}
        </Text>
      ) : null}
      {translation ? (
        <Text style={[styles.translation, { color: colors.text }]}>{translation}</Text>
      ) : null}
      <Text style={[styles.source, { color: colors.textSecondary }]}>{t(sourceKey)}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Ajustement de la date de début (gratuit)
// ---------------------------------------------------------------------------

function OffsetCard({
  offset,
  startDate,
  t,
  language,
  onChange,
}: {
  offset: number;
  startDate: Date;
  t: RamadanTranslate;
  language: string | undefined;
  onChange: (next: number) => void;
}) {
  const colors = useThemeColors();
  return (
    <RamadanCard title={t("offset.title")} icon="calendar-edit">
      <Text style={[styles.hintText, { color: colors.textSecondary }]}>
        {t("offset.description")}
      </Text>
      <View style={styles.offsetStepper}>
        <RamadanStepper
          label={t("offset.value", { date: formatShortDate(startDate, language) })}
          decrementLabel={t("offset.earlier")}
          incrementLabel={t("offset.later")}
          decrementDisabled={offset <= MIN_START_OFFSET_DAYS}
          incrementDisabled={offset >= MAX_START_OFFSET_DAYS}
          onDecrement={() => onChange(offset - 1)}
          onIncrement={() => onChange(offset + 1)}
        />
      </View>
      {offset !== 0 ? (
        <Text style={[styles.hintText, styles.offsetShift, { color: colors.textSecondary }]}>
          {t("offset.shift", { n: offset > 0 ? `+${offset}` : offset })}
        </Text>
      ) : null}
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16 },
  arabic: {
    fontSize: 24,
    lineHeight: 42,
    textAlign: "center",
    writingDirection: "rtl",
  },
  duaLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 6,
  },
  duaSeparator: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  transliteration: {
    marginTop: 8,
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 20,
    textAlign: "center",
  },
  translation: { marginTop: 8, fontSize: 14, lineHeight: 21, textAlign: "center" },
  source: { marginTop: 6, fontSize: 12, textAlign: "center", fontStyle: "italic" },
  hintText: { fontSize: 13, lineHeight: 19 },
  offsetStepper: { marginTop: 12 },
  offsetShift: { marginTop: 8, textAlign: "center" },
});
