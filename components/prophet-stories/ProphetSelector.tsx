import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { PROPHETS, type ProphetId } from "../../constants/prophetStories";

interface ProphetSelectorProps {
  selectedProphet: ProphetId;
  onProphetChange: (prophet: ProphetId) => void;
  colors: {
    primary: string;
    text: string;
    textOnPrimary: string;
    surfaceVariant?: string;
    cardBG?: string;
    border: string;
  };
}

export function ProphetSelector({
  selectedProphet,
  onProphetChange,
  colors,
}: ProphetSelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.prophetSelectorScroll}
      style={styles.prophetSelectorWrapper}
    >
      {PROPHETS.map((prophet) => {
        const isSelected = selectedProphet === prophet.id;
        return (
          <Pressable
            key={prophet.id}
            style={[
              styles.prophetButton,
              {
                backgroundColor: isSelected
                  ? colors.primary
                  : colors.surfaceVariant ?? colors.cardBG ?? colors.text,
                borderColor: isSelected ? colors.primary : colors.border,
              },
              isSelected && styles.prophetButtonActive,
            ]}
            onPress={() => onProphetChange(prophet.id)}
          >
            <Text
              style={[
                styles.prophetButtonText,
                {
                  color: isSelected ? colors.textOnPrimary : colors.text,
                },
              ]}
            >
              {prophet.labelShort}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  prophetSelectorWrapper: {
    marginHorizontal: -4,
  },
  prophetSelectorScroll: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  prophetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    minHeight: 44,
  },
  prophetButtonActive: {
    boxShadow: "0px 1px 4px rgba(0,0,0,0.15)",
  },
  prophetButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
