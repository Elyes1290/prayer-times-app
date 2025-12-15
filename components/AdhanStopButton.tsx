import React from "react";
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAdhanAudio } from "../contexts/AdhanAudioContext";

/**
 * Bouton flottant pour arrêter l'Adhan en cours de lecture
 * Visible uniquement sur iOS quand un Adhan est en cours de lecture
 */
export const AdhanStopButton: React.FC = () => {
  const { state, stopAdhan } = useAdhanAudio();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Animation d'apparition/disparition
  React.useEffect(() => {
    if (Platform.OS !== "ios") return;

    Animated.timing(fadeAnim, {
      toValue: state.isPlaying ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [state.isPlaying, fadeAnim]);

  // Ne rien afficher si pas iOS ou pas en lecture
  if (Platform.OS !== "ios" || !state.isPlaying) {
    return null;
  }

  const handleStop = async () => {
    try {
      await stopAdhan();
      console.log("✅ [AdhanStopButton] Adhan arrêté par l'utilisateur");
    } catch (error) {
      console.error("❌ [AdhanStopButton] Erreur arrêt Adhan:", error);
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            {
              scale: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
        },
      ]}
      pointerEvents={state.isPlaying ? "auto" : "none"}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={handleStop}
        activeOpacity={0.8}
        testID="adhan-stop-button"
      >
        <MaterialCommunityIcons name="stop" size={24} color="#fff" />
      </TouchableOpacity>
      {state.prayer && (
        <View style={styles.labelContainer}>
          <View style={styles.label}>
            <MaterialCommunityIcons name="mosque" size={12} color="#fff" />
            <Animated.Text style={styles.labelText} numberOfLines={1}>
              {state.prayer}
            </Animated.Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    right: 20,
    zIndex: 9999,
    elevation: 9999,
    alignItems: "center",
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF6B6B",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: "#fff",
  },
  labelContainer: {
    marginTop: 8,
    alignItems: "center",
  },
  label: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  labelText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 120,
  },
});
