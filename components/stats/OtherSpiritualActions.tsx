import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  ToastAndroid,
} from "react-native";
import { IonIcon } from "@/components/icons/AppVectorIcons";
import { useTranslation } from "react-i18next";
import { useUpdateUserStats } from "../../hooks/useUpdateUserStats";

function showToast(msg: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  }
}

type OtherSpiritualActionsProps = {
  onUpdated: () => Promise<void>;
  colors: {
    cardBG: string;
    text: string;
    textSecondary: string;
    primary: string;
    success: string;
    accent: string;
    error: string;
  };
};

export function OtherSpiritualActions({
  onUpdated,
  colors,
}: OtherSpiritualActionsProps) {
  const { t } = useTranslation();
  const { recordDhikr, recordQuranRead, recordHadithRead } =
    useUpdateUserStats();
  const [loading, setLoading] = useState<string | null>(null);

  const run = async (
    key: string,
    action: () => Promise<{ success?: boolean } | undefined>,
    successKey: string,
    errorKey: string,
  ) => {
    setLoading(key);
    try {
      const res = await action();
      if (res?.success) {
        showToast(t(successKey));
        await onUpdated();
      } else {
        showToast(t(errorKey));
      }
    } finally {
      setLoading(null);
    }
  };

  const actions = [
    {
      key: "dhikr",
      icon: "heart" as const,
      color: colors.accent,
      title: t("dhikr_completed"),
      onPress: () =>
        run("dhikr", () => recordDhikr(1, "general"), "dhikr_recorded_success", "dhikr_recording_error"),
    },
    {
      key: "quran",
      icon: "book" as const,
      color: colors.primary,
      title: t("quran_read_completed"),
      onPress: () =>
        run("quran", () => recordQuranRead(1), "quran_read_recorded_success", "quran_read_recording_error"),
    },
    {
      key: "hadith",
      icon: "document-text" as const,
      color: colors.error,
      title: t("hadith_studied"),
      onPress: () =>
        run("hadith", () => recordHadithRead(), "hadith_recorded_success", "hadith_recording_error"),
    },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t("stats.other_actions_title")}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t("stats.other_actions_subtitle")}
      </Text>
      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            style={[styles.item, { borderColor: action.color + "55" }]}
            onPress={action.onPress}
            disabled={loading !== null}
          >
            {loading === action.key ? (
              <ActivityIndicator color={action.color} />
            ) : (
              <IonIcon name={action.icon} size={24} color={action.color} />
            )}
            <Text style={[styles.itemText, { color: colors.text }]}>
              {action.title}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  item: {
    flexBasis: "30%",
    flexGrow: 1,
    minWidth: 96,
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  itemText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
