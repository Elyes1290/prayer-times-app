import React from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ThemedAlert from "../../ThemedAlert";
import PremiumLoginSection from "../../../screens/PremiumLoginSection";

interface SettingsModalsProps {
  uiManager: any;
  themedAlert: any;
  setThemedAlert: (alert: any) => void;
  styles: any;
  t: any;
  colors: any;
  currentTheme: "light" | "dark";
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
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => uiManager.setShowSuccessModal(false)}
            >
              <Text style={styles.modalButtonText}>✨ بارك الله فيك ✨</Text>
            </TouchableOpacity>
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
              <TouchableOpacity
                style={styles.premiumModalCloseButton}
                onPress={() => uiManager.setShowPremiumModal(false)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={
                    currentTheme === "light" ? colors.textSecondary : "#CBD5E1"
                  }
                />
              </TouchableOpacity>
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
                onLoginSuccess={handleLoginSuccess}
                isInModal={true}
                initialTab={initialTab}
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

