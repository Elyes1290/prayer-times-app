// components/ramadan/WorshipCard.tsx
// Suivi quotidien de la prière de nuit (tarawih) et de la sadaqa (premium).
// Deux onglets partagent la même grille : nuits (tarawih) ou jours (sadaqa).

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useThemeColors } from "../../hooks/useThemeColor";
import type { RamadanTranslate } from "../../utils/ramadan/i18n";
import { parseLocalDateKey, type RamadanSeason } from "../../utils/ramadan/season";
import type { RamadanData } from "../../utils/ramadan/storage";
import {
  getDayKey,
  getNightKey,
  getTonightNumber,
  isFlagDone,
  type WorshipStats,
} from "../../utils/ramadan/worship";
import { RamadanButton, RamadanCard } from "./RamadanUI";

type Tab = "tarawih" | "sadaqa";

interface WorshipCardProps {
  season: RamadanSeason;
  data: RamadanData;
  todayKey: string;
  worship: WorshipStats;
  t: RamadanTranslate;
  onSetTarawih: (dateKey: string, done: boolean) => void;
  onSetSadaqa: (dateKey: string, done: boolean) => void;
}

const DONE_COLOR = "#2E8B57";

export default function WorshipCard({
  season,
  data,
  todayKey,
  worship,
  t,
  onSetTarawih,
  onSetSadaqa,
}: WorshipCardProps) {
  const colors = useThemeColors();
  const [tab, setTab] = useState<Tab>("tarawih");

  const today = parseLocalDateKey(todayKey) ?? new Date();
  const tonight = getTonightNumber(season, today);
  const inRamadan = season.phase === "ramadan";

  const isTarawih = tab === "tarawih";
  const flags = isTarawih ? data.tarawih : data.sadaqa;
  const setFlag = isTarawih ? onSetTarawih : onSetSadaqa;

  // Bouton « aujourd'hui » : tarawih = ce soir (si c'est une nuit de Ramadan), sadaqa = aujourd'hui.
  const todayTargetKey = isTarawih
    ? tonight > 0
      ? getNightKey(season, tonight)
      : null
    : inRamadan
      ? todayKey
      : null;
  const todayDone = todayTargetKey ? isFlagDone(flags, todayTargetKey) : false;

  const cells = Array.from({ length: season.lengthDays }, (_, index) => {
    const number = index + 1;
    const key = isTarawih ? getNightKey(season, number) : getDayKey(season, number);
    return { number, key };
  });

  const total = isTarawih ? worship.tarawihNights : worship.sadaqaDays;

  return (
    <RamadanCard title={t("worship.title")} icon="hand-heart" premiumBadge>
      <View style={[styles.tabs, { borderColor: colors.border }]}>
        {(["tarawih", "sadaqa"] as const).map((value) => {
          const active = tab === value;
          return (
            <Pressable
              key={value}
              onPress={() => setTab(value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.tab, active && { backgroundColor: colors.primary }]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? colors.textOnPrimary : colors.text },
                ]}
              >
                {t(`worship.${value}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        {t(isTarawih ? "worship.tarawihHint" : "worship.sadaqaHint")}
      </Text>

      {todayTargetKey ? (
        <View style={styles.todayBlock}>
          <RamadanButton
            label={
              todayDone
                ? t("worship.cancel")
                : t(isTarawih ? "worship.markTarawih" : "worship.markSadaqa")
            }
            icon={todayDone ? "close" : "check"}
            variant={todayDone ? "secondary" : "primary"}
            onPress={() => setFlag(todayTargetKey, !todayDone)}
          />
        </View>
      ) : null}

      <View style={styles.grid}>
        {cells.map(({ number, key }) => {
          const done = isFlagDone(flags, key);
          const isFuture = key > todayKey;
          const isToday = key === todayTargetKey;
          return (
            <View key={key} style={styles.cellWrap}>
              <Pressable
                onPress={() => setFlag(key, !done)}
                disabled={isFuture}
                accessibilityRole="button"
                accessibilityLabel={t(
                  isTarawih ? "worship.nightLabel" : "worship.dayLabel",
                  { n: number },
                ) + (done ? `, ${t("worship.done")}` : "")}
                accessibilityState={{ disabled: isFuture, checked: done }}
                style={[
                  styles.cell,
                  {
                    backgroundColor: done ? DONE_COLOR : "transparent",
                    borderColor: isToday ? colors.accent : done ? DONE_COLOR : colors.border,
                    borderWidth: isToday ? 2.5 : 1.5,
                  },
                  isFuture && styles.future,
                ]}
              >
                {done ? (
                  <MCIcon name="check" size={18} color="#FFFFFF" />
                ) : (
                  <Text style={[styles.cellText, { color: colors.text }]}>{number}</Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      <Text style={[styles.stats, { color: colors.text }]}>
        {t(isTarawih ? "worship.tarawihStats" : "worship.sadaqaStats", {
          n: total,
          total: season.lengthDays,
        })}
      </Text>
    </RamadanCard>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabLabel: { fontSize: 14, fontWeight: "700" },
  hint: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  todayBlock: { marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cellWrap: {
    width: `${100 / 7}%`,
    alignItems: "center",
    paddingVertical: 4,
  },
  cell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  future: { opacity: 0.35 },
  cellText: { fontSize: 13, fontWeight: "700" },
  stats: { marginTop: 12, fontSize: 14, fontWeight: "600" },
});
