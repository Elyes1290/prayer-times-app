// components/ramadan/RemindersCard.tsx
// Réglages des rappels Ramadan (Premium) : suhoor, iftar, lecture du jour, Laylat al-Qadr.

import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useThemeColors } from "../../hooks/useThemeColor";
import { formatHourMinute } from "../../utils/ramadan/format";
import type { RamadanTranslate } from "../../utils/ramadan/i18n";
import type { RamadanSettings } from "../../utils/ramadan/storage";
import { RamadanCard, RamadanStepper } from "./RamadanUI";

interface RemindersCardProps {
  settings: RamadanSettings;
  notificationsEnabled: boolean;
  t: RamadanTranslate;
  onChange: (patch: Partial<RamadanSettings>) => void;
}

const SUHOOR_MIN = { min: 15, max: 120, step: 5 };
const IFTAR_MIN = { min: 5, max: 60, step: 5 };
const KHATM_STEP_MINUTES = 30;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function RemindersCard({
  settings,
  notificationsEnabled,
  t,
  onChange,
}: RemindersCardProps) {
  const colors = useThemeColors();

  const khatmTotal = settings.khatmReminderHour * 60 + settings.khatmReminderMinute;
  const shiftKhatm = (deltaMinutes: number) => {
    const total = (khatmTotal + deltaMinutes + 24 * 60) % (24 * 60);
    onChange({
      khatmReminderHour: Math.floor(total / 60),
      khatmReminderMinute: total % 60,
    });
  };

  return (
    <RamadanCard title={t("reminders.title")} icon="bell-ring" premiumBadge>
      {!notificationsEnabled ? (
        <Text style={[styles.warning, { color: colors.warning }]}>
          {t("reminders.needNotifications")}
        </Text>
      ) : null}

      <ReminderRow
        title={t("reminders.suhoor")}
        description={t("reminders.suhoorDesc", { min: settings.suhoorReminderMin })}
        enabled={settings.suhoorEnabled}
        onToggle={(value) => onChange({ suhoorEnabled: value })}
      >
        <RamadanStepper
          label={t("times.durationShort", { m: settings.suhoorReminderMin })}
          decrementLabel={t("reminders.minus")}
          incrementLabel={t("reminders.plus")}
          decrementDisabled={settings.suhoorReminderMin <= SUHOOR_MIN.min}
          incrementDisabled={settings.suhoorReminderMin >= SUHOOR_MIN.max}
          onDecrement={() =>
            onChange({
              suhoorReminderMin: clamp(
                settings.suhoorReminderMin - SUHOOR_MIN.step,
                SUHOOR_MIN.min,
                SUHOOR_MIN.max,
              ),
            })
          }
          onIncrement={() =>
            onChange({
              suhoorReminderMin: clamp(
                settings.suhoorReminderMin + SUHOOR_MIN.step,
                SUHOOR_MIN.min,
                SUHOOR_MIN.max,
              ),
            })
          }
        />
      </ReminderRow>

      <ReminderRow
        title={t("reminders.iftar")}
        description={t("reminders.iftarDesc", { min: settings.iftarReminderMin })}
        enabled={settings.iftarEnabled}
        onToggle={(value) => onChange({ iftarEnabled: value })}
      >
        <RamadanStepper
          label={t("times.durationShort", { m: settings.iftarReminderMin })}
          decrementLabel={t("reminders.minus")}
          incrementLabel={t("reminders.plus")}
          decrementDisabled={settings.iftarReminderMin <= IFTAR_MIN.min}
          incrementDisabled={settings.iftarReminderMin >= IFTAR_MIN.max}
          onDecrement={() =>
            onChange({
              iftarReminderMin: clamp(
                settings.iftarReminderMin - IFTAR_MIN.step,
                IFTAR_MIN.min,
                IFTAR_MIN.max,
              ),
            })
          }
          onIncrement={() =>
            onChange({
              iftarReminderMin: clamp(
                settings.iftarReminderMin + IFTAR_MIN.step,
                IFTAR_MIN.min,
                IFTAR_MIN.max,
              ),
            })
          }
        />
      </ReminderRow>

      <ReminderRow
        title={t("reminders.khatm")}
        description={t("reminders.khatmDesc", {
          time: formatHourMinute(settings.khatmReminderHour, settings.khatmReminderMinute),
        })}
        enabled={settings.khatmReminderEnabled}
        onToggle={(value) => onChange({ khatmReminderEnabled: value })}
      >
        <RamadanStepper
          label={formatHourMinute(settings.khatmReminderHour, settings.khatmReminderMinute)}
          decrementLabel={t("reminders.earlier")}
          incrementLabel={t("reminders.later")}
          onDecrement={() => shiftKhatm(-KHATM_STEP_MINUTES)}
          onIncrement={() => shiftKhatm(KHATM_STEP_MINUTES)}
        />
      </ReminderRow>

      <ReminderRow
        title={t("reminders.laylat")}
        description={t("reminders.laylatDesc")}
        enabled={settings.laylatEnabled}
        onToggle={(value) => onChange({ laylatEnabled: value })}
        last
      />
    </RamadanCard>
  );
}

function ReminderRow({
  title,
  description,
  enabled,
  onToggle,
  children,
  last = false,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  children?: React.ReactNode;
  last?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={styles.rowHeader}>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{description}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          accessibilityLabel={title}
          trackColor={{ true: colors.primary }}
        />
      </View>
      {enabled && children ? <View style={styles.rowBody}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  warning: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  row: { paddingVertical: 12 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "700" },
  rowDesc: { fontSize: 13, marginTop: 2 },
  rowBody: { marginTop: 12 },
});
