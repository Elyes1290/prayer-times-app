// components/friday/FridayHomeCard.tsx
// Carte d'accueil « Jumu'a Moubarak » : visible uniquement le vendredi (gratuit).

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "@/components/ui/LinearGradientView";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useIsFriday } from "../../hooks/useIsFriday";
import { useFridayT } from "../../utils/friday/i18n";

export default function FridayHomeCard() {
  const isFridayToday = useIsFriday();
  const router = useRouter();
  const t = useFridayT();

  if (!isFridayToday) return null;

  const title = t("card.title");
  const subtitle = t("card.subtitle");

  return (
    <Pressable
      onPress={() => router.push("/friday")}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={styles.wrapper}
    >
      <LinearGradient
        colors={["#7C5E10", "#B8932B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <MCIcon name="mosque" size={34} color="#FFFFFF" />
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
  card: {
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
  subtitle: { marginTop: 2, fontSize: 13, color: "rgba(255,255,255,0.9)" },
});
