import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import * as Notifications from "expo-notifications";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import {
  Platform,
  View,
  Animated,
  NativeModules,
  NativeEventEmitter,
  AppState,
  StatusBar,
} from "react-native";
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
import { registerBackgroundFetchAsync } from "../utils/backgroundTask";
import { setupIosSoundsForNotifications } from "../utils/iosSoundsSetup";
import {
  AdhanAudioProvider,
  useAdhanAudio,
} from "../contexts/AdhanAudioContext";
import { AdhanStopButton } from "../components/AdhanStopButton";
import { useThemeColors } from "../hooks/useThemeColor"; // 🎨 Pour la TabBar adaptative

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
  | "bookshelf"
  | "dots-grid"
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
  | "calendar-heart"
  | "bug";

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
        color={color}  // 🎨 Utilise directement la couleur passée en prop (déjà thématique)
      />
      {focused && (
        <View
          style={{
            position: "absolute",
            bottom: -5,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: color,  // 🎨 Utilise la même couleur que l'icône
          }}
        />
      )}
    </Animated.View>
  );
};

// 🎵 Composant interne qui utilise le contexte AdhanAudio
function TabLayoutContent() {
  const insets = useSafeAreaInsets();
  const { forceLogout } = usePremium();
  const { forceReset } = useFavorites();
  const [forceRefresh, setForceRefresh] = React.useState(0);
  
  // 🎨 NOUVEAU : Utiliser les couleurs thématiques pour la TabBar
  const themeColors = useThemeColors();

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync("#191d2b");
      NavigationBar.setButtonStyleAsync("light");
      NavigationBar.setBehaviorAsync("overlay-swipe");
    }
  }, []);

  // 🎵 NOUVEAU : Écouter les clics sur notifications d'Adhan pour jouer le son complet
  // Utilise le module natif AVAudioPlayer sur iOS
  const { playAdhan, state: adhanState } = useAdhanAudio();

  // 🔍 DEBUG : Vérifier que playAdhan est disponible
  console.log("🔍 [_layout] playAdhan disponible:", typeof playAdhan);

  // Mémoriser le traitement de la dernière notification (cold start / resume)
  const handledLastResponseRef = React.useRef(false);
  const appState = React.useRef(AppState.currentState);
  const isAdhanPlayingRef = React.useRef(false);
  const lastHandledNotificationIdRef = React.useRef<string | null>(null);

  // Suivre l'état de lecture pour éviter les relances
  useEffect(() => {
    isAdhanPlayingRef.current = !!adhanState?.isPlaying;
  }, [adhanState?.isPlaying]);

  // 🎯 Gestion du cas où l'app est ouverte par clic sur notification (y compris cold start)
  useEffect(() => {
    if (Platform.OS !== "ios") return; // Seulement pour iOS

    console.log("═══════════════════════════════════════════");
    console.log("🎵 [_layout] Listener de notifications ACTIVÉ");
    console.log("═══════════════════════════════════════════");

    // 🎵 NOUVEAU : Écouter l'événement natif quand une notification d'Adhan arrive en foreground
    // Cela permet de lancer le MP3 complet automatiquement car iOS arrête le .caf quand la notification disparaît
    let nativeEventSubscription: any = null;
    try {
      const { AdhanAudioPlayer } = NativeModules;
      if (AdhanAudioPlayer) {
        const eventEmitter = new NativeEventEmitter(AdhanAudioPlayer);
        nativeEventSubscription = eventEmitter.addListener(
          "AdhanNotificationReceived",
          async (event: { soundName: string; prayer: string }) => {
            try {
              console.log("═══════════════════════════════════════════");
              console.log(
                "🔔 [_layout] ÉVÉNEMENT NATIF: Notification Adhan reçue en foreground"
              );
              console.log(`🎵 Son: ${event.soundName}`);
              console.log(`🕌 Prière: ${event.prayer}`);
              console.log(
                "💡 Lancement du MP3 complet pour continuer après le .caf..."
              );
              console.log("═══════════════════════════════════════════");

              await playAdhan(event.soundName, event.prayer);

              showGlobalToast({
                type: "info",
                title: `🕌 ${event.prayer}`,
                message: "Adhan complet en lecture",
                duration: 3000,
              });
            } catch (error: any) {
              console.error(
                "❌ [_layout] Erreur lors de la lecture automatique:",
                error
              );
            }
          }
        );
        console.log(
          "✅ [_layout] Listener natif AdhanNotificationReceived configuré"
        );
      }
    } catch (error) {
      console.warn(
        "⚠️ [_layout] Impossible de configurer le listener natif:",
        error
      );
    }

    // Factorisé: traitement d'une réponse de notification (clic)
    const handleNotificationResponse = async (
      response: Notifications.NotificationResponse
    ) => {
      try {
        console.log("═══════════════════════════════════════════");
        console.log("🔔 [_layout] NOTIFICATION CLIQUÉE !");
        console.log("═══════════════════════════════════════════");

        const notifId = response.notification.request.identifier;
        // Éviter de retraiter la même notification (utile après un stop + reprise)
        if (notifId && lastHandledNotificationIdRef.current === notifId) {
          console.log(
            "⏸️ [_layout] Notification déjà traitée, pas de relance:",
            notifId
          );
          console.log("═══════════════════════════════════════════");
          return;
        }

        const data = response.notification.request.content.data;
        console.log("📦 [_layout] Données de la notification:");
        console.log(JSON.stringify(data, null, 2));

        // Vérifier si c'est une notification d'Adhan
        if (data.type === "adhan" && data.soundName) {
          console.log("✅ [_layout] Type: adhan confirmé");

          const soundName = data.soundName as string;
          const prayer = data.prayer as string;

          console.log(`🎵 [_layout] Son à jouer: ${soundName}`);
          console.log(`🕌 [_layout] Prière: ${prayer}`);

          // ⚠️ Ne pas relancer si déjà en cours
          if (isAdhanPlayingRef.current) {
            console.log(
              "⏸️ [_layout] Lecture déjà en cours, pas de relance de l'Adhan complet"
            );
            console.log("═══════════════════════════════════════════");
            return;
          }

          console.log(
            `🎵 [_layout] Lancement lecture avec AdhanAudioPlayer (AVAudioPlayer natif)...`
          );

          // Jouer l'Adhan avec le module natif iOS
          await playAdhan(soundName, prayer);
          console.log(
            `✅ [_layout] AdhanAudioPlayer.playAdhan() appelé avec succès`
          );
          console.log(`🎶 [_layout] Adhan complet en cours de lecture`);

          // Marquer cette notification comme traitée
          if (notifId) {
            lastHandledNotificationIdRef.current = notifId;
          }

          // Afficher un toast
          showGlobalToast({
            type: "info",
            title: `🕌 ${prayer}`,
            message: "Adhan complet en lecture",
            duration: 3000,
          });

          console.log("═══════════════════════════════════════════");
        } else if (data.type === "adhan") {
          console.error("❌ [_layout] soundName manquant dans les données !");
        } else {
          console.log(
            `ℹ️ [_layout] Type de notification: ${data.type} (pas un adhan)`
          );
        }
      } catch (error: any) {
        console.error("═══════════════════════════════════════════");
        console.error("❌ [_layout] ERREUR lors de la lecture de l'Adhan:");
        console.error(`   Message: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
        console.error("═══════════════════════════════════════════");

        showGlobalToast({
          type: "error",
          title: "Erreur",
          message: `Impossible de jouer l'Adhan: ${error.message}`,
          duration: 3000,
        });
      }
    };

    // Listener clic temps réel
    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    // 🔁 Rattraper le cas cold start / app en arrière-plan : traiter la dernière réponse si elle existe
    Notifications.getLastNotificationResponseAsync()
      .then((lastResponse) => {
        if (lastResponse && !handledLastResponseRef.current) {
          handledLastResponseRef.current = true;
          console.log(
            "🔁 [_layout] Traitement lastNotificationResponse (cold start / background)"
          );
          handleNotificationResponse(lastResponse);
        }
      })
      .catch((err) => {
        console.warn(
          "⚠️ [_layout] Impossible de récupérer lastNotificationResponse:",
          err
        );
      });

    // 🔁 Re-check quand l'app revient en foreground (cas app en arrière-plan)
    const appStateListener = AppState.addEventListener(
      "change",
      (nextState) => {
        const wasBackground = appState.current.match(/background/);
        appState.current = nextState;
        if (wasBackground && nextState === "active") {
          Notifications.getLastNotificationResponseAsync()
            .then((lastResponse) => {
              if (lastResponse) {
                console.log(
                  "🔁 [_layout] App reprise (background→active), tentative de traitement lastResponse"
                );
                handleNotificationResponse(lastResponse);
              }
            })
            .catch((err) => {
              console.warn(
                "⚠️ [_layout] Erreur getLastNotificationResponse (resume):",
                err
              );
            });
        }
      }
    );

    return () => {
      console.log("🔴 [_layout] Listener de notifications DÉSACTIVÉ");
      subscription.remove();
      if (nativeEventSubscription) {
        nativeEventSubscription.remove();
      }
      appStateListener.remove();
    };
  }, [playAdhan]);

  // 🚀 NOUVEAU : Nettoyer les données obsolètes une seule fois au démarrage
  const initializationRef = React.useRef(false);

  useEffect(() => {
    if (initializationRef.current) return; // Éviter les initialisations multiples

    const initializeApp = async () => {
      try {
        console.log("🧹 Nettoyage des données obsolètes au démarrage...");
        await cleanupObsoleteUserData();

        // 🎵 NOUVEAU : Configuration des sons pour les notifications iOS
        if (Platform.OS === "ios") {
          console.log(
            "═══════════════════════════════════════════════════════════"
          );
          console.log("🎵 [_layout] Démarrage configuration sons iOS...");
          console.log(
            "═══════════════════════════════════════════════════════════"
          );
          setupIosSoundsForNotifications()
            .then(() => {
              console.log(
                "✅ [_layout] Configuration sons iOS terminée avec succès"
              );
            })
            .catch((error) => {
              console.error(
                "❌ [_layout] Erreur configuration sons iOS:",
                error
              );
              console.error("❌ [_layout] Stack:", error?.stack);
            });
        }

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

        // 🍎 Configuration spécifique iOS : Background Fetch pour notifications illimitées
        if (Platform.OS === "ios") {
          console.log("🔔 [iOS] Configuration des notifications locales...");
          console.log(
            "🔄 [iOS] Activation du Background Fetch pour reprogrammation automatique..."
          );
          await registerBackgroundFetchAsync();
          console.log(
            "✅ [iOS] Background Fetch activé - notifications illimitées même app fermée"
          );

          // 🔍 Activer le délégué de notifications pour debug détaillé
          try {
            NativeModules.AdhanModule?.setupNotificationDelegate();
            console.log(
              "✅ [iOS] Délégué de notifications activé - logs détaillés disponibles"
            );
          } catch (error) {
            console.warn(
              "⚠️ [iOS] Erreur activation délégué notifications:",
              error
            );
          }
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
    <>
      <StatusBar
        barStyle="light-content"
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
            backgroundColor: themeColors.tabBar || "rgba(25, 29, 43, 0.95)",  // 🎨 Thématique
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
            borderColor: themeColors.border || "rgba(255, 215, 0, 0.2)",  // 🎨 Thématique
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
          tabBarActiveTintColor: themeColors.tabBarActive || "#ffd700",  // 🎨 Thématique
          tabBarInactiveTintColor: themeColors.tabBarInactive || "rgba(255,255,255,0.6)",  // 🎨 Thématique
          tabBarShowLabel: false,
        }}
      >
        {/* ═══════════════════════════════════════════════════ */}
        {/* 🎯 ONGLETS VISIBLES DANS LA TABBAR (5 principaux) */}
        {/* ═══════════════════════════════════════════════════ */}
        
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
          name="library"
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <TabBarIcon
                icon="bookshelf"
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
          name="more"
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <TabBarIcon
                icon="dots-grid"
                color={color}
                size={size}
                focused={focused}
              />
            ),
          }}
        />

        {/* ═══════════════════════════════════════════════════ */}
        {/* 📚 PAGES BIBLIOTHÈQUE (accessibles via /library) */}
        {/* ═══════════════════════════════════════════════════ */}
        
        <Tabs.Screen
          name="quran"
          options={{
            href: null, // Caché de la TabBar
          }}
        />
        <Tabs.Screen
          name="hadith"
          options={{
            href: null, // Caché de la TabBar
          }}
        />
        <Tabs.Screen
          name="dhikr"
          options={{
            href: null, // Caché de la TabBar
          }}
        />
        <Tabs.Screen
          name="asmaulhusna"
          options={{
            href: null, // Caché de la TabBar
          }}
        />

        {/* ═══════════════════════════════════════════════════ */}
        {/* ➕ PAGES "PLUS" (accessibles via /more) */}
        {/* ═══════════════════════════════════════════════════ */}
        
        <Tabs.Screen
          name="mosques"
          options={{
            href: null, // Caché de la TabBar
          }}
        />
        <Tabs.Screen
          name="tasbih"
          options={{
            href: null, // Caché de la TabBar
          }}
        />
        <Tabs.Screen
          name="hijri"
          options={{
            href: null, // Caché de la TabBar
          }}
        />
        <Tabs.Screen
          name="prayerStatsPremium"
          options={{
            href: null, // Caché de la TabBar
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null, // Caché de la TabBar
          }}
        />
        <Tabs.Screen
          name="about"
          options={{
            href: null, // Caché de la TabBar
          }}
        />
        {/* ═══════════════════════════════════════════════════ */}
        {/* 🐛 DEBUG (complètement désactivé) */}
        {/* ═══════════════════════════════════════════════════ */}
        
        <Tabs.Screen
          name="debugNotifications"
          options={{
            href: null, // Complètement caché et désactivé
          }}
        />

        {/* ═══════════════════════════════════════════════════ */}
        {/* 🔒 PAGES CACHÉES (accessibles par navigation) */}
        {/* ═══════════════════════════════════════════════════ */}
        
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
      {/* 🎵 Bouton flottant pour arrêter l'Adhan (iOS uniquement) */}
      <AdhanStopButton />
    </>
  );
}

// 🎵 Composant principal qui enveloppe avec les providers
export default function TabLayout() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <PremiumProvider>
          <FavoritesProvider>
            <BackupProvider>
              <AdhanAudioProvider>
                <TabLayoutContent />
              </AdhanAudioProvider>
            </BackupProvider>
          </FavoritesProvider>
        </PremiumProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}
