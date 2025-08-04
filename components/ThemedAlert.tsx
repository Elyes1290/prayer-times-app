import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "../hooks/useColorScheme";
import { useThemeAssets } from "../hooks/useThemeAssets";
import { Colors } from "../constants/Colors";

interface ThemedAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: Array<{
    text: string;
    onPress: () => void;
    style?: "default" | "cancel" | "destructive";
  }>;
  onClose: () => void;
  iconType?:
    | "info"
    | "success"
    | "warning"
    | "error"
    | "download"
    | "delete"
    | "question";
}

const ThemedAlert: React.FC<ThemedAlertProps> = ({
  visible,
  title,
  message,
  buttons,
  onClose,
  iconType = "info",
}) => {
  const colorScheme = useColorScheme();
  const themeAssets = useThemeAssets();
  const currentTheme = themeAssets.theme;

  const getStyles = () => {
    const isDark = currentTheme === "dark";
    const hasManyButtons = buttons.length > 2;

    return StyleSheet.create({
      overlay: {
        flex: 1,
        backgroundColor: isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        zIndex: 999999,
        elevation: 999999,
      },
      modal: {
        backgroundColor: isDark
          ? themeAssets.colors.surface
          : themeAssets.colors.cardBG,
        borderRadius: 16,
        padding: 24,
        width: "90%",
        maxWidth: 400,
        shadowColor: isDark ? "#000" : themeAssets.colors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.5 : 0.3,
        shadowRadius: 16,
        elevation: 999999,
        borderWidth: 1,
        borderColor: isDark
          ? themeAssets.colors.border
          : themeAssets.colors.border,
        zIndex: 999999,
      },
      title: {
        fontSize: 20,
        fontWeight: "bold",
        color: isDark ? themeAssets.colors.text : themeAssets.colors.text,
        marginBottom: 12,
        textAlign: "center",
      },
      message: {
        fontSize: 16,
        color: isDark
          ? themeAssets.colors.textSecondary
          : themeAssets.colors.textSecondary,
        marginBottom: 24,
        textAlign: "center",
        lineHeight: 22,
      },
      buttonContainer: {
        flexDirection: hasManyButtons ? "column" : "row",
        justifyContent: hasManyButtons ? "flex-start" : "space-between",
        gap: hasManyButtons ? 8 : 12,
      },
      button: {
        flex: hasManyButtons ? 0 : 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 44,
      },
      defaultButton: {
        backgroundColor: isDark
          ? themeAssets.colors.primary
          : themeAssets.colors.primary,
      },
      cancelButton: {
        backgroundColor: isDark
          ? themeAssets.colors.surfaceVariant
          : themeAssets.colors.surfaceVariant,
        borderWidth: 1,
        borderColor: isDark
          ? themeAssets.colors.border
          : themeAssets.colors.border,
      },
      destructiveButton: {
        backgroundColor: isDark ? "#DC2626" : "#EF4444",
      },
      buttonText: {
        fontSize: 16,
        fontWeight: "600",
      },
      defaultButtonText: {
        color: "#FFFFFF",
      },
      cancelButtonText: {
        color: isDark ? themeAssets.colors.text : themeAssets.colors.text,
      },
      destructiveButtonText: {
        color: "#FFFFFF",
      },
      iconContainer: {
        alignItems: "center",
        marginBottom: 16,
      },
      icon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: isDark
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.05)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
      },
    });
  };

  const styles = getStyles();

  const getButtonStyle = (style?: "default" | "cancel" | "destructive") => {
    switch (style) {
      case "cancel":
        return [styles.button, styles.cancelButton];
      case "destructive":
        return [styles.button, styles.destructiveButton];
      default:
        return [styles.button, styles.defaultButton];
    }
  };

  const getButtonTextStyle = (style?: "default" | "cancel" | "destructive") => {
    switch (style) {
      case "cancel":
        return [styles.buttonText, styles.cancelButtonText];
      case "destructive":
        return [styles.buttonText, styles.destructiveButtonText];
      default:
        return [styles.buttonText, styles.defaultButtonText];
    }
  };

  const getIcon = () => {
    switch (iconType) {
      case "success":
        return "check-circle-outline";
      case "warning":
        return "alert-circle-outline";
      case "error":
        return "close-circle-outline";
      case "download":
        return "download-outline";
      case "delete":
        return "delete-outline";
      case "question":
        return "help-circle-outline";
      default:
        return "information-outline";
    }
  };

  const getIconColor = () => {
    switch (iconType) {
      case "success":
        return "#10B981";
      case "warning":
        return "#F59E0B";
      case "error":
        return "#EF4444";
      case "download":
        return "#3B82F6";
      case "delete":
        return "#EF4444";
      case "question":
        return "#6B7280";
      default:
        return themeAssets.colors.primary;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <View style={styles.icon}>
              <MaterialCommunityIcons
                name={getIcon()}
                size={24}
                color={getIconColor()}
              />
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={getButtonStyle(button.style)}
                onPress={() => {
                  button.onPress();
                  onClose();
                }}
              >
                <Text style={getButtonTextStyle(button.style)}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ThemedAlert;
