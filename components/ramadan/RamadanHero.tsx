// components/ramadan/RamadanHero.tsx
// En-tête de l'écran : compte à rebours, jour X sur N, ou message de l'Aïd.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "@/components/ui/LinearGradientView";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { formatShortDate } from "../../utils/ramadan/format";
import type { RamadanTranslate } from "../../utils/ramadan/i18n";
import type { RamadanSeason } from "../../utils/ramadan/season";

interface RamadanHeroProps {
  season: RamadanSeason;
  t: RamadanTranslate;
  language: string | undefined;
}

export default function RamadanHero({ season, t, language }: RamadanHeroProps) {
  let title: string;
  let subtitle: string;
  let progress: number | null = null;

  switch (season.phase) {
    case "ramadan":
      title = t("hero.dayOf", { day: season.dayNumber, total: season.lengthDays });
      subtitle = t("hero.remaining", { n: season.daysRemaining });
      progress = season.dayNumber / season.lengthDays;
      break;
    case "countdown":
      title = t("hero.countdownValue", { n: season.daysUntilStart });
      subtitle = `${t("hero.countdownLabel")} · ${t("hero.startsOn", {
        date: formatShortDate(season.startDate, language),
      })}`;
      break;
    case "eid":
      title = t("hero.eidTitle");
      subtitle = t("hero.eidText");
      break;
    default:
      title = t("hero.offTitle", { year: season.hijriYear > 0 ? season.hijriYear : "" }).trim();
      subtitle = t("hero.offText");
      break;
  }

  return (
    <LinearGradient
      colors={["#0B3D2E", "#14664A"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <MCIcon name="moon-waning-crescent" size={36} color="#FFD36B" />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {progress !== null ? (
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
        >
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    overflow: "hidden",
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  track: {
    alignSelf: "stretch",
    height: 8,
    borderRadius: 4,
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#FFD36B",
  },
});
