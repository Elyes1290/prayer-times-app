import * as Font from "expo-font";
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Dimensions,
  TextInput,
  Alert,
  ScrollView,
  DeviceEventEmitter,
  Animated,
} from "react-native";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  PanGestureHandler,
  State,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import audioManager from "../utils/AudioManager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FavoriteButton from "../components/FavoriteButton";
import { QuranVerseFavorite } from "../contexts/FavoritesContext";
import { usePremium } from "../contexts/PremiumContext";
import { useToast } from "../contexts/ToastContext";
import PremiumContentManager, { PremiumContent } from "../utils/premiumContent";
import { useNativeDownload } from "../hooks/useNativeDownload";
import { DownloadInfo } from "../utils/nativeDownloadManager";
import { Image as ExpoImage } from "expo-image";
import RNFS from "react-native-fs";
import { useQuranWidget } from "../hooks/useQuranWidget";
import { useQuranAudioService } from "../hooks/useQuranAudioService";
import { useNetworkStatus, useOfflineAccess } from "../hooks/useNetworkStatus";
import { OfflineMessage } from "../components/OfflineMessage";
import {
  OfflineNavigationTabs,
  OfflineTabType,
} from "../components/OfflineNavigationTabs";
import QuranOfflineService from "../utils/QuranOfflineService";

// 🚀 NOUVEAU : Composant de jauge de progression
const ProgressBar = ({
  progress,
  onCancel,
}: {
  progress: number;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.downloadProgressContainer}>
      <View style={styles.downloadProgressHeader}>
        <Text style={styles.downloadProgressTitle}>
          {t("download_progress")} {Math.round(progress * 100)}%
        </Text>
        <TouchableOpacity
          testID="download-cancel-button"
          style={styles.downloadProgressCancelButton}
          onPress={onCancel}
        >
          <MaterialCommunityIcons name="close" size={16} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
      <View style={styles.downloadProgressBackground}>
        <View
          style={[styles.downloadProgressFill, { width: `${progress * 100}%` }]}
        />
      </View>
    </View>
  );
};

