import React, { createContext, useContext, useState, ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import Toast from "../components/Toast";
import type { ToastData } from "../components/Toast";

// ✅ Pont global facultatif pour déclencher un toast en dehors de React (ex: utils)
let globalShowToast: ((toast: Omit<ToastData, "id">) => void) | null = null;
export const showGlobalToast = (toast: Omit<ToastData, "id">) => {
  try {
    if (globalShowToast) globalShowToast(toast);
  } catch {}
};

interface ToastContextType {
  showToast: (toast: Omit<ToastData, "id">) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = (toastData: Omit<ToastData, "id">) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastData = {
      ...toastData,
      id,
    };

    setToasts((prev) => [newToast, ...prev]);
  };

  const hideToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Rendre le showToast disponible globalement
  React.useEffect(() => {
    globalShowToast = showToast;
    return () => {
      globalShowToast = null;
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <View style={styles.toastContainer}>
        {toasts.map((toast, index) => (
          <Toast key={toast.id} toast={toast} onHide={hideToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999999, // 🚀 CORRECTION : Encore plus élevé pour être sûr
    elevation: 999999, // 🚀 CORRECTION : Pour Android
    pointerEvents: "box-none", // Permet aux clics de passer à travers quand vide
  },
});

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
