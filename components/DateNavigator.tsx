// components/DateNavigator.tsx
import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";

type Props = {
  date: Date;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
};

export function DateNavigator({ date, onPrev, onNext, onReset }: Props) {
  return (
    <View style={styles.nav}>
      <Button title="‹" onPress={onPrev} />
      <Text style={styles.text}>{date.toLocaleDateString()}</Text>
      <Button title="›" onPress={onNext} />
      <Button title="Aujourd'hui" onPress={onReset} />
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 12,
  },
});
