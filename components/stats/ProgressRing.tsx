import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { TRACKED_PRAYERS } from "../../constants/prayerTracking";

type ProgressRingProps = {
  completed: number;
  total?: number;
  size?: number;
  strokeWidth?: number;
  trackColor: string;
  fillColor: string;
  textColor: string;
  subtextColor: string;
  /** Libellé optionnel sous l'anneau (déconseillé : redondant avec X/Y au centre). */
  label?: string;
};

export function ProgressRing({
  completed,
  total = TRACKED_PRAYERS.length,
  size = 112,
  strokeWidth = 8,
  trackColor,
  fillColor,
  textColor,
  subtextColor,
  label,
}: ProgressRingProps) {
  const percent = Math.round((completed / total) * 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, completed / total));
  const strokeDashoffset = circumference * (1 - progress);
  const center = size / 2;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.ring, { width: size, height: size }]}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {progress > 0 ? (
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={fillColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation={-90}
              origin={`${center}, ${center}`}
            />
          ) : null}
        </Svg>
        <View style={styles.center}>
          <Text style={[styles.count, { color: textColor }]}>
            {completed}/{total}
          </Text>
          <Text style={[styles.percent, { color: subtextColor }]}>
            {percent}%
          </Text>
        </View>
      </View>
      {label ? (
        <Text style={[styles.label, { color: subtextColor }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ring: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  center: {
    alignItems: "center",
  },
  count: {
    fontSize: 28,
    fontWeight: "700",
  },
  percent: {
    fontSize: 13,
    fontWeight: "500",
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
});
