import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { quranScreenStyles as styles } from "../../styles/QuranScreen.styles";

type QuranOnlineHeaderProps = {
  selectedSourateLabel: string;
  selectedReciter?: string;
  isPremium: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenMenu: () => void;
  onRunWidgetDiagnostic?: () => void;
};

export function QuranOnlineHeader({
  selectedSourateLabel,
  selectedReciter,
  isPremium,
  searchQuery,
  onSearchChange,
  onOpenMenu,
  onRunWidgetDiagnostic,
}: QuranOnlineHeaderProps) {
  const { t } = useTranslation();

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{selectedSourateLabel}</Text>
          {isPremium && selectedReciter && (
            <Text style={styles.headerSubtitle}>{selectedReciter}</Text>
          )}
        </View>
        <Pressable style={styles.menuButton} onPress={onOpenMenu}>
          <Text style={styles.menuButtonText}>☰</Text>
        </Pressable>
      </View>

      {__DEV__ && onRunWidgetDiagnostic && (
        <View style={styles.offlineControlsSection}>
          <Pressable
            style={styles.diagnosticButton}
            onPress={onRunWidgetDiagnostic}
          >
            <MCIcon name="bug" size={16} color="#ffffff" />
            <Text style={styles.diagnosticButtonText}>Diagnostic Widget</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.searchContainer}>
        <TextInput
          testID="search-input"
          style={styles.searchInput}
          placeholder={
            t("quran_search_placeholder") || "Rechercher dans la sourate..."
          }
          placeholderTextColor="#ba9c34"
          value={searchQuery}
          onChangeText={onSearchChange}
          clearButtonMode="while-editing"
        />
      </View>
    </>
  );
}
