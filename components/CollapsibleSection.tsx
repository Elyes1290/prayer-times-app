import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useThemeAssets } from "../hooks/useThemeAssets";

interface CollapsibleSectionProps {
  title: string;
  icon: string;
  iconColor?: string;
  children: React.ReactNode;
  initiallyExpanded?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  iconColor,
  children,
  initiallyExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const progress = useSharedValue(initiallyExpanded ? 1 : 0);
  const themeAssets = useThemeAssets();

  const toggleSection = () => {
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);
    progress.value = withTiming(nextExpanded ? 1 : 0, { duration: 300 });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    maxHeight: progress.value * 8000,
    opacity: progress.value,
  }));

  const styles = StyleSheet.create({
    container: {
      marginBottom: 8,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor:
        themeAssets.theme === "light"
          ? themeAssets.colors.surface
          : themeAssets.colors.surface,
      borderWidth: 1,
      borderColor:
        themeAssets.theme === "light"
          ? themeAssets.colors.border
          : themeAssets.colors.border,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      backgroundColor:
        themeAssets.theme === "light"
          ? themeAssets.colors.surface
          : themeAssets.colors.surface,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        themeAssets.theme === "light"
          ? "rgba(0, 0, 0, 0.05)"
          : "rgba(255, 255, 255, 0.1)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    title: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color:
        themeAssets.theme === "light"
          ? themeAssets.colors.text
          : themeAssets.colors.text,
    },
    chevron: {
      color:
        themeAssets.theme === "light"
          ? themeAssets.colors.textSecondary
          : themeAssets.colors.textSecondary,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
  });

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={toggleSection}>
        <View style={styles.iconContainer}>
          <MCIcon
            name={icon as any}
            size={20}
            color={iconColor || themeAssets.colors.primary}
          />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Animated.View style={chevronStyle}>
          <MCIcon name="chevron-down" size={24} style={styles.chevron} />
        </Animated.View>
      </Pressable>

      <Animated.View style={contentStyle}>
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </View>
  );
};

export default CollapsibleSection;
