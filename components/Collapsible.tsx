import Ionicons from "@expo/vector-icons/Ionicons";
import { PropsWithChildren, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";

export function Collapsible({
  children,
  title,
}: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const iconColor = useThemeColor({}, "text");

  return (
    <ThemedView testID="collapsible-container">
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}
        testID="collapsible-header"
      >
        <Ionicons
          name={isOpen ? "chevron-down" : "chevron-forward-outline"}
          size={18}
          weight="medium"
          color={iconColor}
          testID="collapsible-icon"
        />
        <ThemedText type="defaultSemiBold" testID="collapsible-title">
          {title}
        </ThemedText>
      </TouchableOpacity>
      {isOpen && (
        <ThemedView style={styles.content} testID="collapsible-content">
          {children}
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});
