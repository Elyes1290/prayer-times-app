import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Platform, View, Animated } from "react-native";
import { SettingsProvider } from "../contexts/SettingsContext";
import { FavoritesProvider, useFavorites } from "../contexts/FavoritesContext";
import { PremiumProvider, usePremium } from "../contexts/PremiumContext";
import { BackupProvider } from "../contexts/BackupContext";
import "../locales/i18n-optimized";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cleanupObsoleteUserData } from "../utils/userAuth";
import { clearUserStatsCache } from "../utils/clearAppData";
import { showGlobalToast, ToastProvider } from "../contexts/ToastContext";
import i18n from "../locales/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { verifyAuth } from "../utils/apiClient";
import { isOfflineMode } from "../utils/networkUtils";

// 🚨 NOUVEAU : Protection contre les reloads Expo en mode développement
let isAbonnementProcessActive = false;
let reloadProtectionTimeout: ReturnType<typeof setTimeout> | null = null;

// Fonction pour activer la protection contre les reloads
const activateReloadProtection = () => {
  isAbonnementProcessActive = true;
  console.log("🛡️ Protection contre les reloads Expo activée");

  // Désactiver la protection après 5 minutes (temps max pour un abonnement)
  if (reloadProtectionTimeout) {
    clearTimeout(reloadProtectionTimeout);
  }
  reloadProtectionTimeout = setTimeout(() => {
    isAbonnementProcessActive = false;
    console.log("🛡️ Protection contre les reloads Expo désactivée (timeout)");
  }, 5 * 60 * 1000); // 5 minutes
};

// Fonction pour désactiver la protection
const deactivateReloadProtection = () => {
  isAbonnementProcessActive = false;
  if (reloadProtectionTimeout) {
    clearTimeout(reloadProtectionTimeout);
    reloadProtectionTimeout = null;
  }
  console.log("🛡️ Protection contre les reloads Expo désactivée");
};

// Vérifier périodiquement si la protection doit être activée
setInterval(async () => {
  try {
    const pendingRegistration = await AsyncStorage.getItem(
      "pending_registration"
    );
    if (pendingRegistration && !isAbonnementProcessActive) {
      activateReloadProtection();
    } else if (!pendingRegistration && isAbonnementProcessActive) {
      deactivateReloadProtection();
    }
  } catch (error) {
    console.error("❌ Erreur vérification protection reload:", error);
  }
}, 1000);

// 🚨 NOUVEAU : Intercepter les reloads Expo en mode développement
if (__DEV__) {
  const originalReload = (global as any).reload;
  if (originalReload) {
    (global as any).reload = () => {
      if (isAbonnementProcessActive) {
        console.log("🛡️ Reload Expo bloqué - processus d'abonnement en cours");
        return; // Bloquer le reload
      }
      console.log("🔄 Reload Expo autorisé");
      originalReload();
    };
  }
}

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
  | "chart-bar"
  | "account-heart"
  | "calendar-heart";

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

        // 🚀 CORRECTION : Nettoyer les données incohérentes
        const explicitConnection = await AsyncStorage.getItem(
          "explicit_connection"
        );
        const userData = await AsyncStorage.getItem("user_data");

        if (explicitConnection === "true" && !userData) {
          console.log(
            "🧹 Nettoyage des données incohérentes - explicit_connection=true mais pas de user_data"
          );
          await AsyncStorage.multiRemove([
            "auth_token",
            "refresh_token",
            "user_data",
            "explicit_connection",
            "@prayer_app_premium_user",
            "user_stats_cache",
          ]);
        }

        // 🧪 DEBUG: Forcer le rafraîchissement du cache des statistiques
        await clearUserStatsCache();
        console.log("🔄 Cache des statistiques supprimé pour force refresh");

        // 🔐 Vérification anti-multi-appareils au démarrage (centralisée)
        // 🚨 CORRECTION : Éviter cette vérification si l'utilisateur est en train de choisir un abonnement
        try {
          const pendingRegistration = await AsyncStorage.getItem(
            "pending_registration"
          );
          if (pendingRegistration) {
            console.log(
              "⏸️ Initialisation différée - processus d'abonnement en cours"
            );
            return; // Ne pas vérifier le token si l'utilisateur choisit un abonnement
          }

          const token = await AsyncStorage.getItem("auth_token");
          const explicitConnection = await AsyncStorage.getItem(
            "explicit_connection"
          );

          // 🚀 CORRECTION : Ne vérifier le token que si l'utilisateur est explicitement connecté ET a des données valides
          if (token && explicitConnection === "true") {
            // Vérifier aussi que user_data existe et est valide
            const userData = await AsyncStorage.getItem("user_data");
            if (!userData) {
              console.log(
                "🧹 Nettoyage - explicit_connection=true mais pas de user_data"
              );
              await AsyncStorage.multiRemove([
                "auth_token",
                "refresh_token",
                "user_data",
                "explicit_connection",
                "@prayer_app_premium_user",
                "user_stats_cache",
              ]);
              return;
            }

            // 🌐 NOUVEAU : Vérifier la connectivité avant d'appeler l'API
            const isOffline = await isOfflineMode();
            if (isOffline) {
              console.log(
                "🌐 [OFFLINE] Mode offline détecté - token considéré comme valide"
              );
              console.log("✅ Token valide au démarrage (mode offline)");
            } else {
              console.log(
                "🔐 Vérification token au démarrage - utilisateur connecté"
              );
              const verify = await verifyAuth();
              console.log(
                "🔐 Vérification token au démarrage (verifyAuth):",
                verify
              );
              if (!verify) {
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
                    i18n.t("toast_connection_interrupted") ||
                    "Connexion interrompue",
                  message:
                    i18n.t("toast_single_device_only") ||
                    "Non autorisé. Veuillez vous connecter sur un seul appareil.",
                });
              } else {
                console.log("✅ Token valide au démarrage");
              }
            }
          } else if (token && explicitConnection !== "true") {
            // 🚀 CORRECTION : Nettoyer les tokens orphelins (sans connexion explicite)
            console.log(
              "🧹 Nettoyage des tokens orphelins - pas de connexion explicite"
            );
            await AsyncStorage.multiRemove([
              "auth_token",
              "refresh_token",
              "user_data",
              "@prayer_app_premium_user",
              "user_stats_cache",
            ]);
          } else {
            console.log(
              "🔍 Aucun token ou utilisateur non connecté - pas de vérification API"
            );
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
  }, [forceLogout, forceReset]); // Inclure les dépendances manquantes

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
                {/* 📚 NOUVEAUX ÉCRANS : Histoires du Prophète (PBUH) */}
                <Tabs.Screen
                  name="prophet-stories"
                  options={{
                    href: null, // Cache l'onglet de la navigation
                  }}
                />
                <Tabs.Screen
                  name="story-reader"
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
