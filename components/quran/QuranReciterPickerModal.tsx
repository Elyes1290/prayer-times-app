import React, { useCallback } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { QuranModalOptionItem } from "./QuranListItems";
import { quranScreenStyles as styles } from "../../styles/QuranScreen.styles";

type QuranReciterPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  reciters: string[];
  selectedReciter: string;
  onSelectReciter: (reciter: string) => void;
  maxHeight: number;
};

export function QuranReciterPickerModal({
  visible,
  onClose,
  reciters,
  selectedReciter,
  onSelectReciter,
  maxHeight,
}: QuranReciterPickerModalProps) {
  const { t } = useTranslation();

  const renderItem = useCallback(
    ({ item }: { item: { key: string; label: string } }) => (
      <QuranModalOptionItem
        label={item.label}
        selected={selectedReciter === item.key}
        onPress={() => {
          onSelectReciter(item.key);
          onClose();
        }}
        styles={styles}
      />
    ),
    [selectedReciter, onSelectReciter, onClose],
  );

  const data = reciters.map((reciter) => ({
    key: reciter,
    label: reciter,
  }));

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={[styles.modalContent, { maxHeight }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("choose_reciter")}</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>
          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={true}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
