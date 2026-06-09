import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { QuranIosSourateMenuItem } from "./QuranListItems";
import { quranScreenStyles as styles } from "../../styles/QuranScreen.styles";

type SourateRow = {
  id: number;
  name_simple: string;
  name_arabic: string;
};

type QuranNavigationMenuModalProps = {
  visible: boolean;
  onClose: () => void;
  isPremium: boolean;
  hasReciters: boolean;
  selectedSourateLabel: string;
  selectedReciter: string;
  selectedSourate: number;
  sourates: SourateRow[];
  onSelectSourate: (id: number) => void;
  onOpenSouratePicker: () => void;
  onOpenReciterPicker: () => void;
  onOpenDownloads: () => void;
};

export function QuranNavigationMenuModal({
  visible,
  onClose,
  isPremium,
  hasReciters,
  selectedSourateLabel,
  selectedReciter,
  selectedSourate,
  sourates,
  onSelectSourate,
  onOpenSouratePicker,
  onOpenReciterPicker,
  onOpenDownloads,
}: QuranNavigationMenuModalProps) {
  const { t } = useTranslation();
  const [menuView, setMenuView] = useState<"main" | "sourateList">("main");
  const prevVisibleRef = useRef(visible);

  if (visible !== prevVisibleRef.current) {
    prevVisibleRef.current = visible;
    if (!visible) {
      setMenuView("main");
    }
  }

  const handleClose = useCallback(() => {
    setMenuView("main");
    onClose();
  }, [onClose]);

  const handleIosSourateSelect = useCallback(
    (id: number) => {
      onSelectSourate(id);
      setMenuView("main");
      onClose();
    },
    [onSelectSourate, onClose],
  );

  const renderIosSourateMenuItem = useCallback(
    ({ item }: { item: SourateRow }) => (
      <QuranIosSourateMenuItem
        sourateId={item.id}
        nameSimple={item.name_simple}
        nameArabic={item.name_arabic}
        selected={selectedSourate === item.id}
        onSelect={handleIosSourateSelect}
        styles={styles}
      />
    ),
    [selectedSourate, handleIosSourateSelect],
  );

  const handleOpenReciter = useCallback(() => {
    onOpenReciterPicker();
    onClose();
  }, [onOpenReciterPicker, onClose]);

  const handleOpenDownloads = useCallback(() => {
    onClose();
    onOpenDownloads();
  }, [onClose, onOpenDownloads]);

  const downloadsOption = isPremium ? (
    <View style={styles.menuSection}>
      <Text style={styles.menuSectionTitle}>
        {t("downloads_manager") || "Téléchargements"}
      </Text>
      <Pressable style={styles.menuOption} onPress={handleOpenDownloads}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
          }}
        >
          <MCIcon
            name="download-multiple"
            size={20}
            color="#4ECDC4"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.menuOptionText}>
            {t("manage_downloads") || "Gérer les téléchargements"}
          </Text>
        </View>
        <Text style={styles.menuArrow}>›</Text>
      </Pressable>
    </View>
  ) : null;

  const reciterOption =
    isPremium && hasReciters ? (
      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>{t("reciter")}</Text>
        <Pressable style={styles.menuOption} onPress={handleOpenReciter}>
          <Text style={styles.menuOptionText}>
            {selectedReciter || t("quran.reciter", "Récitateur")}
          </Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
      </View>
    ) : null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.menuOverlay}>
        <View style={styles.menuContent}>
          <View style={styles.menuHeader}>
            {Platform.OS === "ios" && menuView !== "main" && (
              <Pressable
                style={styles.backButton}
                onPress={() => setMenuView("main")}
              >
                <Text style={styles.backButtonText}>
                  ‹ {t("back", "Retour")}
                </Text>
              </Pressable>
            )}
            <Text style={styles.menuTitle}>
              {Platform.OS === "ios" && menuView === "sourateList"
                ? t("choose_sourate")
                : t("navigation")}
            </Text>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          {Platform.OS === "ios" ? (
            <>
              {menuView === "sourateList" && (
                <FlatList
                  data={sourates}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderIosSourateMenuItem}
                />
              )}

              {menuView === "main" && (
                <>
                  <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>{t("sourate")}</Text>
                    <Pressable
                      style={styles.menuOption}
                      onPress={() => setMenuView("sourateList")}
                    >
                      <Text style={styles.menuOptionText}>
                        {selectedSourateLabel}
                      </Text>
                      <Text style={styles.menuArrow}>›</Text>
                    </Pressable>
                  </View>
                  {reciterOption}
                  {downloadsOption}
                </>
              )}
            </>
          ) : (
            <>
              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>{t("sourate")}</Text>
                <Pressable
                  style={styles.menuOption}
                  onPress={onOpenSouratePicker}
                >
                  <Text style={styles.menuOptionText}>
                    {selectedSourateLabel}
                  </Text>
                  <Text style={styles.menuArrow}>›</Text>
                </Pressable>
              </View>
              {reciterOption}
              {downloadsOption}
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
