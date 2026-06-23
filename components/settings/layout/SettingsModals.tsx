import React from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import ThemedAlert from "../../ThemedAlert";
import PremiumLoginSection from "../../../screens/PremiumLoginSection";

interface SettingsModalsProps {
  uiManager: any;
  themedAlert: any;
  setThemedAlert: (alert: any) => void;
  styles: any;
  t: any;
  colors: any;
  currentTheme: "light" | "dark" | "morning" | "sunset";
  activatePremium: any;
  showToast: any;
  handleLoginSuccess: (userData: any) => void;
  initialTab?: "login" | "signup";
}

export default function SettingsModals({
  uiManager,
  themedAlert,
  setThemedAlert,
  styles,
  t,
  colors,
  currentTheme,
  activatePremium,
  showToast,
  handleLoginSuccess,
  initialTab = "login",
}: SettingsModalsProps) {
  const isLightTheme = currentTheme === "light" || currentTheme === "morning";
  return (
    <>
      {/* 🌙 Modal de confirmation mystique */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={uiManager.uiState.showSuccessModal}
        onRequestClose={() => uiManager.setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Text style={styles.modalIcon}>🌙</Text>
            </View>
            <Text style={styles.modalTitle}>
              {t("notifications_reprogrammed", "Notifications reprogrammées")}
            </Text>
            <Text style={styles.modalMessage}>
              {t(
                "changes_will_be_active",
                "Vos nouveaux paramètres seront pris en compte pour les prochaines notifications."
              )}
            </Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => uiManager.setShowSuccessModal(false)}
            >
              <Text style={styles.modalButtonText}>✨ بارك الله فيك ✨</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 👑 Modal Premium */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={uiManager.uiState.showPremiumModal}
        onRequestClose={() => uiManager.setShowPremiumModal(false)}
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContent}>
            <View style={styles.premiumModalHeader}>
              <Text style={styles.premiumModalTitle}>
                👑 {t("premium_access", "Accès Premium")}
              </Text>
              <Pressable
                style={styles.premiumModalCloseButton}
                onPress={() => uiManager.setShowPremiumModal(false)}
              >
                <MCIcon
                  name="close"
                  size={24}
                  color={
                    isLightTheme ? colors.textSecondary : "#CBD5E1"
                  }
                />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <PremiumLoginSection
                activatePremium={activatePremium}
                styles={styles}
                showToast={showToast}
                t={t}
                currentTheme={currentTheme}
                onLoginSuccess={handleLoginSuccess}
                isInModal={true}
                initialTab={initialTab}
                onCloseModal={() => uiManager.setShowPremiumModal(false)}
              />

              {/* 🚀 Toast dans la zone scrollable pour rester visible */}
              <View style={styles.modalToastContainer} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 🚀 NOUVEAU : ThemedAlert personnalisé */}
      {themedAlert && (
        <ThemedAlert
          visible={themedAlert.visible}
          title={themedAlert.title}
          message={themedAlert.message}
          buttons={themedAlert.buttons}
          onClose={() => setThemedAlert(null)}
        />
      )}
    </>
  );
}

