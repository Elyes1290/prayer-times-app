// components/ramadan/KhatmCard.tsx
// Plan de khatm (Premium) : objectif, portion du jour adaptative, progression.

import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useThemeColors } from "../../hooks/useThemeColor";
import {
  clampKhatmDays,
  computeKhatmDay,
  MAX_KHATM_DAYS,
  MAX_KHATM_GOAL,
  MIN_KHATM_DAYS,
  MIN_KHATM_GOAL,
  type KhatmPlan,
} from "../../utils/ramadan/khatm";
import { formatShortDate } from "../../utils/ramadan/format";
import type { RamadanTranslate } from "../../utils/ramadan/i18n";
import {
  parseLocalDateKey,
  type RamadanSeason,
} from "../../utils/ramadan/season";
import { getKhatmDayIndex, type RamadanData } from "../../utils/ramadan/storage";
import { RamadanButton, RamadanCard, RamadanStepper } from "./RamadanUI";

interface KhatmCardProps {
  season: RamadanSeason;
  data: RamadanData;
  todayKey: string;
  now: Date;
  t: RamadanTranslate;
  language: string | undefined;
  /** Heure du rappel quotidien ("21:00") si activé, sinon null/absent. */
  reminderTime?: string | null;
  onCreatePlan: (goalKhatms: number, days: number) => void;
  onDeletePlan: () => void;
  onSetProgress: (dateKey: string, juz: number) => void;
}

export default function KhatmCard(props: KhatmCardProps) {
  const { data, t } = props;
  return (
    <RamadanCard title={t("khatm.title")} icon="book-open-page-variant" premiumBadge>
      {data.khatmPlan ? (
        <ActivePlan {...props} plan={data.khatmPlan} />
      ) : (
        <PlanCreator {...props} />
      )}
    </RamadanCard>
  );
}

// ---------------------------------------------------------------------------
// Création du plan
// ---------------------------------------------------------------------------

