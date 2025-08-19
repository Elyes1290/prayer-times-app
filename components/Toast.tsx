import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export interface ToastData {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onHide: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onHide }) => {
  const [visible, setVisible] = useState(true);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Créer les animations avec useMemo pour éviter les recréations
  const animations = useMemo(
    () => ({
      enter: Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      exit: Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const hideToast = React.useCallback(() => {
    animations.exit.start(() => {
      setVisible(false);
      onHide(toast.id);
    });
  }, [animations.exit, onHide, toast.id]);

  useEffect(() => {
    // Animation d'entrée
    animations.enter.start();

    // Auto-hide après la durée spécifiée
    const timer = setTimeout(() => {
      hideToast();
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast.duration, hideToast, animations.enter]);

  const getToastConfig = () => {
    switch (toast.type) {
      case "success":
        return {
          icon: "check-circle" as const,
          colors: ["#4CAF50", "#2E7D32"] as const,
          iconColor: "#fff",
        };
      case "error":
        return {
          icon: "alert-circle" as const,
          colors: ["#f44336", "#c62828"] as const,
          iconColor: "#fff",
        };
      case "info":
      default:
        return {
          icon: "information" as const,
          colors: ["#2196F3", "#1565C0"] as const,
          iconColor: "#fff",
        };
    }
  };

  const config = getToastConfig();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      testID="toast-container"
    >
      <TouchableOpacity activeOpacity={0.9} onPress={hideToast}>
        <LinearGradient
          colors={config.colors}
          style={styles.toast}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          testID="toast-gradient"
        >
          <View style={styles.content} testID="toast-content">
            <MaterialCommunityIcons
              name={config.icon}
              size={24}
              color={config.iconColor}
              style={styles.icon}
              testID="toast-icon"
            />
            <View style={styles.textContainer}>
              <Text style={styles.title}>{toast.title}</Text>
              {toast.message && (
                <Text style={styles.message}>{toast.message}</Text>
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 999999, // 🚀 CORRECTION : Encore plus élevé pour être sûr
    elevation: 999999, // 🚀 CORRECTION : Pour Android
  },
  toast: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 18,
  },
});

export default Toast;
