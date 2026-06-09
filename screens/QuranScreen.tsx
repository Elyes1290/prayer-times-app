import { Z_INDEX } from "../constants/zIndex";
import * as Font from "expo-font";
import { Audio } from "expo-av";
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
  Pressable,
  Modal,
  useWindowDimensions,
  TextInput,
  Alert,
  ScrollView,
  DeviceEventEmitter,
  Platform,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { MCIcon, IonIcon } from "@/components/icons/AppVectorIcons";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
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
import { addPlaybackDebugLog } from "../utils/playbackDebugLogs";
import {
  parseSurahNumberFromServiceTitle,
  resolvePlaybackDurationMs,
} from "../utils/audioDurationUtils";
import { toPremiumStreamPlaybackUrl } from "../utils/premiumPlaybackUrl";
import { logQuranSeek } from "../utils/quranSeekDebug";
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

// 🎵 Import des GIFs disponibles (premium)
import audioWave3Gif from "../assets/images/gif/audio_wave3.gif";
import audioWave3Fix from "../assets/images/gif/audio_wave3_fix.png";
import chuteGif from "../assets/images/gif/chute.gif";
import chuteFix from "../assets/images/gif/chute_fix.png";
import riviereGif from "../assets/images/gif/riviere.gif";
import riviereFix from "../assets/images/gif/riviere_fix.png";
import alqudsGif from "../assets/images/gif/alquds.gif";
import alqudsFix from "../assets/images/gif/alquds_fix.png";
import madinaGif from "../assets/images/gif/madina.gif";
import madinaFix from "../assets/images/gif/madina_fix.png";
import makkaGif from "../assets/images/gif/makka.gif";
import makkaFix from "../assets/images/gif/makka_fix.png";

// 🎵 Types et configuration des GIFs
type AudioGifType =
  | "audio_wave3"
  | "chute"
  | "riviere"
  | "alquds"
  | "madina"
  | "makka";

const AVAILABLE_GIFS = {
  audio_wave3: {
    id: "audio_wave3" as AudioGifType,
    name: "Ondes Audio",
    gifImage: audioWave3Gif,
    fixImage: audioWave3Fix,
    premium: false,
  },
  chute: {
    id: "chute" as AudioGifType,
    name: "Cascade",
    gifImage: chuteGif,
    fixImage: chuteFix,
    premium: true,
  },
  riviere: {
    id: "riviere" as AudioGifType,
    name: "Rivière",
    gifImage: riviereGif,
    fixImage: riviereFix,
    premium: true,
  },
  alquds: {
    id: "alquds" as AudioGifType,
    name: "Al-Quds 🏛️",
    gifImage: alqudsGif,
    fixImage: alqudsFix,
    premium: true,
  },
  madina: {
    id: "madina" as AudioGifType,
    name: "Médine 🕌",
    gifImage: madinaGif,
    fixImage: madinaFix,
    premium: true,
  },
  makka: {
    id: "makka" as AudioGifType,
    name: "Makka 🕋",
    gifImage: makkaGif,
    fixImage: makkaFix,
    premium: true,
  },
};

const AVAILABLE_GIFS_LIST = Object.values(AVAILABLE_GIFS);

