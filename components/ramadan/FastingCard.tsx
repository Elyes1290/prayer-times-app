// components/ramadan/FastingCard.tsx
// Suivi du jeûne.
//  - Gratuit : cocher « j'ai jeûné » pour aujourd'hui.
//  - Premium : calendrier complet modifiable, jours manqués / dispensés, série, qada.
// Confidentialité : le motif d'une dispense n'est jamais demandé ni enregistré.

import React, { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useThemeColors } from "../../hooks/useThemeColor";
import { formatShortDate } from "../../utils/ramadan/format";
import type { RamadanTranslate } from "../../utils/ramadan/i18n";
import {
  addLocalDays,
  toLocalDateKey,
  type RamadanSeason,
} from "../../utils/ramadan/season";
import type {
  FastingStats,
  FastStatus,
  RamadanData,
} from "../../utils/ramadan/storage";
import { RamadanButton, RamadanCard } from "./RamadanUI";

interface FastingCardProps {
  season: RamadanSeason;
  data: RamadanData;
  stats: FastingStats;
  todayKey: string;
  isPremium: boolean;
  t: RamadanTranslate;
  language: string | undefined;
  onSetStatus: (dateKey: string, status: FastStatus) => void;
  onSetQadaDone: (count: number) => void;
}

const STATUS_COLORS: Record<Exclude<FastStatus, "none">, string> = {
  fasted: "#2E8B57",
  missed: "#D9534F",
  exempt: "#6C8EBF",
};

const CHOICES: Exclude<FastStatus, "none">[] = ["fasted", "missed", "exempt"];

function statusOf(data: RamadanData, key: string): FastStatus {
  return data.fasting[key]?.status ?? "none";
}

