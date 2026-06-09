import React from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { quranScreenStyles as styles } from "../../styles/QuranScreen.styles";

export type SourateModalRow = { key: number; label: string };

type QuranSouratePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  data: SourateModalRow[];
  renderItem: (info: {
    item: SourateModalRow;
  }) => React.ReactElement | null;
  maxHeight: number;
  optimizedList?: boolean;
};

export function QuranSouratePickerModal({
  visible,
  onClose,
  data,
  renderItem,
  maxHeight,
  optimizedList = false,
}: QuranSouratePickerModalProps) {
  const { t } = useTranslation();

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
            <Text style={styles.modalTitle}>{t("choose_sourate")}</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>
          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={(item) => item.key.toString()}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
            removeClippedSubviews={true}
            {...(optimizedList
              ? {
                  getItemLayout: (
                    _data: SourateModalRow[] | null | undefined,
                    index: number,
                  ) => ({
                    length: 50,
                    offset: 50 * index,
                    index,
                  }),
                  contentContainerStyle: styles.listContent,
                  showsVerticalScrollIndicator: true,
                  bounces: true,
                }
              : {})}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
