import { Z_INDEX } from "../constants/zIndex";
import React from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
} from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useThemeAssets } from "../hooks/useThemeAssets";
import { makeBoxShadow } from "../utils/shadowUtils";

interface ThemedPickerProps {
  visible: boolean;
  title: string;
  items: {
    label: string;
    value: string;
  }[];
  selectedValue: string;
  onValueChange: (value: string) => void | boolean; // 🔧 Peut retourner boolean pour contrôler la fermeture
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
        maxHeight: "80%",
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
      <Pressable
        style={[styles.item, isSelected && styles.selectedItem]}
        onPress={() => {
          const result = onValueChange(item.value);
          // 🔧 Ne fermer que si le résultat est true ou undefined (pour rétrocompatibilité)
          if (result !== false) {
            onClose();
          }
        }}
      >
        <Text style={[styles.itemText, isSelected && styles.selectedItemText]}>
          {item.label}
        </Text>
        {isSelected && (
          <MCIcon
            name="check"
            size={20}
            style={styles.checkIcon}
          />
        )}
      </Pressable>
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

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default ThemedPicker;