function PlanCreator({ season, t, onCreatePlan }: KhatmCardProps) {
  const colors = useThemeColors();
  const [goal, setGoal] = useState(1);
  // Pendant le mois : on propose par défaut le nombre de jours restants.
  const [days, setDays] = useState(() =>
    season.phase === "ramadan" ? clampKhatmDays(season.daysRemaining) : MAX_KHATM_DAYS,
  );

  const goals = Array.from(
    { length: MAX_KHATM_GOAL - MIN_KHATM_GOAL + 1 },
    (_, i) => MIN_KHATM_GOAL + i,
  );

  return (
    <View style={styles.gap}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>{t("khatm.intro")}</Text>

      <Text style={[styles.label, { color: colors.text }]}>{t("khatm.goalLabel")}</Text>
      <View style={styles.chips}>
        {goals.map((value) => {
          const selected = goal === value;
          return (
            <Pressable
              key={value}
              onPress={() => setGoal(value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                {
                  borderColor: colors.primary,
                  backgroundColor: selected ? colors.primary : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selected ? colors.textOnPrimary : colors.primary },
                ]}
              >
                {t("khatm.goalOption", { n: value })}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <RamadanStepper
        label={t("khatm.daysLabel", { n: days })}
        decrementLabel={t("reminders.minus")}
        incrementLabel={t("reminders.plus")}
        decrementDisabled={days <= MIN_KHATM_DAYS}
        incrementDisabled={days >= MAX_KHATM_DAYS}
        onDecrement={() => setDays((d) => clampKhatmDays(d - 1))}
        onIncrement={() => setDays((d) => clampKhatmDays(d + 1))}
      />

      <RamadanButton
        label={t("khatm.create")}
        icon="playlist-check"
        onPress={() => onCreatePlan(goal, days)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Plan actif
// ---------------------------------------------------------------------------

function ActivePlan({
  plan,
  data,
  todayKey,
  now,
  t,
  language,
  reminderTime,
  onDeletePlan,
  onSetProgress,
}: KhatmCardProps & { plan: KhatmPlan }) {
  const colors = useThemeColors();
  const router = useRouter();

  const planStart = parseLocalDateKey(plan.startKey);
  const notStarted = planStart !== null && todayKey < plan.startKey;
  const dayIndex = getKhatmDayIndex(plan, now);
  const info = computeKhatmDay(plan, data.khatmLog, todayKey, dayIndex);

  const confirmDelete = () => {
    Alert.alert(t("khatm.title"), t("khatm.confirmReset"), [
      { text: t("khatm.cancel"), style: "cancel" },
      { text: t("khatm.confirmResetYes"), style: "destructive", onPress: onDeletePlan },
    ]);
  };

  const deleteButton = (
    <RamadanButton label={t("khatm.edit")} variant="secondary" onPress={confirmDelete} />
  );

  // Le plan commence au premier jour de Ramadan : rien à lire avant.
  if (notStarted) {
    const perDay = Math.ceil((plan.goalKhatms * 30) / plan.days);
    return (
      <View style={styles.gap}>
        <Text style={[styles.label, { color: colors.primary }]}>{t("khatm.created")}</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          {t("khatm.goalOption", { n: plan.goalKhatms })} · {t("khatm.daysLabel", { n: plan.days })}
        </Text>
        {planStart ? (
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            {t("khatm.startInfo", {
              date: formatShortDate(planStart, language),
              n: perDay,
            })}
          </Text>
        ) : null}
        {reminderTime ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t("khatm.reminderInfo", { time: reminderTime })}
          </Text>
        ) : null}
        {deleteButton}
      </View>
    );
  }

  const progress = info.totalJuz > 0 ? info.completedJuz / info.totalJuz : 0;
  const juzLabel =
    info.juzList.length === 0
      ? ""
      : info.juzList.length === 1
        ? t("khatm.juzSingle", { juz: info.juzList[0] })
        : t("khatm.juzRange", {
            from: info.juzList[0],
            to: info.juzList[info.juzList.length - 1],
          });

  return (
    <View style={styles.gap}>
      <Text style={[styles.label, { color: colors.text }]}>
        {t("khatm.progress", { done: info.completedJuz, total: info.totalJuz })}
      </Text>
      <View
        style={[styles.track, { backgroundColor: colors.border }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      >
        <View
          style={[
            styles.fill,
            { backgroundColor: colors.primary, width: `${Math.round(progress * 100)}%` },
          ]}
        />
      </View>
      {plan.goalKhatms > 1 && !info.planDone ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {t("khatm.khatmNumber", { n: info.currentKhatm, total: plan.goalKhatms })}
        </Text>
      ) : null}

      {info.planDone ? (
        <Text style={[styles.text, { color: colors.primary, fontWeight: "700" }]}>
          {t("khatm.planDone")}
        </Text>
      ) : (
        <View style={[styles.todayBox, { borderColor: colors.border }]}>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t("khatm.todayTitle")}
          </Text>
          <Text style={[styles.todayJuz, { color: colors.text }]}>{juzLabel}</Text>
          {info.from && info.to ? (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t("khatm.verses", {
                from: `${info.from.surah}:${info.from.ayah}`,
                to: `${info.to.surah}:${info.to.ayah}`,
              })}
            </Text>
          ) : null}
          {info.behindBy > 0 && !info.isDoneToday ? (
            <Text style={[styles.hint, { color: colors.warning }]}>
              {t("khatm.behind", { n: info.behindBy })}
            </Text>
          ) : null}

          <View style={styles.buttons}>
            {info.from ? (
              <RamadanButton
                label={t("khatm.open")}
                icon="book-open-variant"
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: "/quran",
                    params: {
                      surah: String(info.from?.surah ?? 1),
                      ts: String(Date.now()),
                    },
                  })
                }
              />
            ) : null}
            {info.isDoneToday ? (
              <RamadanButton
                label={`${t("khatm.doneToday")} · ${t("khatm.undo")}`}
                variant="secondary"
                onPress={() => onSetProgress(todayKey, 0)}
              />
            ) : (
              <RamadanButton
                label={t("khatm.markDone")}
                icon="check"
                onPress={() => onSetProgress(todayKey, info.target)}
              />
            )}
          </View>
        </View>
      )}

      {deleteButton}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  text: { fontSize: 14, lineHeight: 21 },
  hint: { fontSize: 13, lineHeight: 19 },
  label: { fontSize: 15, fontWeight: "700" },
  chips: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 14, fontWeight: "700" },
  track: { height: 10, borderRadius: 5, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 5 },
  todayBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  todayJuz: { fontSize: 22, fontWeight: "800" },
  buttons: { gap: 10, marginTop: 8 },
});
