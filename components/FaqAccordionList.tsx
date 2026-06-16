import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useTranslation } from "react-i18next";
import { ABOUT_FAQ } from "../constants/aboutFaq";
import { useThemeColors, useCurrentTheme } from "../hooks/useThemeColor";

type FaqAccordionListProps = {
  variant?: "about" | "themed";
};

export function FaqAccordionList({ variant = "themed" }: FaqAccordionListProps) {
  const { t } = useTranslation();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const colors = useThemeColors();
  const currentTheme = useCurrentTheme();
  const isLightTheme = currentTheme === "light" || currentTheme === "morning";

  const accentColor = variant === "about" ? "#b59d42" : colors.primary;
  const questionColor =
    variant === "about" ? "#483C1C" : isLightTheme ? colors.text : colors.text;
  const answerColor =
    variant === "about" ? "#6c5d3b" : colors.textSecondary;
  const cardBackground =
    variant === "about" ? "#fff" : isLightTheme ? colors.cardBG : colors.cardBG;

  return (
    <View style={styles.list}>
      {ABOUT_FAQ.map((item, index) => {
        const isExpanded = expandedFAQ === index;
        return (
          <Pressable
            key={item.question}
            style={[styles.faqItem, { backgroundColor: cardBackground }]}
            onPress={() => setExpandedFAQ(isExpanded ? null : index)}
          >
            <View style={styles.faqHeader}>
              <Text style={[styles.faqQuestion, { color: questionColor }]}>
                {t(`abouts.${item.question}`)}
              </Text>
              <MCIcon
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={24}
                color={accentColor}
              />
            </View>
            {isExpanded && (
              <Text style={[styles.faqAnswer, { color: answerColor }]}>
                {t(`abouts.${item.answer}`)}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  faqItem: {
    borderRadius: 8,
    padding: 12,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  faqQuestion: {
    fontSize: 16,
    fontFamily: "ScheherazadeNew",
    fontWeight: "bold",
    flex: 1,
  },
  faqAnswer: {
    fontSize: 14,
    marginTop: 8,
    fontFamily: "ScheherazadeNew",
    lineHeight: 20,
  },
});
