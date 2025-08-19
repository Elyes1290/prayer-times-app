import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Keyboard,
  Animated,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

const { width: screenWidth } = Dimensions.get("window");

interface WelcomePersonalizationModalProps {
  visible: boolean;
  onConfirm: (firstName: string | null) => void;
  onSkip: () => void;
}

export default function WelcomePersonalizationModal({
  visible,
  onConfirm,
  onSkip,
}: WelcomePersonalizationModalProps) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [keyboardOffset] = useState(new Animated.Value(0));

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", (e) => {
      // Calculer le décalage nécessaire pour remonter le modal
      const keyboardHeight = e.endCoordinates.height;
      const offset =
        Platform.OS === "ios" ? -keyboardHeight / 2 : -keyboardHeight / 3;

      Animated.timing(keyboardOffset, {
        toValue: offset,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, [keyboardOffset]);

  const handleConfirm = () => {
    Keyboard.dismiss();
    onConfirm(firstName.trim() || null);
  };

  const handleSkip = () => {
    Keyboard.dismiss();
    onSkip();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.7)" />
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: keyboardOffset }],
            },
          ]}
        >
          <LinearGradient
            colors={["rgba(78,205,196,0.15)", "rgba(240,147,251,0.10)"]}
            style={styles.modalGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* ✨ Icône de bienvenue */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={["#4ECDC4", "#F093FB"]}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons
                  name="account-heart"
                  size={32}
                  color="white"
                />
              </LinearGradient>
            </View>

            {/* 📝 Titre et description */}
            <Text style={styles.title}>
              {t("welcome_personalization_title")}
            </Text>
            <Text style={styles.description}>
              {t("welcome_personalization_description")}
            </Text>

            {/* 📝 Champ de saisie */}
            <View style={styles.inputContainer}>
              <LinearGradient
                colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.04)"]}
                style={styles.inputGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons
                  name="account"
                  size={20}
                  color="rgba(255,255,255,0.6)"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={t("welcome_personalization_placeholder")}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={firstName}
                  onChangeText={setFirstName}
                  maxLength={20}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoFocus={true}
                  returnKeyType="done"
                  onSubmitEditing={handleConfirm}
                />
              </LinearGradient>
            </View>

            {/* 🔘 Boutons d'action */}
            <View style={styles.buttonsContainer}>
              {/* Bouton Passer */}
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>
                  {t("welcome_personalization_skip")}
                </Text>
              </TouchableOpacity>

              {/* Bouton Confirmer */}
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#4ECDC4", "#2C7A7A"]}
                  style={styles.confirmGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons
                    name="check"
                    size={20}
                    color="white"
                    style={styles.confirmIcon}
                  />
                  <Text style={styles.confirmButtonText}>
                    {t("welcome_personalization_confirm")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: Math.min(screenWidth - 40, 380),
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalGradient: {
    padding: 32,
    backgroundColor: "rgba(44, 44, 46, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(78, 205, 196, 0.2)",
  },
  iconContainer: {
    alignSelf: "center",
    marginBottom: 20,
  },
  iconGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    marginBottom: 12,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 32,
  },
  inputGradient: {
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(78, 205, 196, 0.3)",
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "white",
    height: 48,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 16,
  },
  skipButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.7)",
  },
  confirmButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  confirmIcon: {
    marginRight: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
