import React, { useCallback } from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { PROPHETS, type ProphetConfig, type ProphetId } from "../../constants/prophetStories";

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
  const renderProphet = useCallback(
    ({ item: prophet }: { item: ProphetConfig }) => {
      const isSelected = selectedProphet === prophet.id;
      return (
        <Pressable
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
    },
    [selectedProphet, onProphetChange, colors]
  );

  return (
    <FlatList
      horizontal
      data={PROPHETS}
      keyExtractor={(item) => item.id}
      renderItem={renderProphet}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.prophetSelectorScroll}
      style={styles.prophetSelectorWrapper}
    />
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
  },
  prophetButtonActive: {
    transform: [{ scale: 1.02 }],
  },
  prophetButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
