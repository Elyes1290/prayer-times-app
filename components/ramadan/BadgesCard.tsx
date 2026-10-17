// components/ramadan/BadgesCard.tsx
// Badges de Ramadan (premium) : calculés à partir de ce que l'utilisateur a coché.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useThemeColors } from "../../hooks/useThemeColor";
import type { RamadanBadge } from "../../utils/ramadan/badges";
import type { RamadanTranslate } from "../../utils/ramadan/i18n";
import { RamadanCard } from "./RamadanUI";

interface BadgesCardProps {
  badges: RamadanBadge[];
  t: RamadanTranslate;
}

export default function BadgesCard({ badges, t }: BadgesCardProps) {
  const colors = useThemeColors();
  const unlockedCount = badges.filter((badge) => badge.unlocked).length;

  return (
    <RamadanCard title={t("badges.title")} icon="medal" premiumBadge>
      <Text style={[styles.summary, { color: colors.textSecondary }]}>
        {t("badges.summary", { n: unlockedCount, total: badges.length })}
      </Text>
      <View style={styles.grid}>
        {badges.map((badge) => {
          const name = t(`badges.${badge.code}.name`);
          const description = t(`badges.${badge.code}.desc`);
          return (
            <View
              key={badge.code}
              style={styles.tileWrap}
              accessible
              accessibilityLabel={`${name}. ${description}. ${
                badge.unlocked
                  ? t("badges.unlocked")
                  : t("badges.progress", { current: badge.current, target: badge.target })
              }`}
            >
              <View
                style={[
                  styles.tile,
                  {
                    borderColor: badge.unlocked ? badge.color : colors.border,
                    backgroundColor: badge.unlocked ? `${badge.color}22` : "transparent",
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: badge.unlocked ? badge.color : colors.border },
                  ]}
                >
                  <MCIcon
                    name={(badge.unlocked ? badge.icon : "lock") as never}
                    size={22}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                  {name}
                </Text>
                <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={3}>
                  {description}
                </Text>
                <Text
                  style={[
                    styles.progress,
                    { color: badge.unlocked ? badge.color : colors.textSecondary },
                  ]}
                >
                  {badge.unlocked
                    ? t("badges.unlocked")
                    : t("badges.progress", { current: badge.current, target: badge.target })}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </RamadanCard>
  );
}

const styles = StyleSheet.create({
  summary: { fontSize: 13, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  tileWrap: { width: "50%", padding: 4 },
  tile: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  desc: { fontSize: 11, lineHeight: 15, textAlign: "center" },
  progress: { fontSize: 12, fontWeight: "700", marginTop: 2 },
});