export default function FastingCard({
  season,
  data,
  stats,
  todayKey,
  isPremium,
  t,
  language,
  onSetStatus,
  onSetQadaDone,
}: FastingCardProps) {
  const colors = useThemeColors();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lockedHint, setLockedHint] = useState(false);

  const inRamadan = season.phase === "ramadan";
  const todayStatus = statusOf(data, todayKey);

  const toggleToday = useCallback(() => {
    onSetStatus(todayKey, todayStatus === "fasted" ? "none" : "fasted");
  }, [onSetStatus, todayKey, todayStatus]);

  const handleDayPress = useCallback(
    (index: number, key: string) => {
      if (!isPremium) {
        // Gratuit : seul le jour courant est modifiable.
        if (key === todayKey && inRamadan) {
          toggleToday();
        } else {
          setLockedHint(true);
        }
        return;
      }
      setSelectedIndex(index);
    },
    [isPremium, todayKey, inRamadan, toggleToday],
  );

  const days = Array.from({ length: season.lengthDays }, (_, index) => {
    const date = addLocalDays(season.startDate, index);
    return { index, date, key: toLocalDateKey(date) };
  });

  const selected = selectedIndex !== null ? days[selectedIndex] : null;

  return (
    <RamadanCard title={t("fasting.title")} icon="calendar-check">
      {inRamadan ? (
        <View style={styles.todayBlock}>
          <RamadanButton
            label={
              todayStatus === "fasted" ? t("fasting.cancelFasted") : t("fasting.markFasted")
            }
            icon={todayStatus === "fasted" ? "close" : "check"}
            variant={todayStatus === "fasted" ? "secondary" : "primary"}
            onPress={toggleToday}
          />
          {todayStatus === "missed" || todayStatus === "exempt" ? (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t("fasting.today")} · {t(`fasting.${todayStatus}`)}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.grid}>
        {days.map(({ index, date, key }) => {
          const status = statusOf(data, key);
          const isToday = key === todayKey;
          const isFuture = key > todayKey;
          const filled = status !== "none";
          const fill = filled ? STATUS_COLORS[status as Exclude<FastStatus, "none">] : "transparent";
          return (
            <View key={key} style={styles.cellWrap}>
              <Pressable
                onPress={() => handleDayPress(index, key)}
                disabled={isFuture}
                accessibilityRole="button"
                accessibilityLabel={`${t("fasting.dayLabel", { day: index + 1 })}, ${formatShortDate(
                  date,
                  language,
                )}${filled ? `, ${t(`fasting.${status}`)}` : ""}`}
                accessibilityState={{ disabled: isFuture, selected: isToday }}
                style={[
                  styles.cell,
                  {
                    backgroundColor: fill,
                    borderColor: isToday ? colors.accent : filled ? fill : colors.border,
                    borderWidth: isToday ? 2.5 : 1.5,
                  },
                  isFuture && styles.future,
                ]}
              >
                <Text
                  style={[
                    styles.cellText,
                    { color: filled ? "#FFFFFF" : colors.text },
                  ]}
                >
                  {index + 1}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        {CHOICES.map((status) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[status] }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              {t(`fasting.${status}`)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.stats, { color: colors.text }]}>
        {t("fasting.stats", {
          fasted: stats.fasted,
          missed: stats.missed,
          exempt: stats.exempt,
        })}
      </Text>
      {stats.streak > 1 ? (
        <Text style={[styles.streak, { color: colors.primary }]}>
          🔥 {t("fasting.streak", { n: stats.streak })}
        </Text>
      ) : null}

      {isPremium ? (
        <View style={[styles.qada, { borderTopColor: colors.border }]}>
          <Text style={[styles.qadaTitle, { color: colors.text }]}>
            {t("fasting.qadaTitle")}
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t("fasting.qadaOwed", { n: stats.qadaOwed })} ·{" "}
            {t("fasting.qadaDone", { n: data.qadaDone.count })}
          </Text>
          <View style={styles.qadaButtons}>
            <View style={styles.flex}>
              <RamadanButton
                label={t("fasting.qadaAdd")}
                variant="primary"
                disabled={stats.qadaOwed <= 0}
                onPress={() => onSetQadaDone(data.qadaDone.count + 1)}
              />
            </View>
            <View style={styles.flex}>
              <RamadanButton
                label={t("fasting.qadaUndo")}
                variant="secondary"
                disabled={data.qadaDone.count <= 0}
                onPress={() => onSetQadaDone(data.qadaDone.count - 1)}
              />
            </View>
          </View>
          <Text style={[styles.privacy, { color: colors.textSecondary }]}>
            {t("fasting.privacy")}
          </Text>
        </View>
      ) : (
        lockedHint && (
          <View style={styles.lockedRow}>
            <MCIcon name="crown" size={16} color="#FFD700" />
            <Text style={[styles.hint, styles.flex, { color: colors.textSecondary }]}>
              {t("fasting.lockedPast")}
            </Text>
          </View>
        )
      )}

      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedIndex(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSelectedIndex(null)}>
          {/* Le contenu absorbe les appuis pour ne pas fermer la feuille. */}
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.background }]}
            onPress={() => undefined}
          >
            {selected ? (
              <>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>
                  {t("fasting.chooseTitle", {
                    day: selected.index + 1,
                    date: formatShortDate(selected.date, language),
                  })}
                </Text>
                {CHOICES.map((status) => (
                  <RamadanButton
                    key={status}
                    label={t(`fasting.${status}`)}
                    variant={statusOf(data, selected.key) === status ? "primary" : "secondary"}
                    onPress={() => {
                      onSetStatus(selected.key, status);
                      setSelectedIndex(null);
                    }}
                  />
                ))}
                <RamadanButton
                  label={t("fasting.clear")}
                  variant="danger"
                  onPress={() => {
                    onSetStatus(selected.key, "none");
                    setSelectedIndex(null);
                  }}
                />
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </RamadanCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  todayBlock: { marginBottom: 14, gap: 8 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
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
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 10,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  stats: { marginTop: 12, fontSize: 14, fontWeight: "600" },
  streak: { marginTop: 4, fontSize: 14, fontWeight: "700" },
  hint: { fontSize: 13, lineHeight: 19 },
  lockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  qada: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  qadaTitle: { fontSize: 15, fontWeight: "700" },
  qadaButtons: { flexDirection: "row", gap: 10 },
  privacy: { fontSize: 12, fontStyle: "italic" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
});
