// components/ramadan/LastTenNightsCard.tsx
// Les 10 dernières nuits : mise en avant des nuits impaires (Laylat al-Qadr), suivi de la
// prière de nuit et invocation recommandée (premium).

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useThemeColors } from "../../hooks/useThemeColor";
import type { RamadanTranslate } from "../../utils/ramadan/i18n";
import { parseLocalDateKey, type RamadanSeason } from "../../utils/ramadan/season";
import type { RamadanData } from "../../utils/ramadan/storage";
import {
  getLastTenNights,
  getNightKey,
  getTonightNumber,
  isFlagDone,
  isOddLastNight,
  type WorshipStats,
} from "../../utils/ramadan/worship";
import { RamadanCard } from "./RamadanUI";

interface LastTenNightsCardProps {
  season: RamadanSeason;
  data: RamadanData;
  todayKey: string;
  worship: WorshipStats;
  t: RamadanTranslate;
  onSetTarawih: (dateKey: string, done: boolean) => void;
}

const DONE_COLOR = "#2E8B57";
const GOLD = "#D4AF37";

export default function LastTenNightsCard({
  season,
  data,
  todayKey,
  worship,
  t,
  onSetTarawih,
}: LastTenNightsCardProps) {
  const colors = useThemeColors();
  const today = parseLocalDateKey(todayKey) ?? new Date();
  const tonight = getTonightNumber(season, today);
  const nights = getLastTenNights(season);

  const tonightKey = tonight > 0 ? getNightKey(season, tonight) : null;
  const tonightIsOdd = isOddLastNight(tonight);

  const transliteration = t("lastTen.duaTransliteration");
  const translation = t("lastTen.duaTranslation");

  let tonightText: string;
  if (tonight === 0) {
    tonightText = t("lastTen.eidNight");
  } else if (tonightIsOdd) {
    tonightText = t("lastTen.oddTonight", { n: tonight });
  } else {
    tonightText = t("lastTen.tonight", { n: tonight });
  }

  return (
    <RamadanCard title={t("lastTen.title")} icon="star-four-points" premiumBadge>
      <View
        style={[
          styles.tonight,
          {
            backgroundColor: tonightIsOdd ? "rgba(212, 175, 55, 0.15)" : "transparent",
            borderColor: tonightIsOdd ? GOLD : colors.border,
          },
        ]}
      >
        <Text style={[styles.tonightText, { color: colors.text }]}>{tonightText}</Text>
      </View>

      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t("lastTen.hint")}</Text>

      <View style={styles.grid}>
        {nights.map((night) => {
          const key = getNightKey(season, night);
          const done = isFlagDone(data.tarawih, key);
          const isFuture = key > todayKey;
          const isOdd = isOddLastNight(night);
          const isTonight = key === tonightKey;
          return (
            <View key={night} style={styles.cellWrap}>
              <Pressable
                onPress={() => onSetTarawih(key, !done)}
                disabled={isFuture}
                accessibilityRole="button"
                accessibilityLabel={
                  t(isOdd ? "lastTen.oddNightLabel" : "lastTen.nightLabel", { n: night }) +
                  (done ? `, ${t("worship.done")}` : "")
                }
                accessibilityState={{ disabled: isFuture, checked: done }}
                style={[
                  styles.cell,
                  {
                    backgroundColor: done ? DONE_COLOR : "transparent",
                    borderColor: isOdd ? GOLD : done ? DONE_COLOR : colors.border,
                    borderWidth: isTonight ? 3 : 2,
                  },
                  isFuture && styles.future,
                ]}
              >
                {done ? (
                  <MCIcon name="check" size={20} color="#FFFFFF" />
                ) : (
                  <Text style={[styles.cellText, { color: colors.text }]}>{night}</Text>
                )}
              </Pressable>
              {isOdd ? (
                <MCIcon name="star-four-points" size={12} color={GOLD} style={styles.star} />
              ) : (
                <View style={styles.starSpacer} />
              )}
            </View>
          );
        })}
      </View>

      <Text style={[styles.stats, { color: colors.text }]}>
        {t("lastTen.progress", { n: worship.lastTenDone, total: worship.lastTenTotal })}
        {" · "}
        {t("lastTen.oddProgress", { n: worship.oddNightsDone, total: worship.oddNightsTotal })}
      </Text>

      <View style={[styles.duaBox, { borderTopColor: colors.border }]}>
        <Text style={[styles.duaLabel, { color: colors.primary }]}>{t("lastTen.duaTitle")}</Text>
        <Text style={[styles.arabic, { color: colors.text }]}>{t("lastTen.duaArabic")}</Text>
        {transliteration ? (
          <Text style={[styles.transliteration, { color: colors.textSecondary }]}>
            {transliteration}
          </Text>
        ) : null}
        {translation ? (
          <Text style={[styles.translation, { color: colors.text }]}>{translation}</Text>
        ) : null}
        <Text style={[styles.source, { color: colors.textSecondary }]}>
          {t("lastTen.duaSource")}
        </Text>
      </View>
    </RamadanCard>
  );
}

const styles = StyleSheet.create({
  tonight: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  tonightText: { fontSize: 15, fontWeight: "700", textAlign: "center", lineHeight: 22 },
  hint: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cellWrap: {
    width: "20%",
    alignItems: "center",
    paddingVertical: 4,
  },
  cell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  future: { opacity: 0.35 },
  cellText: { fontSize: 15, fontWeight: "700" },
  star: { marginTop: 2 },
  starSpacer: { height: 14 },
  stats: { marginTop: 10, fontSize: 14, fontWeight: "600" },
  duaBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  duaLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 6,
  },
  arabic: {
    fontSize: 24,
    lineHeight: 42,
    textAlign: "center",
    writingDirection: "rtl",
  },
  transliteration: {
    marginTop: 8,
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 20,
    textAlign: "center",
  },
  translation: { marginTop: 8, fontSize: 14, lineHeight: 21, textAlign: "center" },
  source: { marginTop: 6, fontSize: 12, textAlign: "center", fontStyle: "italic" },
});
