import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  const [animation] = useState(new Animated.Value(initiallyExpanded ? 1 : 0));
  const themeAssets = useThemeAssets();

  const toggleSection = () => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);

    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

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
      <TouchableOpacity style={styles.header} onPress={toggleSection}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={icon as any}
            size={20}
            color={iconColor || themeAssets.colors.primary}
          />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Animated.View
          style={{
            transform: [
              {
                rotate: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "180deg"],
                }),
              },
            ],
          }}
        >
          <MaterialCommunityIcons
            name="chevron-down"
            size={24}
            style={styles.chevron}
          />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View
        style={{
          maxHeight: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 2000],
          }),
          opacity: animation,
        }}
      >
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </View>
  );
};

export default CollapsibleSection;
