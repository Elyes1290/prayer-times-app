// components/DateNavigator.tsx
import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  date: Date;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
};

export function DateNavigator({ date, onPrev, onNext, onReset }: Props) {
  return (
    <View style={styles.nav}>
      <TouchableOpacity onPress={onPrev} style={styles.arrowBtn}>
        <MaterialIcons name="chevron-left" size={28} color="#FFF" />
      </TouchableOpacity>
      <Text style={styles.text}>{date.toLocaleDateString()}</Text>
      <TouchableOpacity onPress={onNext} style={styles.arrowBtn}>
        <MaterialIcons name="chevron-right" size={28} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity onPress={onReset} style={styles.todayBtn}>
        <Text style={styles.todayText}>Aujourd&#39;hui</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    gap: 6, // si tu utilises React Native > 0.71, sinon remplace par margin
  },
  arrowBtn: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: "rgba(30,30,30,0.3)", // petit effet nuit
    marginHorizontal: 2,
  },
  text: {
    fontSize: 17,
    fontWeight: "600",
    marginHorizontal: 10,
    color: "#fff", // Blanc pour ressortir sur nuit
    minWidth: 120,
    textAlign: "center",
  },
  todayBtn: {
    backgroundColor: "#3faea6", // couleur claire/bleu ou celle de ton thème
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginLeft: 8,
  },
  todayText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