// 🎵 NOUVEAU : Composant AudioSeekBar amélioré avec contrôle tactile
const AudioSeekBar = ({
  currentPosition,
  totalDuration,
  onSeek,
}: {
  currentPosition: number;
  totalDuration: number;
  onSeek: (position: number) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const [seekBarWidth, setSeekBarWidth] = useState(0);

  const progress = totalDuration > 0 ? currentPosition / totalDuration : 0;
  const displayPosition = isDragging ? dragPosition : currentPosition;
  const displayProgress =
    totalDuration > 0 ? displayPosition / totalDuration : 0;

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const onGestureEvent = (event: any) => {
    const { x } = event.nativeEvent;
    if (isDragging && seekBarWidth > 0) {
      const clampedX = Math.max(0, Math.min(x, seekBarWidth));
      const newProgress = clampedX / seekBarWidth;
      const newPosition = newProgress * totalDuration;
      setDragPosition(newPosition);
    }
  };

  const onHandlerStateChange = (event: any) => {
    const { state, x } = event.nativeEvent;

    if (state === State.BEGAN) {
      setIsDragging(true);
    } else if (state === State.END || state === State.CANCELLED) {
      if (isDragging && seekBarWidth > 0) {
        const clampedX = Math.max(0, Math.min(x, seekBarWidth));
        const newProgress = clampedX / seekBarWidth;
        const newPosition = newProgress * totalDuration;
        onSeek(newPosition);
      }
      setIsDragging(false);
    }
  };

  return (
    <View style={styles.seekBarContainer}>
      <Text
        style={[styles.audioTimeText, isDragging && styles.audioTimeTextActive]}
      >
        {formatTime(displayPosition)}
      </Text>

      <View style={styles.seekBarWrapper}>
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          minDist={0}
        >
          <View
            style={[
              styles.audioProgressBar,
              isDragging && styles.audioProgressBarActive,
            ]}
            onLayout={(event) =>
              setSeekBarWidth(event.nativeEvent.layout.width)
            }
          >
            <View
              style={[
                styles.audioProgressFill,
                {
                  width: `${Math.max(
                    0,
                    Math.min(100, displayProgress * 100)
                  )}%`,
                  backgroundColor: isDragging ? "#FF6B6B" : "#4ECDC4",
                },
              ]}
            />
          </View>
        </PanGestureHandler>

        {/* 🎯 Aperçu de temps pendant le glissement */}
        {isDragging && (
          <View
            style={[
              styles.seekPreview,
              { left: `${Math.max(10, Math.min(75, displayProgress * 100))}%` }, // Ajusté sans curseur
            ]}
          >
            <Text style={styles.seekPreviewText}>
              {formatTime(displayPosition)}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.audioTimeText}>{formatTime(totalDuration)}</Text>
    </View>
  );
};

export default function QuranScreen() {
  const { t, i18n } = useTranslation();
  const { user } = usePremium();
  const { showToast } = useToast();
  const [modalVisible, setModalVisible] = useState(false);
  const [reciterModalVisible, setReciterModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [modalType, setModalType] = useState<"sourate" | "reciter">("sourate");
  const [showDownloadsView, setShowDownloadsView] = useState(false); // 🆕 Vue cachée de gestion des téléchargements
  const flatListRef = useRef<FlatList>(null);
  const windowHeight = Dimensions.get("window").height;

  // 📱 Hook pour obtenir les insets de la barre de statut
  const insets = useSafeAreaInsets();

  // États pour les récitations premium
  const [availableRecitations, setAvailableRecitations] = useState<
    PremiumContent[]
  >([]);
  const [selectedReciter, setSelectedReciter] = useState<string | null>(null);

  // 📱 NOUVEAU : États pour la logique offline
  const networkStatus = useNetworkStatus();
  const offlineAccess = useOfflineAccess(!!user?.isPremium);

  const [activeOfflineTab, setActiveOfflineTab] =
    useState<OfflineTabType>("quran");
  const [offlineSurahs, setOfflineSurahs] = useState<any[]>([]);
  const [loadingOfflineData, setLoadingOfflineData] = useState(false);
  const [scannedQuranFiles, setScannedQuranFiles] = useState<PremiumContent[]>(
    []
  ); // 🆕 Récitations scannées depuis le dossier physique

  // Supprimer les variables non utilisées pour éviter les warnings
  console.log("offlineSurahs:", offlineSurahs.length);
  console.log("loadingOfflineData:", loadingOfflineData);

  // 🎵 NOUVEAU : Lecture en continu (playlist mode)
  const [playlistMode, setPlaylistMode] = useState(false);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const [playlistItems, setPlaylistItems] = useState<PremiumContent[]>([]);

  // 🔧 NOUVEAU : Refs pour éviter les problèmes de closure dans les callbacks
  const playlistModeRef = useRef(false);
  const currentPlaylistIndexRef = useRef(0);
  const playlistItemsRef = useRef<PremiumContent[]>([]);

  // 🎨 NOUVEAU : État pour la section récitateur rétractable
  // const [reciterSectionCollapsed, setReciterSectionCollapsed] = useState(true);
  // 🎨 NOUVEAU : État pour le modal des contrôles audio
  const [audioControlsModalVisible, setAudioControlsModalVisible] =
    useState(false);
  // 🎵 NOUVEAU : État pour forcer l'animation du GIF
  const [gifKey, setGifKey] = useState(0);

  // 👆 NOUVEAU : État pour désactiver la synchronisation automatique (mode navigation app)
  const [isAppNavigation, setIsAppNavigation] = useState(false);
  // 🎯 NOUVEAU : Garder la trace de la dernière sourate du service pour détecter les changements widget
  const [lastServiceSurah, setLastServiceSurah] = useState<string | null>(null);
  // 📝 NOUVEAU : État pour afficher le tooltip navigation
  const [showNavigationTooltip, setShowNavigationTooltip] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  // 🔧 Fonction pour réinitialiser l'animation si nécessaire
  const resetSlideAnimation = useCallback(() => {
    slideAnim.setValue(0);
    console.log("🔧 Animation slide réinitialisée à 0");
  }, [slideAnim]);

  // 🔧 Réinitialiser l'animation quand la modal se ferme
  useEffect(() => {
    if (!audioControlsModalVisible) {
      resetSlideAnimation();
    }
  }, [audioControlsModalVisible, resetSlideAnimation]);

  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [sound, setSound] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const premiumManager = PremiumContentManager.getInstance();

  // Hook téléchargement natif
  const { downloadState, startDownload, cancelDownload, isNativeAvailable } =
    useNativeDownload();

  // 🎯 NOUVEAU : Hook widget Coran
  const {
    isWidgetAvailable,
    updateWidgetAudio,
    updateWidgetPlaybackState,
    runWidgetDiagnostic,
  } = useQuranWidget();

  // 🎵 NOUVEAU : Hook service audio natif
  const {
    audioState: serviceAudioState,
    startService,
    loadAudio: loadAudioInService,
    playAudio: playAudioInService,
    pauseAudio: pauseAudioInService,
    stopAudio: stopAudioInService,
    seekToPosition: seekToPositionInService,
    getCurrentWidgetSurah,
    syncWithWidgetSurah,
    updatePremiumStatus,
    isServiceAvailable,
  } = useQuranAudioService();

  // 🎵 DEBUG : Vérifier l'état du hook
  console.log(
    "🎵 Hook useQuranAudioService - État initial:",
    serviceAudioState
  );
  console.log(
    "🎵 Hook useQuranAudioService - Service disponible:",
    isServiceAvailable()
  );

  // 🎵 NOUVEAU : Démarrer la lecture en continu d'un récitateur
  const startPlaylistMode = (reciterRecitations: PremiumContent[]) => {
    console.log(
      `🎵 Démarrage playlist avec ${reciterRecitations.length} récitations`
    );

    const sortedRecitations = [...reciterRecitations].sort(
      (a, b) => (a.surahNumber || 0) - (b.surahNumber || 0)
    );

    console.log(
      `🎵 Récitations triées: ${sortedRecitations
        .map((r) => r.title)
        .join(", ")}`
    );

    setPlaylistItems(sortedRecitations);
    setCurrentPlaylistIndex(0);
    setPlaylistMode(true);

    // 🔧 Mettre à jour les refs pour les callbacks
    playlistItemsRef.current = sortedRecitations;
    currentPlaylistIndexRef.current = 0;
    playlistModeRef.current = true;

    // Commencer par la première récitation
    if (sortedRecitations.length > 0) {
      console.log(
        `🎵 Démarrage de la première récitation: ${sortedRecitations[0].title}`
      );
      playRecitation(sortedRecitations[0]);
    }
  };

  // 🎵 NOUVEAU : Passer à la récitation suivante dans la playlist
  const playNextInPlaylist = () => {
    console.log(
      `🎵 playNextInPlaylist - currentIndex: ${currentPlaylistIndexRef.current}, total: ${playlistItemsRef.current.length}`
    );

    if (
      !playlistModeRef.current ||
      currentPlaylistIndexRef.current >= playlistItemsRef.current.length - 1
    ) {
      // Fin de playlist
      console.log("🎵 Fin de playlist atteinte");
      setPlaylistMode(false);
      setCurrentPlaylistIndex(0);
      setPlaylistItems([]);
      playlistModeRef.current = false;
      currentPlaylistIndexRef.current = 0;
      playlistItemsRef.current = [];

      // Arrêter la lecture actuelle
      stopRecitation();
      return;
    }

    const nextIndex = currentPlaylistIndexRef.current + 1;
    const nextRecitation = playlistItemsRef.current[nextIndex];

    if (nextRecitation) {
      console.log(
        `🎵 Passage à la récitation suivante: ${nextRecitation.title} (index: ${nextIndex})`
      );
      setCurrentPlaylistIndex(nextIndex);
      currentPlaylistIndexRef.current = nextIndex;
      playRecitation(nextRecitation);
    }
  };

  // 🎵 NOUVEAU : Arrêter la playlist
  const stopPlaylistMode = () => {
    console.log("🎵 Arrêt de la playlist demandé");

    // Arrêter d'abord la lecture actuelle
    stopRecitation();

    // Puis nettoyer l'état de la playlist
    setPlaylistMode(false);
    setCurrentPlaylistIndex(0);
    setPlaylistItems([]);
    playlistModeRef.current = false;
    currentPlaylistIndexRef.current = 0;
    playlistItemsRef.current = [];

    console.log("🎵 Playlist arrêtée avec succès");
  };

  // 🎵 NOUVEAU : Forcer l'animation du GIF quand la modal s'ouvre
  useEffect(() => {
    if (audioControlsModalVisible) {
      // Forcer le re-render du GIF pour activer l'animation
      setGifKey((prev) => prev + 1);
    }
  }, [audioControlsModalVisible]);

  // Map langue => id traduction Quran.com (ajoute d'autres langues si besoin)
  const translationMap: Record<string, number | null> = {
    fr: 136,
    en: 85,
    ru: 45,
    tr: 52,
    de: 27,
    ar: null,
    es: 83,
    it: 153,
    pt: 43, // Portugais
    nl: 144, // Néerlandais
    ur: 97, // Ourdou
    bn: 120, // Bengali
    fa: 135, // Persan
  };

  const [sourates, setSourates] = useState<any[]>([]);
  const [selectedSourate, setSelectedSourate] = useState(1);
  const [arabicVerses, setArabicVerses] = useState<any[]>([]);
  const [phoneticArr, setPhoneticArr] = useState<any[]>([]);
  const [translationArr, setTranslationArr] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [fontsLoaded] = Font.useFonts({
    ScheherazadeNew: require("../assets/fonts/ScheherazadeNew-Regular.ttf"),
  });

  // Détecter la langue à utiliser pour l'API Quran.com
  const lang = i18n.language.startsWith("fr")
    ? "fr"
    : i18n.language.startsWith("en")
    ? "en"
    : i18n.language.startsWith("ru")
    ? "ru"
    : i18n.language.startsWith("tr")
    ? "tr"
    : i18n.language.startsWith("de")
    ? "de"
    : i18n.language.startsWith("it")
    ? "it"
    : i18n.language.startsWith("es")
    ? "es"
    : i18n.language.startsWith("pt")
    ? "pt"
    : i18n.language.startsWith("ur")
    ? "ur"
    : i18n.language.startsWith("fa")
    ? "fa"
    : i18n.language.startsWith("ar")
    ? "ar"
    : i18n.language.startsWith("nl") // Ajout du néerlandais
    ? "nl"
    : i18n.language.startsWith("bn") // Ajout du bengali
    ? "bn"
    : "en";

  // Fonction fetch avec fallback sur anglais (id 85)
  async function fetchTranslation(chapterNumber: number, lang: string) {
    const translationId = translationMap[lang] || 85; // fallback anglais

    try {
      const res = await fetch(
        `https://api.quran.com/api/v4/quran/translations/${translationId}?chapter_number=${chapterNumber}`
      );
      const json = await res.json();

      if (json.translations && json.translations.length > 0) {
        return json.translations;
      } else if (translationId !== 85) {
        // fallback anglais si vide
        const fallbackRes = await fetch(
          `https://api.quran.com/api/v4/quran/translations/85?chapter_number=${chapterNumber}`
        );
        const fallbackJson = await fallbackRes.json();
        return fallbackJson.translations || [];
      }
      return [];
    } catch {
      // fallback en cas d'erreur réseau
      if (translationId !== 85) {
        const fallbackRes = await fetch(
          `https://api.quran.com/api/v4/quran/translations/85?chapter_number=${chapterNumber}`
        );
        const fallbackJson = await fallbackRes.json();
        return fallbackJson.translations || [];
      }
      return [];
    }
  }

  // Charger la liste des sourates selon la langue courante
  useEffect(() => {
    fetch(`https://api.quran.com/api/v4/chapters?language=${lang}`)
      .then((res) => res.json())
      .then((json) => setSourates(json.chapters))
      .catch(() => setSourates([]));
  }, [lang]);

  // Charger les récitations premium disponibles
  useEffect(() => {
    loadAvailableRecitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🆕 Scanner le dossier physique quand on active le mode hors ligne ou la vue des téléchargements
  useEffect(() => {
    console.log(
      `🔍 useEffect scan - isOfflineMode: ${offlineAccess.isOfflineMode}, showDownloadsView: ${showDownloadsView}`
    );
    if (offlineAccess.isOfflineMode || showDownloadsView) {
      scanDownloadedQuranFiles().then((files) => {
        console.log(
          `🎯 Fichiers scannés à setter dans l'état: ${files.length}`
        );
        setScannedQuranFiles(files);
      });
    }
  }, [offlineAccess.isOfflineMode, showDownloadsView]);

  // Nettoyer l'audio à la fermeture
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // 🎵 NOUVEAU : Écouter les événements du service audio natif
  useEffect(() => {
    if (isServiceAvailable() && user?.isPremium) {
      console.log("🎵 Initialisation des écouteurs d'événements audio natifs");

      // Écouter les changements d'état du service
      // 🎵 SUPPRIMÉ : Plus de gestion directe des événements - utilisation uniquement du hook useQuranAudioService

      // 🎵 SUPPRIMÉ : Plus d'écoute directe des événements - utilisation uniquement du hook useQuranAudioService
      console.log(
        "🎵 Écouteurs d'événements audio initialisés via useQuranAudioService"
      );

      // Nettoyer les écouteurs lors du démontage
      return () => {
        console.log("🎵 Nettoyage des écouteurs d'événements audio");
      };
    }
  }, [isServiceAvailable, user?.isPremium]);

  // 🎵 NOUVEAU : Démarrer le service automatiquement pour les utilisateurs premium
  useEffect(() => {
    const shouldStartService = async () => {
      if (
        isServiceAvailable() &&
        user?.isPremium &&
        !serviceAudioState.isServiceRunning
      ) {
        console.log(
          "🎵 Démarrage automatique du service audio pour utilisateur premium"
        );
        startService().catch((error) => {
          console.error("❌ Erreur démarrage service audio:", error);
        });
      }
    };

    shouldStartService();
  }, [
    isServiceAvailable,
    user?.isPremium,
    serviceAudioState.isServiceRunning,
    startService,
  ]);

  // 🎵 NOUVEAU : Écouter aussi les événements du hook useQuranAudioService
  useEffect(() => {
    if (isServiceAvailable() && user?.isPremium) {
      console.log("🎵 Synchronisation avec useQuranAudioService");
      console.log("🔍 État du service:", serviceAudioState);

      // Mettre à jour l'état local avec l'état du service
      const newPosition = serviceAudioState.position || 0;
      const newDuration = serviceAudioState.duration || 0;
      const newIsPlaying = serviceAudioState.isPlaying || false;

      console.log(
        "📊 Mise à jour état - position:",
        newPosition,
        "duration:",
        newDuration,
        "isPlaying:",
        newIsPlaying
      );

      setPlaybackPosition(newPosition);
      setPlaybackDuration(newDuration);
      setIsPlaying(newIsPlaying);

      // 🎯 NOUVEAU : Synchroniser currentlyPlaying avec l'état du service
      if (newIsPlaying && serviceAudioState.currentSurah) {
        // Si le service joue quelque chose, s'assurer que currentlyPlaying correspond
        if (currentRecitation && currentRecitation.id) {
          setCurrentlyPlaying(currentRecitation.id);
          console.log(
            `🎯 Synchronisation currentlyPlaying: ${currentRecitation.id}`
          );
        }
      } else if (!newIsPlaying) {
        // Si le service ne joue rien, réinitialiser si nécessaire
        console.log(
          `🎯 Service en pause, currentlyPlaying conservé: ${currentlyPlaying}`
        );
      }

      // 🎯 NOUVEAU : Détecter changements de sourate depuis le widget
      if (
        serviceAudioState.currentSurah &&
        serviceAudioState.currentSurah !== lastServiceSurah
      ) {
        console.log(
          `🎯 Changement sourate détecté: "${lastServiceSurah}" → "${serviceAudioState.currentSurah}"`
        );
        setLastServiceSurah(serviceAudioState.currentSurah);

        // Si on était en mode navigation app, le réactiver
        if (isAppNavigation) {
          setIsAppNavigation(false);
          console.log(
            "🔄 Navigation widget détectée - Mode navigation app désactivé - Sync réactivée"
          );
        }
      }

      // 🎯 NOUVEAU : Synchroniser l'interface avec le changement de sourate du service
      // ⚠️ Synchronisation DÉSACTIVÉE en mode navigation app
      if (serviceAudioState.currentSurah && !isAppNavigation) {
        console.log(
          `🔍 Vérification sync: currentSurah="${serviceAudioState.currentSurah}" selectedSourate=${selectedSourate}`
        );
        // Extraire le numéro de sourate depuis le nom (format: "Al-Fatiha (001) - Récitateur")
        const surahMatch = serviceAudioState.currentSurah.match(/\((\d{3})\)/);
        if (surahMatch) {
          const surahNumber = parseInt(surahMatch[1]);
          console.log(
            `🔍 Sourate extraite: ${surahNumber}, actuelle: ${selectedSourate}`
          );
          if (
            surahNumber >= 1 &&
            surahNumber <= 114 &&
            surahNumber !== selectedSourate
          ) {
            console.log(
              `🎯 Synchronisation interface: passage sourate ${selectedSourate} → ${surahNumber}`
            );
            setSelectedSourate(surahNumber);
          } else {
            console.log(`🔍 Pas de sync nécessaire (même sourate ou invalide)`);
          }
        } else {
          console.log(
            `🔍 Regex ne match pas: "${serviceAudioState.currentSurah}"`
          );
        }
      } else if (isAppNavigation) {
        console.log(
          "🚫 Synchronisation désactivée - Mode navigation app actif"
        );
      }
    }
  }, [
    serviceAudioState,
    isServiceAvailable,
    user?.isPremium,
    isAppNavigation,
    lastServiceSurah,
  ]);

  // NOUVEAU : Écouter l'événement de fin de sourate pour la playlist
  useEffect(() => {
    const handleSurahCompleted = (event: any) => {
      console.log("🎵 Événement fin de sourate reçu dans QuranScreen:", event);

      if (playlistModeRef.current) {
        console.log(
          "🎵 Mode playlist actif - passage automatique à la suivante"
        );
        // Appeler directement playNextInPlaylist sans délai
        playNextInPlaylist();
      } else {
        console.log("🎵 Mode playlist inactif - pas de passage automatique");
      }
    };

    const subscription = DeviceEventEmitter.addListener(
      "QuranSurahCompletedForPlaylist",
      handleSurahCompleted
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const loadAvailableRecitations = async (forceRefresh = false) => {
    try {
      // 🌐 Mode en ligne : fonctionnement normal
      // 🎯 OPTIMISATION : Utiliser le cache par défaut, forcer le rechargement seulement si demandé
      if (forceRefresh) {
        // Vider le cache pour forcer le rechargement
        await AsyncStorage.removeItem("premium_catalog_cache");
        // console.log("🔄 Rechargement forcé du catalogue premium");
      } else {
        // console.log("📋 Chargement du catalogue premium depuis le cache");
      }

      const catalog = await premiumManager.getPremiumCatalog();
      if (catalog && catalog.quranRecitations) {
        // Synchroniser le statut téléchargé pour chaque récitation
        const recitationsWithStatus = await Promise.all(
          catalog.quranRecitations.map(async (recitation) => {
            const actualDownloadPath = await premiumManager.isContentDownloaded(
              recitation.id
            );
            return {
              ...recitation,
              isDownloaded: !!actualDownloadPath,
              downloadPath: actualDownloadPath || undefined,
            };
          })
        );
        setAvailableRecitations(recitationsWithStatus);

        // Sélectionner automatiquement le premier récitateur s'il n'y en a pas
        if (!selectedReciter && recitationsWithStatus.length > 0) {
          const firstReciter = recitationsWithStatus[0].reciter;
          if (firstReciter) {
            setSelectedReciter(firstReciter);
          }
        }

        // console.log(
        //   `📖 Catalogue chargé: ${recitationsWithStatus.length} récitateurs`
        //);
      }
    } catch (error) {
      console.error("Erreur chargement récitations:", error);
      // En cas d'erreur réseau, le catalogue reste vide
      // L'utilisateur verra le mode hors ligne avec les 2 onglets si isPremium et hors connexion
    }
  };

  // 📱 NOUVEAU : Charger les données offline du Coran
  const loadOfflineQuranData = async () => {
    setLoadingOfflineData(true);
    try {
      // Charger l'index des sourates
      const index = await QuranOfflineService.getQuranIndex();
      if (index) {
        setOfflineSurahs(index.surahs);
        console.log(
          `✅ [QuranOffline] ${index.surahs.length} sourates chargées`
        );
      }
    } catch (error) {
      console.error("❌ [QuranOffline] Erreur chargement données:", error);
    } finally {
      setLoadingOfflineData(false);
    }
  };

  // 🆕 Scanner physiquement le dossier /quran/ pour trouver les récitations téléchargées
  const scanDownloadedQuranFiles = async (): Promise<PremiumContent[]> => {
    try {
      // 🎯 CORRECTION : Les récitations Quran sont dans /quran/ organisées par récitateur
      const quranDirectory = `${RNFS.DocumentDirectoryPath}/quran`;

      // Vérifier si le dossier existe
      const dirExists = await RNFS.exists(quranDirectory);
      if (!dirExists) {
        console.log("📁 Dossier /quran/ n'existe pas encore");
        return [];
      }

      // Lire tous les sous-dossiers (récitateurs)
      const reciterFolders = await RNFS.readDir(quranDirectory);
      const quranRecitations: PremiumContent[] = [];

      for (const folder of reciterFolders) {
        // Ignorer les fichiers, on ne veut que les dossiers
        if (!folder.isDirectory()) continue;

        const reciterName = folder.name;

        // Lire tous les fichiers MP3 dans le dossier du récitateur
        const reciterFiles = await RNFS.readDir(folder.path);

        for (const file of reciterFiles) {
          // Ne garder que les fichiers .mp3
          if (!file.isFile() || !file.name.endsWith(".mp3")) continue;

          // Format: quran_reciterName_surahNumber.mp3
          // Exemple: quran_abdulbaset_mujawwad_1.mp3
          const nameWithoutExt = file.name.replace(".mp3", "");
          const parts = nameWithoutExt.split("_");

          // Le dernier élément est le numéro de sourate
          const surahNumberStr = parts[parts.length - 1];
          if (!surahNumberStr) continue;

          const surahNumber = parseInt(surahNumberStr, 10);
          if (isNaN(surahNumber)) continue;

          // Obtenir la taille du fichier en MB
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

          quranRecitations.push({
            id: nameWithoutExt,
            type: "quran",
            title: `Sourate ${surahNumber}`,
            description: `Récitation par ${reciterName}`,
            fileUrl: "",
            fileSize: parseFloat(fileSizeMB),
            version: "1.0",
            isDownloaded: true,
            downloadPath: file.path,
            reciter: reciterName,
            surahNumber: surahNumber,
            surahName: `Sourate ${surahNumber}`,
          });
        }
      }

      console.log(
        `✅ ${quranRecitations.length} récitations Quran trouvées dans ${reciterFolders.length} récitateurs`
      );
      return quranRecitations;
    } catch (error) {
      console.error("❌ Erreur scan dossier récitations:", error);
      return [];
    }
  };

  // 📱 NOUVEAU : Charger les versets offline pour une sourate
  const loadOfflineSurah = async (surahNumber: number) => {
    try {
      console.log(
        `🔍 [QuranOffline] Tentative de chargement sourate ${surahNumber}...`
      );
      const surahData = await QuranOfflineService.getSurah(surahNumber);
      if (surahData) {
        console.log(
          `✅ [QuranOffline] Données sourate ${surahNumber} reçues:`,
          {
            versesCount: surahData.verses.length,
            availableTranslations: Object.keys(
              surahData.verses[0]?.translations || {}
            ),
          }
        );
        // Convertir au format attendu par l'interface existante
        const arabicVerses = surahData.verses.map((verse) => ({
          id: verse.verse_number,
          verse_number: verse.verse_number,
          verse_key: verse.verse_key, // ✅ AJOUTÉ : verse_key manquant
          text_uthmani: verse.arabic_text,
        }));

        const phoneticArr = surahData.verses.map((verse) => ({
          id: verse.verse_number,
          verse_number: verse.verse_number,
          verse_key: verse.verse_key, // ✅ AJOUTÉ : verse_key manquant
          text: verse.phonetic_text,
        }));

        const translationArr = surahData.verses.map((verse) => ({
          id: verse.verse_number,
          verse_number: verse.verse_number,
          verse_key: verse.verse_key, // ✅ AJOUTÉ : verse_key manquant
          text:
            verse.translations[lang] ||
            verse.translations["en"] ||
            verse.translations["ar"] ||
            "",
        }));

        setArabicVerses(arabicVerses);
        setPhoneticArr(phoneticArr);
        setTranslationArr(translationArr);

        console.log(`✅ [QuranOffline] Sourate ${surahNumber} chargée offline`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(
        `❌ [QuranOffline] Erreur chargement sourate ${surahNumber}:`,
        error
      );
      return false;
    }
  };

  const getAvailableReciters = () => {
    const reciters = new Set<string>();
    availableRecitations.forEach((recitation) => {
      if (recitation.reciter && recitation.reciter !== "Récitateur") {
        reciters.add(recitation.reciter);
      }
    });
    return Array.from(reciters).sort();
  };

  // const getCurrentRecitation = (): PremiumContent | null => {
  //   if (!selectedReciter) return null;
  //   return (
  //     availableRecitations.find(
  //       (recitation) =>
  //         recitation.reciter === selectedReciter &&
  //         recitation.surahNumber === selectedSourate
  //     ) || null
  //   );
  // };

  // 🚀 NOUVEAU : Charger une récitation spécifique à la demande
  const [currentRecitation, setCurrentRecitation] =
    useState<PremiumContent | null>(null);
  // const [loadingRecitation, setLoadingRecitation] = useState(false);

  const loadSpecificRecitation = async (
    reciterName: string,
    surahNumber: number
  ) => {
    if (!reciterName) return;

    // setLoadingRecitation(true);
    try {
      const recitation = await premiumManager.getSpecificRecitation(
        reciterName,
        surahNumber
      );
      setCurrentRecitation(recitation);

      // 🚀 SUPPRIMÉ : Plus besoin de rafraîchir le statut ici
      // Le statut sera mis à jour automatiquement via les événements natifs
    } catch (error) {
      console.error("Erreur chargement récitation spécifique:", error);
      setCurrentRecitation(null);
    } finally {
      // setLoadingRecitation(false);
    }
  };

  // Charger la récitation quand le récitateur ou la sourate change
  useEffect(() => {
    // ✅ Ne pas charger les récitations en mode offline
    if (selectedReciter && selectedSourate && !offlineAccess.isOfflineMode) {
      loadSpecificRecitation(selectedReciter, selectedSourate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReciter, selectedSourate, offlineAccess.isOfflineMode]);

  // 🚀 SUPPRIMÉ : Anciens événements de téléchargement non natifs

  const handleDeleteRecitation = async (recitation: PremiumContent) => {
    Alert.alert(
      t("delete_download_title"),
      t("delete_download_message", { title: recitation.title }),
      [
        { text: "Annuler", style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            try {
              // Arrêter la lecture si c'est cette récitation qui joue
              if (currentlyPlaying === recitation.id) {
                await stopRecitation();
              }

              const success = await premiumManager.deletePremiumContent(
                recitation.id
              );

              if (success) {
                showToast({
                  type: "success",
                  title: t("toast_delete_success"),
                  message: t("toast_delete_completed"),
                });

                // 🚀 IMPORTANT : Mettre à jour l'état local pour refléter la suppression
                if (
                  currentRecitation &&
                  currentRecitation.id === recitation.id
                ) {
                  setCurrentRecitation({
                    ...currentRecitation,
                    isDownloaded: false,
                    downloadPath: undefined,
                  });
                }

                // 🆕 CORRECTION BUG : Rescanner le dossier physique après suppression
                scanDownloadedQuranFiles().then(setScannedQuranFiles);
              } else {
                showToast({
                  type: "error",
                  title: t("toast_error"),
                  message: t("toast_delete_error"),
                });
              }
            } catch (error) {
              console.error("Erreur suppression récitation:", error);
              showToast({
                type: "error",
                title: t("toast_error"),
                message: t("toast_delete_failed"),
              });
            }
          },
        },
      ]
    );
  };

  // 🚀 NOUVEAU : Téléchargement natif avec jauge de progression
  const handleNativeDownloadRecitation = async (recitation: PremiumContent) => {
    if (!user.isPremium) {
      showToast({
        type: "error",
        title: t("toast_premium_required"),
        message: t("toast_premium_required"),
      });
      return;
    }

    if (!isNativeAvailable) {
      showToast({
        type: "error",
        title: t("toast_download_error"),
        message: t("toast_download_failed"),
      });
      return;
    }

    try {
      // console.log(
      //   `[MyRecitation] 📥 Début téléchargement: ${recitation.title}`
      // );
      // console.log(`[MyRecitation] 🎯 Téléchargement ${recitation.title}:`);
      // console.log(`[MyRecitation]    📂 Dossier source: ${recitation.fileUrl}`);
      // console.log(`[MyRecitation]    💾 Fichier local: ${recitation.id}.mp3`);
      // console.log(`[MyRecitation]    🔑 ID unique: ${recitation.id}`);

      // Préparer l'info de téléchargement
      const downloadInfo: DownloadInfo = {
        contentId: recitation.id,
        url: recitation.fileUrl,
        fileName: `${recitation.id}.mp3`,
        title: recitation.title,
      };

      // console.log(
      //   `[MyRecitation] 🎯 Début téléchargement RNFS: ${recitation.title}`
      // );

      // Démarrer le téléchargement natif
      await startDownload(downloadInfo);

      showToast({
        type: "info",
        title: t("toast_download_success"),
        message: t("toast_recitation_loading"),
      });
    } catch (error) {
      console.error("❌ Erreur téléchargement récitation:", error);
      showToast({
        type: "error",
        title: t("toast_download_error"),
        message: t("toast_download_failed"),
      });
    }
  };

  // 🚀 NOUVEAU : Gérer la complétion du téléchargement natif
  const handleNativeDownloadCompleted = useCallback(
    async (contentId: string, localUri: string) => {
      // console.log(`[MyRecitation] ✅ Téléchargement natif terminé: ${contentId}`);

      try {
        // 🚀 NOUVEAU : Migrer automatiquement le fichier vers le stockage interne
        if (
          contentId.startsWith("quran_") ||
          contentId.startsWith("reciter_")
        ) {
          // console.log(`🔄 Migration automatique du fichier Quran: ${contentId}`);

          // Utiliser la fonction de migration du PremiumContentManager
          const migratedPath = await premiumManager.migrateFileToInternal(
            localUri.replace("file://", ""),
            contentId
          );

          if (migratedPath) {
            // console.log(`✅ Fichier migré avec succès: ${migratedPath}`);
            // Utiliser le nouveau chemin migré
            await premiumManager.markContentAsDownloaded(
              contentId,
              migratedPath
            );

            // Mettre à jour l'état local avec le nouveau chemin
            if (currentRecitation && currentRecitation.id === contentId) {
              setCurrentRecitation({
                ...currentRecitation,
                isDownloaded: true,
                downloadPath: migratedPath,
              });
            }
          } else {
            // console.log(`⚠️ Échec migration, utilisation du chemin original`);
            // Fallback vers le chemin original si la migration échoue
            await premiumManager.markContentAsDownloaded(contentId, localUri);

            if (currentRecitation && currentRecitation.id === contentId) {
              setCurrentRecitation({
                ...currentRecitation,
                isDownloaded: true,
                downloadPath: localUri.replace("file://", ""),
              });
            }
          }
        } else {
          // Pour les autres types de contenu (adhans), pas de migration nécessaire
          await premiumManager.markContentAsDownloaded(contentId, localUri);

          if (currentRecitation && currentRecitation.id === contentId) {
            setCurrentRecitation({
              ...currentRecitation,
              isDownloaded: true,
              downloadPath: localUri.replace("file://", ""),
            });
          }
        }

        showToast({
          type: "success",
          title: t("toast_success"),
          message: t("toast_download_completed_title"),
        });
      } catch (error) {
        console.error("❌ Erreur lors de la finalisation:", error);
        showToast({
          type: "error",
          title: t("toast_error"),
          message: t("toast_download_error_message"),
        });
      }
    },
    [currentRecitation, t, premiumManager, showToast]
  );

  // 🚀 NOUVEAU : Gérer l'annulation du téléchargement natif
  const handleNativeCancelDownload = async (recitationId: string) => {
    try {
      await cancelDownload(recitationId);
      showToast({
        type: "info",
        title: t("toast_download_cancelled_title"),
        message: t("toast_download_cancelled_message"),
      });
    } catch (error) {
      console.error("❌ Erreur annulation téléchargement:", error);
      showToast({
        type: "error",
        title: t("toast_download_error_title"),
        message: t("toast_download_failed_message"),
      });
    }
  };

  // 🚀 NOUVEAU : Écouter les événements de téléchargement natif
  useEffect(() => {
    // Parcourir tous les téléchargements terminés
    Array.from(downloadState.entries()).forEach(([contentId, state]) => {
      if (
        state.progress === 1 &&
        !state.isDownloading &&
        !state.error &&
        state.localUri
      ) {
        // Téléchargement terminé
        handleNativeDownloadCompleted(contentId, state.localUri);
        // Nettoyer l'état pour éviter les répétitions
        downloadState.delete(contentId);
      }
    });
  }, [downloadState, handleNativeDownloadCompleted]);

  const playRecitation = useCallback(
    async (recitation: PremiumContent) => {
      try {
        setIsLoading(true);

        // 📱 NOUVEAU : Vérifier le mode offline
        const shouldUseOffline =
          offlineAccess.isOfflineMode || !networkStatus.isConnected;

        // En mode offline, vérifier que le fichier est téléchargé
        if (shouldUseOffline && !recitation.isDownloaded) {
          showToast({
            type: "error",
            title: t("audio_offline_only"),
            message: t("offline_access_premium"),
          });
          setIsLoading(false);
          return;
        }

        // Arrêter toute lecture précédente
        if (sound) {
          await sound.unloadAsync();
          setSound(null);
        }

        setCurrentlyPlaying(recitation.id);
        setCurrentRecitation(recitation);

        // 🎵 NOUVEAU : Mettre à jour la sourate sélectionnée pour la synchronisation UI
        if (recitation.surahNumber) {
          setSelectedSourate(recitation.surahNumber);
        }

        let audioSource: any;

        // 🎯 Priorité 1: Fichier local téléchargé (hors ligne)
        // console.log(
        //   `🔍 Debug lecture: isDownloaded=${recitation.isDownloaded}, downloadPath=${recitation.downloadPath}`
        // );

        // Vérifier si le fichier est réellement téléchargé
        const actualDownloadPath = await premiumManager.isContentDownloaded(
          recitation.id
        );

        if (actualDownloadPath) {
          audioSource = { uri: "file://" + actualDownloadPath };
          // console.log(`🎵 Lecture locale: ${recitation.title}`);

          // 🎵 NOUVEAU : Mettre à jour le récitateur sélectionné pour la synchronisation UI (mode hors ligne)
          if (recitation.reciter) {
            setSelectedReciter(recitation.reciter);
          }
        }
        // 🌐 Priorité 2: Streaming depuis Infomaniak
        else {
          audioSource = { uri: recitation.fileUrl };
          //  console.log(`🌐 Streaming Infomaniak: ${recitation.title}`);

          // 🎵 NOUVEAU : Mettre à jour le récitateur sélectionné pour la synchronisation UI (mode streaming)
          if (recitation.reciter) {
            setSelectedReciter(recitation.reciter);
          }
        }

        // 🎯 NOUVEAU : Analyser l'audio pour la synchronisation
        // TODO: À implémenter plus tard
        /*
      if (arabicVerses.length > 0) {
        setIsAnalyzing(true);
        try {
          // Utiliser le nombre réel de versets pour une meilleure estimation
          const timings = await quranAudioAnalyzer.analyzeAudioFile(
            audioSource.uri
          );

          // Améliorer l'estimation avec le nombre réel de versets
          const improvedTimings =
            quranAudioAnalyzer.estimateWithKnownVerseCount(
              timings.length > 0
                ? timings[timings.length - 1].estimatedEndTime
                : 0,
              arabicVerses.length
            );

          setVerseTimings(improvedTimings);

          // Calculer la confiance moyenne de l'analyse
          const avgConfidence =
            improvedTimings.length > 0
              ? improvedTimings.reduce((sum, t) => sum + t.confidence, 0) /
                improvedTimings.length
              : 0;
          setAnalysisConfidence(avgConfidence);

          // console.log(
          //    `🎵 Analyse audio terminée: ${
          //      improvedTimings.length
          //    } versets détectés, confiance: ${(avgConfidence * 100).toFixed(1)}%`
          //    );
        } catch (error) {
          console.error("Erreur analyse audio:", error);
          // Fallback vers l'ancien système si l'analyse échoue
          setVerseTimings([]);
          setAnalysisConfidence(0);
        } finally {
          setIsAnalyzing(false);
        }
      }
      */

        // 🎵 NOUVEAU : Utiliser le service audio natif si disponible
        if (isServiceAvailable() && user?.isPremium) {
          try {
            console.log("🎵 Utilisation du service audio natif");

            // Mettre à jour le statut premium dans le service
            await updatePremiumStatus(true);

            // Charger l'audio dans le service
            const audioPath = actualDownloadPath || recitation.fileUrl;
            await loadAudioInService(
              audioPath,
              recitation.title,
              recitation.reciter || ""
            );

            // Lancer la lecture
            await playAudioInService();

            setIsPlaying(true);
            setCurrentlyPlaying(recitation.id);

            // 🎵 NOUVEAU : Créer un mock sound pour maintenir la compatibilité
            const mockSound = {
              setOnPlaybackStatusUpdate: (callback: any) => {
                // Le callback sera géré par les événements du service natif
                console.log("🎵 Mock sound configuré pour service natif");
                // Stocker le callback pour l'utiliser plus tard si nécessaire
                mockSound._callback = callback;
              },
              unloadAsync: async () => {
                console.log("🎵 Mock sound unloadAsync appelé");
                return Promise.resolve();
              },
              playAsync: async () => {
                console.log("🎵 Mock sound playAsync appelé");
                return Promise.resolve();
              },
              pauseAsync: async () => {
                console.log("🎵 Mock sound pauseAsync appelé");
                return Promise.resolve();
              },
              stopAsync: async () => {
                console.log("🎵 Mock sound stopAsync appelé");
                return Promise.resolve();
              },
              setPositionAsync: async (position: number) => {
                console.log("🎵 Mock sound setPositionAsync appelé:", position);
                return Promise.resolve();
              },
              getStatusAsync: async () => {
                console.log("🎵 Mock sound getStatusAsync appelé");
                // NOUVEAU : Utiliser les vraies valeurs du service natif
                return Promise.resolve({
                  isLoaded: true,
                  isPlaying: isPlaying,
                  positionMillis: playbackPosition,
                  durationMillis: playbackDuration,
                });
              },
              _callback: null as any, // Pour stocker le callback
            };
            setSound(mockSound);

            console.log("✅ Lecture lancée via service natif");
          } catch (serviceError) {
            console.error("❌ Erreur service audio natif:", serviceError);
            // Fallback vers l'ancien système
            console.log("🔄 Fallback vers système audio Expo");
          }
        }

        // Fallback vers l'ancien système si service non disponible ou non premium
        if (!isServiceAvailable() || !user?.isPremium) {
          console.log("🎵 Utilisation du système audio Expo");

          // 📱 NOUVEAU : En mode offline, pas de fallback streaming
          if (shouldUseOffline) {
            console.log("📱 Mode offline - lecture locale uniquement");
            try {
              const createdSound = await audioManager.playSource(
                audioSource,
                1.0
              );
              setSound(createdSound);
              setIsPlaying(true);
              setCurrentlyPlaying(recitation.id);
              setIsLoading(false);
              return;
            } catch (playError: any) {
              console.error(
                "❌ Erreur lecture locale en mode offline:",
                playError
              );
              showToast({
                type: "error",
                title: t("audio_offline_only"),
                message: "Fichier audio corrompu ou indisponible",
              });
              setIsLoading(false);
              return;
            }
          }

          // Créer et configurer l'objet audio (avec fallback streaming si local corrompu)
          let createdSound: any | null = null;
          try {
            createdSound = await audioManager.playSource(audioSource, 1.0);
          } catch (playError: any) {
            console.error(
              "Erreur lecture locale, fallback streaming:",
              playError
            );
            // Fallback: tenter le streaming HTTP sécurisé
            try {
              const remoteUrl = (
                currentRecitation?.fileUrl ||
                recitation.fileUrl ||
                ""
              ).replace("action=download", "action=stream");
              if (!remoteUrl) throw new Error("URL streaming indisponible");
              createdSound = await audioManager.playSource(
                { uri: remoteUrl },
                1.0
              );
            } catch (fallbackError) {
              console.error("Erreur fallback streaming:", fallbackError);
              setIsPlaying(false);
              setCurrentlyPlaying(null);
              setIsLoading(false);
              return;
            }
          }

          setSound(createdSound);
          setIsPlaying(true);
          setCurrentlyPlaying(recitation.id);
        }

        // 🎯 NOUVEAU : Mettre à jour le widget Coran
        if (isWidgetAvailable && user?.isPremium) {
          const audioPath = actualDownloadPath || recitation.fileUrl;
          updateWidgetAudio(
            recitation.title,
            recitation.reciter || "",
            audioPath
          );
          updateWidgetPlaybackState(true, 0, 0);
        }

        // Configuration des callbacks de progression avec analyse audio
        // TODO: À implémenter plus tard
        if (sound) {
          sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.isLoaded) {
              setPlaybackPosition(status.positionMillis || 0);
              setPlaybackDuration(status.durationMillis || 0);

              // 🎯 NOUVEAU : Mettre à jour le widget Coran avec la progression
              if (isWidgetAvailable && user?.isPremium) {
                updateWidgetPlaybackState(
                  isPlaying,
                  status.positionMillis || 0,
                  status.durationMillis || 0
                );
              }

              // 🎯 NOUVEAU : Utiliser l'analyse audio pour la synchronisation
              // TODO: À implémenter plus tard
              /*
            if (status.positionMillis && verseTimings.length > 0) {
              const currentTimeSeconds = status.positionMillis / 1000;
              const currentVerse = quranAudioAnalyzer.getCurrentVerse(
                verseTimings,
                currentTimeSeconds
              );

              // console.log(
              //   `🎵 Temps: ${currentTimeSeconds}s, Verset actuel: ${currentVerse}, Index précédent: ${currentVerseIndex}`
              // );

              if (currentVerse !== currentVerseIndex) {
                setCurrentVerseIndex(currentVerse);
                //  console.log(`🎵 Nouveau verset détecté: ${currentVerse}`);

                // 🎯 NOUVEAU : Scroll automatique vers le verset en cours
                if (autoScrollEnabled && flatListRef.current) {
                  setTimeout(() => {
                    flatListRef.current?.scrollToIndex({
                      index: currentVerse,
                      animated: true,
                      viewPosition: 0.3, // Positionne le verset à 30% du haut
                    });
                  }, 100);
                }
              }
            }
            */

              if (status.didJustFinish) {
                console.log(
                  "🎵 Audio terminé - didJustFinish détecté (Expo-AV uniquement)"
                );
                console.log("🎵 État playlist:", {
                  playlistMode: playlistModeRef.current,
                  currentIndex: currentPlaylistIndexRef.current,
                  totalItems: playlistItemsRef.current.length,
                });

                setIsPlaying(false);
                setCurrentlyPlaying(null);
                setPlaybackPosition(0);
                setPlaybackDuration(0);
                // TODO: setCurrentVerseIndex(null);

                // 🎵 Mode playlist - passer automatiquement à la suivante (Expo-AV uniquement)
                if (playlistModeRef.current) {
                  console.log(
                    "🎵 Mode playlist actif - passage automatique à la suivante (Expo-AV)"
                  );
                  setTimeout(() => {
                    console.log(
                      "🎵 Exécution de playNextInPlaylist après délai (Expo-AV)"
                    );
                    playNextInPlaylist();
                  }, 1000); // Petite pause entre les récitations
                } else {
                  console.log("🎵 Mode playlist inactif - arrêt de la lecture");
                }
              }
            }
          });

          // 🎵 NOUVEAU : Configurer un timer pour simuler la fin de l'audio
          // car le service natif ne déclenche pas automatiquement didJustFinish
          if (
            playlistModeRef.current &&
            isServiceAvailable() &&
            user?.isPremium
          ) {
            console.log(
              "🎵 Mode playlist détecté - pas de timer nécessaire, utilisation de l'événement natif"
            );
          }
        }

        showToast({
          type: "success",
          title: actualDownloadPath ? t("local_playback") : t("streaming"),
          message: `${recitation.title} - ${
            actualDownloadPath ? t("local_file") : t("streaming_status")
          }`,
        });
      } catch (error) {
        console.error("Erreur lecture récitation:", error);
        showToast({
          type: "error",
          title: t("playback_error"),
          message: t("playback_error_message"),
        });
        setCurrentlyPlaying(null);
        setIsPlaying(false);
      } finally {
        setIsLoading(false);
      }
    },
    [
      sound,
      premiumManager,
      isServiceAvailable,
      user?.isPremium,
      isWidgetAvailable,
      showToast,
      t,
      updatePremiumStatus,
      loadAudioInService,
      playAudioInService,
      isPlaying,
      playbackPosition,
      playbackDuration,
      currentRecitation?.fileUrl,
      updateWidgetAudio,
      updateWidgetPlaybackState,
      playNextInPlaylist,
      offlineAccess.isOfflineMode,
      networkStatus.isConnected,
    ]
  );

  const pauseRecitation = async () => {
    try {
      // 🎵 NOUVEAU : Utiliser le service natif si disponible
      if (isServiceAvailable() && user?.isPremium) {
        await pauseAudioInService();
        setIsPlaying(false);
        console.log("✅ Pause via service natif");
      } else if (sound) {
        await audioManager.pause();
        setIsPlaying(false);
        console.log("✅ Pause via Expo-AV");
      }

      // 🎯 NOUVEAU : Mettre à jour le widget Coran
      if (isWidgetAvailable && user?.isPremium) {
        updateWidgetPlaybackState(false, playbackPosition, playbackDuration);
      }
    } catch (error) {
      console.error("Erreur pause audio:", error);
    }
  };

  const resumeRecitation = async () => {
    try {
      // 🎵 NOUVEAU : Utiliser le service natif si disponible
      if (isServiceAvailable() && user?.isPremium) {
        await playAudioInService();
        setIsPlaying(true);
        console.log("✅ Reprise via service natif");
      } else if (sound) {
        await audioManager.resume();
        setIsPlaying(true);
        console.log("✅ Reprise via Expo-AV");
      }

      // 🎯 NOUVEAU : Mettre à jour le widget Coran
      if (isWidgetAvailable && user?.isPremium) {
        updateWidgetPlaybackState(true, playbackPosition, playbackDuration);
      }
    } catch (error) {
      console.error("Erreur reprise audio:", error);
    }
  };

  const seekToPosition = async (positionMillis: number) => {
    try {
      // 🎵 NOUVEAU : Utiliser le service natif si disponible
      if (isServiceAvailable() && user?.isPremium) {
        await seekToPositionInService(positionMillis);
        console.log("✅ Seek via service natif");
      } else if (sound) {
        await sound.setPositionAsync(positionMillis);
        console.log("✅ Seek via Expo-AV");
      }
    } catch (error) {
      console.error("Erreur navigation audio:", error);
    }
  };

  // Fonction utilitaire pour formater le temps
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const stopRecitation = async () => {
    try {
      console.log("🎵 Arrêt de la récitation demandé");

      // 🎵 NOUVEAU : Utiliser le service natif si disponible
      if (isServiceAvailable() && user?.isPremium) {
        await stopAudioInService();
        console.log("✅ Arrêt via service natif");
      } else if (sound) {
        await audioManager.stop();
        await audioManager.unload();
        setSound(null);
        console.log("✅ Arrêt via Expo-AV");
      }

      setIsPlaying(false);
      setCurrentlyPlaying(null);
      // 🔧 FIX : Ne pas vider currentRecitation pour éviter de fermer la modal
      // setCurrentRecitation(null); ← Commenté pour garder la modal ouverte
      setPlaybackPosition(0);
      setPlaybackDuration(0);

      // 🎯 NOUVEAU : Mettre à jour le widget Coran
      if (isWidgetAvailable && user?.isPremium) {
        updateWidgetPlaybackState(false, 0, 0);
      }

      console.log("🎵 Récitation arrêtée avec succès");
    } catch (error) {
      console.error("❌ Erreur arrêt audio:", error);
    }
  };

  // 👆 NOUVEAU : Navigation par gestes de swipe (simple - juste changer la sourate affichée)
  const handleSwipeNavigation = (direction: "next" | "previous") => {
    const currentSurah = selectedSourate;
    let targetSurah: number;

    if (direction === "next") {
      targetSurah = currentSurah >= 114 ? 1 : currentSurah + 1;
      console.log(
        `👆 Swipe SUIVANT: ${currentSurah} → ${targetSurah} (affichage seulement)`
      );
    } else {
      targetSurah = currentSurah <= 1 ? 114 : currentSurah - 1;
      console.log(
        `👆 Swipe PRÉCÉDENT: ${currentSurah} → ${targetSurah} (affichage seulement)`
      );
    }

    // 🔧 SOLUTION SIMPLIFIÉE : Animation sans changement d'état dans les callbacks
    console.log(`🎬 Début animation slide ${direction}`);

    // Activer le mode navigation app (désactive sync automatique) AVANT l'animation
    setIsAppNavigation(true);
    console.log("🎯 Mode navigation app activé - Sync automatique désactivée");

    // Changer la sourate AVANT l'animation
    setSelectedSourate(targetSurah);
    if (selectedReciter) {
      loadSpecificRecitation(selectedReciter, targetSurah);
    }

    // Animation slide simple avec Animated.sequence
    const exitValue =
      direction === "next"
        ? -Dimensions.get("window").width
        : Dimensions.get("window").width;

    const enterValue = -exitValue; // Direction opposée

    Animated.sequence([
      // Sortie vers la direction opposée
      Animated.timing(slideAnim, {
        toValue: exitValue,
        duration: 150,
        useNativeDriver: true,
      }),
      // Entrée depuis l'autre côté
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      console.log("🎬 Animation slide complète terminée - modal visible");
    });

    console.log(
      `✅ Navigation par geste: sourate ${targetSurah} affichée (audio inchangé)`
    );
  };

  // 👆 Handler pour les gestes Pan
  const onGestureEvent = (event: any) => {
    // On traite le geste seulement à la fin (State.END)
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;

      // Seuils pour déclencher la navigation
      const SWIPE_THRESHOLD = 50; // Distance minimale
      const VELOCITY_THRESHOLD = 300; // Vitesse minimale

      if (
        Math.abs(translationX) > SWIPE_THRESHOLD &&
        Math.abs(velocityX) > VELOCITY_THRESHOLD
      ) {
        if (translationX > 0) {
          // Swipe vers la droite = sourate précédente
          handleSwipeNavigation("previous");
        } else {
          // Swipe vers la gauche = sourate suivante
          handleSwipeNavigation("next");
        }
      }
    }
  };

  // 🎯 NAVIGATION SUPPRIMÉE - Utiliser uniquement le widget pour naviguer
  // Cela évite les conflits de double navigation qui causaient les sauts de sourates

  // 🎯 NAVIGATION SUPPRIMÉE - Plus besoin d'écouteurs d'événements puisque l'app n'a plus de boutons de navigation

  // Charger les versets, la translittération et la traduction selon la sourate et la langue
  useEffect(() => {
    async function fetchQuranData() {
      setLoading(true);

      // 📱 NOUVEAU : Logique Premium optimisée
      if (user?.isPremium) {
        // Premium : TOUJOURS utiliser les données locales (plus rapide)
        console.log(
          `📱 [QuranOffline] Chargement sourate ${selectedSourate} avec données locales Premium`
        );
        const success = await loadOfflineSurah(selectedSourate);
        if (success) {
          setLoading(false);
          return;
        } else {
          // ✅ Si le chargement offline échoue, ne pas essayer le serveur
          console.error(
            `❌ [QuranOffline] Impossible de charger la sourate ${selectedSourate} offline`
          );
          setArabicVerses([]);
          setPhoneticArr([]);
          setTranslationArr([]);
          setLoading(false);
          return;
        }
      } else if (!networkStatus.isConnected) {
        // Non-Premium hors ligne : accès refusé
        console.log(
          `🚫 [QuranOffline] Accès refusé - connexion requise pour utilisateur gratuit`
        );
        setArabicVerses([]);
        setPhoneticArr([]);
        setTranslationArr([]);
        setLoading(false);
        return;
      }

      // 🌐 Mode en ligne : fonctionnement normal
      try {
        // Fetch arabe (toujours même endpoint)
        const arabicRes = await fetch(
          `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${selectedSourate}`
        );
        const arabicJson = await arabicRes.json();

        // Fetch translittération (toujours id=57)
        const phoneticRes = await fetch(
          `https://api.quran.com/api/v4/quran/translations/57?chapter_number=${selectedSourate}`
        );
        const phoneticJson = await phoneticRes.json();

        // Fetch traduction avec fallback
        let translationJson = { translations: [] };
        if (lang !== "ar") {
          const translations = await fetchTranslation(selectedSourate, lang);
          translationJson.translations = translations;
        }

        setArabicVerses(arabicJson.verses || []);
        setPhoneticArr(phoneticJson.translations || []);
        setTranslationArr(translationJson.translations || []);
      } catch {
        // En cas d'erreur réseau, essayer le mode offline si Premium
        if (user?.isPremium) {
          console.log(
            `🔄 [QuranOffline] Erreur réseau, basculement vers mode offline`
          );
          await loadOfflineSurah(selectedSourate);
        } else {
          setArabicVerses([]);
          setPhoneticArr([]);
          setTranslationArr([]);
        }
      }
      setLoading(false);
    }
    fetchQuranData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSourate, lang, user?.isPremium, networkStatus.isConnected]);

  // 📱 NOUVEAU : Charger les données offline au démarrage
  useEffect(() => {
    if (user?.isPremium) {
      loadOfflineQuranData();
    }
  }, [user?.isPremium]);

  function stripHtml(text: string | undefined) {
    if (!text) return "";
    return (
      text
        // Supprimer les balises sup avec foot_note (avec ou sans guillemets)
        .replace(/<sup[^>]*foot_note[^>]*>.*?<\/sup>/gi, "")
        // Supprimer les balises a avec des balises sup imbriquées
        .replace(/<a[^>]*>.*?<\/a>/gi, "")
        // Supprimer toutes les autres balises HTML
        .replace(/<[^>]*>/g, "")
        // Supprimer les espaces multiples
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  // Fonction pour normaliser le texte (supprimer accents et caractères spéciaux)
  function normalizeText(text: string) {
    return text
      .normalize("NFD") // Décompose les caractères accentués
      .replace(/[\u0300-\u036f]/g, "") // Supprime les diacritiques latins
      .replace(/[\u064B-\u0652]/g, "") // Supprime les diacritiques arabes (tashkeel)
      .replace(/[\u0653-\u065F]/g, "") // Supprime autres diacritiques arabes
      .replace(/[\u0670]/g, "") // Supprime alif khanjariyah
      .replace(/[\u06D6-\u06ED]/g, "") // Supprime les marques de récitation
      .replace(/[^\w\s\u0600-\u06FF\u0750-\u077F]/gi, "") // Garde seulement lettres, espaces et caractères arabes de base
      .toLowerCase()
      .trim();
  }

  // Fonction pour convertir un verset en format favori
  const convertToFavorite = (
    item: any,
    translationText: string,
    chapterName: string
  ): Omit<QuranVerseFavorite, "id" | "dateAdded"> => {
    // Vérifier que verse_key existe avant de le splitter
    if (!item.verse_key) {
      console.warn("⚠️ verse_key manquant pour l'item:", item);
      return {
        type: "quran_verse" as const,
        chapterNumber: 1,
        verseNumber: 1,
        arabicText: item.text_uthmani || "",
        translation: stripHtml(translationText),
        chapterName: chapterName,
      };
    }

    const verseParts = item.verse_key.split(":");
    return {
      type: "quran_verse" as const,
      chapterNumber: parseInt(verseParts[0]) || 1,
      verseNumber: parseInt(verseParts[1]) || 1,
      arabicText: item.text_uthmani,
      translation: stripHtml(translationText),
      chapterName: chapterName,
    };
  };

  // Filtrer les versets selon la recherche dans la sourate sélectionnée
  const filteredVerses = useMemo(() => {
    if (!searchQuery.trim()) {
      return arabicVerses;
    }

    // Rechercher uniquement dans la sourate sélectionnée avec normalisation
    const normalizedSearch = normalizeText(searchQuery);
    return arabicVerses.filter((verse, index) => {
      const phonetic = phoneticArr[index]?.text || "";
      const translation = translationArr[index]?.text || "";

      // Normaliser tous les textes pour la comparaison
      const normalizedArabic = normalizeText(verse.text_uthmani || "");
      const normalizedPhonetic = normalizeText(phonetic);
      const normalizedTranslation = normalizeText(stripHtml(translation));
      const normalizedVerseKey = normalizeText(verse.verse_key);

      return (
        normalizedArabic.includes(normalizedSearch) ||
        normalizedPhonetic.includes(normalizedSearch) ||
        normalizedTranslation.includes(normalizedSearch) ||
        normalizedVerseKey.includes(normalizedSearch)
      );
    });
  }, [searchQuery, arabicVerses, phoneticArr, translationArr]);

  // 📱 NOUVEAU : Afficher le message offline si nécessaire
  if (offlineAccess.shouldShowOfflineMessage) {
    return (
      <OfflineMessage
        onRetry={() => {
          // Recharger les données
          if (user?.isPremium) {
            loadOfflineQuranData();
          }
        }}
        customMessage={t("offline_message_quran")}
      />
    );
  }

  if (loading)
    return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;
  if (!fontsLoaded) return null;

  const modalData = sourates.map((s) => ({
    key: s.id,
    label: `${s.id}. ${s.name_simple} (${s.name_arabic})`,
  }));

  function getSelectedSourateLabel() {
    const current = sourates.find((s) => s.id === selectedSourate);
    return current
      ? `${current.id}. ${current.name_simple} (${current.name_arabic})`
      : t("choose_sourate");
  }

  const renderSourateItem = ({
    item,
  }: {
    item: { key: number; label: string };
  }) => (
    <TouchableOpacity
      style={[
        styles.optionStyle,
        selectedSourate === item.key && styles.selectedOptionStyle,
      ]}
      onPress={() => {
        setSelectedSourate(item.key);
        setModalVisible(false);
        // Le menu reste ouvert, pas besoin de le rouvrir
      }}
    >
      <Text
        style={[
          styles.optionTextStyle,
          selectedSourate === item.key && styles.selectedOptionTextStyle,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  // 📱 NOUVEAU : Vue cachée de gestion des téléchargements (accessible en ligne)
  if (showDownloadsView) {
    return (
      <ImageBackground
        source={require("../assets/images/parchment_bg.jpg")}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
            {/* En-tête avec bouton retour */}
            <View style={{ marginBottom: 16, paddingHorizontal: 16 }}>
              <TouchableOpacity
                onPress={() => setShowDownloadsView(false)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 8,
                }}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={24}
                  color="#ba9c34"
                />
                <Text
                  style={[
                    styles.sourateName,
                    { marginLeft: 8, fontSize: 20, fontWeight: "bold" },
                  ]}
                >
                  {t("manage_downloads") || "Gérer les téléchargements"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Affichage de la liste des audio téléchargés */}
            <View style={styles.offlineRecitationsContainer}>
              <Text style={styles.offlineRecitationsTitle}>
                {t("downloaded_audio") || "Audio Téléchargés"}
              </Text>
              {(() => {
                // 🔧 Utiliser les récitations scannées physiquement
                const downloadedRecitations = scannedQuranFiles;
                console.log(
                  `📊 Affichage vue téléchargements - scannedQuranFiles.length: ${scannedQuranFiles.length}`
                );

                if (downloadedRecitations.length === 0) {
                  return (
                    <View
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <MaterialCommunityIcons
                        name="download-outline"
                        size={64}
                        color="#ba9c34"
                        style={{ opacity: 0.5, marginBottom: 16 }}
                      />
                      <Text style={styles.placeholderText}>
                        {t("no_downloaded_audio") ||
                          "Aucun audio téléchargé pour le moment"}
                      </Text>
                      <Text
                        style={[
                          styles.placeholderText,
                          { fontSize: 12, marginTop: 8 },
                        ]}
                      >
                        {t("download_audio_hint") ||
                          "Téléchargez des récitations en mode en ligne"}
                      </Text>
                    </View>
                  );
                }

                // 🎵 Grouper les récitations par récitateur
                const recitationsByReciter: {
                  [key: string]: PremiumContent[];
                } = {};
                downloadedRecitations.forEach((rec: PremiumContent) => {
                  const reciterName =
                    rec.reciter || t("unknown_reciter") || "Récitateur inconnu";
                  if (!recitationsByReciter[reciterName]) {
                    recitationsByReciter[reciterName] = [];
                  }
                  recitationsByReciter[reciterName].push(rec);
                });

                return (
                  <FlatList
                    data={Object.entries(recitationsByReciter)}
                    keyExtractor={([reciterName]) => reciterName}
                    renderItem={({ item: [reciterName, recitations] }) => (
                      <View style={{ marginBottom: 24 }}>
                        <View style={styles.offlineReciterHeader}>
                          <Text style={styles.offlineReciterName}>
                            {reciterName}
                          </Text>
                          <Text style={styles.offlineReciterCount}>
                            {recitations.length} {t("surah", "Sourate")}
                            {recitations.length > 1 ? "s" : ""}
                          </Text>
                        </View>
                        {recitations
                          .sort(
                            (a, b) =>
                              (a.surahNumber || 0) - (b.surahNumber || 0)
                          )
                          .map((recitation) => (
                            <View
                              key={recitation.id}
                              style={[
                                styles.offlineRecitationItem,
                                currentlyPlaying === recitation.id && {
                                  backgroundColor: "#fff5e6",
                                  borderColor: "#FFD700",
                                  borderWidth: 2,
                                },
                              ]}
                            >
                              <TouchableOpacity
                                style={{
                                  flex: 1,
                                  flexDirection: "row",
                                  alignItems: "center",
                                }}
                                onPress={() => playRecitation(recitation)}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.offlineRecitationTitle}>
                                    {recitation.surahName || recitation.title}
                                  </Text>
                                  <Text
                                    style={styles.offlineRecitationSubtitle}
                                  >
                                    {t("surah")} {recitation.surahNumber} •{" "}
                                    {recitation.fileSize} MB
                                  </Text>
                                </View>
                                {currentlyPlaying === recitation.id &&
                                isPlaying ? (
                                  <MaterialCommunityIcons
                                    name="pause-circle"
                                    size={32}
                                    color="#FFD700"
                                  />
                                ) : (
                                  <MaterialCommunityIcons
                                    name="play-circle"
                                    size={32}
                                    color="#4ECDC4"
                                  />
                                )}
                              </TouchableOpacity>

                              {/* 🗑️ Bouton de suppression */}
                              <TouchableOpacity
                                style={{
                                  padding: 8,
                                  marginLeft: 8,
                                }}
                                onPress={() =>
                                  handleDeleteRecitation(recitation)
                                }
                              >
                                <MaterialCommunityIcons
                                  name="delete-outline"
                                  size={24}
                                  color="#ff6b6b"
                                />
                              </TouchableOpacity>
                            </View>
                          ))}
                      </View>
                    )}
                    contentContainerStyle={[
                      styles.offlineRecitationsList,
                      { paddingBottom: 100 },
                    ]}
                  />
                );
              })()}
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // 📱 NOUVEAU : Rendu spécial pour le mode offline premium
  if (user?.isPremium && offlineAccess.isOfflineMode) {
    return (
      <ImageBackground
        source={require("../assets/images/parchment_bg.jpg")}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
            {/* ✅ Utilise SafeAreaView + paddingTop réduit */}
            {/* 📱 Onglets de navigation offline pour Premium */}
            <OfflineNavigationTabs
              activeTab={activeOfflineTab}
              onTabChange={setActiveOfflineTab}
              isPremium={!!user?.isPremium}
            />
            {/* Contenu selon l'onglet sélectionné */}
            {activeOfflineTab === "quran" ? (
              // Onglet "Texte du Coran" - afficher le contenu normal
              <View style={{ flex: 1 }}>
                {/* Header avec sélecteur de sourate uniquement - version compacte pour offline */}
                <View style={styles.compactHeaderOffline}>
                  {/* Sélecteur de sourate */}
                  <TouchableOpacity
                    style={[styles.compactSourateSelector, { flex: 1 }]} // ✅ Prend tout l'espace disponible
                    onPress={() => setModalVisible(true)}
                  >
                    <Text style={styles.compactSourateText}>
                      {getSelectedSourateLabel()}
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={20}
                      color="#4ECDC4"
                    />
                  </TouchableOpacity>
                </View>

                {/* Contenu du Coran */}
                <FlatList
                  ref={flatListRef}
                  data={filteredVerses}
                  keyExtractor={(item, index) =>
                    `${item.verse_key || item.id || index}`
                  }
                  renderItem={({ item, index }) => {
                    // Affichage simplifié pour le mode offline
                    const originalIndex = arabicVerses.findIndex(
                      (v) => v.id === item.id
                    );
                    const phoneticText = phoneticArr[originalIndex]?.text || "";
                    const translationText =
                      translationArr[originalIndex]?.text || "";

                    return (
                      <View style={styles.ayahContainer}>
                        <View style={styles.arabicRow}>
                          <Text style={styles.arabic}>
                            {item.text_uthmani || ""}
                          </Text>
                          <View style={styles.verseActions}>
                            <View style={styles.verseCircle}>
                              <Text style={styles.verseNumber}>
                                {item.verse_key
                                  ? item.verse_key.split(":")[1]
                                  : "1"}
                              </Text>
                            </View>
                            <FavoriteButton
                              favoriteData={convertToFavorite(
                                item,
                                translationText,
                                getSelectedSourateLabel()
                              )}
                              size={20}
                              iconColor="#ba9c34"
                              iconColorActive="#FFD700"
                              style={styles.favoriteButtonCompact}
                            />
                          </View>
                        </View>
                        {phoneticText ? (
                          <Text style={styles.phonetic}>{phoneticText}</Text>
                        ) : null}
                        {translationText ? (
                          <Text style={styles.traduction}>
                            {stripHtml(translationText)}
                          </Text>
                        ) : null}
                      </View>
                    );
                  }}
                  initialNumToRender={5}
                  maxToRenderPerBatch={5}
                  windowSize={10}
                  removeClippedSubviews={true}
                  updateCellsBatchingPeriod={100}
                  contentContainerStyle={[
                    styles.versesContainer,
                    { paddingBottom: 100 },
                  ]} // ✅ Espace supplémentaire en bas
                />
              </View>
            ) : (
              // Onglet "Audio Téléchargés" - afficher la liste des fichiers audio
              <View style={styles.offlineRecitationsContainer}>
                <Text style={styles.offlineRecitationsTitle}>
                  {t("downloaded_audio") || "Audio Téléchargés"}
                </Text>
                {(() => {
                  // 🔧 CORRECTION BUG : Utiliser les récitations scannées physiquement
                  const downloadedRecitations = scannedQuranFiles;
                  console.log(
                    `📊 Affichage mode hors ligne - scannedQuranFiles.length: ${scannedQuranFiles.length}`
                  );

                  if (downloadedRecitations.length === 0) {
                    return (
                      <View
                        style={{
                          flex: 1,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <MaterialCommunityIcons
                          name="download-outline"
                          size={64}
                          color="#ba9c34"
                          style={{ opacity: 0.5, marginBottom: 16 }}
                        />
                        <Text style={styles.placeholderText}>
                          {t("no_downloaded_audio") ||
                            "Aucun audio téléchargé pour le moment"}
                        </Text>
                        <Text
                          style={[
                            styles.placeholderText,
                            { fontSize: 12, marginTop: 8 },
                          ]}
                        >
                          {t("download_audio_hint") ||
                            "Téléchargez des récitations en mode en ligne"}
                        </Text>
                      </View>
                    );
                  }

                  // 🎵 Grouper les récitations par récitateur
                  const recitationsByReciter: {
                    [key: string]: PremiumContent[];
                  } = {};
                  downloadedRecitations.forEach((rec: PremiumContent) => {
                    const reciterName =
                      rec.reciter ||
                      t("unknown_reciter") ||
                      "Récitateur inconnu";
                    if (!recitationsByReciter[reciterName]) {
                      recitationsByReciter[reciterName] = [];
                    }
                    recitationsByReciter[reciterName].push(rec);
                  });

                  return (
                    <FlatList
                      data={Object.entries(recitationsByReciter)}
                      keyExtractor={([reciterName]) => reciterName}
                      renderItem={({ item: [reciterName, recitations] }) => (
                        <View style={{ marginBottom: 24 }}>
                          <View style={styles.offlineReciterHeader}>
                            <Text style={styles.offlineReciterName}>
                              {reciterName}
                            </Text>
                            <Text style={styles.offlineReciterCount}>
                              {recitations.length} {t("surah", "Sourate")}
                              {recitations.length > 1 ? "s" : ""}
                            </Text>
                          </View>
                          {recitations
                            .sort(
                              (a, b) =>
                                (a.surahNumber || 0) - (b.surahNumber || 0)
                            )
                            .map((recitation) => (
                              <TouchableOpacity
                                key={recitation.id}
                                style={[
                                  styles.offlineRecitationItem,
                                  currentlyPlaying === recitation.id && {
                                    backgroundColor: "#fff5e6",
                                    borderColor: "#FFD700",
                                    borderWidth: 2,
                                  },
                                ]}
                                onPress={() => playRecitation(recitation)}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.offlineRecitationTitle}>
                                    {recitation.surahName || recitation.title}
                                  </Text>
                                  <Text
                                    style={styles.offlineRecitationSubtitle}
                                  >
                                    {t("surah")} {recitation.surahNumber} •{" "}
                                    {recitation.fileSize} MB
                                  </Text>
                                </View>
                                {currentlyPlaying === recitation.id &&
                                isPlaying ? (
                                  <MaterialCommunityIcons
                                    name="pause-circle"
                                    size={32}
                                    color="#FFD700"
                                  />
                                ) : (
                                  <MaterialCommunityIcons
                                    name="play-circle"
                                    size={32}
                                    color="#4ECDC4"
                                  />
                                )}
                              </TouchableOpacity>
                            ))}
                        </View>
                      )}
                      contentContainerStyle={styles.offlineRecitationsList}
                    />
                  );
                })()}
              </View>
            )}
          </View>
        </SafeAreaView>

        {/* 📱 Modal de sélection de sourate - accessible en mode offline */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View
              style={[styles.modalContent, { maxHeight: windowHeight * 0.8 }]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("choose_sourate")}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={modalData}
                renderItem={renderSourateItem}
                keyExtractor={(item) => item.key.toString()}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={10}
                removeClippedSubviews={true}
              />
            </View>
          </SafeAreaView>
        </Modal>
      </ImageBackground>
    );
  }

  // Rendu normal pour les utilisateurs en ligne ou non-premium
  return (
    <ImageBackground
      source={require("../assets/images/parchment_bg.jpg")}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        {/* 🎨 Header avec bouton menu */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{getSelectedSourateLabel()}</Text>
            {user.isPremium && selectedReciter && (
              <Text style={styles.headerSubtitle}>{selectedReciter}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
          >
            <Text style={styles.menuButtonText}>☰</Text>
          </TouchableOpacity>
        </View>

        {/* 🔍 NOUVEAU : Bouton de diagnostic widget (mode dev) */}
        {__DEV__ && (
          <View style={styles.offlineControlsSection}>
            <TouchableOpacity
              style={styles.diagnosticButton}
              onPress={runWidgetDiagnostic}
            >
              <MaterialCommunityIcons name="bug" size={16} color="#ffffff" />
              <Text style={styles.diagnosticButtonText}>Diagnostic Widget</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 🎨 NOUVEAU : Barre de recherche séparée */}
        <View style={styles.searchContainer}>
          <TextInput
            testID="search-input"
            style={styles.searchInput}
            placeholder={
              t("quran_search_placeholder") || "Rechercher dans la sourate..."
            }
            placeholderTextColor="#ba9c34"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* 🎨 NOUVEAU : Menu latéral de navigation */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={menuVisible}
          onRequestClose={() => setMenuVisible(false)}
        >
          <SafeAreaView style={styles.menuOverlay}>
            <View style={styles.menuContent}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>{t("navigation")}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setMenuVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Section Sourate */}
              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>{t("sourate")}</Text>
                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => {
                    setModalType("sourate");
                    setModalVisible(true);
                    // Ne pas fermer le menu tout de suite
                  }}
                >
                  <Text style={styles.menuOptionText}>
                    {getSelectedSourateLabel()}
                  </Text>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Section Récitateur (premium uniquement) */}
              {user.isPremium && getAvailableReciters().length > 0 && (
                <View style={styles.menuSection}>
                  <Text style={styles.menuSectionTitle}>{t("reciter")}</Text>
                  <TouchableOpacity
                    style={styles.menuOption}
                    onPress={() => {
                      setModalType("reciter");
                      setReciterModalVisible(true);
                      setMenuVisible(false); // Fermer le menu après sélection du récitateur
                    }}
                  >
                    <Text style={styles.menuOptionText}>
                      {selectedReciter || t("quran.reciter", "Récitateur")}
                    </Text>
                    <Text style={styles.menuArrow}>›</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 🆕 Section Gestion des téléchargements (premium uniquement) */}
              {user.isPremium && (
                <View style={styles.menuSection}>
                  <Text style={styles.menuSectionTitle}>
                    {t("downloads_manager") || "Téléchargements"}
                  </Text>
                  <TouchableOpacity
                    style={styles.menuOption}
                    onPress={() => {
                      setMenuVisible(false);
                      setShowDownloadsView(true);
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flex: 1,
                      }}
                    >
                      <MaterialCommunityIcons
                        name="download-multiple"
                        size={20}
                        color="#4ECDC4"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.menuOptionText}>
                        {t("manage_downloads") || "Gérer les téléchargements"}
                      </Text>
                    </View>
                    <Text style={styles.menuArrow}>›</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </SafeAreaView>
        </Modal>

        {/* Modal de sélection (sourate ou récitateur) */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View
              style={[styles.modalContent, { maxHeight: windowHeight * 0.8 }]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("choose_sourate")}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                ref={flatListRef}
                data={modalData}
                renderItem={renderSourateItem}
                keyExtractor={(item) => item.key.toString()}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={10}
                getItemLayout={(data, index) => ({
                  length: 50,
                  offset: 50 * index,
                  index,
                })}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
              />
            </View>
          </SafeAreaView>
        </Modal>

        {/* 🎨 NOUVEAU : Bouton play flottant pour les récitations premium */}
        {user.isPremium && (
          <TouchableOpacity
            testID="floating-play-button"
            style={[
              styles.floatingPlayButton,
              !selectedReciter && styles.floatingPlayButtonInactive,
            ]}
            onPress={() => {
              if (!selectedReciter) {
                setReciterModalVisible(true);
              } else if (currentRecitation) {
                setAudioControlsModalVisible(true);
              }
            }}
            disabled={isLoading}
          >
            <MaterialCommunityIcons
              name={
                isLoading
                  ? "loading"
                  : !selectedReciter
                  ? "account-music"
                  : currentlyPlaying === currentRecitation?.id && isPlaying
                  ? "pause"
                  : "play"
              }
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        )}

        {/* 🎨 NOUVEAU : Modal des contrôles audio complets */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={audioControlsModalVisible}
          onRequestClose={() => setAudioControlsModalVisible(false)}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.audioModalContainer}>
              <PanGestureHandler
                onGestureEvent={onGestureEvent}
                onHandlerStateChange={onHandlerStateChange}
                activeOffsetX={[-50, 50]}
                failOffsetY={[-50, 50]}
              >
                <ScrollView
                  style={styles.audioModalScrollView}
                  contentContainerStyle={styles.audioModalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Animated.View
                    style={[
                      styles.audioModalContent,
                      { transform: [{ translateX: slideAnim }] },
                    ]}
                  >
                    {/* 🎵 GIF animé ou image statique selon l'état de lecture */}
                    <ExpoImage
                      source={
                        currentlyPlaying === currentRecitation?.id && isPlaying
                          ? require("../assets/images/audio_wave3.gif")
                          : require("../assets/images/audio_wave3_fix.png")
                      }
                      style={styles.audioModalGifBackground}
                      contentFit="cover"
                      onLoad={() => {
                        // console.log("✅ Image background chargée avec expo-image")
                      }}
                      onError={() => {
                        // console.log("❌ Erreur image background avec expo-image")
                      }}
                      key={`gif-${gifKey}-${
                        currentlyPlaying === currentRecitation?.id && isPlaying
                          ? "play"
                          : "pause"
                      }`}
                    />
                    <View style={styles.audioModalOverlay}>
                      <View style={styles.audioModalHeader}>
                        <TouchableOpacity
                          style={styles.closeButton}
                          onPress={() => setAudioControlsModalVisible(false)}
                        >
                          <MaterialCommunityIcons
                            name="close"
                            size={24}
                            color="#483C1C"
                          />
                        </TouchableOpacity>
                      </View>
                      {currentRecitation && (
                        <View style={styles.audioModalBody}>
                          {/* 🎵 Indicateur de lecture - SIMPLE et STABLE */}
                          <View style={styles.audioAnimationContainer}>
                            <Text style={styles.audioAnimationText}>
                              {currentlyPlaying === currentRecitation.id &&
                              isPlaying
                                ? `🎵 ${t("currently_playing")}`
                                : `🎵 ${t("ready_to_listen")}`}
                            </Text>
                          </View>

                          {/* Informations sur la récitation */}
                          <View style={styles.audioInfoContainer}>
                            <Text style={styles.audioReciterName}>
                              {currentRecitation.reciter}
                            </Text>
                            <Text style={styles.audioSurahName}>
                              {currentRecitation.surahName}
                            </Text>
                            {currentRecitation.isDownloaded && (
                              <View style={styles.audioLocalBadge}>
                                <MaterialCommunityIcons
                                  name="download"
                                  size={14}
                                  color="#4CAF50"
                                />
                                <Text style={styles.audioLocalText}>
                                  {t("offline")}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* Contrôles de lecture principaux */}
                          <View style={styles.audioMainControls}>
                            <TouchableOpacity
                              style={[
                                styles.audioPlayButton,
                                currentlyPlaying === currentRecitation.id &&
                                  isPlaying &&
                                  styles.audioPlayButtonActive,
                              ]}
                              onPress={() => {
                                if (
                                  currentlyPlaying === currentRecitation.id &&
                                  isPlaying
                                ) {
                                  pauseRecitation();
                                } else if (
                                  currentlyPlaying === currentRecitation.id
                                ) {
                                  resumeRecitation();
                                } else {
                                  playRecitation(currentRecitation);
                                }
                              }}
                              disabled={isLoading}
                            >
                              <MaterialCommunityIcons
                                name={
                                  isLoading
                                    ? "loading"
                                    : currentlyPlaying ===
                                        currentRecitation.id && isPlaying
                                    ? "pause"
                                    : "play"
                                }
                                size={40}
                                color="#fff"
                              />
                            </TouchableOpacity>
                          </View>

                          {/* 🎯 NOUVEAU : Navigation entre sourates */}
                          <View style={styles.audioNavigationContainer}>
                            {/* Affichage de la sourate actuelle - AU-DESSUS */}
                            <View style={styles.audioCurrentSurah}>
                              <Text style={styles.audioCurrentSurahText}>
                                {t("surah")} {selectedSourate}
                              </Text>
                              <Text style={styles.audioCurrentSurahName}>
                                {getSelectedSourateLabel()}
                              </Text>
                            </View>

                            {/* Info navigation discrète - EN DESSOUS */}
                            <View style={styles.navigationInfoContainer}>
                              <TouchableOpacity
                                style={styles.navigationInfoButton}
                                onPress={() => setShowNavigationTooltip(true)}
                                activeOpacity={0.7}
                              >
                                <MaterialCommunityIcons
                                  name="information-outline"
                                  size={18}
                                  color={
                                    showNavigationTooltip
                                      ? "#4ECDC4"
                                      : "#B0B0B0"
                                  }
                                />
                                <Text
                                  style={[
                                    styles.navigationInfoText,
                                    showNavigationTooltip &&
                                      styles.navigationInfoTextActive,
                                  ]}
                                >
                                  Navigation
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Barre de progression - TOUJOURS présente pour éviter les changements de layout */}
                          <View style={styles.audioProgressContainer}>
                            {playbackDuration > 0 ? (
                              <AudioSeekBar
                                currentPosition={playbackPosition}
                                totalDuration={playbackDuration}
                                onSeek={seekToPosition}
                              />
                            ) : (
                              <>
                                <Text style={styles.audioTimeText}>--:--</Text>
                                {/* NOUVEAU : Debug info pour comprendre pourquoi la durée n'est pas affichée */}
                                {__DEV__ && (
                                  <Text style={styles.debugText}>
                                    Debug: pos={playbackPosition}, dur=
                                    {playbackDuration}
                                  </Text>
                                )}
                              </>
                            )}
                          </View>

                          {/* Options de téléchargement/streaming */}
                          <View style={styles.audioOptionsContainer}>
                            {/* 🚀 NOUVEAU : Vérifier si téléchargement en cours */}
                            {(() => {
                              const downloadingState = downloadState.get(
                                currentRecitation.id
                              );
                              const isDownloading =
                                downloadingState?.isDownloading || false;
                              const progress = downloadingState?.progress || 0;
                              // const hasError = downloadingState?.error || false;

                              if (isDownloading) {
                                // Téléchargement en cours - Afficher la jauge de progression
                                return (
                                  <ProgressBar
                                    progress={progress}
                                    onCancel={() =>
                                      handleNativeCancelDownload(
                                        currentRecitation.id
                                      )
                                    }
                                  />
                                );
                              } else if (!currentRecitation.isDownloaded) {
                                // Pas téléchargé - Afficher le bouton de téléchargement
                                return (
                                  <TouchableOpacity
                                    style={styles.audioDownloadButton}
                                    onPress={() =>
                                      handleNativeDownloadRecitation(
                                        currentRecitation
                                      )
                                    }
                                  >
                                    <MaterialCommunityIcons
                                      name="download"
                                      size={20}
                                      color="#FFD700"
                                    />
                                    <Text style={styles.audioDownloadText}>
                                      {t("download")} (
                                      {currentRecitation.fileSize}
                                      MB)
                                    </Text>
                                  </TouchableOpacity>
                                );
                              } else {
                                // Téléchargé - Afficher l'info et le bouton de suppression
                                return (
                                  <View style={styles.downloadedInfoContainer}>
                                    <MaterialCommunityIcons
                                      name="check-circle"
                                      size={20}
                                      color="#4CAF50"
                                    />
                                    <Text style={styles.downloadedInfoText}>
                                      {t("downloaded_locally")}
                                    </Text>
                                    <TouchableOpacity
                                      style={styles.audioDeleteButton}
                                      onPress={() =>
                                        handleDeleteRecitation(
                                          currentRecitation
                                        )
                                      }
                                    >
                                      <MaterialCommunityIcons
                                        name="delete"
                                        size={16}
                                        color="#FF6B6B"
                                      />
                                    </TouchableOpacity>
                                  </View>
                                );
                              }
                            })()}
                          </View>

                          {/* Bouton stop */}
                          <TouchableOpacity
                            style={styles.audioStopButton}
                            onPress={stopRecitation}
                          >
                            <MaterialCommunityIcons
                              name="stop"
                              size={24}
                              color="#FF6B6B"
                            />
                            <Text style={styles.audioStopText}>
                              {t("stop")}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </Animated.View>
                </ScrollView>
              </PanGestureHandler>
            </SafeAreaView>
          </GestureHandlerRootView>
        </Modal>

        {/* Modal de sélection du récitateur */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={reciterModalVisible}
          onRequestClose={() => setReciterModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View
              style={[styles.modalContent, { maxHeight: windowHeight * 0.6 }]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("choose_reciter")}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setReciterModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={getAvailableReciters().map((reciter) => ({
                  key: reciter,
                  label: reciter,
                }))}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.optionStyle,
                      selectedReciter === item.key &&
                        styles.selectedOptionStyle,
                    ]}
                    onPress={() => {
                      setSelectedReciter(item.key);
                      setReciterModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionTextStyle,
                        selectedReciter === item.key &&
                          styles.selectedOptionTextStyle,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.key}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={true}
              />
            </View>
          </SafeAreaView>
        </Modal>

        {/* 🌐 Affichage normal du Coran */}
        <>
          {/* N'affiche pas Bismillah pour sourate 9 */}
          {selectedSourate !== 9 && (
            <Text style={styles.bismillah}>{t("bismillah")}</Text>
          )}

          <FlatList
            data={filteredVerses}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item, index }) => {
              // Affichage normal d'une sourate
              const originalIndex = arabicVerses.findIndex(
                (v) => v.id === item.id
              );
              const phoneticText = phoneticArr[originalIndex]?.text || "";
              const translationText = translationArr[originalIndex]?.text || "";

              // Obtenir le nom de la sourate pour les favoris
              const currentSourate = sourates.find(
                (s) => s.id === selectedSourate
              );
              const chapterName = currentSourate
                ? currentSourate.name_simple
                : "Sourate inconnue";

              // 🎯 NOUVEAU : Vérifier si ce verset est en cours de lecture (version simplifiée pour debug)
              // TODO: À implémenter plus tard
              /*
            const isCurrentlyPlaying =
              currentVerseIndex !== null && originalIndex === currentVerseIndex;

            console.log(
              `🎵 Rendu verset ${originalIndex}: isCurrentlyPlaying=${isCurrentlyPlaying}, currentVerseIndex=${currentVerseIndex}, currentlyPlaying=${currentlyPlaying}`
            );
            */

              return (
                <View
                  style={[
                    styles.ayahContainer,
                    // TODO: isCurrentlyPlaying && styles.ayahContainerPlaying,
                  ]}
                >
                  <View style={styles.arabicRow}>
                    <Text
                      style={[
                        styles.arabic,
                        // TODO: isCurrentlyPlaying && styles.arabicPlaying,
                      ]}
                    >
                      {item.text_uthmani}
                    </Text>
                    <View style={styles.verseActions}>
                      <View
                        style={[
                          styles.verseCircle,
                          // TODO: isCurrentlyPlaying && styles.verseCirclePlaying,
                        ]}
                      >
                        <Text
                          style={[
                            styles.verseNumber,
                            // TODO: isCurrentlyPlaying && styles.verseNumberPlaying,
                          ]}
                        >
                          {item.verse_key ? item.verse_key.split(":")[1] : "1"}
                        </Text>
                      </View>
                      <FavoriteButton
                        favoriteData={convertToFavorite(
                          item,
                          translationText,
                          chapterName
                        )}
                        size={20}
                        iconColor="#ba9c34"
                        iconColorActive="#FFD700"
                        style={styles.favoriteButtonCompact}
                      />
                    </View>
                  </View>

                  <Text style={styles.phonetic}>{phoneticText}</Text>

                  {lang !== "ar" && (
                    <Text style={styles.traduction}>
                      {stripHtml(translationText)}
                    </Text>
                  )}

                  <Image
                    source={require("../assets/images/ayah_separator.png")}
                    style={styles.ayahSeparator}
                    resizeMode="contain"
                  />
                </View>
              );
            }}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={10}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={100}
          />
        </>
      </View>

      {/* Modal d'information de navigation */}
      <Modal
        visible={showNavigationTooltip}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNavigationTooltip(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalNavigationTooltip}>
            <Text style={styles.modalNavigationTooltipTitle}>
              {t("quran_navigation_modal.title")}
            </Text>

            <View style={styles.modalNavigationTooltipRow}>
              <MaterialCommunityIcons
                name="gesture-swipe-horizontal"
                size={20}
                color="#4ECDC4"
              />
              <Text style={styles.modalNavigationTooltipText}>
                {t("quran_navigation_modal.swipe_instruction")}
              </Text>
            </View>

            <View style={styles.modalNavigationTooltipRow}>
              <MaterialCommunityIcons
                name="widgets"
                size={20}
                color="#FFD700"
              />
              <Text style={styles.modalNavigationTooltipText}>
                {t("quran_navigation_modal.widget_instruction")}
              </Text>
            </View>

            <View style={styles.modalNavigationTooltipRow}>
              <MaterialCommunityIcons name="play" size={20} color="#4CAF50" />
              <Text style={styles.modalNavigationTooltipText}>
                {t("quran_navigation_modal.play_instruction")}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowNavigationTooltip(false)}
            >
              <Text style={styles.modalCloseButtonText}>
                {t("quran_navigation_modal.close_button")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 60, // Ajout d'un padding en haut pour descendre le bouton
  },
  // 🎨 NOUVEAU : Styles pour le header avec menu
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#523f13",
    fontFamily: "ScheherazadeNew",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#2c1810",
    fontFamily: "ScheherazadeNew",
    marginTop: 4,
    fontWeight: "500",
  },
  menuButton: {
    backgroundColor: "#e7c86a",
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#ba9c34",
    borderWidth: 2,
    shadowColor: "#b59d42",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  menuButtonText: {
    fontSize: 24,
    color: "#523f13",
    fontWeight: "bold",
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  menuContent: {
    backgroundColor: "#fffbe6",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e7c86a",
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#523f13",
    fontFamily: "ScheherazadeNew",
  },
  menuSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ba9c34",
    marginBottom: 12,
    fontFamily: "ScheherazadeNew",
  },
  menuOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    padding: 16,
    borderRadius: 12,
    borderColor: "#e7c86a",
    borderWidth: 1,
  },
  menuOptionText: {
    fontSize: 16,
    color: "#523f13",
    fontFamily: "ScheherazadeNew",
    flex: 1,
  },
  menuArrow: {
    fontSize: 20,
    color: "#ba9c34",
    marginLeft: 10,
  },
  // 🎨 ANCIEN : Styles pour le header compact (gardé pour la version offline)
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(231, 200, 106, 0.15)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e7c86a",
    gap: 8,
  },
  compactSourateSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbe6",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ba9c34",
    flex: 2,
  },
  compactLangSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbe6",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ba9c34",
    flex: 1,
  },
  compactSourateText: {
    fontSize: 14,
    color: "#2c1810",
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  compactLangText: {
    fontSize: 14,
    color: "#2c1810",
    fontWeight: "600",
    marginRight: 8,
  },
  versesContainer: {
    paddingBottom: 20,
    marginRight: 4,
  },
  compactReciterSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbe6",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ba9c34",
    flex: 1.5,
  },
  compactReciterText: {
    flex: 1,
    fontSize: 12,
    color: "#483C1C",
    fontWeight: "500",
    marginHorizontal: 4,
  },
  // 🌐 NOUVEAU : Section des contrôles hors ligne
  offlineControlsSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  // 🌐 NOUVEAU : Styles pour les indicateurs de connectivité
  offlineIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff5f5",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#ff6b6b",
  },
  offlineText: {
    fontSize: 11,
    color: "#d63031",
    fontWeight: "500",
    marginLeft: 4,
  },
  connectivityIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbe6",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#ba9c34",
  },
  connectivityText: {
    fontSize: 11,
    color: "#ba9c34",
    fontWeight: "500",
    marginLeft: 4,
  },
  diagnosticButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff6b6b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  diagnosticButtonText: {
    fontSize: 12,
    color: "#ffffff",
    marginLeft: 4,
    fontWeight: "bold",
  },
  // 🌐 NOUVEAU : Styles pour le bouton de basculement mode hors ligne
  offlineManagerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbe6",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#ba9c34",
  },
  offlineManagerButtonActive: {
    backgroundColor: "#fff5f5",
    borderColor: "#ff6b6b",
  },
  offlineManagerButtonText: {
    fontSize: 11,
    color: "#ba9c34",
    fontWeight: "500",
    marginLeft: 4,
  },
  offlineManagerButtonTextActive: {
    color: "#d63031",
  },
  // 🌐 NOUVEAU : Styles pour la liste des récitations hors ligne
  offlineRecitationsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  offlineRecitationsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#483C1C",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "ScheherazadeNew",
  },
  // 🎵 NOUVEAU : Styles pour la navigation par récitateur
  offlineHeader: {
    marginBottom: 16,
  },
  offlineHeaderWithBack: {
    flexDirection: "column",
    gap: 8,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(231, 200, 106, 0.1)",
  },
  backButtonText: {
    fontSize: 14,
    color: "#ba9c34",
    fontWeight: "600",
  },
  offlineReciterItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(231, 200, 106, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e7c86a",
  },
  offlineReciterInfo: {
    flex: 1,
  },
  offlineReciterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  offlineReciterName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#483C1C",
    flex: 1,
  },
  offlineReciterCount: {
    fontSize: 14,
    color: "#ba9c34",
    fontWeight: "500",
  },
  offlineRecitersList: {
    paddingBottom: 120, // Espace pour le menu de navigation en bas
  },
  // 🎵 NOUVEAU : Styles pour la playlist et lecture en continu
  offlineReciterTitleContainer: {
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
  },
  playlistIndicator: {
    fontSize: 12,
    color: "#4ECDC4",
    fontWeight: "600",
    marginTop: 4,
  },
  playlistControls: {
    marginTop: 12,
  },
  playAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(78, 205, 196, 0.1)",
    borderWidth: 1,
    borderColor: "#4ECDC4",
  },
  playAllButtonText: {
    fontSize: 14,
    color: "#4ECDC4",
    fontWeight: "600",
  },
  stopPlaylistButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  stopPlaylistButtonText: {
    fontSize: 14,
    color: "#FF6B6B",
    fontWeight: "600",
  },
  offlineRecitationItemActive: {
    backgroundColor: "rgba(78, 205, 196, 0.05)",
    borderColor: "#4ECDC4",
    borderWidth: 2,
  },
  offlineRecitationTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  playlistCurrentIcon: {
    marginRight: 8,
  },
  offlineRecitationTitleActive: {
    color: "#4ECDC4",
    fontWeight: "bold",
  },
  offlineRecitationBadgesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playlistPositionBadge: {
    backgroundColor: "rgba(78, 205, 196, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  playlistPositionText: {
    fontSize: 10,
    color: "#4ECDC4",
    fontWeight: "600",
  },
  noRecitationsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  noRecitationsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ba9c34",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  noRecitationsSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  offlineRecitationsList: {
    paddingBottom: 120, // Espace pour le menu de navigation en bas
  },
  offlineRecitationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbe6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e7c86a",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  offlineRecitationInfo: {
    flex: 1,
    marginRight: 12,
  },
  offlineRecitationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#483C1C",
    marginBottom: 4,
  },
  offlineRecitationSubtitle: {
    fontSize: 13,
    color: "#ba9c34",
    opacity: 0.8,
  },
  offlineRecitationReciter: {
    fontSize: 14,
    color: "#ba9c34",
    marginBottom: 6,
  },
  offlineRecitationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e8",
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignSelf: "flex-start",
  },
  offlineRecitationBadgeText: {
    fontSize: 10,
    color: "#4CAF50",
    fontWeight: "500",
    marginLeft: 2,
  },
  offlineRecitationActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  offlineRecitationPlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(78, 205, 196, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#4ECDC4",
  },
  offlineRecitationPlayButtonActive: {
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    borderColor: "#FF6B6B",
  },
  offlineRecitationDeleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  // 🚀 SUPPRIMÉ : Styles du bouton de rechargement (plus nécessaire)
  // 🎨 NOUVEAU : Bouton play flottant pour les récitations premium
  floatingPlayButton: {
    position: "absolute",
    bottom: 140, // Augmenté davantage pour être complètement visible
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4ECDC4",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  floatingPlayButtonInactive: {
    backgroundColor: "#ba9c34",
  },
  // 🎨 NOUVEAU : Styles pour le modal des contrôles audio
  audioModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  audioModalScrollView: {
    flex: 1,
    width: "100%",
  },
  audioModalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  audioModalContent: {
    backgroundColor: "transparent", // Transparent pour voir le GIF
    borderRadius: 20,
    paddingBottom: 20, // Padding en bas pour l'espace
    width: "90%",
    maxWidth: 400,
  },
  audioModalOverlay: {
    backgroundColor: "transparent", // Transparent pour voir le GIF
    borderRadius: 20,
    paddingBottom: 20, // Padding en bas
  },
  audioModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // padding: 16, // SUPPRIMÉ
    // borderBottomWidth: 1, // SUPPRIMÉ
    // borderBottomColor: "#e7c86a", // SUPPRIMÉ
  },
  audioModalTitle: {
    fontSize: 18,
    color: "#FFF",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  audioModalSubtitle: {
    fontSize: 14,
    color: "#FFF",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  audioModalBody: {
    // padding: 20, // SUPPRIMÉ
    alignItems: "center",
  },
  // 🎵 NOUVEAU : Styles pour l'indicateur de lecture (GIF maintenant en fond)
  audioAnimationContainer: {
    alignItems: "center",
    marginBottom: 4,
    padding: 4,
    backgroundColor: "rgba(78, 205, 196, 0.2)",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(78, 205, 196, 0.6)",
    minHeight: 50,
  },

  // 🎵 NOUVEAU : Styles pour la barre de progression améliorée
  seekBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 20,
    gap: 10,
  },

  seekBarWrapper: {
    flex: 1,
    position: "relative",
  },

  audioProgressBarActive: {
    height: 12, // Légèrement plus épais pendant le glissement
    borderWidth: 2,
    borderColor: "#FF6B6B",
    borderRadius: 6, // Maintient les coins arrondis
  },

  audioTimeTextActive: {
    color: "#FF6B6B",
    fontWeight: "bold",
  },

  seekPreview: {
    position: "absolute",
    top: -40, // Ajusté pour le curseur de taille normale
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    transform: [{ translateX: -20 }], // Centrage pour curseur 16px
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  seekPreviewText: {
    color: "#FFF",
    fontSize: 14, // Plus gros pour une meilleure lisibilité
    fontWeight: "700", // Plus gras
    textAlign: "center",
  },

  audioAnimationText: {
    fontSize: 16, // Plus grand pour plus de visibilité
    color: "#4ECDC4",
    fontWeight: "700", // Plus gras
    fontStyle: "italic",
    textShadowColor: "rgba(0, 0, 0, 0.3)", // Ombre pour meilleure lisibilité
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  debugText: {
    fontSize: 10,
    color: "#FF6B6B",
    fontWeight: "400",
    fontStyle: "italic",
    marginTop: 5,
  },
  debugBackgroundColor: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 0, 255, 0.2)", // Magenta pour debug
    borderRadius: 20,
    zIndex: -1,
  },
  audioModalGifOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    width: "100%",
    height: "100%",
    opacity: 0.6,
    zIndex: 1,
  },
  audioModalGifBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    width: "100%",
    height: "100%",
    opacity: 1, // GIF complètement visible
    zIndex: 0,
    backgroundColor: "transparent",
  },
  audioInfoContainer: {
    alignItems: "center",
    marginBottom: 20,
    padding: 15,
    backgroundColor: "rgba(231, 200, 106, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e7c86a",
    width: "100%",
  },
  audioReciterName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 2,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  audioSurahName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 10,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  audioLocalBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  audioLocalText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: 4,
  },
  audioMainControls: {
    marginBottom: 20,
    alignItems: "center",
  },
  audioPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4ECDC4",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  audioPlayButtonActive: {
    backgroundColor: "#FF6B6B",
  },
  audioProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 20,
    gap: 10,
  },
  audioTimeText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    minWidth: 40,
    textAlign: "center",
  },
  audioProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(186, 156, 52, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  audioProgressFill: {
    height: "100%",
    backgroundColor: "#4ECDC4",
    borderRadius: 4,
  },
  audioDownloadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  audioDownloadText: {
    fontSize: 16,
    color: "#222",
    fontWeight: "600",
    marginLeft: 8,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  audioStopButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  audioStopText: {
    fontSize: 16,
    color: "#222",
    fontWeight: "600",
    marginLeft: 8,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  audioOptionsContainer: {
    marginBottom: 12,
  },
  downloadedInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  downloadedInfoText: {
    flex: 1,
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: 8,
  },
  audioDeleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  // 🎯 NOUVEAU : Styles pour la navigation entre sourates (COMPACT)
  audioNavigationContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    marginTop: 4,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  audioNavButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    minWidth: 60,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  audioNavButtonDisabled: {
    backgroundColor: "rgba(200,200,200,0.5)",
    borderColor: "#bbb",
  },
  audioNavButtonText: {
    fontSize: 12,
    color: "#222",
    fontWeight: "600",
    marginHorizontal: 2,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // 🎯 NOUVEAU : Styles pour l'info navigation
  navigationInfoContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginTop: 8,
    position: "relative",
  },
  navigationInfoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  navigationInfoText: {
    color: "#B0B0B0",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "600",
  },
  navigationInfoTextActive: {
    color: "#4ECDC4",
  },
  // Styles de la Modal d'information de navigation
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalNavigationTooltip: {
    backgroundColor: "rgba(20, 20, 20, 0.95)",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 350,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  modalNavigationTooltipTitle: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  modalNavigationTooltipRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  modalNavigationTooltipText: {
    color: "#FFFFFF",
    fontSize: 15,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  modalCloseButton: {
    backgroundColor: "#4ECDC4",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: "center",
    marginTop: 8,
  },
  modalCloseButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  audioCurrentSurah: {
    alignItems: "center",
    marginBottom: 4,
  },
  audioCurrentSurahText: {
    fontSize: 14,
    color: "#FFF",
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  audioCurrentSurahName: {
    fontSize: 12,
    color: "#FFF",
    fontStyle: "italic",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  audioNavButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 4,
  },
  // 🎯 NOUVEAU : Styles pour le contrôle du scroll automatique
  autoScrollContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(186, 156, 52, 0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ba9c34",
    marginBottom: 12,
  },
  autoScrollLeft: {
    flex: 1,
  },
  confidenceText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 2,
  },
  autoScrollText: {
    fontSize: 16,
    color: "#483C1C",
    fontWeight: "600",
  },
  autoScrollToggle: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(186, 156, 52, 0.2)",
    borderWidth: 1,
    borderColor: "#ba9c34",
  },
  autoScrollToggleActive: {
    backgroundColor: "rgba(78, 205, 196, 0.2)",
    borderColor: "#4ECDC4",
  },
  selectStyle: {
    backgroundColor: "#e7c86a",
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderColor: "#ba9c34",
    borderWidth: 2,
    shadowColor: "#b59d42",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  selectTextStyle: {
    fontSize: 18,
    color: "#483C1C",
    fontFamily: "ScheherazadeNew",
    textAlign: "left",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fffbe6",
    borderRadius: 20,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e7c86a",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#483C1C",
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: "#483C1C",
  },
  listContent: {
    paddingBottom: 20,
  },
  optionStyle: {
    backgroundColor: "#fffbe6",
    borderBottomWidth: 1,
    borderColor: "#e7c86a",
    padding: 12,
  },
  selectedOptionStyle: {
    backgroundColor: "#e7c86a",
  },
  optionTextStyle: {
    fontSize: 18,
    color: "#444",
    fontFamily: "ScheherazadeNew",
  },
  selectedOptionTextStyle: {
    color: "#483C1C",
    fontWeight: "bold",
  },
  ayahContainer: {
    marginVertical: 12,
    paddingVertical: 8,
  },
  // 🎯 NOUVEAU : Styles pour le verset en cours de lecture
  ayahContainerPlaying: {
    backgroundColor: "rgba(78, 205, 196, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: "#4ECDC4",
    shadowColor: "#4ECDC4",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  arabicPlaying: {
    color: "#2E8B57",
    fontWeight: "bold",
  },
  verseCirclePlaying: {
    backgroundColor: "#4ECDC4",
    borderColor: "#2E8B57",
    shadowColor: "#4ECDC4",
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  verseNumberPlaying: {
    color: "#fff",
    fontWeight: "bold",
  },
  arabic: {
    fontSize: 30,
    textAlign: "right",
    color: "#222",
    marginBottom: 8,
    fontFamily: "ScheherazadeNew",
    lineHeight: 60,
    flex: 1,
    flexShrink: 1,
  },
  phonetic: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#666",
    marginBottom: 2,
  },
  traduction: {
    fontSize: 16,
    textAlign: "left",
    color: "#338",
    marginBottom: 2,
  },
  ayahSeparator: {
    marginTop: 50,
    alignSelf: "center",
    width: 50,
    height: 50,
    marginVertical: 7,
  },
  bismillah: {
    textAlign: "center",
    color: "#7c6720",
    fontSize: 28,
    marginVertical: 12,
    fontFamily: "ScheherazadeNew",
    lineHeight: 44,
    letterSpacing: 1,
  },
  arabicRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  verseCircle: {
    backgroundColor: "#e7c86a",
    borderRadius: 14,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#ba9c34",
    shadowColor: "#a0802a",
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  verseNumber: {
    color: "#6b510e",
    fontWeight: "bold",
    fontSize: 15,
    fontFamily: "ScheherazadeNew",
  },
  verseActions: {
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  favoriteButtonCompact: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "rgba(186, 156, 52, 0.08)",
  },
  searchInput: {
    height: 40,
    backgroundColor: "#fffbe6",
    borderRadius: 20,
    borderColor: "#ba9c34",
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 14,
    color: "#523f13",
    textAlign: "left",
  },
  sourateHeader: {
    backgroundColor: "rgba(231, 200, 106, 0.2)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#e7c86a",
  },
  sourateName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#7c6720",
    textAlign: "center",
    fontFamily: "ScheherazadeNew",
  },
  searchContainer: {
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  searchLoader: {
    position: "absolute",
    right: 15,
    top: "50%",
    marginTop: -10,
  },
  searchInfo: {
    fontSize: 14,
    color: "#7c6720",
    textAlign: "center",
    marginBottom: 12,
    fontStyle: "italic",
  },

  // Styles pour la section récitateur premium rétractable
  reciterSection: {
    backgroundColor: "rgba(231, 200, 106, 0.15)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e7c86a",
  },
  reciterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fffbe6",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ba9c34",
  },
  reciterHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  reciterHeaderText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    fontSize: 16,
    color: "#483C1C",
    fontWeight: "500",
  },
  reciterHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reciterSelectorButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "rgba(186, 156, 52, 0.1)",
  },
  collapseButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "rgba(186, 156, 52, 0.1)",
  },
  // 🎨 NOUVEAU : Styles pour les contrôles compacts
  compactControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  compactPlayButton: {
    padding: 12,
    borderRadius: 25,
    backgroundColor: "rgba(78, 205, 196, 0.2)",
    borderWidth: 1,
    borderColor: "#4ECDC4",
    alignItems: "center",
    justifyContent: "center",
  },
  activeCompactButton: {
    backgroundColor: "rgba(78, 205, 196, 0.4)",
  },
  // Anciens styles conservés pour compatibilité
  reciterSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fffbe6",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ba9c34",
  },
  reciterText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    fontSize: 16,
    color: "#483C1C",
    fontWeight: "500",
  },
  audioControls: {
    marginTop: 12,
    alignItems: "center",
  },
  noRecitationText: {
    fontSize: 14,
    color: "#7c6720",
    fontStyle: "italic",
    textAlign: "center",
    padding: 8,
  },
  downloadProgress: {
    width: "100%",
    alignItems: "center",
  },
  downloadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  downloadProgressTitle: {
    fontSize: 14,
    color: "#7c6720",
    fontWeight: "600",
  },
  cancelButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(186, 156, 52, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4ECDC4",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#7c6720",
    fontWeight: "bold",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(78, 205, 196, 0.1)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#4ECDC4",
  },
  downloadButtonText: {
    fontSize: 14,
    color: "#FFD700",
    fontWeight: "600",
  },
  downloadWarningText: {
    fontSize: 11,
    color: "#7c6720",
    fontStyle: "italic",
    marginTop: 2,
    textAlign: "center",
  },
  bandwidthInfo: {
    fontSize: 12,
    color: "#7c6720",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
    opacity: 0.8,
  },
  playbackControls: {
    marginTop: 12,
    gap: 8,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    minWidth: 40,
    textAlign: "center",
  },
  progressBarContainer: {
    flex: 1,
    height: 30,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  progressBarAudio: {
    height: 6,
    backgroundColor: "rgba(186, 156, 52, 0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFillAudio: {
    height: "100%",
    backgroundColor: "#4ECDC4",
    borderRadius: 3,
  },
  controlButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  controlButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(231, 200, 106, 0.2)",
    borderWidth: 1,
    borderColor: "#e7c86a",
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // Nouveaux styles pour la nouvelle structure de contrôles audio
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
    color: "#7c6720",
    fontWeight: "600",
  },
  recitationOptions: {
    backgroundColor: "rgba(231, 200, 106, 0.1)",
    borderRadius: 12,
    padding: 16,
    margin: 8,
    borderWidth: 1,
    borderColor: "#e7c86a",
  },
  recitationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#483C1C",
    textAlign: "center",
    marginBottom: 12,
  },
  recitationActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "rgba(231, 200, 106, 0.2)",
    borderWidth: 1,
    borderColor: "#e7c86a",
  },
  streamButton: {
    backgroundColor: "rgba(78, 205, 196, 0.2)",
    borderColor: "#4ECDC4",
  },
  activeButton: {
    backgroundColor: "rgba(78, 205, 196, 0.4)",
  },
  streamButtonText: {
    fontSize: 14,
    color: "#4ECDC4",
    fontWeight: "600",
  },
  downloadedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  downloadedText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },
  downloadedSection: {
    backgroundColor: "rgba(231, 200, 106, 0.1)",
    borderRadius: 12,
    padding: 16,
    margin: 8,
    borderWidth: 1,
    borderColor: "#e7c86a",
  },
  downloadedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(231, 200, 106, 0.2)",
    borderWidth: 1,
    borderColor: "#e7c86a",
  },
  mainControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  mainPlayButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "rgba(78, 205, 196, 0.2)",
    borderWidth: 1,
    borderColor: "#4ECDC4",
  },
  activePlayButton: {
    backgroundColor: "rgba(78, 205, 196, 0.4)",
  },
  stopButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(231, 200, 106, 0.2)",
    borderWidth: 1,
    borderColor: "#e7c86a",
  },
  clearQuranButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#FF6B6B",
    gap: 4,
  },
  clearQuranButtonText: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "600",
  },
  stopButtonCenter: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    borderWidth: 1,
    borderColor: "#FF6B6B",
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // 🚀 NOUVEAU : Styles pour la jauge de progression
  downloadProgressContainer: {
    backgroundColor: "rgba(231, 200, 106, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#e7c86a",
  },
  downloadProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  downloadProgressCancelButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    borderWidth: 1,
    borderColor: "#FF6B6B",
    alignItems: "center",
    justifyContent: "center",
  },
  downloadProgressBackground: {
    height: 8,
    backgroundColor: "rgba(186, 156, 52, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  downloadProgressFill: {
    height: "100%",
    backgroundColor: "#4ECDC4",
    borderRadius: 4,
  },
  // Titre principal adapté (nom du récitateur et de la sourate)
  audioReciterSurahTitle: {
    fontSize: 16,
    color: "#FFF",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // 📱 NOUVEAU : Styles pour la page offline
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c1810",
    marginBottom: 16,
    textAlign: "center",
  },
  placeholderText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 20,
  },
  compactHeaderOffline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(231, 200, 106, 0.15)",
    borderRadius: 12, // ✅ RÉDUIT de 16 à 12
    padding: 8, // ✅ RÉDUIT de 12 à 8
    marginBottom: 8, // ✅ RÉDUIT de 16 à 8
    borderWidth: 1,
    borderColor: "#e7c86a",
    gap: 6, // ✅ RÉDUIT de 8 à 6
  },
});
