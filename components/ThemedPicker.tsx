import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeAssets } from "../hooks/useThemeAssets";

interface ThemedPickerProps {
  visible: boolean;
  title: string;
  items: {
    label: string;
    value: string;
  }[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  onClose: () => void;
}

const ThemedPicker: React.FC<ThemedPickerProps> = ({
  visible,
  title,
  items,
  selectedValue,
  onValueChange,
  onClose,
}) => {
  const themeAssets = useThemeAssets();
  const currentTheme = themeAssets.theme;

  const getStyles = () => {
    const isDark = currentTheme === "dark";

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
        maxHeight: "80%",
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
        marginBottom: 20,
        textAlign: "center",
      },
      listContainer: {
        maxHeight: 300,
      },
      item: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: isDark
          ? themeAssets.colors.border
          : themeAssets.colors.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: isDark ? "transparent" : "transparent",
      },
      selectedItem: {
        backgroundColor: isDark
          ? "rgba(78, 205, 196, 0.2)"
          : "rgba(78, 205, 196, 0.1)",
        borderLeftWidth: 4,
        borderLeftColor: "#4ECDC4",
      },
      itemText: {
        fontSize: 16,
        color: isDark ? themeAssets.colors.text : themeAssets.colors.text,
        flex: 1,
      },
      selectedItemText: {
        color: "#4ECDC4",
        fontWeight: "600",
      },
      checkIcon: {
        color: "#4ECDC4",
      },
      cancelButton: {
        marginTop: 20,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        backgroundColor: isDark
          ? themeAssets.colors.surfaceVariant
          : themeAssets.colors.surfaceVariant,
        alignItems: "center",
        borderWidth: 1,
        borderColor: isDark
          ? themeAssets.colors.border
          : themeAssets.colors.border,
      },
      cancelButtonText: {
        fontSize: 16,
        color: isDark
          ? themeAssets.colors.textSecondary
          : themeAssets.colors.textSecondary,
        fontWeight: "600",
      },
    });
  };

  const styles = getStyles();

  const renderItem = ({ item }: { item: { label: string; value: string } }) => {
    const isSelected = item.value === selectedValue;

    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.selectedItem]}
        onPress={() => {
          onValueChange(item.value);
          onClose();
        }}
      >
        <Text style={[styles.itemText, isSelected && styles.selectedItemText]}>
          {item.label}
        </Text>
        {isSelected && (
          <MaterialCommunityIcons
            name="check"
            size={20}
            style={styles.checkIcon}
          />
        )}
      </TouchableOpacity>
    );
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
          <Text style={styles.title}>{title}</Text>

          <View style={styles.listContainer}>
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={false}
            />
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ThemedPicker;
