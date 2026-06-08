import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  StatusBar,
  Keyboard,
  Platform,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { LinearGradient } from "@/components/ui/LinearGradientView";
import { useTranslation } from "react-i18next";

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
  const { width: screenWidth } = useWindowDimensions();
  const [firstName, setFirstName] = useState("");
  const keyboardOffset = useSharedValue(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (e: { endCoordinates: { height: number } }) => {
        const keyboardHeight = e.endCoordinates.height;
        const offset =
          Platform.OS === "ios" ? -keyboardHeight / 2 : -keyboardHeight / 3;
        keyboardOffset.value = withTiming(offset, { duration: 250 });
      }
    );

    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      keyboardOffset.value = withTiming(0, { duration: 250 });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardOffset]);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: keyboardOffset.value }],
  }));

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
            modalAnimatedStyle,
            { width: Math.min(screenWidth - 40, 380) },
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
                <MCIcon
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
                <MCIcon
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
              <Pressable
                style={styles.skipButton}
                onPress={handleSkip}
              >
                <Text style={styles.skipButtonText}>
                  {t("welcome_personalization_skip")}
                </Text>
              </Pressable>

              {/* Bouton Confirmer */}
              <Pressable
                style={styles.confirmButton}
                onPress={handleConfirm}
              >
                <LinearGradient
                  colors={["#4ECDC4", "#2C7A7A"]}
                  style={styles.confirmGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MCIcon
                    name="check"
                    size={20}
                    color="white"
                    style={styles.confirmIcon}
                  />
                  <Text style={styles.confirmButtonText}>
                    {t("welcome_personalization_confirm")}
                  </Text>
                </LinearGradient>
              </Pressable>
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
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: "0px 10px 20px rgba(78,205,196,0.3)",
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
    boxShadow: "0px 0px 10px rgba(78,205,196,0.5)",
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
    boxShadow: "0px 4px 8px rgba(78,205,196,0.3)",
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
