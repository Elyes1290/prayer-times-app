import { Z_INDEX } from "../constants/zIndex";
import React from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useThemeAssets } from "../hooks/useThemeAssets";
import { makeBoxShadow } from "../utils/shadowUtils";

interface ThemedAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: {
    text: string;
    onPress: () => void;
    style?: "default" | "cancel" | "destructive";
  }[];
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
        zIndex: Z_INDEX.modal,
      },
      modal: {
        backgroundColor: isDark
          ? themeAssets.colors.surface
          : themeAssets.colors.cardBG,
        borderRadius: 16,
        padding: 24,
        width: "90%",
        maxWidth: 400,
        boxShadow: makeBoxShadow(
          isDark ? "#000" : themeAssets.colors.shadow,
          0,
          8,
          16,
          isDark ? 0.5 : 0.3
        ),
        borderWidth: 1,
        borderColor: isDark
          ? themeAssets.colors.border
          : themeAssets.colors.border,
        zIndex: Z_INDEX.modal,
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
      <View style={styles.overlay} testID="themed-alert-overlay">
        <View style={styles.modal} testID="themed-alert-modal">
          <View
            style={styles.iconContainer}
            testID="themed-alert-icon-container"
          >
            <View style={styles.icon} testID="themed-alert-icon">
              <MCIcon
                name={getIcon()}
                size={24}
                color={getIconColor()}
                testID="themed-alert-icon-element"
              />
            </View>
          </View>

          <Text style={styles.title} testID="themed-alert-title">
            {title}
          </Text>
          <Text style={styles.message} testID="themed-alert-message">
            {message}
          </Text>

          <View
            style={styles.buttonContainer}
            testID="themed-alert-button-container"
          >
            {buttons.map((button, index) => (
              <Pressable
                key={button.text}
                style={getButtonStyle(button.style)}
                onPress={() => {
                  button.onPress();
                  onClose();
                }}
                testID={`themed-alert-button-${index}`}
              >
                <Text
                  style={getButtonTextStyle(button.style)}
                  testID={`themed-alert-button-text-${button.text}`}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ThemedAlert;
