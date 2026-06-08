import React from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import { IonIcon } from "@/components/icons/AppVectorIcons";
import { useTranslation } from "react-i18next";

type DayCompleteModalProps = {
  visible: boolean;
  onClose: () => void;
  colors: {
    cardBG: string;
    text: string;
    textSecondary: string;
    success: string;
  };
};

export function DayCompleteModal({
  visible,
  onClose,
  colors,
}: DayCompleteModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.cardBG }]}>
          <IonIcon name="trophy" size={48} color={colors.success} />
          <Text style={[styles.title, { color: colors.text }]}>
            {t("stats.day_complete_title")}
          </Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {t("stats.day_complete_message")}
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: colors.success }]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>{t("ok")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
