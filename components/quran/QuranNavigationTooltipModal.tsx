import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { quranScreenStyles as styles } from "../../styles/QuranScreen.styles";

type QuranNavigationTooltipModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function QuranNavigationTooltipModal({
  visible,
  onClose,
}: QuranNavigationTooltipModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalNavigationTooltip}>
          <Text style={styles.modalNavigationTooltipTitle}>
            {t("quran_navigation_modal.title")}
          </Text>

          <View style={styles.modalNavigationTooltipRow}>
            <MCIcon
              name="gesture-swipe-horizontal"
              size={20}
              color="#4ECDC4"
            />
            <Text style={styles.modalNavigationTooltipText}>
              {t("quran_navigation_modal.swipe_instruction")}
            </Text>
          </View>

          <View style={styles.modalNavigationTooltipRow}>
            <MCIcon name="widgets" size={20} color="#FFD700" />
            <Text style={styles.modalNavigationTooltipText}>
              {t("quran_navigation_modal.widget_instruction")}
            </Text>
          </View>

          <View style={styles.modalNavigationTooltipRow}>
            <MCIcon name="play" size={20} color="#4CAF50" />
            <Text style={styles.modalNavigationTooltipText}>
              {t("quran_navigation_modal.play_instruction")}
            </Text>
          </View>

          <Pressable style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseButtonText}>
              {t("quran_navigation_modal.close_button")}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