function formatAudioTime(milliseconds: number): string {
  if (isNaN(milliseconds) || milliseconds <= 0) {
    return "0:00";
  }
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function stripHtml(text: string | undefined) {
  if (!text) return "";
  return (
    text
      .replace(/<sup[^>]*foot_note[^>]*>.*?<\/sup>/gi, "")
      .replace(/<a[^>]*>.*?<\/a>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function normalizeQuranText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[\u0653-\u065F]/g, "")
    .replace(/[\u0670]/g, "")
    .replace(/[\u06D6-\u06ED]/g, "")
    .replace(/[^\w\s\u0600-\u06FF\u0750-\u077F]/gi, "")
    .toLowerCase()
    .trim();
}

function convertToFavorite(
  item: { verse_key?: string; text_uthmani?: string },
  translationText: string,
  chapterName: string,
): Omit<QuranVerseFavorite, "id" | "dateAdded"> {
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
}

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
        <Pressable
          testID="download-cancel-button"
          style={styles.downloadProgressCancelButton}
          onPress={onCancel}
        >
          <MCIcon name="close" size={16} color="#FF6B6B" />
        </Pressable>
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

  const displayPosition = isDragging ? dragPosition : currentPosition;
  const displayProgress =
    totalDuration > 0
      ? Math.max(0, Math.min(1, displayPosition / totalDuration))
      : 0;
  const trackReady = totalDuration > 0;

  const positionFromTouchX = (x: number): number | null => {
    if (seekBarWidth <= 0 || totalDuration <= 0) {
      return null;
    }
    const clampedX = Math.max(0, Math.min(x, seekBarWidth));
    return (clampedX / seekBarWidth) * totalDuration;
  };

  const onGestureEvent = (event: any) => {
    const { x } = event.nativeEvent;
    if (isDragging) {
      const newPosition = positionFromTouchX(x);
      if (newPosition != null) {
        setDragPosition(newPosition);
      }
    }
  };

  const onPanHandlerStateChange = (event: any) => {
    const { state, x } = event.nativeEvent;

    if (state === State.BEGAN) {
      setIsDragging(true);
      const newPosition = positionFromTouchX(x);
      if (newPosition != null) {
        setDragPosition(newPosition);
      } else {
        setDragPosition(currentPosition);
      }
    } else if (state === State.END || state === State.CANCELLED) {
      if (isDragging) {
        const newPosition = positionFromTouchX(x);
        if (newPosition != null) {
          onSeek(newPosition);
        }
      }
      setIsDragging(false);
    }
  };

  return (
    <View style={styles.seekBarContainer}>
      <Text
        style={[styles.audioTimeText, isDragging && styles.audioTimeTextActive]}
      >
        {formatAudioTime(displayPosition)}
      </Text>

      <View style={styles.seekBarWrapper}>
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onPanHandlerStateChange}
          minDist={0}
          enabled={trackReady}
        >
          <View
            style={styles.audioProgressBarTouchTarget}
            onLayout={(event) =>
              setSeekBarWidth(event.nativeEvent.layout.width)
            }
          >
            <View
              pointerEvents="none"
              style={[
                styles.audioProgressBar,
                isDragging && styles.audioProgressBarActive,
              ]}
            >
              {trackReady && (
                <>
                  <View
                    style={[
                      styles.audioProgressFill,
                      {
                        flex: displayProgress > 0 ? displayProgress : 0.001,
                        backgroundColor: isDragging ? "#FF6B6B" : "#4ECDC4",
                      },
                    ]}
                  />
                  <View
                    style={{ flex: Math.max(0.001, 1 - displayProgress) }}
                  />
                </>
              )}
            </View>
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
              {formatAudioTime(displayPosition)}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.audioTimeText}>{formatAudioTime(totalDuration)}</Text>
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
  // 🍎 iOS: Navigation interne dans le menu (pas de 2ème modal)
  const [menuView, setMenuView] = useState<"main" | "sourateList">("main");
  const [showDownloadsView, setShowDownloadsView] = useState(false); // 🆕 Vue cachée de gestion des téléchargements
  const versesFlatListRef = useRef<FlatList>(null);
  const surahAutoPlayOnChangeRef = useRef(false);
  const surahDataRequestIdRef = useRef(0);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  // 📱 Hook pour obtenir les insets de la barre de statut
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState("");
  const [sourates, setSourates] = useState<any[]>([]);
  const [selectedSourate, setSelectedSourate] = useState(1);
  const [arabicVerses, setArabicVerses] = useState<any[]>([]);
  const [phoneticArr, setPhoneticArr] = useState<any[]>([]);
  const [translationArr, setTranslationArr] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    [],
  );

  // 🍎 État local pour les téléchargements iOS (RNFS)
  const [iosDownloadingIds, setIosDownloadingIds] = useState<Set<string>>(
    new Set(),
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

  // 🎵 NOUVEAU : États pour la sélection de GIF (premium)
  const [selectedGif, setSelectedGif] = useState<AudioGifType>("audio_wave3");
  const [gifModalVisible, setGifModalVisible] = useState(false);
  // 🍎 iOS: Navigation interne dans la modal audio (pas de 2ème modal)
  const [audioModalView, setAudioModalView] = useState<"player" | "gifSelector">("player");

  // 🎨 NOUVEAU : Déterminer la couleur des boutons en fonction du GIF
  // Pour makka, madina, alquds, riviere → blanc (fonds clairs)
  // Pour audio_wave3, chute → couleur sombre
  const modalButtonColor = ["makka", "madina", "alquds", "riviere"].includes(
    selectedGif,
  )
    ? "#FFFFFF"
    : "#483C1C";

  // 👆 NOUVEAU : État pour désactiver la synchronisation automatique (mode navigation app)
  const [isAppNavigation, setIsAppNavigation] = useState(false);
  // 🎯 NOUVEAU : Garder la trace de la dernière sourate du service pour détecter les changements widget
  const lastServiceSurahRef = useRef<string | null>(null);
  // 📝 NOUVEAU : État pour afficher le tooltip navigation
  const [showNavigationTooltip, setShowNavigationTooltip] = useState(false);

  const slideAnim = useSharedValue(0);

  const slideAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideAnim.value }],
  }));

  // 🎵 NOUVEAU : Refs pour fonctions circulaires
  const playNextInPlaylistRef = useRef<() => void>(() => {});
  const playPreviousInPlaylistRef = useRef<() => void>(() => {});
  /** Sourate à laquelle appartient playbackDuration (évite Fatiha + durée Baqara). */
  const lastDurationSurahRef = useRef<number | null>(null);

  // 🔧 Fonction pour réinitialiser l'animation si nécessaire
  const resetSlideAnimation = useCallback(() => {
    slideAnim.value = 0;
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
  const pendingSeekTargetRef = useRef(0);
  const pendingSeekUntilRef = useRef(0);
  const [manualPlaybackDuration, setManualPlaybackDuration] = useState(0);
  const [currentRecitation, setCurrentRecitation] =
    useState<PremiumContent | null>(null);

  // 🎵 NOUVEAU : États pour le lecteur de téléchargements (complètement indépendant)
  const [downloadsSound, setDownloadsSound] = useState<Audio.Sound | null>(
    null,
  );
  const [downloadsPlaying, setDownloadsPlaying] = useState<string | null>(null);
  const [downloadsIsPlaying, setDownloadsIsPlaying] = useState(false);
  const downloadsPositionRef = useRef(0);
  const downloadsDurationRef = useRef(0);
  const [downloadsPlaylist, setDownloadsPlaylist] = useState<PremiumContent[]>(
    [],
  );
  const [downloadsPlaylistIndex, setDownloadsPlaylistIndex] = useState(0);

  const scanDownloadedQuranFiles = useCallback(async (): Promise<
    PremiumContent[]
  > => {
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

      const dirs = reciterFolders.filter((folder) => folder.isDirectory());
      const perReciter = await Promise.all(
        dirs.map(async (folder) => {
            const reciterName = folder.name;
            const reciterFiles = await RNFS.readDir(folder.path);
            const items: PremiumContent[] = [];

            for (const file of reciterFiles) {
              if (!file.isFile() || !file.name.endsWith(".mp3")) continue;

              const nameWithoutExt = file.name.replace(".mp3", "");
              const parts = nameWithoutExt.split("_");
              const surahNumberStr = parts[parts.length - 1];
              if (!surahNumberStr) continue;

              const surahNumber = parseInt(surahNumberStr, 10);
              if (isNaN(surahNumber)) continue;

              const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
              const surahData = sourates.find((s) => s.id === surahNumber);
              const surahName = surahData
                ? `${surahData.name_simple} (${surahData.name_arabic})`
                : `Sourate ${surahNumber}`;

              items.push({
                id: nameWithoutExt,
                type: "quran",
                title: surahName,
                description: `Récitation par ${reciterName}`,
                fileUrl: "",
                fileSize: parseFloat(fileSizeMB),
                version: "1.0",
                isDownloaded: true,
                downloadPath: file.path,
                reciter: reciterName,
                surahNumber: surahNumber,
                surahName: surahName,
              });
            }

            return items;
          })
      );

      const quranRecitations = perReciter.flat();

      console.log(
        `✅ ${quranRecitations.length} récitations Quran trouvées dans ${
          dirs.length
        } récitateurs`,
      );
      return quranRecitations;
    } catch (error) {
      console.error("❌ Erreur scan dossier récitations:", error);
      return [];
    }
  }, [sourates]);
  const playNextDownloadedRef = useRef<(() => Promise<void>) | null>(null); // Ref pour éviter la closure
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
    serviceAudioState,
  );
  console.log(
    "🎵 Hook useQuranAudioService - Service disponible:",
    isServiceAvailable(),
  );

  const playbackDurationAccumRef = useRef(0);

  const serviceSyncedPlaybackDuration = useMemo(() => {
    if (!isServiceAvailable() || !user?.isPremium) {
      return 0;
    }

    const newPosition = serviceAudioState.position || 0;
    const rawDuration =
      serviceAudioState.duration || serviceAudioState.totalDuration || 0;
    const serviceSurahNum = parseSurahNumberFromServiceTitle(
      serviceAudioState.currentSurah,
    );
    const iosRaw =
      Platform.OS === "ios" &&
      serviceAudioState.totalDuration &&
      serviceAudioState.totalDuration > 0 &&
      serviceAudioState.totalDuration < 40000
        ? serviceAudioState.totalDuration * 1000
        : rawDuration;

    const resolved = resolvePlaybackDurationMs({
      rawDuration,
      positionMs: newPosition,
      previousMs: playbackDurationAccumRef.current,
      fileSizeMb: currentRecitation?.fileSize,
      catalogDurationMs: currentRecitation?.durationMs,
      selectedSurah: selectedSourate,
      serviceSurah: serviceSurahNum,
      iosScaledRaw: iosRaw,
    });

    if (resolved > 0) {
      playbackDurationAccumRef.current = resolved;
      lastDurationSurahRef.current = selectedSourate;
    }

    return resolved;
  }, [
    serviceAudioState.position,
    serviceAudioState.duration,
    serviceAudioState.totalDuration,
    serviceAudioState.currentSurah,
    user?.isPremium,
    currentRecitation?.fileSize,
    currentRecitation?.durationMs,
    selectedSourate,
  ]);

  const playbackDuration = useMemo(
    () =>
      serviceSyncedPlaybackDuration > 0
        ? serviceSyncedPlaybackDuration
        : manualPlaybackDuration,
    [serviceSyncedPlaybackDuration, manualPlaybackDuration],
  );

  // 🎵 NOUVEAU : Démarrer la lecture en continu d'un récitateur
  const startPlaylistMode = (reciterRecitations: PremiumContent[]) => {
    console.log(
      `🎵 Démarrage playlist avec ${reciterRecitations.length} récitations`,
    );

    const sortedRecitations = [...reciterRecitations].sort(
      (a, b) => (a.surahNumber || 0) - (b.surahNumber || 0),
    );

    console.log(
      `🎵 Récitations triées: ${sortedRecitations
        .map((r) => r.title)
        .join(", ")}`,
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
        `🎵 Démarrage de la première récitation: ${sortedRecitations[0].title}`,
      );
      playRecitation(sortedRecitations[0]);
    }
  };

  // 🎵 NOUVEAU : Forcer l'animation du GIF quand la modal s'ouvre
  useEffect(() => {
    if (audioControlsModalVisible) {
      // Forcer le re-render du GIF pour activer l'animation
      setGifKey((prev) => prev + 1);
    }
  }, [audioControlsModalVisible]);

  // 🎵 NOUVEAU : Sauvegarder le choix de GIF
  const selectGif = async (gifId: AudioGifType) => {
    try {
      setSelectedGif(gifId);
      await AsyncStorage.setItem("@selected_audio_gif", gifId);
      
      // 🍎 iOS: Fermer la vue interne au lieu de la modal
      if (Platform.OS === "ios") {
        setAudioModalView("player");
      } else {
        setGifModalVisible(false);
      }
      
      // Forcer le re-render pour appliquer le nouveau GIF
      setGifKey((prev) => prev + 1);
    } catch (err) {
      console.error("Erreur sauvegarde GIF:", err);
    }
  };

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
        `https://api.quran.com/api/v4/quran/translations/${translationId}?chapter_number=${chapterNumber}`,
      );
      const json = await res.json();

      if (json.translations && json.translations.length > 0) {
        return json.translations;
      } else if (translationId !== 85) {
        // fallback anglais si vide
        const fallbackRes = await fetch(
          `https://api.quran.com/api/v4/quran/translations/85?chapter_number=${chapterNumber}`,
        );
        const fallbackJson = await fallbackRes.json();
        return fallbackJson.translations || [];
      }
      return [];
    } catch {
      // fallback en cas d'erreur réseau
      if (translationId !== 85) {
        const fallbackRes = await fetch(
          `https://api.quran.com/api/v4/quran/translations/85?chapter_number=${chapterNumber}`,
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

  // 🆕 Scanner le dossier physique quand on active le mode hors ligne ou la vue des téléchargements
  useEffect(() => {
    console.log(
      `🔍 useEffect scan - isOfflineMode: ${offlineAccess.isOfflineMode}, showDownloadsView: ${showDownloadsView}`,
    );
    if (
      (offlineAccess.isOfflineMode || showDownloadsView) &&
      sourates.length > 0
    ) {
      scanDownloadedQuranFiles().then((files) => {
        console.log(
          `🎯 Fichiers scannés à setter dans l'état: ${files.length}`,
        );
        setScannedQuranFiles(files);
      });
    }
  }, [
    offlineAccess.isOfflineMode,
    showDownloadsView,
    sourates,
    scanDownloadedQuranFiles,
  ]);

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
        "🎵 Écouteurs d'événements audio initialisés via useQuranAudioService",
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
          "🎵 Démarrage automatique du service audio pour utilisateur premium",
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
      const rawDuration =
        serviceAudioState.duration ||
        serviceAudioState.totalDuration ||
        0;
      const newIsPlaying = serviceAudioState.isPlaying || false;

      console.log(
        "📊 Mise à jour état - position:",
        newPosition,
        "duration:",
        rawDuration,
        "isPlaying:",
        newIsPlaying,
        "currentSurah:",
        serviceAudioState.currentSurah,
      );

      const now = Date.now();
      if (now < pendingSeekUntilRef.current) {
        const target = pendingSeekTargetRef.current;
        const gap = Math.abs(newPosition - target);
        if (gap <= 3000) {
          pendingSeekUntilRef.current = 0;
          logQuranSeek("JS_SYNC_SEEK_OK", {
            target,
            newPosition,
            gap,
          });
          setPlaybackPosition(newPosition);
        } else {
          logQuranSeek("JS_SYNC_SEEK_WAIT", {
            target,
            newPosition,
            gap,
            remainingMs: pendingSeekUntilRef.current - now,
          });
        }
      } else {
        setPlaybackPosition(newPosition);
      }
      // État natif play/pause : toujours synchroniser (évite bouton bloqué sur « play » pendant isLoading)
      if (isServiceAvailable() && user?.isPremium) {
        setIsPlaying(newIsPlaying);
      } else if (!isLoading) {
        setIsPlaying(newIsPlaying);
      }

      // 🚀 DEBUG : Log vers la page de debug toutes les 2 secondes
      const currentSec = Math.floor(newPosition / 1000);
      const totalSec = Math.floor(playbackDuration / 1000);

      if (newPosition >= 0) {
        // Log plus souvent au début
        const shouldLog =
          newPosition === 0 || (currentSec % 2 === 0 && newPosition > 0);
        if (shouldLog) {
          addPlaybackDebugLog("JS Sync", {
            pos: currentSec,
            dur: totalSec,
            playing: newIsPlaying,
          });
          DeviceEventEmitter.emit("AddPlaybackDebugLog", {
            message: `[JS Sync] ${currentSec}s / ${totalSec}s (Play:${
              newIsPlaying ? "OUI" : "NON"
            })`,
            type: "info",
            details: {
              newPosition,
              rawDuration,
              rawServiceDur: serviceAudioState.duration,
              rawServiceTotalDur: serviceAudioState.totalDuration,
              playbackDuration,
            },
          });
        }
      }

      // 🎯 NOUVEAU : Détecter changements de sourate depuis le widget
      if (
        serviceAudioState.currentSurah &&
        serviceAudioState.currentSurah !== lastServiceSurahRef.current
      ) {
        console.log(
          `🎯 Changement sourate détecté: "${lastServiceSurahRef.current}" → "${serviceAudioState.currentSurah}"`,
        );
        const surahMatch = serviceAudioState.currentSurah.match(/\((\d{3})\)/);
        const serviceSurahNum = surahMatch
          ? parseInt(surahMatch[1], 10)
          : null;

        lastServiceSurahRef.current = serviceAudioState.currentSurah;

        // Réactiver la sync seulement quand le service a rattrapé la sourate affichée
        if (
          isAppNavigation &&
          serviceSurahNum !== null &&
          serviceSurahNum === selectedSourate
        ) {
          setIsAppNavigation(false);
          console.log(
            "✅ Navigation app terminée - service aligné, sync réactivée",
          );
        }
      }

      // 🎯 NOUVEAU : Synchroniser l'interface avec le changement de sourate du service
      // ⚠️ Synchronisation DÉSACTIVÉE en mode navigation app
      if (serviceAudioState.currentSurah && !isAppNavigation) {
        console.log(
          `🔍 Vérification sync: currentSurah="${serviceAudioState.currentSurah}" selectedSourate=${selectedSourate}`,
        );
        // Extraire le numéro de sourate depuis le nom (format: "Al-Fatiha (001) - Récitateur")
        const surahMatch = serviceAudioState.currentSurah.match(/\((\d{3})\)/);
        if (surahMatch) {
          const surahNumber = parseInt(surahMatch[1]);
          console.log(
            `🔍 Sourate extraite: ${surahNumber}, actuelle: ${selectedSourate}`,
          );
          if (
            surahNumber >= 1 &&
            surahNumber <= 114 &&
            surahNumber !== selectedSourate
          ) {
            console.log(
              `🎯 Synchronisation interface: passage sourate ${selectedSourate} → ${surahNumber}`,
            );
            setSelectedSourate(surahNumber);
          } else {
            console.log(`🔍 Pas de sync nécessaire (même sourate ou invalide)`);
          }
        } else {
          console.log(
            `🔍 Regex ne match pas: "${serviceAudioState.currentSurah}"`,
          );
        }
      } else if (isAppNavigation) {
        console.log(
          "🚫 Synchronisation désactivée - Mode navigation app actif",
        );
      }
    }
  }, [
    serviceAudioState,
    isServiceAvailable,
    user?.isPremium,
    isAppNavigation,
    isLoading,
    currentRecitation,
    currentlyPlaying,
    selectedSourate,
    currentRecitation?.fileSize,
    currentRecitation?.durationMs,
  ]);

  const loadAvailableRecitations = useCallback(async (forceRefresh = false) => {
    try {
      const savedGif = await AsyncStorage.getItem("@selected_audio_gif");
      const validGifs: AudioGifType[] = [
        "audio_wave3",
        "chute",
        "riviere",
        "alquds",
        "madina",
        "makka",
      ];
      if (savedGif && validGifs.includes(savedGif as AudioGifType)) {
        setSelectedGif(savedGif as AudioGifType);
      }

      // 🌐 Mode en ligne : fonctionnement normal
      // 🎯 OPTIMISATION : Utiliser le cache par défaut, forcer le rechargement seulement si demandé
      if (forceRefresh) {
        // Vider le cache pour forcer le rechargement
        await AsyncStorage.removeItem("premium_catalog_cache");
        await premiumManager.invalidateQuranCache();
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
              recitation.id,
            );
            return {
              ...recitation,
              isDownloaded: !!actualDownloadPath,
              downloadPath: actualDownloadPath || undefined,
            };
          }),
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
  }, [premiumManager, selectedReciter]);

  useEffect(() => {
    void loadAvailableRecitations();
  }, [loadAvailableRecitations]);

  // 📱 NOUVEAU : Charger les données offline du Coran
  const loadOfflineQuranData = async () => {
    setLoadingOfflineData(true);
    try {
      // Charger l'index des sourates
      const index = await QuranOfflineService.getQuranIndex();
      if (index) {
        setOfflineSurahs(index.surahs);
        console.log(
          `✅ [QuranOffline] ${index.surahs.length} sourates chargées`,
        );
      }
    } catch (error) {
      console.error("❌ [QuranOffline] Erreur chargement données:", error);
    } finally {
      setLoadingOfflineData(false);
    }
  };

  // 🆕 Scanner physiquement le dossier /quran/ pour trouver les récitations téléchargées
  // 📱 NOUVEAU : Charger les versets offline pour une sourate
  const loadOfflineSurah = async (
    surahNumber: number,
    requestId: number,
  ): Promise<boolean> => {
    try {
      console.log(
        `🔍 [QuranOffline] Tentative de chargement sourate ${surahNumber}...`,
      );
      const surahData = await QuranOfflineService.getSurah(surahNumber);
      if (surahData) {
        console.log(
          `✅ [QuranOffline] Données sourate ${surahNumber} reçues:`,
          {
            versesCount: surahData.verses.length,
            availableTranslations: Object.keys(
              surahData.verses[0]?.translations || {},
            ),
          },
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

        if (requestId !== surahDataRequestIdRef.current) {
          return false;
        }

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
        error,
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

  // Réinitialiser le minuteur quand on change de sourate (évite de garder 264:09 de Baqara)
  useEffect(() => {
    lastDurationSurahRef.current = null;
    playbackDurationAccumRef.current = 0;
    setManualPlaybackDuration(0);
    setPlaybackPosition(0);
    setSearchQuery("");

    requestAnimationFrame(() => {
      versesFlatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [selectedSourate]);

  // 🚀 SUPPRIMÉ : Anciens événements de téléchargement non natifs

  const handleDeleteRecitation = async (recitation: PremiumContent) => {
    const recitationLabel =
      recitation.surahName ||
      recitation.title ||
      (recitation.surahNumber != null
        ? `${t("surah")} ${recitation.surahNumber}`
        : recitation.id);

    Alert.alert(
      t("delete_download_title"),
      t("delete_download_message", { title: recitationLabel }),
      [
        { text: t("cancel"), style: "cancel" },
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
                recitation.id,
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
      ],
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

    // 🍎 iOS n'a pas besoin de isNativeAvailable car on utilise RNFS
    if (Platform.OS === "android" && !isNativeAvailable) {
      showToast({
        type: "error",
        title: t("toast_download_error"),
        message: t("toast_download_failed"),
      });
      return;
    }

    try {
      console.log(
        `🎯 Début téléchargement: ${recitation.title} (${Platform.OS})`,
      );

      // 🍎 iOS : Utiliser PremiumContentManager (RNFS) comme pour les Adhans
      if (Platform.OS === "ios") {
        console.log("🍎 iOS détecté - Utilisation de PremiumContentManager");

        // Marquer comme en cours de téléchargement
        setIosDownloadingIds((prev) => new Set(prev).add(recitation.id));

        try {
          // Créer un objet PremiumContent compatible
          const quranContent: PremiumContent = {
            id: recitation.id,
            type: "quran",
            title: recitation.title,
            description: recitation.reciter || "",
            fileUrl: recitation.fileUrl,
            fileSize: 0, // Sera calculé pendant le téléchargement
            version: "1.0",
            isDownloaded: false,
            reciter: recitation.reciter,
            surahNumber: recitation.surahNumber,
            surahName: recitation.surahName,
          };

          await premiumManager.downloadPremiumContent(
            quranContent,
            (progress) => {
              console.log(`📥 Progression: ${Math.round(progress * 100)}%`);
            },
          );

          console.log("✅ Téléchargement terminé, attente 500ms avant scan...");

          // 🍎 IMPORTANT : Attendre un peu pour que le système de fichiers iOS se synchronise
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Scanner les fichiers téléchargés pour mettre à jour l'UI
          console.log("📁 Scan des fichiers téléchargés...");
          const files = await scanDownloadedQuranFiles();
          console.log(`📊 ${files.length} fichiers trouvés après scan`);

          // 🔄 Forcer la mise à jour de l'état avec un nouvel array pour déclencher le re-render
          setScannedQuranFiles([...files]);

          // 🎯 CRITIQUE : Recharger availableRecitations pour mettre à jour les boutons Télécharger/Supprimer
          console.log(
            "🔄 Rechargement des récitations pour actualiser l'UI...",
          );
          await loadAvailableRecitations(true);

          // 🚀 NOUVEAU : Mettre à jour currentRecitation localement pour actualiser le bouton immédiatement
          if (currentRecitation && currentRecitation.id === recitation.id) {
            const updatedPath = await premiumManager.isContentDownloaded(
              recitation.id,
            );
            setCurrentRecitation({
              ...currentRecitation,
              isDownloaded: true,
              downloadPath: updatedPath || undefined,
            });
            console.log(
              "✅ currentRecitation mis à jour avec le statut téléchargé",
            );
          }

          showToast({
            type: "success",
            title: t("toast_download_success"),
            message: `${recitation.title} téléchargé avec succès !`,
          });
        } finally {
          // Retirer du téléchargement en cours
          setIosDownloadingIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(recitation.id);
            return newSet;
          });
        }
      } else {
        // 🤖 Android : Utiliser le téléchargeur natif Android
        console.log("🤖 Android détecté - Utilisation de DownloadModule");

        const downloadInfo: DownloadInfo = {
          contentId: recitation.id,
          url: recitation.fileUrl,
          fileName: `${recitation.id}.mp3`,
          title: recitation.title,
        };

        await startDownload(downloadInfo);

        showToast({
          type: "info",
          title: t("toast_download_success"),
          message: t("toast_recitation_loading"),
        });
      }
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
            contentId,
          );

          if (migratedPath) {
            // console.log(`✅ Fichier migré avec succès: ${migratedPath}`);
            // Utiliser le nouveau chemin migré
            await premiumManager.markContentAsDownloaded(
              contentId,
              migratedPath,
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
    [currentRecitation, t, premiumManager, showToast],
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

        let activeRecitation = recitation;

        // 📏 Rafraîchir taille / URLs depuis le serveur (évite 40 Mo affiché après upload 171 Mo)
        if (
          activeRecitation.reciter &&
          activeRecitation.surahNumber &&
          activeRecitation.surahNumber >= 1
        ) {
          const fresh = await premiumManager.getSpecificRecitation(
            activeRecitation.reciter,
            activeRecitation.surahNumber,
            { forceRefresh: true },
          );
          if (fresh) {
            activeRecitation = { ...activeRecitation, ...fresh };
          }
        }

        // 📱 NOUVEAU : Vérifier le mode offline
        const shouldUseOffline =
          offlineAccess.isOfflineMode || !networkStatus.isConnected;

        // En mode offline, vérifier que le fichier est téléchargé
        if (shouldUseOffline && !activeRecitation.isDownloaded) {
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

        setCurrentlyPlaying(activeRecitation.id);
        setCurrentRecitation(activeRecitation);

        setPlaybackPosition(0);
        if (activeRecitation.durationMs && activeRecitation.durationMs > 0) {
          setManualPlaybackDuration(activeRecitation.durationMs);
        } else {
          setManualPlaybackDuration(0);
        }
        if (activeRecitation.surahNumber) {
          lastDurationSurahRef.current = activeRecitation.surahNumber;
        }

        // 🎵 NOUVEAU : Mettre à jour la sourate sélectionnée pour la synchronisation UI
        if (activeRecitation.surahNumber) {
          setSelectedSourate(activeRecitation.surahNumber);
        }

        let audioSource: any;

        // 🎯 Priorité 1: Fichier local téléchargé (hors ligne)
        // Vérifier si le fichier est réellement téléchargé
        const actualDownloadPath = await premiumManager.isContentDownloaded(
          activeRecitation.id,
        );

        if (actualDownloadPath) {
          audioSource = { uri: "file://" + actualDownloadPath };
          // console.log(`🎵 Lecture locale: ${recitation.title}`);

          // 🎵 NOUVEAU : Mettre à jour le récitateur sélectionné pour la synchronisation UI (mode hors ligne)
          if (activeRecitation.reciter) {
            setSelectedReciter(activeRecitation.reciter);
          }
        }
        // 🌐 Priorité 2: Streaming depuis Infomaniak
        else {
          let streamingUrl = toPremiumStreamPlaybackUrl(activeRecitation.fileUrl);

          if (
            activeRecitation.surahNumber &&
            !streamingUrl.includes("surah=") &&
            !streamingUrl.includes("id=")
          ) {
            const surahStr = activeRecitation.surahNumber
              .toString()
              .padStart(3, "0");
            streamingUrl += `&surah=${surahStr}`;
          }

          const token = await AsyncStorage.getItem("auth_token");
          if (token && !streamingUrl.includes("token=")) {
            streamingUrl += `&token=${token}`;
          }

          audioSource = { uri: streamingUrl };
          console.log(`🌐 Streaming URL (Range/seek): ${streamingUrl}`);

          // 🎵 NOUVEAU : Mettre à jour le récitateur sélectionné pour la synchronisation UI (mode streaming)
          if (activeRecitation.reciter) {
            setSelectedReciter(activeRecitation.reciter);
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

        // 🎵 Service audio natif (Android / iOS) — repli Expo-AV si échec
        let nativePlaybackOk = false;
        if (isServiceAvailable() && user?.isPremium) {
          try {
            console.log("🎵 Utilisation du service audio natif");

            // Mettre à jour le statut premium dans le service
            await updatePremiumStatus(true);

            // Charger l'audio dans le service
            const audioPath = actualDownloadPath
              ? actualDownloadPath
              : toPremiumStreamPlaybackUrl(audioSource.uri);
            console.log(`🎵 loadAudioInService: ${audioPath}`);

            // 🚀 DEBUG : Log vers la page de debug
            console.log(`🚀 [JS Play] Lancement: ${activeRecitation.title}`);
            addPlaybackDebugLog("JS Play", {
              title: activeRecitation.title,
              path: audioPath,
            });
            DeviceEventEmitter.emit("AddPlaybackDebugLog", {
              message: `[JS Play] Lancement: ${activeRecitation.title}`,
              type: "info",
              details: { path: audioPath, isPremium: user?.isPremium },
            });

            const catalogDurationMs =
              activeRecitation.durationMs && activeRecitation.durationMs > 0
                ? activeRecitation.durationMs
                : 0;
            if (catalogDurationMs > 0) {
              setManualPlaybackDuration(catalogDurationMs);
            }

            await loadAudioInService(
              audioPath,
              activeRecitation.title,
              activeRecitation.reciter || "",
              catalogDurationMs,
              true,
            );

            setIsPlaying(true);
            setCurrentlyPlaying(activeRecitation.id);

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
            setIsLoading(false);

            nativePlaybackOk = true;
            console.log("✅ Lecture lancée via service natif");
          } catch (serviceError) {
            console.error("❌ Erreur service audio natif:", serviceError);
            setIsPlaying(false);
            setCurrentlyPlaying(null);
            console.log("🔄 Fallback vers système audio Expo");
          }
        }

        if (!nativePlaybackOk) {
          console.log("🎵 Utilisation du système audio Expo");

          // 📱 NOUVEAU : En mode offline, pas de fallback streaming
          if (shouldUseOffline) {
            console.log("📱 Mode offline - lecture locale uniquement");
            try {
              const createdSound = await audioManager.playSource(
                audioSource,
                1.0,
              );
              setSound(createdSound);
              setIsPlaying(true);
              setCurrentlyPlaying(activeRecitation.id);
              setIsLoading(false);
              return;
            } catch (playError: any) {
              console.error(
                "❌ Erreur lecture locale en mode offline:",
                playError,
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
              playError,
            );
            // Fallback: tenter le streaming HTTP sécurisé
            try {
              const remoteUrl = toPremiumStreamPlaybackUrl(
                currentRecitation?.fileUrl ||
                  activeRecitation.fileUrl ||
                  "",
              );
              if (!remoteUrl) throw new Error("URL streaming indisponible");
              createdSound = await audioManager.playSource(
                { uri: remoteUrl },
                1.0,
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
          setCurrentlyPlaying(activeRecitation.id);
        }

        // 🎯 NOUVEAU : Mettre à jour le widget Coran
        if (isWidgetAvailable && user?.isPremium) {
          const audioPath = actualDownloadPath || activeRecitation.fileUrl;
          updateWidgetAudio(
            activeRecitation.title,
            activeRecitation.reciter || "",
            audioPath,
          );
          updateWidgetPlaybackState(true, 0, 0);
        }

        // Configuration des callbacks de progression (Expo-AV uniquement)
        // Utilise audioManager.setStatusCallback pour cibler le son actif, pas l'ancien state
        if (!nativePlaybackOk) {
          audioManager.setStatusCallback((status: any) => {
            if (status.isLoaded) {
              const posMs = status.positionMillis || 0;
              setPlaybackPosition(posMs);
              setManualPlaybackDuration((prev) =>
                resolvePlaybackDurationMs({
                  rawDuration: status.durationMillis || 0,
                  positionMs: posMs,
                  previousMs: prev,
                  fileSizeMb: currentRecitation?.fileSize,
                  catalogDurationMs: currentRecitation?.durationMs,
                  selectedSurah: selectedSourate,
                  serviceSurah: selectedSourate,
                }),
              );

              // 🎯 NOUVEAU : Mettre à jour le widget Coran avec la progression
              if (isWidgetAvailable && user?.isPremium) {
                updateWidgetPlaybackState(
                  isPlaying,
                  status.positionMillis || 0,
                  status.durationMillis || 0,
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
                if (autoScrollEnabled && versesFlatListRef.current) {
                  setTimeout(() => {
                    versesFlatListRef.current?.scrollToIndex({
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
                  "🎵 Audio terminé - didJustFinish détecté (Expo-AV uniquement)",
                );
                console.log("🎵 État playlist:", {
                  playlistMode: playlistModeRef.current,
                  currentIndex: currentPlaylistIndexRef.current,
                  totalItems: playlistItemsRef.current.length,
                });

                setIsPlaying(false);
                setCurrentlyPlaying(null);
                setPlaybackPosition(0);
                setManualPlaybackDuration(0);
                // TODO: setCurrentVerseIndex(null);

                // 🎵 Mode playlist - passer automatiquement à la suivante (Expo-AV uniquement)
                if (playlistModeRef.current) {
                  console.log(
                    "🎵 Mode playlist actif - passage automatique à la suivante (Expo-AV)",
                  );
                  setTimeout(() => {
                    console.log(
                      "🎵 Exécution de playNextInPlaylist après délai (Expo-AV)",
                    );
                    playNextInPlaylistRef.current();
                  }, 1000); // Petite pause entre les récitations
                } else {
                  console.log("🎵 Mode playlist inactif - arrêt de la lecture");
                }
              }
            }
          });

        }

        showToast({
          type: "success",
          title: actualDownloadPath ? t("local_playback") : t("streaming"),
          message: `${activeRecitation.title} - ${
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
      offlineAccess.isOfflineMode,
      networkStatus.isConnected,
    ],
  );

  const loadSpecificRecitation = useCallback(
    async (
      reciterName: string,
      surahNumber: number,
      autoPlay: boolean = false,
    ) => {
      if (!reciterName) return;

      try {
        const recitation = await premiumManager.getSpecificRecitation(
          reciterName,
          surahNumber,
        );
        setCurrentRecitation(recitation);

        if (recitation?.durationMs && recitation.durationMs > 0) {
          setManualPlaybackDuration(recitation.durationMs);
          lastDurationSurahRef.current = surahNumber;
        }

        if (autoPlay && recitation) {
          console.log(
            `🎵 Lecture automatique après chargement: ${recitation.title}`,
          );
          playRecitation(recitation);
        }
      } catch (error) {
        console.error("Erreur chargement récitation spécifique:", error);
        setCurrentRecitation(null);
      }
    },
    [premiumManager, playRecitation],
  );

  useEffect(() => {
    if (!selectedReciter || !selectedSourate || offlineAccess.isOfflineMode) {
      return;
    }

    // Navigation suivant/précédent ou picker : chargement audio déjà déclenché
    if (surahAutoPlayOnChangeRef.current) {
      surahAutoPlayOnChangeRef.current = false;
      return;
    }

    void loadSpecificRecitation(selectedReciter, selectedSourate, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pas de rechargement quand loadSpecificRecitation est recréé
  }, [selectedReciter, selectedSourate, offlineAccess.isOfflineMode]);

  // 🎵 LECTEUR COMPLÈTEMENT INDÉPENDANT POUR LES TÉLÉCHARGEMENTS
  // Utilise Audio.Sound avec configuration pour lecture en arrière-plan
  const playDownloadedRecitation = useCallback(
    async (recitation: PremiumContent) => {
      try {
        console.log(
          `🎵 [DOWNLOADS] Lecture téléchargement: ${recitation.title}`,
        );

        // 1️⃣ Arrêter toute lecture précédente dans le lecteur téléchargements
        if (downloadsSound) {
          console.log("🎵 [DOWNLOADS] Arrêt son précédent");
          await downloadsSound.unloadAsync();
          setDownloadsSound(null);
        }

        // 2️⃣ Créer la playlist avec SEULEMENT les fichiers téléchargés du même récitateur
        if (recitation.reciter) {
          const downloadedRecitations = scannedQuranFiles
            .filter((r) => r.reciter === recitation.reciter)
            .sort((a, b) => (a.surahNumber || 0) - (b.surahNumber || 0));

          if (downloadedRecitations.length > 0) {
            const currentIndex = downloadedRecitations.findIndex(
              (r) => r.id === recitation.id,
            );

            setDownloadsPlaylist(downloadedRecitations);
            setDownloadsPlaylistIndex(currentIndex >= 0 ? currentIndex : 0);

            console.log(
              `🎵 [DOWNLOADS] Playlist: ${
                downloadedRecitations.length
              } récitations, position: ${currentIndex + 1}`,
            );
          }
        }

        // 3️⃣ Vérifier que le fichier est téléchargé
        const downloadPath = await premiumManager.isContentDownloaded(
          recitation.id,
        );
        if (!downloadPath) {
          showToast({
            type: "error",
            title: t("error"),
            message: t("file_not_found"),
          });
          return;
        }

        // 4️⃣ Configurer l'audio pour lecture en arrière-plan
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });

        // 5️⃣ Charger et jouer l'audio (système indépendant)
        console.log(`🎵 [DOWNLOADS] Chargement: file://${downloadPath}`);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: `file://${downloadPath}` },
          {
            shouldPlay: true,
            progressUpdateIntervalMillis: 1000,
          },
          (status) => {
            if (status.isLoaded) {
              downloadsDurationRef.current = status.durationMillis || 0;
              downloadsPositionRef.current = status.positionMillis || 0;
              setDownloadsIsPlaying(status.isPlaying || false);

              // 🎵 Détecter la fin du fichier
              if (status.didJustFinish && !status.isLooping) {
                console.log(
                  "🎵 [DOWNLOADS] Fichier terminé, passage au suivant",
                );
                if (playNextDownloadedRef.current) {
                  playNextDownloadedRef.current();
                }
              }
            }
          },
        );

        setDownloadsSound(newSound);
        setDownloadsPlaying(recitation.id);
        setDownloadsIsPlaying(true);

        showToast({
          type: "success",
          title: t("playing"),
          message: recitation.title,
        });
      } catch (error) {
        console.error("❌ [DOWNLOADS] Erreur lecture:", error);
        showToast({
          type: "error",
          title: t("playback_error"),
          message: t("playback_error_message"),
        });
      }
    },
    [downloadsSound, scannedQuranFiles, premiumManager, showToast, t],
  );

  // 🎵 Pause/Resume pour le lecteur téléchargements (complètement indépendant)
  const pauseDownloadedRecitation = useCallback(async () => {
    try {
      if (downloadsSound) {
        const status = await downloadsSound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await downloadsSound.pauseAsync();
          setDownloadsIsPlaying(false);
          console.log("⏸️ [DOWNLOADS] Pause");
        }
      }
    } catch (error) {
      console.error("❌ [DOWNLOADS] Erreur pause:", error);
    }
  }, [downloadsSound]);

  const resumeDownloadedRecitation = useCallback(async () => {
    try {
      if (downloadsSound) {
        const status = await downloadsSound.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await downloadsSound.playAsync();
          setDownloadsIsPlaying(true);
          console.log("▶️ [DOWNLOADS] Resume");
        }
      }
    } catch (error) {
      console.error("❌ [DOWNLOADS] Erreur resume:", error);
    }
  }, [downloadsSound]);

  // 🎵 Passage au fichier suivant dans la playlist téléchargements
  const playNextDownloaded = useCallback(async () => {
    const nextIndex = downloadsPlaylistIndex + 1;
    if (nextIndex < downloadsPlaylist.length) {
      console.log(
        `🎵 [DOWNLOADS] Passage à ${nextIndex + 1}/${downloadsPlaylist.length}`,
      );
      setDownloadsPlaylistIndex(nextIndex);
      await playDownloadedRecitation(downloadsPlaylist[nextIndex]);
    } else {
      console.log("🎵 [DOWNLOADS] Fin de la playlist");
      if (downloadsSound) {
        await downloadsSound.unloadAsync();
        setDownloadsSound(null);
      }
      setDownloadsPlaying(null);
      setDownloadsIsPlaying(false);
      setDownloadsPlaylist([]);
      setDownloadsPlaylistIndex(0);
    }
  }, [
    downloadsPlaylistIndex,
    downloadsPlaylist,
    downloadsSound,
    playDownloadedRecitation,
  ]);

  // Assigner la fonction à la ref pour éviter les problèmes de closure
  useEffect(() => {
    playNextDownloadedRef.current = playNextDownloaded;
  }, [playNextDownloaded]);

  // 🎵 Nettoyer le son à la fermeture de la vue téléchargements
  useEffect(() => {
    if (!showDownloadsView && downloadsSound) {
      console.log("🎵 [DOWNLOADS] Nettoyage à la fermeture");
      downloadsSound.unloadAsync();
      setDownloadsSound(null);
      setDownloadsPlaying(null);
      setDownloadsIsPlaying(false);
    }
  }, [showDownloadsView, downloadsSound]);

  const pauseRecitation = useCallback(async () => {
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
  }, [
    sound,
    isServiceAvailable,
    user?.isPremium,
    pauseAudioInService,
    isWidgetAvailable,
    updateWidgetPlaybackState,
    playbackPosition,
    playbackDuration,
  ]);

  const resumeRecitation = useCallback(async () => {
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
  }, [
    sound,
    isServiceAvailable,
    user?.isPremium,
    playAudioInService,
    isWidgetAvailable,
    updateWidgetPlaybackState,
    playbackPosition,
    playbackDuration,
  ]);

  const seekToPosition = useCallback(
    async (positionMillis: number) => {
      try {
        pendingSeekTargetRef.current = positionMillis;
        pendingSeekUntilRef.current = Date.now() + 2000;
        setPlaybackPosition(positionMillis);

        logQuranSeek("JS_SEEK_REQUEST", {
          positionMillis,
          playbackDuration,
          playbackPosition,
          surah: selectedSourate,
          reciter: selectedReciter,
          recitationId: currentRecitation?.id,
          url: currentRecitation?.fileUrl
            ? toPremiumStreamPlaybackUrl(currentRecitation.fileUrl).slice(0, 100)
            : "",
          native: isServiceAvailable() && user?.isPremium,
        });

        if (isServiceAvailable() && user?.isPremium) {
          await seekToPositionInService(positionMillis);
          logQuranSeek("JS_SEEK_NATIVE_OK", { positionMillis });
        } else if (sound) {
          await sound.setPositionAsync(positionMillis);
          logQuranSeek("JS_SEEK_EXPO_OK", { positionMillis });
        }
      } catch (error) {
        logQuranSeek("JS_SEEK_ERROR", {
          message: error instanceof Error ? error.message : String(error),
        });
        console.error("Erreur navigation audio:", error);
      }
    },
    [
      sound,
      isServiceAvailable,
      user?.isPremium,
      seekToPositionInService,
      playbackDuration,
      playbackPosition,
      selectedSourate,
      selectedReciter,
      currentRecitation?.id,
      currentRecitation?.fileUrl,
    ],
  );

  const stopRecitation = useCallback(async () => {
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
      setManualPlaybackDuration(0);

      // 🎯 NOUVEAU : Mettre à jour le widget Coran
      if (isWidgetAvailable && user?.isPremium) {
        updateWidgetPlaybackState(false, 0, 0);
      }

      console.log("🎵 Récitation arrêtée avec succès");
    } catch (error) {
      console.error("❌ Erreur arrêt audio:", error);
    }
  }, [
    sound,
    isServiceAvailable,
    user?.isPremium,
    stopAudioInService,
    isWidgetAvailable,
    updateWidgetPlaybackState,
  ]);

  // 🎯 NAVIGATION SUPPRIMÉE - Utiliser uniquement le widget pour naviguer
  // Cela évite les conflits de double navigation qui causaient les sauts de sourates

  /** Choix manuel dans la liste (menu / modal) : texte + audio premium si lecture en cours */
  const selectSourateFromPicker = useCallback(
    async (surahNumber: number) => {
      if (surahNumber < 1 || surahNumber > 114) return;
      setIsAppNavigation(true);

      const audioActive =
        user?.isPremium &&
        !!selectedReciter &&
        (isPlaying ||
          !!currentlyPlaying ||
          (isServiceAvailable() && serviceAudioState.isPlaying));

      surahAutoPlayOnChangeRef.current = audioActive;
      setSelectedSourate(surahNumber);

      // Gratuit : uniquement le texte du Coran (pas d'appel audio)
      if (!user?.isPremium || !selectedReciter) return;
      if (!audioActive) return;

      if (offlineAccess.isOfflineMode) {
        const offlineRec = scannedQuranFiles.find(
          (r) =>
            r.surahNumber === surahNumber &&
            r.reciter?.toLowerCase() === selectedReciter.toLowerCase(),
        );
        if (offlineRec) {
          await playRecitation(offlineRec);
        }
        return;
      }

      await loadSpecificRecitation(selectedReciter, surahNumber, true);
    },
    [
      user?.isPremium,
      selectedReciter,
      isPlaying,
      currentlyPlaying,
      isServiceAvailable,
      serviceAudioState.isPlaying,
      offlineAccess.isOfflineMode,
      scannedQuranFiles,
      playRecitation,
      loadSpecificRecitation,
    ],
  );

  // 👆 NOUVEAU : Navigation par gestes de swipe (simple - juste changer la sourate affichée)
  const handleSwipeNavigation = useCallback(
    (direction: "next" | "previous", autoPlay: boolean = false) => {
      const currentSurah = selectedSourate;
      let targetSurah: number;

      if (direction === "next") {
        targetSurah = currentSurah >= 114 ? 1 : currentSurah + 1;
        console.log(
          `👆 Navigation SUIVANT: ${currentSurah} → ${targetSurah} (autoPlay: ${autoPlay})`,
        );
      } else {
        targetSurah = currentSurah <= 1 ? 114 : currentSurah - 1;
        console.log(
          `👆 Navigation PRÉCÉDENT: ${currentSurah} → ${targetSurah} (autoPlay: ${autoPlay})`,
        );
      }

      // 🔧 SOLUTION SIMPLIFIÉE : Animation sans changement d'état dans les callbacks
      console.log(`🎬 Début animation slide ${direction}`);

      // Activer le mode navigation app (désactive sync automatique) AVANT l'animation
      setIsAppNavigation(true);
      console.log(
        "🎯 Mode navigation app activé - Sync automatique désactivée",
      );

      // Changer la sourate AVANT l'animation
      surahAutoPlayOnChangeRef.current = true;
      setSelectedSourate(targetSurah);

      if (autoPlay && selectedReciter) {
        if (offlineAccess.isOfflineMode) {
          const offlineRec = scannedQuranFiles.find(
            (r) =>
              r.surahNumber === targetSurah &&
              r.reciter?.toLowerCase() === selectedReciter.toLowerCase(),
          );
          if (offlineRec) {
            void playRecitation(offlineRec);
          }
        } else {
          void loadSpecificRecitation(selectedReciter, targetSurah, true);
        }
      }

      // Animation slide
      const exitValue =
        direction === "next"
          ? -windowWidth
          : windowWidth;

      slideAnim.value = withSequence(
        withTiming(exitValue, { duration: 150 }),
        withTiming(0, { duration: 150 })
      );
    },
    [
      selectedSourate,
      selectedReciter,
      slideAnim,
      windowWidth,
      offlineAccess.isOfflineMode,
      scannedQuranFiles,
      playRecitation,
      loadSpecificRecitation,
    ],
  );

  // 🎵 NOUVEAU : Passer à la récitation suivante dans la playlist
  const playNextInPlaylist = useCallback(() => {
    console.log(
      `🎵 playNextInPlaylist - currentIndex: ${currentPlaylistIndexRef.current}, total: ${playlistItemsRef.current.length}, mode: ${playlistModeRef.current}`,
    );

    // 🎯 Si on n'est pas en mode playlist, on utilise la navigation classique avec animation
    if (!playlistModeRef.current) {
      handleSwipeNavigation("next", true);
      return;
    }

    if (
      currentPlaylistIndexRef.current >=
      playlistItemsRef.current.length - 1
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
        `🎵 Passage à la récitation suivante: ${nextRecitation.title} (index: ${nextIndex})`,
      );
      setCurrentPlaylistIndex(nextIndex);
      currentPlaylistIndexRef.current = nextIndex;
      playRecitation(nextRecitation);
    }
  }, [playRecitation, stopRecitation, handleSwipeNavigation]);

  // 🔄 NOUVEAU : Mettre à jour les refs
  useEffect(() => {
    playNextInPlaylistRef.current = playNextInPlaylist;
  }, [playNextInPlaylist]);

  // 🎵 NOUVEAU : Passer à la récitation précédente dans la playlist
  const playPreviousInPlaylist = useCallback(() => {
    console.log(
      `🎵 playPreviousInPlaylist - currentIndex: ${currentPlaylistIndexRef.current}, mode: ${playlistModeRef.current}`,
    );

    // 🎯 Si on n'est pas en mode playlist, on utilise la navigation classique avec animation
    if (!playlistModeRef.current) {
      handleSwipeNavigation("previous", true);
      return;
    }

    if (currentPlaylistIndexRef.current <= 0) {
      console.log("🎵 Début de playlist atteint ou mode playlist inactif");
      // On recommence juste la sourate actuelle au début
      seekToPosition(0);
      return;
    }

    const prevIndex = currentPlaylistIndexRef.current - 1;
    const prevRecitation = playlistItemsRef.current[prevIndex];

    if (prevRecitation) {
      console.log(
        `🎵 Passage à la récitation précédente: ${prevRecitation.title} (index: ${prevIndex})`,
      );
      setCurrentPlaylistIndex(prevIndex);
      currentPlaylistIndexRef.current = prevIndex;
      playRecitation(prevRecitation);
    }
  }, [playRecitation, seekToPosition, handleSwipeNavigation]);

  // 🔄 NOUVEAU : Mettre à jour les refs
  useEffect(() => {
    playPreviousInPlaylistRef.current = playPreviousInPlaylist;
  }, [playPreviousInPlaylist]);

  // 🎵 NOUVEAU : Arrêter la playlist
  const stopPlaylistMode = useCallback(() => {
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
  }, [stopRecitation]);

  // NOUVEAU : Écouter l'événement de fin de sourate pour la playlist
  // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      "QuranSurahCompletedForPlaylist",
      (event: any) => {
        console.log("🏁 Événement fin de sourate reçu dans QuranScreen:", event);

        DeviceEventEmitter.emit("AddPlaybackDebugLog", {
          message: `[JS Event] SurahCompleted (reason: ${event.reason || "end"})`,
          type: "info",
        });

        const isRemoteCommand =
          event.reason === "next" || event.reason === "previous";

        if (playlistModeRef.current || isRemoteCommand) {
          if (event.reason === "previous") {
            console.log(
              "🎵 Navigation vers la sourate précédente demandée (via Ref)",
            );
            playPreviousInPlaylistRef.current();
          } else {
            console.log("🎵 Passage à la sourate suivante (via Ref)");
            playNextInPlaylistRef.current();
          }
        } else {
          console.log("🎵 Mode playlist inactif - pas de passage automatique");
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // 👆 Handler pour les gestes Pan
  const onGestureEvent = useCallback((event: any) => {
    // On traite le geste seulement à la fin (State.END)
  }, []);

  const onHandlerStateChange = useCallback(
    (event: any) => {
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
            handleSwipeNavigation("previous", false);
          } else {
            // Swipe vers la gauche = sourate suivante
            handleSwipeNavigation("next", false);
          }
        }
      }
    },
    [handleSwipeNavigation],
  );

  // 🎯 NAVIGATION SUPPRIMÉE - Utiliser uniquement le widget pour naviguer
  // Cela évite les conflits de double navigation qui causaient les sauts de sourates

  // 🎯 NAVIGATION SUPPRIMÉE - Plus besoin d'écouteurs d'événements puisque l'app n'a plus de boutons de navigation

  // Charger les versets, la translittération et la traduction selon la sourate et la langue
  useEffect(() => {
    const requestId = ++surahDataRequestIdRef.current;
    const surahToLoad = selectedSourate;

    const isStale = () =>
      requestId !== surahDataRequestIdRef.current ||
      surahToLoad !== selectedSourate;

    async function fetchQuranData() {
      setLoading(true);

      // 📱 NOUVEAU : Logique Premium optimisée
      if (user?.isPremium) {
        console.log(
          `📱 [QuranOffline] Chargement sourate ${surahToLoad} avec données locales Premium`,
        );
        const success = await loadOfflineSurah(surahToLoad, requestId);
        if (isStale()) return;
        if (success) {
          setLoading(false);
          return;
        }

        console.error(
          `❌ [QuranOffline] Impossible de charger la sourate ${surahToLoad} offline`,
        );
        setArabicVerses([]);
        setPhoneticArr([]);
        setTranslationArr([]);
        setLoading(false);
        return;
      }

      if (!networkStatus.isConnected) {
        console.log(
          `🚫 [QuranOffline] Accès refusé - connexion requise pour utilisateur gratuit`,
        );
        if (isStale()) return;
        setArabicVerses([]);
        setPhoneticArr([]);
        setTranslationArr([]);
        setLoading(false);
        return;
      }

      // 🌐 Mode en ligne : fonctionnement normal
      try {
        const [arabicRes, phoneticRes] = await Promise.all([
          fetch(
            `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahToLoad}`,
          ),
          fetch(
            `https://api.quran.com/api/v4/quran/translations/57?chapter_number=${surahToLoad}`,
          ),
        ]);

        if (isStale()) return;

        const arabicJson = await arabicRes.json();
        const phoneticJson = await phoneticRes.json();

        let translationJson = { translations: [] as any[] };
        if (lang !== "ar") {
          const translations = await fetchTranslation(surahToLoad, lang);
          if (isStale()) return;
          translationJson.translations = translations;
        }

        setArabicVerses(arabicJson.verses || []);
        setPhoneticArr(phoneticJson.translations || []);
        setTranslationArr(translationJson.translations || []);
      } catch {
        if (isStale()) return;
        if (user?.isPremium) {
          console.log(
            `🔄 [QuranOffline] Erreur réseau, basculement vers mode offline`,
          );
          await loadOfflineSurah(surahToLoad, requestId);
        } else {
          setArabicVerses([]);
          setPhoneticArr([]);
          setTranslationArr([]);
        }
      }

      if (!isStale()) {
        setLoading(false);
      }
    }

    void fetchQuranData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSourate, lang, user?.isPremium, networkStatus.isConnected]);

  // 📱 NOUVEAU : Charger les données offline au démarrage
  useEffect(() => {
    if (user?.isPremium) {
      loadOfflineQuranData();
    }
  }, [user?.isPremium]);

  // Filtrer les versets selon la recherche dans la sourate sélectionnée
  const filteredVerses = useMemo(() => {
    if (!searchQuery.trim()) {
      return arabicVerses;
    }

    // Rechercher uniquement dans la sourate sélectionnée avec normalisation
    const normalizedSearch = normalizeQuranText(searchQuery);
    return arabicVerses.filter((verse, index) => {
      const phonetic = phoneticArr[index]?.text || "";
      const translation = translationArr[index]?.text || "";

      // Normaliser tous les textes pour la comparaison
      const normalizedArabic = normalizeQuranText(verse.text_uthmani || "");
      const normalizedPhonetic = normalizeQuranText(phonetic);
      const normalizedTranslation = normalizeQuranText(stripHtml(translation));
      const normalizedVerseKey = normalizeQuranText(verse.verse_key);

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
    <Pressable
      style={[
        styles.optionStyle,
        selectedSourate === item.key && styles.selectedOptionStyle,
      ]}
      onPress={() => {
        selectSourateFromPicker(item.key);
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
    </Pressable>
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
              <Pressable
                onPress={() => setShowDownloadsView(false)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 8,
                }}
              >
                <MCIcon
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
              </Pressable>
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
                  `📊 Affichage vue téléchargements - scannedQuranFiles.length: ${scannedQuranFiles.length}`,
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
                      <MCIcon
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
                              (a.surahNumber || 0) - (b.surahNumber || 0),
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
                              <Pressable
                                style={{
                                  flex: 1,
                                  flexDirection: "row",
                                  alignItems: "center",
                                }}
                                onPress={() => {
                                  // 🎵 Toggle play/pause (lecteur téléchargements indépendant)
                                  if (
                                    downloadsPlaying === recitation.id &&
                                    downloadsIsPlaying
                                  ) {
                                    pauseDownloadedRecitation();
                                  } else if (
                                    downloadsPlaying === recitation.id &&
                                    !downloadsIsPlaying
                                  ) {
                                    resumeDownloadedRecitation();
                                  } else {
                                    playDownloadedRecitation(recitation);
                                  }
                                }}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.offlineRecitationTitle}>
                                    {recitation.surahName || recitation.title}
                                  </Text>
                                  <Text
                                    style={styles.offlineRecitationSubtitle}
                                  >
                                    {recitation.reciter} • {recitation.fileSize}{" "}
                                    MB
                                  </Text>
                                </View>
                                {downloadsPlaying === recitation.id &&
                                downloadsIsPlaying ? (
                                  <MCIcon
                                    name="pause-circle"
                                    size={32}
                                    color="#FFD700"
                                  />
                                ) : (
                                  <MCIcon
                                    name="play-circle"
                                    size={32}
                                    color="#4ECDC4"
                                  />
                                )}
                              </Pressable>

                              {/* 🗑️ Bouton de suppression */}
                              <Pressable
                                style={{
                                  padding: 8,
                                  marginLeft: 8,
                                }}
                                onPress={() =>
                                  handleDeleteRecitation(recitation)
                                }
                              >
                                <MCIcon
                                  name="delete-outline"
                                  size={24}
                                  color="#ff6b6b"
                                />
                              </Pressable>
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
                  <Pressable
                    style={[styles.compactSourateSelector, { flex: 1 }]} // ✅ Prend tout l'espace disponible
                    onPress={() => setModalVisible(true)}
                  >
                    <Text style={styles.compactSourateText}>
                      {getSelectedSourateLabel()}
                    </Text>
                    <MCIcon
                      name="chevron-down"
                      size={20}
                      color="#4ECDC4"
                    />
                  </Pressable>
                </View>

                {/* Contenu du Coran */}
                <FlatList
                  ref={versesFlatListRef}
                  key={`quran-verses-${selectedSourate}`}
                  data={filteredVerses}
                  keyExtractor={(item) =>
                    `${selectedSourate}-${item.verse_key || item.id}`
                  }
                  renderItem={({ item, index }) => {
                    // Affichage simplifié pour le mode offline
                    const originalIndex = arabicVerses.findIndex(
                      (v) => v.id === item.id,
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
                                getSelectedSourateLabel(),
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
                    `📊 Affichage mode hors ligne - scannedQuranFiles.length: ${scannedQuranFiles.length}`,
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
                        <MCIcon
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
                                (a.surahNumber || 0) - (b.surahNumber || 0),
                            )
                            .map((recitation) => (
                              <Pressable
                                key={recitation.id}
                                style={[
                                  styles.offlineRecitationItem,
                                  currentlyPlaying === recitation.id && {
                                    backgroundColor: "#fff5e6",
                                    borderColor: "#FFD700",
                                    borderWidth: 2,
                                  },
                                ]}
                                onPress={() => {
                                  // 🎵 Toggle play/pause (lecteur téléchargements indépendant)
                                  if (
                                    downloadsPlaying === recitation.id &&
                                    downloadsIsPlaying
                                  ) {
                                    pauseDownloadedRecitation();
                                  } else if (
                                    downloadsPlaying === recitation.id &&
                                    !downloadsIsPlaying
                                  ) {
                                    resumeDownloadedRecitation();
                                  } else {
                                    playDownloadedRecitation(recitation);
                                  }
                                }}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.offlineRecitationTitle}>
                                    {recitation.surahName || recitation.title}
                                  </Text>
                                  <Text
                                    style={styles.offlineRecitationSubtitle}
                                  >
                                    {recitation.reciter} • {recitation.fileSize}{" "}
                                    MB
                                  </Text>
                                </View>
                                {downloadsPlaying === recitation.id &&
                                downloadsIsPlaying ? (
                                  <MCIcon
                                    name="pause-circle"
                                    size={32}
                                    color="#FFD700"
                                  />
                                ) : (
                                  <MCIcon
                                    name="play-circle"
                                    size={32}
                                    color="#4ECDC4"
                                  />
                                )}
                              </Pressable>
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
                <Pressable
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </Pressable>
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
          <Pressable
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
          >
            <Text style={styles.menuButtonText}>☰</Text>
          </Pressable>
        </View>

        {/* 🔍 NOUVEAU : Bouton de diagnostic widget (mode dev) */}
        {__DEV__ && (
          <View style={styles.offlineControlsSection}>
            <Pressable
              style={styles.diagnosticButton}
              onPress={runWidgetDiagnostic}
            >
              <MCIcon name="bug" size={16} color="#ffffff" />
              <Text style={styles.diagnosticButtonText}>Diagnostic Widget</Text>
            </Pressable>
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
          onRequestClose={() => {
            setMenuVisible(false);
            setMenuView("main"); // Reset à la fermeture
          }}
        >
          <SafeAreaView style={styles.menuOverlay}>
            <View style={styles.menuContent}>
              <View style={styles.menuHeader}>
                {/* 🍎 iOS: Bouton retour si on est dans une sous-vue */}
                {Platform.OS === "ios" && menuView !== "main" && (
                  <Pressable
                    style={styles.backButton}
                    onPress={() => setMenuView("main")}
                  >
                    <Text style={styles.backButtonText}>
                      ‹ {t("back", "Retour")}
                    </Text>
                  </Pressable>
                )}
                <Text style={styles.menuTitle}>
                  {Platform.OS === "ios" && menuView === "sourateList"
                    ? t("choose_sourate")
                    : t("navigation")}
                </Text>
                <Pressable
                  style={styles.closeButton}
                  onPress={() => {
                    setMenuVisible(false);
                    setMenuView("main"); // Reset à la fermeture
                  }}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </Pressable>
              </View>

              {/* 🍎 iOS: Affichage conditionnel selon la vue */}
              {Platform.OS === "ios" ? (
                <>
                  {menuView === "sourateList" && (
                    // Afficher SEULEMENT la liste des sourates (sans View wrapper, comme HadithScreen)
                    <FlatList
                      data={sourates}
                      keyExtractor={(item) => item.id.toString()}
                      renderItem={({ item }) => (
                        <Pressable
                          style={[
                            styles.menuOption,
                            selectedSourate === item.id &&
                              styles.selectedOptionStyle,
                          ]}
                          onPress={() => {
                            selectSourateFromPicker(item.id);
                            setMenuView("main"); // Retour à la vue principale
                            setMenuVisible(false); // Fermer le menu après sélection
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.menuOptionText}>
                              {item.id}. {item.name_simple}
                            </Text>
                            <Text style={styles.menuOptionSubtitle}>
                              {item.name_arabic}
                            </Text>
                          </View>
                          {selectedSourate === item.id && (
                            <Text style={styles.checkMark}>✓</Text>
                          )}
                        </Pressable>
                      )}
                    />
                  )}

                  {menuView === "main" && (
                    // Afficher le menu principal (sourate + récitateur + téléchargements)
                    <>
                      {/* Section Sourate */}
                      <View style={styles.menuSection}>
                        <Text style={styles.menuSectionTitle}>
                          {t("sourate")}
                        </Text>
                        <Pressable
                          style={styles.menuOption}
                          onPress={() => setMenuView("sourateList")}
                        >
                          <Text style={styles.menuOptionText}>
                            {getSelectedSourateLabel()}
                          </Text>
                          <Text style={styles.menuArrow}>›</Text>
                        </Pressable>
                      </View>

                      {/* Section Récitateur (premium uniquement) */}
                      {user.isPremium && getAvailableReciters().length > 0 && (
                        <View style={styles.menuSection}>
                          <Text style={styles.menuSectionTitle}>
                            {t("reciter")}
                          </Text>
                          <Pressable
                            style={styles.menuOption}
                            onPress={() => {
                              setModalType("reciter");
                              setReciterModalVisible(true);
                              setMenuVisible(false); // Fermer le menu
                            }}
                          >
                            <Text style={styles.menuOptionText}>
                              {selectedReciter ||
                                t("quran.reciter", "Récitateur")}
                            </Text>
                            <Text style={styles.menuArrow}>›</Text>
                          </Pressable>
                        </View>
                      )}

                      {/* Section Téléchargements (premium uniquement) */}
                      {user.isPremium && (
                        <View style={styles.menuSection}>
                          <Text style={styles.menuSectionTitle}>
                            {t("downloads_manager") || "Téléchargements"}
                          </Text>
                          <Pressable
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
                              <MCIcon
                                name="download-multiple"
                                size={20}
                                color="#4ECDC4"
                                style={{ marginRight: 8 }}
                              />
                              <Text style={styles.menuOptionText}>
                                {t("manage_downloads") ||
                                  "Gérer les téléchargements"}
                              </Text>
                            </View>
                            <Text style={styles.menuArrow}>›</Text>
                          </Pressable>
                        </View>
                      )}
                    </>
                  )}
                </>
              ) : (
                /* 🤖 Android: Comportement original */
                <>
                  {/* Section Sourate */}
                  <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>{t("sourate")}</Text>
                    <Pressable
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
                    </Pressable>
                  </View>

                  {/* Section Récitateur (premium uniquement) */}
                  {user.isPremium && getAvailableReciters().length > 0 && (
                    <View style={styles.menuSection}>
                      <Text style={styles.menuSectionTitle}>
                        {t("reciter")}
                      </Text>
                      <Pressable
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
                      </Pressable>
                    </View>
                  )}

                  {/* 🆕 Section Gestion des téléchargements (premium uniquement) */}
                  {user.isPremium && (
                    <View style={styles.menuSection}>
                      <Text style={styles.menuSectionTitle}>
                        {t("downloads_manager") || "Téléchargements"}
                      </Text>
                      <Pressable
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
                          <MCIcon
                            name="download-multiple"
                            size={20}
                            color="#4ECDC4"
                            style={{ marginRight: 8 }}
                          />
                          <Text style={styles.menuOptionText}>
                            {t("manage_downloads") ||
                              "Gérer les téléchargements"}
                          </Text>
                        </View>
                        <Text style={styles.menuArrow}>›</Text>
                      </Pressable>
                    </View>
                  )}
                </>
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
                <Pressable
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </Pressable>
              </View>
              <FlatList
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
          <Pressable
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
            <MCIcon
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
          </Pressable>
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
                    style={[styles.audioModalContent, slideAnimatedStyle]}
                  >
                    {/* 🎵 GIF animé ou image statique selon l'état de lecture */}
                    <ExpoImage
                      source={
                        currentlyPlaying === currentRecitation?.id && isPlaying
                          ? AVAILABLE_GIFS[selectedGif].gifImage
                          : AVAILABLE_GIFS[selectedGif].fixImage
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
                        {/* 🍎 iOS: Bouton retour si on est dans la vue gifSelector */}
                        {Platform.OS === "ios" && audioModalView === "gifSelector" ? (
                          <Pressable
                            style={styles.closeButton}
                            onPress={() => setAudioModalView("player")}
                          >
                            <MCIcon
                              name="arrow-left"
                              size={24}
                              color={modalButtonColor}
                            />
                          </Pressable>
                        ) : (
                          <Pressable
                            style={styles.closeButton}
                            onPress={() => {
                              setAudioControlsModalVisible(false);
                              // Réinitialiser la vue sur iOS
                              if (Platform.OS === "ios") {
                                setAudioModalView("player");
                              }
                            }}
                          >
                            <MCIcon
                              name="close"
                              size={24}
                              color={modalButtonColor}
                            />
                          </Pressable>
                        )}
                        
                        {/* 🎵 NOUVEAU : Bouton de sélection de GIF (premium only, visible uniquement sur vue player) */}
                        {user?.isPremium && audioModalView === "player" && (
                          <Pressable
                            style={styles.gifSelectorButton}
                            onPress={() => {
                              // 🍎 iOS: Navigation interne (pas de 2ème modal)
                              if (Platform.OS === "ios") {
                                setAudioModalView("gifSelector");
                              } else {
                                setGifModalVisible(true);
                              }
                            }}
                          >
                            <IonIcon
                              name="images-outline"
                              size={20}
                              color={modalButtonColor}
                            />
                          </Pressable>
                        )}
                      </View>
                      
                      {/* 🍎 iOS: Navigation interne entre player et sélecteur GIF */}
                      {Platform.OS === "ios" && audioModalView === "gifSelector" ? (
                        <FlatList
                          style={styles.gifList}
                          data={AVAILABLE_GIFS_LIST}
                          keyExtractor={(gif) => gif.id}
                          renderItem={({ item: gif }) => {
                            const isLocked = gif.premium && !user?.isPremium;
                            const isSelected = selectedGif === gif.id;

                            return (
                              <Pressable
                                style={[
                                  styles.gifOption,
                                  isSelected && styles.selectedGifOption,
                                  isLocked && styles.lockedGifOption,
                                ]}
                                onPress={() => !isLocked && selectGif(gif.id)}
                                disabled={isLocked}
                              >
                                <ExpoImage
                                  source={gif.fixImage}
                                  style={styles.gifPreview}
                                  contentFit="cover"
                                />
                                <View style={styles.gifInfo}>
                                  <Text
                                    style={[
                                      styles.gifName,
                                      isSelected && styles.selectedGifName,
                                    ]}
                                  >
                                    {gif.name}
                                  </Text>
                                  {gif.premium && (
                                    <View style={styles.premiumBadge}>
                                      <MCIcon name="crown" size={14} color="#FFD700" />
                                      <Text style={styles.premiumText}>Premium</Text>
                                    </View>
                                  )}
                                </View>
                                {isSelected && (
                                  <MCIcon name="check-circle" size={24} color="#4CAF50" />
                                )}
                              </Pressable>
                            );
                          }}
                        />
                      ) : (
                        currentRecitation && (
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
                                <MCIcon
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
                            <Pressable
                              onPress={playPreviousInPlaylist}
                              disabled={isLoading}
                              style={styles.audioSecondaryControlButton}
                            >
                              <MCIcon
                                name="skip-previous"
                                size={40}
                                color="#FFF"
                              />
                            </Pressable>

                            <Pressable
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
                              <MCIcon
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
                            </Pressable>

                            <Pressable
                              onPress={playNextInPlaylist}
                              disabled={isLoading}
                              style={styles.audioSecondaryControlButton}
                            >
                              <MCIcon
                                name="skip-next"
                                size={40}
                                color="#FFF"
                              />
                            </Pressable>
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
                              <Pressable
                                style={styles.navigationInfoButton}
                                onPress={() => setShowNavigationTooltip(true)}
                              >
                                <MCIcon
                                  name="information-outline"
                                  size={18}
                                  color="#FFD700"
                                />
                                <Text style={styles.navigationInfoText}>
                                  Navigation
                                </Text>
                              </Pressable>
                            </View>
                          </View>

                          <View style={styles.audioProgressContainer}>
                            <AudioSeekBar
                              key={`seek-${currentRecitation.id}-${playbackDuration}`}
                              currentPosition={playbackPosition || 0}
                              totalDuration={playbackDuration || 0}
                              onSeek={seekToPosition}
                            />
                          </View>

                          {/* Options de téléchargement/streaming */}
                          <View style={styles.audioOptionsContainer}>
                            {/* 🚀 NOUVEAU : Vérifier si téléchargement en cours */}
                            {(() => {
                              const downloadingState = downloadState.get(
                                currentRecitation.id,
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
                                        currentRecitation.id,
                                      )
                                    }
                                  />
                                );
                              } else if (!currentRecitation.isDownloaded) {
                                // Pas téléchargé - Afficher le bouton de téléchargement
                                return (
                                  <Pressable
                                    style={styles.audioDownloadButton}
                                    onPress={() =>
                                      handleNativeDownloadRecitation(
                                        currentRecitation,
                                      )
                                    }
                                  >
                                    <MCIcon
                                      name="download"
                                      size={20}
                                      color={modalButtonColor}
                                    />
                                    <Text
                                      style={[
                                        styles.audioDownloadText,
                                        { color: modalButtonColor },
                                      ]}
                                    >
                                      {t("download")} (
                                      {Number(
                                        currentRecitation.fileSize,
                                      ).toFixed(2)}
                                      MB)
                                    </Text>
                                  </Pressable>
                                );
                              } else {
                                // Téléchargé - Afficher l'info et le bouton de suppression
                                return (
                                  <View style={styles.downloadedInfoContainer}>
                                    <MCIcon
                                      name="check-circle"
                                      size={20}
                                      color="#4CAF50"
                                    />
                                    <Text style={styles.downloadedInfoText}>
                                      {t("downloaded_locally")}
                                    </Text>
                                    <Pressable
                                      style={styles.audioDeleteButton}
                                      onPress={() =>
                                        handleDeleteRecitation(
                                          currentRecitation,
                                        )
                                      }
                                    >
                                      <MCIcon
                                        name="delete"
                                        size={16}
                                        color="#FF6B6B"
                                      />
                                    </Pressable>
                                  </View>
                                );
                              }
                            })()}
                          </View>

                          {/* Bouton stop */}
                          <Pressable
                            style={styles.audioStopButton}
                            onPress={stopRecitation}
                          >
                            <MCIcon
                              name="stop"
                              size={24}
                              color={modalButtonColor}
                            />
                            <Text
                              style={[
                                styles.audioStopText,
                                { color: modalButtonColor },
                              ]}
                            >
                              {t("stop")}
                            </Text>
                          </Pressable>
                        </View>
                        )
                      )}
                    </View>
                  </Animated.View>
                </ScrollView>
              </PanGestureHandler>
            </SafeAreaView>
          </GestureHandlerRootView>
        </Modal>

        {/* 🎵 NOUVEAU : Modal de sélection de GIF (premium - Android uniquement) */}
        {Platform.OS !== "ios" && (
          <Modal
          animationType="slide"
          transparent={true}
          visible={gifModalVisible}
          onRequestClose={() => setGifModalVisible(false)}
        >
          <SafeAreaView style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {t("choose_gif", "Choisir un effet visuel")}
                </Text>
                <Pressable
                  style={styles.closeButton}
                  onPress={() => setGifModalVisible(false)}
                >
                  <MCIcon
                    name="close"
                    size={24}
                    color="#483C1C"
                  />
                </Pressable>
              </View>

              <FlatList
                style={styles.gifList}
                data={AVAILABLE_GIFS_LIST}
                keyExtractor={(gif) => gif.id}
                renderItem={({ item: gif }) => {
                  const isLocked = gif.premium && !user?.isPremium;
                  const isSelected = selectedGif === gif.id;

                  return (
                    <Pressable
                      style={[
                        styles.gifOption,
                        isSelected && styles.selectedGifOption,
                        isLocked && styles.lockedGifOption,
                      ]}
                      onPress={() => !isLocked && selectGif(gif.id)}
                      disabled={isLocked}
                    >
                      <ExpoImage
                        source={gif.fixImage}
                        style={styles.gifPreview}
                        contentFit="cover"
                      />
                      <View style={styles.gifInfo}>
                        <Text
                          style={[
                            styles.gifName,
                            isSelected && styles.selectedGifName,
                          ]}
                        >
                          {gif.name}
                        </Text>
                        {gif.premium && (
                          <View style={styles.premiumBadge}>
                            <MCIcon
                              name="crown"
                              size={14}
                              color="#FFD700"
                            />
                            <Text style={styles.premiumText}>Premium</Text>
                          </View>
                        )}
                      </View>
                      {isSelected && (
                        <MCIcon
                          name="check-circle"
                          size={24}
                          color="#4CAF50"
                        />
                      )}
                    </Pressable>
                  );
                }}
              />
            </View>
          </SafeAreaView>
        </Modal>
        )}

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
                <Pressable
                  style={styles.closeButton}
                  onPress={() => setReciterModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </Pressable>
              </View>
              <FlatList
                data={getAvailableReciters().map((reciter) => ({
                  key: reciter,
                  label: reciter,
                }))}
                renderItem={({ item }) => (
                  <Pressable
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
                  </Pressable>
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
            ref={versesFlatListRef}
            key={`quran-verses-${selectedSourate}`}
            data={filteredVerses}
            keyExtractor={(item) =>
              `${selectedSourate}-${item.verse_key || item.id}`
            }
            renderItem={({ item, index }) => {
              // Affichage normal d'une sourate
              const originalIndex = arabicVerses.findIndex(
                (v) => v.id === item.id,
              );
              const phoneticText = phoneticArr[originalIndex]?.text || "";
              const translationText = translationArr[originalIndex]?.text || "";

              // Obtenir le nom de la sourate pour les favoris
              const currentSourate = sourates.find(
                (s) => s.id === selectedSourate,
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
                          chapterName,
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
              <MCIcon
                name="gesture-swipe-horizontal"
                size={20}
                color="#4ECDC4"
              />
              <Text style={styles.modalNavigationTooltipText}>
                {t("quran_navigation_modal.swipe_instruction")}
              </Text>
            </View>

            <View style={styles.modalNavigationTooltipRow}>
              <MCIcon
                name="widgets"
                size={20}
                color="#FFD700"
              />
              <Text style={styles.modalNavigationTooltipText}>
                {t("quran_navigation_modal.widget_instruction")}
              </Text>
            </View>

            <View style={styles.modalNavigationTooltipRow}>
              <MCIcon name="play" size={20} color="#4CAF50" />
              <Text style={styles.modalNavigationTooltipText}>
                {t("quran_navigation_modal.play_instruction")}
              </Text>
            </View>

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setShowNavigationTooltip(false)}
            >
              <Text style={styles.modalCloseButtonText}>
                {t("quran_navigation_modal.close_button")}
              </Text>
            </Pressable>
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
    boxShadow: "0px 2px 8px rgba(181,157,66,0.3)",
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
    marginBottom: 10,
    maxHeight: "85%",
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
  menuOptionSubtitle: {
    fontSize: 12,
    color: "#8b7355",
    fontStyle: "italic",
    marginTop: 2,
  },
  checkMark: {
    fontSize: 18,
    color: "#4CAF50",
    fontWeight: "bold",
    marginLeft: 10,
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
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
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
    boxShadow: "0px 2px 4px rgba(0,0,0,0.25)",
    zIndex: Z_INDEX.modal,
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
  // 🎵 NOUVEAU : Bouton de sélection de GIF (premium)
  gifSelectorButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
    minHeight: Platform.OS === "ios" ? 44 : 32,
    justifyContent: "center",
    position: "relative",
  },

  audioProgressBarActive: {
    height: 10,
    borderWidth: 1,
    borderColor: "#FF6B6B",
    borderRadius: 5,
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
    boxShadow: "0px 2px 4px rgba(0,0,0,0.3)",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 20,
    zIndex: 10,
  },
  audioSecondaryControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    boxShadow: "0px 2px 3px rgba(0,0,0,0.2)",
  },
  audioPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4ECDC4",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 2px 4px rgba(0,0,0,0.25)",
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
  audioProgressBarTouchTarget: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
  },
  audioProgressBar: {
    flexDirection: "row",
    width: "100%",
    height: 8,
    backgroundColor: "rgba(186, 156, 52, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  audioProgressFill: {
    height: 8,
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
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
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
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
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
    boxShadow: "0px 1px 3px rgba(0,0,0,0.08)",
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
    boxShadow: "0px 1px 2px rgba(0,0,0,0.06)",
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
    boxShadow: "0px 10px 15px rgba(0,0,0,0.5)",
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
    boxShadow: "0px 2px 8px rgba(181,157,66,0.3)",
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
    boxShadow: "0px 2px 4px rgba(0,0,0,0.25)",
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
  // 🎵 NOUVEAU : Styles pour la liste de sélection de GIF
  gifList: {
    maxHeight: 400,
  },
  gifOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 2,
    borderColor: "transparent",
    boxShadow: "0px 1px 2px rgba(0,0,0,0.2)",
  },
  selectedGifOption: {
    borderColor: "#4CAF50",
    backgroundColor: "#f0f8f0",
  },
  lockedGifOption: {
    opacity: 0.6,
  },
  gifPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  gifInfo: {
    flex: 1,
  },
  gifName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#242428",
    marginBottom: 4,
  },
  selectedGifName: {
    color: "#4CAF50",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  premiumText: {
    fontSize: 12,
    color: "#FFD700",
    marginLeft: 4,
    fontWeight: "600",
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
    boxShadow: "0px 1px 4px rgba(78,205,196,0.3)",
  },
  arabicPlaying: {
    color: "#2E8B57",
    fontWeight: "bold",
  },
  verseCirclePlaying: {
    backgroundColor: "#4ECDC4",
    borderColor: "#2E8B57",
    boxShadow: "0px 0px 3px rgba(78,205,196,0.5)",
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
    boxShadow: "0px 1px 2px rgba(160,128,42,0.12)",
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
