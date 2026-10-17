// components/ramadan/RamadanHomeBanner.tsx
// Bannière d'accueil « Mon Ramadan ». Ne rend RIEN hors saison (30 jours avant → 3 jours après).

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "@/components/ui/LinearGradientView";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useRamadanSeason } from "../../hooks/useRamadanSeason";
import { useRamadanT } from "../../utils/ramadan/i18n";

export default function RamadanHomeBanner() {
  const season = useRamadanSeason();
  const router = useRouter();
  const t = useRamadanT();

  if (season.phase === "off") return null;

  let title: string;
  let subtitle: string;
  if (season.phase === "countdown") {
    title = t("banner.countdown", { n: season.daysUntilStart });
    subtitle = t("banner.countdownSub");
  } else if (season.phase === "ramadan") {
    title = t("banner.ramadan", { day: season.dayNumber, total: season.lengthDays });
    subtitle = t("banner.ramadanSub");
  } else {
    title = t("banner.eid");
    subtitle = t("banner.eidSub");
  }

  return (
    <Pressable
      onPress={() => router.push("/ramadan")}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={styles.wrapper}
    >
      <LinearGradient
        colors={["#0B3D2E", "#14664A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <MCIcon name="moon-waning-crescent" size={34} color="#FFD36B" />
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <MCIcon name="chevron-right" size={26} color="#FFFFFF" />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 24 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: "hidden",
  },
  texts: { flex: 1 },
  title: { fontSize: 17, fontWeight: "800", color: "#FFFFFF" },
  subtitle: { marginTop: 2, fontSize: 13, color: "rgba(255,255,255,0.85)" },
});
