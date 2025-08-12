import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Platform, View, StyleSheet, Animated } from "react-native";
import { SettingsProvider } from "../contexts/SettingsContext";
import { FavoritesProvider, useFavorites } from "../contexts/FavoritesContext";
import { PremiumProvider, usePremium } from "../contexts/PremiumContext";
import { BackupProvider } from "../contexts/BackupContext";
import "../locales/i18n-optimized";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cleanupObsoleteUserData } from "../utils/userAuth";
import { showGlobalToast, ToastProvider } from "../contexts/ToastContext";
import i18n from "../locales/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearUserStatsCache } from "../utils/clearAppData";
import apiClient from "../utils/apiClient";

type IconName =
  | "home"
  | "clock-time-four"
  | "compass"
  | "book-open-variant"
  | "book-multiple"
  | "hand-heart"
  | "star-circle"
  | "calendar"
  | "cog"
  | "information"
  | "counter"
  | "mosque"
  | "heart-multiple"
  | "chart-bar";

interface TabBarIconProps {
  icon: IconName;
  color: string;
  size: number;
  focused: boolean;
}

const TabBarIcon = ({ icon, color, size, focused }: TabBarIconProps) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.2 : 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [focused, scale]);

  return (
    <Animated.View
      style={{
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        transform: [{ scale }],
      }}
    >
      <MaterialCommunityIcons
        name={icon}
        size={size}
        color={focused ? "#ffd700" : "rgba(255,255,255,0.6)"}
      />
      {focused && (
        <View
          style={{
            position: "absolute",
            bottom: -5,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#ffd700",
          }}
        />
      )}
    </Animated.View>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { forceLogout } = usePremium();
  const { forceReset } = useFavorites();
  const [forceRefresh, setForceRefresh] = React.useState(0);

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync("#191d2b");
      NavigationBar.setButtonStyleAsync("light");
      NavigationBar.setBehaviorAsync("overlay-swipe");
    }
  }, []);

  // 🚀 NOUVEAU : Nettoyer les données obsolètes une seule fois au démarrage
  const initializationRef = React.useRef(false);

  useEffect(() => {
    if (initializationRef.current) return; // Éviter les initialisations multiples

    const initializeApp = async () => {
      try {
        console.log("🧹 Nettoyage des données obsolètes au démarrage...");
        await cleanupObsoleteUserData();

        // 🧪 DEBUG: Forcer le rafraîchissement du cache des statistiques
        await clearUserStatsCache();
        console.log("🔄 Cache des statistiques supprimé pour force refresh");

        // 🔐 Vérification anti-multi-appareils au démarrage (centralisée)
        try {
          const token = await AsyncStorage.getItem("auth_token");
          if (token) {
            const verify = await apiClient.verifyAuth();
            console.log(
              "🔐 Vérification token au démarrage (verifyAuth):",
              verify?.success
            );
            if (!verify?.success) {
              console.log("❌ Token invalide détecté, déconnexion...");
              await AsyncStorage.multiRemove([
                "auth_token",
                "refresh_token",
                "user_data",
                "explicit_connection",
                "@prayer_app_premium_user",
                "user_stats_cache",
              ]);
              console.log("✅ Données utilisateur supprimées");

              // Forcer la mise à jour des contextes React
              await forceLogout();
              await forceReset();

              // Forcer un re-render de tous les composants
              setForceRefresh((prev) => prev + 1);

              showGlobalToast({
                type: "error",
                title:
                  i18n.t("toasts.connection_interrupted") ||
                  "Connexion interrompue",
                message:
                  i18n.t("toasts.single_device_only") ||
                  "Non autorisé. Veuillez vous connecter sur un seul appareil.",
              });
            } else {
              console.log("✅ Token valide au démarrage");
            }
          }
        } catch (error) {
          console.error("❌ Erreur vérification token:", error);
        }

        console.log("✅ Application initialisée");
        initializationRef.current = true;
      } catch (error) {
        console.error("❌ Erreur lors de l'initialisation:", error);
      }
    };

    initializeApp();
  }, []); // Dépendances vides = exécution unique au montage

  // 🔄 Forcer la mise à jour des contextes quand forceRefresh change
  useEffect(() => {
    if (forceRefresh > 0) {
      console.log("🔄 Force refresh déclenché:", forceRefresh);
      // Les contextes se mettront à jour automatiquement via leurs propres useEffect
    }
  }, [forceRefresh]);

  return (
    <SettingsProvider>
      <ToastProvider>
        <PremiumProvider>
          <FavoritesProvider>
            <BackupProvider>
              <StatusBar
                style="light"
                translucent
                backgroundColor="transparent"
              />
              <Tabs
                screenOptions={{
                  headerShown: false,
                  tabBarStyle: {
                    position: "absolute",
                    bottom: Math.max(insets.bottom, 20),
                    left: 5,
                    right: 5,
                    height: 70,
                    borderRadius: 35,
                    backgroundColor: "rgba(25, 29, 43, 0.95)",
                    borderTopWidth: 0,
                    elevation: 8,
                    shadowColor: "#000",
                    shadowOffset: {
                      width: 0,
                      height: 4,
                    },
                    shadowOpacity: 0.5,
                    shadowRadius: 12,
                    paddingBottom: 0,
                    borderWidth: 1,
                    borderColor: "rgba(255, 215, 0, 0.2)",
                    backdropFilter: "blur(10px)",
                  },
                  tabBarItemStyle: {
                    height: 70,
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 70,
                  },
                  tabBarActiveTintColor: "#ffd700",
                  tabBarInactiveTintColor: "rgba(255,255,255,0.6)",
                  tabBarShowLabel: false,
                }}
              >
                <Tabs.Screen
                  name="index"
                  options={{
                    tabBarIcon: ({ color, size, focused }) => (
                      <TabBarIcon
                        icon="home"
                        color={color}
                        size={size}
                        focused={focused}
                      />
                    ),
                  }}
                />
                <Tabs.Screen
                  name="prayerScreen"
                  options={{
                    tabBarIcon: ({ color, size, focused }) => (
                      <TabBarIcon
                        icon="clock-time-four"
                        color={color}
                        size={size}
                        focused={focused}
                      />
                    ),
                  }}
                />
                <Tabs.Screen
                  name="qibla"
                  options={{
                    tabBarIcon: ({ color, size, focused }) => (
                      <TabBarIcon
                        icon="compass"
                        color={color}
                        size={size}
                        focused={focused}
                      />
                    ),
                  }}
                />
                <Tabs.Screen
                  name="mosques"
                  options={{
                    tabBarIcon: ({ color, size, focused }) => (
                      <TabBarIcon
                        icon="mosque"
                        color={color}
                        size={size}
                        focused={focused}
                      />
                    ),
                  }}
                />
                <Tabs.Screen
                  name="tasbih"
                  options={{
                    tabBarIcon: ({ color, size, focused }) => (
                      <TabBarIcon
                        icon="counter"
                        color={color}
                        size={size}
                        focused={focused}
                      />
                    ),
                  }}
                />
                <Tabs.Screen
                  name="quran"
                  options={{
                    tabBarIcon: ({ color, size, focused }) => (
                      <TabBarIcon
                        icon="book-open-variant"
                        color={color}
                        size={size}
                        focused={focused}
                      />
                    ),
                  }}
                />
                <Tabs.Screen
                  name="hadith"
                  options={{
                    tabBarIcon: ({ color, size, focused }) => (
                      <TabBarIcon
                        icon="book-multiple"
                        color={color}
                        size={size}
                        focused={focused}
                      />
                    ),
                  }}
                />
                <Tabs.Screen
                  name="dhikr"
                  options={{
                    tabBarIcon: ({ color, size, focused }) => (
                      <TabBarIcon
                        icon="hand-heart"
                        color={color}
                        size={size}
                        focused={focused}
                      />
                    ),
                  }}
                />
                <Tabs.Screen
                  name="asmaulhusna"
                  options={{
                    tabBarIcon: ({ color, size, focused }) => (
                      <TabBarIcon
                        icon="star-circle"
                        color={color}
                        size={size}
                        focused={focused}
                      />
                    ),
                  }}
                />
                <Tabs.Screen
                  name="hijri"
                  options={{
                    tabBarIcon: ({ color, size, focused }) => (
                      <TabBarIcon
                        icon="calendar"
                        color={color}
                        size={size}
                        focused={focused}
                      />
                    ),
                  }}
                />
                <Tabs.Screen
                  name="prayerStatsPremium"
                  options={{
                    tabBarIcon: ({ color, size, focused }) => (
                      <TabBarIcon
                        icon="chart-bar"
                        color={color}
                        size={size}
                        focused={focused}
                      />
                    ),
                  }}
                />
                <Tabs.Screen
                  name="settings"
                  options={{
                    tabBarIcon: ({ color, size, focused }) => (
                      <TabBarIcon
                        icon="cog"
                        color={color}
                        size={size}
                        focused={focused}
                      />
                    ),
                  }}
                />
                <Tabs.Screen
                  name="about"
                  options={{
                    tabBarIcon: ({ color, size, focused }) => (
                      <TabBarIcon
                        icon="information"
                        color={color}
                        size={size}
                        focused={focused}
                      />
                    ),
                  }}
                />
                {/* Écran favoris accessible par navigation (pas visible dans la tab bar) */}
                <Tabs.Screen
                  name="favorites"
                  options={{
                    href: null, // Cache l'onglet de la navigation
                  }}
                />
                {/* Écran de paiement premium accessible par navigation (pas visible dans la tab bar) */}
                <Tabs.Screen
                  name="premium-payment"
                  options={{
                    href: null, // Cache l'onglet de la navigation
                  }}
                />
                {/* Pages de résultat de paiement accessibles par deep links (pas visible dans la tab bar) */}
                <Tabs.Screen
                  name="payment-success"
                  options={{
                    href: null, // Cache l'onglet de la navigation
                  }}
                />
                <Tabs.Screen
                  name="payment-cancel"
                  options={{
                    href: null, // Cache l'onglet de la navigation
                  }}
                />
                {/* Écran de suppression de données accessible par navigation (pas visible dans la tab bar) */}
                <Tabs.Screen
                  name="data-deletion"
                  options={{
                    href: null, // Cache l'onglet de la navigation
                  }}
                />
              </Tabs>
            </BackupProvider>
          </FavoritesProvider>
        </PremiumProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    width: 50,
    height: 50,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
  },
  tabIconGradient: {
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
  },
  tabIconGradientActive: {
    shadowColor: "#ffd700",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
});
