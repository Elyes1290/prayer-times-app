import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { LinearGradient } from "@/components/ui/LinearGradientView";

import { Z_INDEX } from "../constants/zIndex";

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
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const finishHide = useCallback(() => {
    setVisible(false);
    onHide(toast.id);
  }, [onHide, toast.id]);

  const hideToast = useCallback(() => {
    translateY.value = withTiming(-100, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(finishHide)();
      }
    });
  }, [finishHide, opacity, translateY]);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 300 });
    opacity.value = withTiming(1, { duration: 300 });

    const timer = setTimeout(() => {
      hideToast();
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast.duration, hideToast, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

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
      style={[styles.container, animatedStyle]}
      testID="toast-container"
    >
      <Pressable onPress={hideToast}>
        <LinearGradient
          colors={config.colors}
          style={styles.toast}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          testID="toast-gradient"
        >
          <View style={styles.content} testID="toast-content">
            <MCIcon
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
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 999999,
  },
  toast: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    boxShadow: "0px 4px 8px rgba(0,0,0,0.3)",
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
