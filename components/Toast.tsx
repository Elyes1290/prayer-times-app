import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth } = Dimensions.get("window");

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

  useEffect(() => {
    // Animation d'entrée
    Animated.parallel([
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
    ]).start();

    // Auto-hide après la durée spécifiée
    const timer = setTimeout(() => {
      hideToast();
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, []);

  const hideToast = () => {
    Animated.parallel([
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
    ]).start(() => {
      setVisible(false);
      onHide(toast.id);
    });
  };

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
    >
      <TouchableOpacity activeOpacity={0.9} onPress={hideToast}>
        <LinearGradient
          colors={config.colors}
          style={styles.toast}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.content}>
            <MaterialCommunityIcons
              name={config.icon}
              size={24}
              color={config.iconColor}
              style={styles.icon}
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
    zIndex: 9999,
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
