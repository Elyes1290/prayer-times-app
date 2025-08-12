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
  Platform,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FavoriteButton from "../components/FavoriteButton";
import { QuranVerseFavorite } from "../contexts/FavoritesContext";
import { usePremium } from "../contexts/PremiumContext";
import { useToast } from "../contexts/ToastContext";
import PremiumContentManager, { PremiumContent } from "../utils/premiumContent";
import { quranAudioAnalyzer, VerseTiming } from "../utils/audioAnalysis";
import { useNativeDownload } from "../hooks/useNativeDownload";
import { DownloadInfo } from "../utils/nativeDownloadManager";
import { Image as ExpoImage } from "expo-image";
import RNFS from "react-native-fs";

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

export default function QuranScreen() {
  const { t, i18n } = useTranslation();
  const { user } = usePremium();
  const { showToast } = useToast();
  const [modalVisible, setModalVisible] = useState(false);
  const [reciterModalVisible, setReciterModalVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const windowHeight = Dimensions.get("window").height;

  // États pour les récitations premium
  const [availableRecitations, setAvailableRecitations] = useState<
    PremiumContent[]
  >([]);
  const [selectedReciter, setSelectedReciter] = useState<string | null>(null);
  // 🌐 NOUVEAU : États pour la connectivité et mode hors ligne
  const [isOnline, setIsOnline] = useState(true);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [forceOfflineMode, setForceOfflineMode] = useState(false);

  // 🎵 NOUVEAU : Navigation par récitateur en mode hors ligne
  const [selectedOfflineReciter, setSelectedOfflineReciter] = useState<
    string | null
  >(null);
  const [offlineRecitations, setOfflineRecitations] = useState<
    PremiumContent[]
  >([]);
  const [loadingOfflineRecitations, setLoadingOfflineRecitations] =
    useState(false);

  // 🎵 NOUVEAU : Lecture en continu (playlist mode)
  const [playlistMode, setPlaylistMode] = useState(false);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const [playlistItems, setPlaylistItems] = useState<PremiumContent[]>([]);

  // 🔧 NOUVEAU : Refs pour éviter les problèmes de closure dans les callbacks
  const playlistModeRef = useRef(false);
  const currentPlaylistIndexRef = useRef(0);
  const playlistItemsRef = useRef<PremiumContent[]>([]);

  // 🎨 NOUVEAU : État pour la section récitateur rétractable
  const [reciterSectionCollapsed, setReciterSectionCollapsed] = useState(true);
  // 🎨 NOUVEAU : État pour le modal des contrôles audio
  const [audioControlsModalVisible, setAudioControlsModalVisible] =
    useState(false);
  // 🎵 NOUVEAU : État pour forcer l'animation du GIF
  const [gifKey, setGifKey] = useState(0);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  // 🎯 NOUVEAU : États pour la synchronisation de lecture avec analyse audio
  // TODO: À implémenter plus tard
  /*
  const [currentVerseIndex, setCurrentVerseIndex] = useState<number | null>(
    null
  );
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [verseTimings, setVerseTimings] = useState<VerseTiming[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisConfidence, setAnalysisConfidence] = useState<number>(0);
  */

  const premiumManager = PremiumContentManager.getInstance();

  // Hook téléchargement natif
  const { downloadState, startDownload, cancelDownload, isNativeAvailable } =
    useNativeDownload();

  // 🌐 NOUVEAU : Fonction pour tester la connectivité
  const checkConnectivity = async (): Promise<boolean> => {
    try {
      setIsCheckingConnection(true);
      // Test simple avec timeout court
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 secondes

      await fetch("https://api.quran.com/api/v4/chapters?language=fr&limit=1", {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      console.log("🌐 Mode hors ligne détecté:", error);
      return false;
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // 🌐 NOUVEAU : Scanner directement les dossiers de récitateurs (comme premiumManager)
  const loadOfflineRecitations = async (): Promise<PremiumContent[]> => {
    try {
      console.log("🔍 Scan direct des dossiers de récitateurs...");

      const downloadedRecitations: PremiumContent[] = [];
      const quranDirectory = `${RNFS.DocumentDirectoryPath}/quran`;

      // Vérifier que le répertoire quran existe
      const quranExists = await RNFS.exists(quranDirectory);
      if (!quranExists) {
        console.log("❌ Répertoire /quran inexistant");
        return [];
      }

      // Scanner tous les dossiers de récitateurs
      const reciterFolders = await RNFS.readDir(quranDirectory);
      console.log(`📁 Dossiers récitateurs trouvés: ${reciterFolders.length}`);

      for (const reciterFolder of reciterFolders) {
        if (reciterFolder.isDirectory()) {
          console.log(`📂 Scan dossier: ${reciterFolder.name}`);

          try {
            // Scanner tous les fichiers MP3 dans ce dossier récitateur
            const reciterFiles = await RNFS.readDir(reciterFolder.path);

            for (const file of reciterFiles) {
              if (file.isFile() && file.name.endsWith(".mp3")) {
                // Le nom du fichier (sans .mp3) = contentId complet
                const contentId = file.name.replace(/\.mp3$/, "");
                console.log(`🎵 Fichier trouvé: ${contentId} -> ${file.path}`);

                // Parser l'ID pour extraire les infos
                if (contentId.startsWith("quran_")) {
                  const parts = contentId.split("_");
                  if (parts.length >= 3 && parts[0] === "quran") {
                    const surahNumber = parseInt(parts[parts.length - 1]);
                    const reciterName = parts
                      .slice(1, -1)
                      .join(" ")
                      .replace(/_/g, " ");

                    if (!isNaN(surahNumber) && reciterName) {
                      // Utiliser getSpecificRecitation pour les métadonnées complètes
                      try {
                        const completeRecitation =
                          await premiumManager.getSpecificRecitation(
                            reciterName,
                            surahNumber
                          );
                        if (completeRecitation) {
                          // Forcer le statut téléchargé avec le bon chemin
                          const offlineRecitation: PremiumContent = {
                            ...completeRecitation,
                            isDownloaded: true,
                            downloadPath: file.path,
                          };
                          downloadedRecitations.push(offlineRecitation);
                          console.log(
                            `✅ Récitation complète: ${completeRecitation.title}`
                          );
                          continue;
                        }
                      } catch (error) {
                        console.log(
                          `⚠️ API non disponible pour ${reciterName} sourate ${surahNumber}:`,
                          error
                        );
                      }

                      // Fallback : récitation basique si API non disponible
                      const basicRecitation: PremiumContent = {
                        id: contentId,
                        type: "quran",
                        title: `${reciterName} - Sourate ${surahNumber}`,
                        description: "Récitation téléchargée (hors ligne)",
                        fileUrl: "",
                        fileSize: 0,
                        version: "1.0",
                        isDownloaded: true,
                        downloadPath: file.path,
                        reciter: reciterName,
                        surahNumber: surahNumber,
                      };
                      downloadedRecitations.push(basicRecitation);
                      console.log(
                        `✅ Récitation basique: ${basicRecitation.title}`
                      );
                    }
                  }
                }
              }
            }
          } catch (reciterError) {
            console.error(
              `❌ Erreur scan dossier ${reciterFolder.name}:`,
              reciterError
            );
          }
        }
      }

      console.log(
        `📱 Total récitations trouvées: ${downloadedRecitations.length}`
      );
      return downloadedRecitations;
    } catch (error) {
      console.error("❌ Erreur scan dossiers récitateurs:", error);
      return [];
    }
  };

  // 🎵 NOUVEAU : Regrouper les récitations par récitateur pour l'affichage hors ligne
  const groupRecitationsByReciter = (recitations: PremiumContent[]) => {
    const groups: { [reciterName: string]: PremiumContent[] } = {};

    recitations.forEach((recitation) => {
      const reciterName = recitation.reciter || "Récitateur inconnu";
      if (!groups[reciterName]) {
        groups[reciterName] = [];
      }
      groups[reciterName].push(recitation);
    });

    // Trier chaque groupe par numéro de sourate
    Object.keys(groups).forEach((reciter) => {
      groups[reciter].sort(
        (a, b) => (a.surahNumber || 0) - (b.surahNumber || 0)
      );
    });

    return groups;
  };

  // 🎵 NOUVEAU : Obtenir la liste des récitateurs avec comptage
  const getOfflineReciters = (recitations: PremiumContent[]) => {
    const groups = groupRecitationsByReciter(recitations);

    return Object.keys(groups)
      .map((reciterName) => ({
        name: reciterName,
        count: groups[reciterName].length,
        recitations: groups[reciterName],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // 🎵 NOUVEAU : Démarrer la lecture en continu d'un récitateur
  const startPlaylistMode = (reciterRecitations: PremiumContent[]) => {
    const sortedRecitations = [...reciterRecitations].sort(
      (a, b) => (a.surahNumber || 0) - (b.surahNumber || 0)
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
      playRecitation(sortedRecitations[0]);
    }
  };

  // 🎵 NOUVEAU : Passer à la récitation suivante dans la playlist
  const playNextInPlaylist = () => {
    if (
      !playlistModeRef.current ||
      currentPlaylistIndexRef.current >= playlistItemsRef.current.length - 1
    ) {
      // Fin de playlist
      setPlaylistMode(false);
      setCurrentPlaylistIndex(0);
      setPlaylistItems([]);
      playlistModeRef.current = false;
      currentPlaylistIndexRef.current = 0;
      playlistItemsRef.current = [];
      stopRecitation();
      return;
    }

    const nextIndex = currentPlaylistIndexRef.current + 1;
    const nextRecitation = playlistItemsRef.current[nextIndex];

    if (nextRecitation) {
      setCurrentPlaylistIndex(nextIndex);
      currentPlaylistIndexRef.current = nextIndex;
      playRecitation(nextRecitation);
    }
  };

  // 🎵 NOUVEAU : Arrêter la playlist
  const stopPlaylistMode = () => {
    setPlaylistMode(false);
    setCurrentPlaylistIndex(0);
    setPlaylistItems([]);
    playlistModeRef.current = false;
    currentPlaylistIndexRef.current = 0;
    playlistItemsRef.current = [];
    stopRecitation();
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

  // 🎵 NOUVEAU : Charger les récitations locales réelles
  const loadOfflineRecitationsData = useCallback(async () => {
    setLoadingOfflineRecitations(true);
    try {
      console.log("🔍 Chargement des récitations réellement locales...");
      const localRecitations = await loadOfflineRecitations();
      setOfflineRecitations(localRecitations);
      console.log(`📱 ${localRecitations.length} récitations locales chargées`);
    } catch (error) {
      console.error("❌ Erreur chargement récitations locales:", error);
      setOfflineRecitations([]);
    } finally {
      setLoadingOfflineRecitations(false);
    }
  }, []);

  // Charger les récitations premium disponibles
  useEffect(() => {
    loadAvailableRecitations();
  }, []);

  // 🌐 NOUVEAU : Charger les bonnes récitations selon le mode
  useEffect(() => {
    // Réinitialiser le récitateur sélectionné quand on change de mode
    setSelectedOfflineReciter(null);

    // Arrêter la playlist si on change de mode
    if (playlistMode) {
      stopPlaylistMode();
    }

    if (!isOnline || forceOfflineMode) {
      // Mode hors ligne : charger les vraies récitations locales
      loadOfflineRecitationsData();
    } else {
      // Mode en ligne : charger les récitations du serveur
      loadAvailableRecitations();
    }
  }, [forceOfflineMode, isOnline, loadOfflineRecitationsData]);

  // Nettoyer l'audio à la fermeture
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadAvailableRecitations = async (forceRefresh = false) => {
    try {
      // 🌐 NOUVEAU : Vérifier d'abord la connectivité (sauf si mode forcé)
      const isConnected = !forceOfflineMode ? await checkConnectivity() : true;
      setIsOnline(isConnected);

      if (!isConnected || forceOfflineMode) {
        // 📱 Mode hors ligne ou forcé : charger uniquement les récitations téléchargées
        console.log(
          forceOfflineMode
            ? "🌐 Mode hors ligne forcé - affichage des récitations locales"
            : "🌐 Mode hors ligne détecté - chargement des récitations locales"
        );
        const offlineRecitations = await loadOfflineRecitations();
        setAvailableRecitations(offlineRecitations);

        // Sélectionner automatiquement le premier récitateur hors ligne
        if (!selectedReciter && offlineRecitations.length > 0) {
          const firstOfflineReciter = offlineRecitations[0].reciter;
          if (firstOfflineReciter) {
            setSelectedReciter(firstOfflineReciter);
          }
        }
        return;
      }

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
      // En cas d'erreur, essayer de charger les récitations hors ligne
      setIsOnline(false);
      const offlineRecitations = await loadOfflineRecitations();
      setAvailableRecitations(offlineRecitations);
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

  const getCurrentRecitation = (): PremiumContent | null => {
    if (!selectedReciter) return null;

    return (
      availableRecitations.find(
        (recitation) =>
          recitation.reciter === selectedReciter &&
          recitation.surahNumber === selectedSourate
      ) || null
    );
  };

  // 🚀 NOUVEAU : Charger une récitation spécifique à la demande
  const [currentRecitation, setCurrentRecitation] =
    useState<PremiumContent | null>(null);
  const [loadingRecitation, setLoadingRecitation] = useState(false);

  const loadSpecificRecitation = async (
    reciterName: string,
    surahNumber: number
  ) => {
    if (!reciterName) return;

    setLoadingRecitation(true);
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
      setLoadingRecitation(false);
    }
  };

  // Charger la récitation quand le récitateur ou la sourate change
  useEffect(() => {
    if (selectedReciter && selectedSourate) {
      loadSpecificRecitation(selectedReciter, selectedSourate);
    }
  }, [selectedReciter, selectedSourate]);

  // 🚀 SUPPRIMÉ : Anciens événements de téléchargement non natifs

  // 🚀 NOUVEAU : Rafraîchir le statut de téléchargement quand on revient sur la page
  const refreshDownloadStatus = async (recitation: PremiumContent) => {
    if (!recitation) return;

    try {
      const actualDownloadPath = await premiumManager.isContentDownloaded(
        recitation.id
      );
      const isActuallyDownloaded = !!actualDownloadPath;

      // Mettre à jour seulement si le statut a changé
      if (
        recitation.isDownloaded !== isActuallyDownloaded ||
        recitation.downloadPath !== actualDownloadPath
      ) {
        setCurrentRecitation((prev) => {
          if (!prev || prev.id !== recitation.id) return prev;

          return {
            ...prev,
            isDownloaded: isActuallyDownloaded,
            downloadPath: actualDownloadPath || undefined,
          };
        });
        // console.log(
        //  `🔄 Statut mis à jour: ${recitation.title} - ${
        //    isActuallyDownloaded ? "Téléchargé" : "Non téléchargé"
        //  }`
        //);
      }
    } catch (error) {
      console.error("Erreur rafraîchissement statut:", error);
    }
  };

  // 🚀 SUPPRIMÉ : Ce useEffect causait une boucle infinie
  // Le statut est maintenant mis à jour directement dans les événements natifs

  // 🚀 SUPPRIMÉ : Ancienne fonction d'annulation remplacée par handleNativeCancelDownload

  // 🚀 SUPPRIMÉ : Ancienne fonction de téléchargement remplacée par handleNativeDownloadRecitation

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
                  title: t("toasts.delete_success"),
                  message: t("toasts.delete_completed"),
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

                // 🚀 OPTIMISATION : Ne plus recharger tout le catalogue, juste mettre à jour localement
                // await loadAvailableRecitations(); // ❌ SUPPRIMÉ
              } else {
                showToast({
                  type: "error",
                  title: t("toasts.error"),
                  message: t("toasts.delete_error"),
                });
              }
            } catch (error) {
              console.error("Erreur suppression récitation:", error);
              showToast({
                type: "error",
                title: t("toasts.error"),
                message: t("toasts.delete_failed"),
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
        title: t("toasts.premium_required"),
        message: t("toasts.premium_required"),
      });
      return;
    }

    if (!isNativeAvailable) {
      showToast({
        type: "error",
        title: t("toasts.download_error"),
        message: t("toasts.download_failed"),
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
        title: t("toasts.download_success"),
        message: t("toasts.recitation_loading"),
      });
    } catch (error) {
      console.error("❌ Erreur téléchargement récitation:", error);
      showToast({
        type: "error",
        title: t("toasts.download_error"),
        message: t("toasts.download_failed"),
      });
    }
  };

  // 🚀 NOUVEAU : Gérer la complétion du téléchargement natif
  const handleNativeDownloadCompleted = async (
    contentId: string,
    localUri: string
  ) => {
    // console.log(`[MyRecitation] ✅ Téléchargement natif terminé: ${contentId}`);

    try {
      // 🚀 NOUVEAU : Migrer automatiquement le fichier vers le stockage interne
      if (contentId.startsWith("quran_") || contentId.startsWith("reciter_")) {
        // console.log(`🔄 Migration automatique du fichier Quran: ${contentId}`);

        // Utiliser la fonction de migration du PremiumContentManager
        const migratedPath = await premiumManager.migrateFileToInternal(
          localUri.replace("file://", ""),
          contentId
        );

        if (migratedPath) {
          // console.log(`✅ Fichier migré avec succès: ${migratedPath}`);
          // Utiliser le nouveau chemin migré
          await premiumManager.markContentAsDownloaded(contentId, migratedPath);

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
        title: t("toasts.download_success"),
        message: t("toasts.download_completed"),
      });
    } catch (error) {
      console.error("❌ Erreur lors de la finalisation:", error);
      showToast({
        type: "error",
        title: t("toasts.error"),
        message: t("toasts.download_error"),
      });
    }
  };

  // 🚀 NOUVEAU : Gérer l'annulation du téléchargement natif
  const handleNativeCancelDownload = async (recitationId: string) => {
    try {
      await cancelDownload(recitationId);
      showToast({
        type: "info",
        title: t("toasts.download_cancelled"),
        message: t("toasts.operation_cancelled"),
      });
    } catch (error) {
      console.error("❌ Erreur annulation téléchargement:", error);
      showToast({
        type: "error",
        title: t("toasts.download_error"),
        message: t("toasts.download_failed"),
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
  }, [downloadState]);

  const playRecitation = async (recitation: PremiumContent) => {
    try {
      setIsLoading(true);

      // Arrêter toute lecture précédente
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      setCurrentlyPlaying(recitation.id);

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
      }
      // 🌐 Priorité 2: Streaming depuis Infomaniak
      else {
        audioSource = { uri: recitation.fileUrl };
        //  console.log(`🌐 Streaming Infomaniak: ${recitation.title}`);
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

      // Créer et configurer l'objet audio (avec fallback streaming si local corrompu)
      let createdSound: Audio.Sound | null = null;
      try {
        const created = await Audio.Sound.createAsync(audioSource, {
          shouldPlay: true,
          volume: 1.0,
          rate: 1.0,
          shouldCorrectPitch: true,
        });
        createdSound = created.sound;
      } catch (playError: any) {
        console.error("Erreur lecture locale, fallback streaming:", playError);
        // Fallback: tenter le streaming HTTP sécurisé
        try {
          const remoteUrl = (
            currentRecitation?.fileUrl ||
            recitation.fileUrl ||
            ""
          ).replace("action=download", "action=stream");
          if (!remoteUrl) throw new Error("URL streaming indisponible");
          const created = await Audio.Sound.createAsync(
            { uri: remoteUrl },
            {
              shouldPlay: true,
              volume: 1.0,
              rate: 1.0,
              shouldCorrectPitch: true,
            }
          );
          createdSound = created.sound;
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

      // Configuration des callbacks de progression avec analyse audio
      // TODO: À implémenter plus tard
      createdSound?.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded) {
          setPlaybackPosition(status.positionMillis || 0);
          setPlaybackDuration(status.durationMillis || 0);

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
            setIsPlaying(false);
            setCurrentlyPlaying(null);
            setPlaybackPosition(0);
            setPlaybackDuration(0);
            // TODO: setCurrentVerseIndex(null);

            // 🎵 NOUVEAU : Mode playlist - passer automatiquement à la suivante
            if (playlistModeRef.current) {
              setTimeout(() => {
                playNextInPlaylist();
              }, 1000); // Petite pause entre les récitations
            }
          }
        }
      });

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
  };

  const pauseRecitation = async () => {
    try {
      if (sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("Erreur pause audio:", error);
    }
  };

  const resumeRecitation = async () => {
    try {
      if (sound) {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Erreur reprise audio:", error);
    }
  };

  const seekToPosition = async (positionMillis: number) => {
    try {
      if (sound) {
        await sound.setPositionAsync(positionMillis);
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
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
      setIsPlaying(false);
      setCurrentlyPlaying(null);
      // TODO: setCurrentVerseIndex(null);
    } catch (error) {
      console.error("Erreur arrêt audio:", error);
    }
  };

  // Charger les versets, la translittération et la traduction selon la sourate et la langue
  useEffect(() => {
    async function fetchQuranData() {
      setLoading(true);
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
      } catch (error) {
        setArabicVerses([]);
        setPhoneticArr([]);
        setTranslationArr([]);
      }
      setLoading(false);
    }
    fetchQuranData();
  }, [selectedSourate, lang]);

  function stripHtml(text: string | undefined) {
    if (!text) return "";
    return text
      .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/(\.)(\d+)$/g, "$1")
      .trim();
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
    return {
      type: "quran_verse" as const,
      chapterNumber: parseInt(item.verse_key.split(":")[0]),
      verseNumber: parseInt(item.verse_key.split(":")[1]),
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

  // 🚀 TEMPORAIRE : Bouton pour vider le dossier Quran
  const handleClearQuranDirectory = async () => {
    try {
      const result = await premiumManager.clearQuranDirectory();
      // console.log("🧹 Nettoyage Quran terminé:", result);

      showToast({
        type: "success",
        title: t("toasts.cleanup_success"),
        message: t("toasts.cleanup_completed"),
      });

      // Recharger la liste
      loadAvailableRecitations(true);
    } catch (error) {
      console.error("❌ Erreur nettoyage:", error);
      showToast({
        type: "error",
        title: t("toasts.error"),
        message: t("toasts.cleanup_error"),
      });
    }
  };

  return (
    <ImageBackground
      source={require("../assets/images/parchment_bg.jpg")}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        {/* 🎨 NOUVEAU : Header compact avec sélecteurs */}
        <View style={styles.compactHeader}>
          {/* Sélecteur de sourate */}
          <TouchableOpacity
            style={styles.compactSourateSelector}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.compactSourateText}>
              {getSelectedSourateLabel()}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={16}
              color="#ba9c34"
            />
          </TouchableOpacity>

          {/* Sélecteur de récitateur premium (seulement si premium) */}
          {user.isPremium && getAvailableReciters().length > 0 && (
            <TouchableOpacity
              style={styles.compactReciterSelector}
              onPress={() => setReciterModalVisible(true)}
            >
              <MaterialCommunityIcons
                name="account-music"
                size={16}
                color="#ba9c34"
              />
              <Text style={styles.compactReciterText}>
                {selectedReciter || "Récitateur"}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={16}
                color="#ba9c34"
              />
            </TouchableOpacity>
          )}

          {/* 🚀 TEMPORAIRE : Bouton de nettoyage Quran - DÉCOMMENTÉ POUR UTILISATION */}
          {/* 
          <TouchableOpacity
            style={styles.clearQuranButton}
            onPress={handleClearQuranDirectory}
          >
            <MaterialCommunityIcons
              name="delete-sweep"
              size={16}
              color="#FF6B6B"
            />
            <Text style={styles.clearQuranButtonText}>Vider Quran</Text>
          </TouchableOpacity>
          */}
        </View>

        {/* 🌐 NOUVEAU : Section contrôles hors ligne */}
        <View style={styles.offlineControlsSection}>
          {/* Indicateur de mode hors ligne */}
          {(!isOnline || forceOfflineMode) && (
            <View style={styles.offlineIndicator}>
              <MaterialCommunityIcons
                name={forceOfflineMode ? "cloud-off-outline" : "wifi-off"}
                size={14}
                color="#ff6b6b"
              />
              <Text style={styles.offlineText}>
                {forceOfflineMode
                  ? t("forced_offline_mode", "Mode local")
                  : t("offline_mode", "Mode hors ligne")}
              </Text>
            </View>
          )}

          {/* Indicateur de vérification connectivité */}
          {isCheckingConnection && (
            <View style={styles.connectivityIndicator}>
              <ActivityIndicator size="small" color="#ba9c34" />
              <Text style={styles.connectivityText}>
                {t("checking_connection", "Vérification...")}
              </Text>
            </View>
          )}

          {/* Bouton basculer mode hors ligne (visible quand premium) */}
          {user.isPremium && (
            <TouchableOpacity
              style={[
                styles.offlineManagerButton,
                forceOfflineMode && styles.offlineManagerButtonActive,
              ]}
              onPress={() => setForceOfflineMode(!forceOfflineMode)}
            >
              <MaterialCommunityIcons
                name={forceOfflineMode ? "cloud-off-outline" : "download"}
                size={16}
                color={forceOfflineMode ? "#ff6b6b" : "#ba9c34"}
              />
              <Text
                style={[
                  styles.offlineManagerButtonText,
                  forceOfflineMode && styles.offlineManagerButtonTextActive,
                ]}
              >
                {forceOfflineMode
                  ? t("back_online", "En ligne")
                  : t("offline_manager", "Hors ligne")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

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
          <SafeAreaView style={styles.audioModalContainer}>
            <ScrollView
              style={styles.audioModalScrollView}
              contentContainerStyle={styles.audioModalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.audioModalContent}>
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
                                : currentlyPlaying === currentRecitation.id &&
                                  isPlaying
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

                        {/* Boutons de navigation - EN DESSOUS */}
                        <View style={styles.audioNavButtonsContainer}>
                          <TouchableOpacity
                            style={[
                              styles.audioNavButton,
                              selectedSourate <= 1 &&
                                styles.audioNavButtonDisabled,
                            ]}
                            onPress={() => {
                              if (selectedSourate > 1) {
                                setSelectedSourate(selectedSourate - 1);
                                // Arrêter la lecture actuelle si elle est en cours
                                if (
                                  currentlyPlaying === currentRecitation?.id &&
                                  isPlaying
                                ) {
                                  stopRecitation();
                                }
                              }
                            }}
                            disabled={selectedSourate <= 1}
                          >
                            <MaterialCommunityIcons
                              name="skip-previous"
                              size={24}
                              color={selectedSourate <= 1 ? "#666" : "#FFD700"}
                            />
                            <Text style={styles.audioNavButtonText}>
                              {t("previous")}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.audioNavButton,
                              selectedSourate >= 114 &&
                                styles.audioNavButtonDisabled,
                            ]}
                            onPress={() => {
                              if (selectedSourate < 114) {
                                setSelectedSourate(selectedSourate + 1);
                                // Arrêter la lecture actuelle si elle est en cours
                                if (
                                  currentlyPlaying === currentRecitation?.id &&
                                  isPlaying
                                ) {
                                  stopRecitation();
                                }
                              }
                            }}
                            disabled={selectedSourate >= 114}
                          >
                            <Text style={styles.audioNavButtonText}>
                              {t("next")}
                            </Text>
                            <MaterialCommunityIcons
                              name="skip-next"
                              size={24}
                              color={
                                selectedSourate >= 114 ? "#666" : "#FFD700"
                              }
                            />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Barre de progression - TOUJOURS présente pour éviter les changements de layout */}
                      <View style={styles.audioProgressContainer}>
                        {playbackDuration > 0 ? (
                          <>
                            <Text style={styles.audioTimeText}>
                              {formatTime(playbackPosition)}
                            </Text>
                            <TouchableOpacity
                              style={styles.audioProgressBar}
                              onPress={(event) => {
                                const { locationX } = event.nativeEvent;
                                const progressBarWidth = event.target.measure(
                                  (x, y, width) => {
                                    const progress = locationX / width;
                                    const newPosition =
                                      progress * playbackDuration;
                                    seekToPosition(newPosition);
                                  }
                                );
                              }}
                              activeOpacity={0.8}
                            >
                              <View
                                style={[
                                  styles.audioProgressFill,
                                  {
                                    width: `${
                                      playbackDuration > 0
                                        ? (playbackPosition /
                                            playbackDuration) *
                                          100
                                        : 0
                                    }%`,
                                  },
                                ]}
                              />
                            </TouchableOpacity>
                            <Text style={styles.audioTimeText}>
                              {formatTime(playbackDuration)}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.audioTimeText}>--:--</Text>
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
                          const hasError = downloadingState?.error || false;

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
                                  {t("download")} ({currentRecitation.fileSize}
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
                                    handleDeleteRecitation(currentRecitation)
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
                        <Text style={styles.audioStopText}>{t("stop")}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
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

        {/* 🌐 NOUVEAU : Affichage conditionnel selon le mode */}
        {!isOnline || forceOfflineMode ? (
          // 📱 Mode hors ligne : Navigation par récitateur
          <View style={styles.offlineRecitationsContainer}>
            {/* En-tête avec navigation */}
            <View style={styles.offlineHeader}>
              {selectedOfflineReciter ? (
                // Vue récitateur sélectionné avec bouton retour
                <View style={styles.offlineHeaderWithBack}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                      setSelectedOfflineReciter(null);
                      // Arrêter la playlist si on retourne en arrière
                      if (playlistMode) {
                        stopPlaylistMode();
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name="arrow-left"
                      size={20}
                      color="#ba9c34"
                    />
                    <Text style={styles.backButtonText}>
                      {t("back", "Retour")}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.offlineReciterTitleContainer}>
                    <Text style={styles.offlineRecitationsTitle}>
                      {selectedOfflineReciter}
                    </Text>
                    {playlistMode && (
                      <Text style={styles.playlistIndicator}>
                        🎵 {currentPlaylistIndex + 1}/{playlistItems.length}
                      </Text>
                    )}
                  </View>

                  {/* 🎵 NOUVEAU : Contrôles playlist */}
                  <View style={styles.playlistControls}>
                    {!playlistMode ? (
                      <TouchableOpacity
                        style={styles.playAllButton}
                        onPress={() => {
                          const reciterRecitations =
                            groupRecitationsByReciter(offlineRecitations)[
                              selectedOfflineReciter
                            ] || [];
                          if (reciterRecitations.length > 0) {
                            startPlaylistMode(reciterRecitations);
                          }
                        }}
                      >
                        <MaterialCommunityIcons
                          name="playlist-play"
                          size={20}
                          color="#4ECDC4"
                        />
                        <Text style={styles.playAllButtonText}>
                          {t("play_all", "Tout lire")}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.stopPlaylistButton}
                        onPress={stopPlaylistMode}
                      >
                        <MaterialCommunityIcons
                          name="stop"
                          size={20}
                          color="#FF6B6B"
                        />
                        <Text style={styles.stopPlaylistButtonText}>
                          {t("stop_playlist", "Arrêter")}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                // Vue liste des récitateurs
                <Text style={styles.offlineRecitationsTitle}>
                  {t("downloaded_recitations", "Récitations téléchargées")}
                </Text>
              )}
            </View>

            {loadingOfflineRecitations ? (
              <View style={styles.noRecitationsContainer}>
                <ActivityIndicator size="large" color="#ba9c34" />
                <Text style={styles.noRecitationsTitle}>
                  {t("checking_connection", "Vérification...")}
                </Text>
              </View>
            ) : offlineRecitations.length === 0 ? (
              <View style={styles.noRecitationsContainer}>
                <MaterialCommunityIcons
                  name="download-off"
                  size={48}
                  color="#ba9c34"
                />
                <Text style={styles.noRecitationsTitle}>
                  {t(
                    "no_downloaded_recitations",
                    "Aucune récitation téléchargée"
                  )}
                </Text>
                <Text style={styles.noRecitationsSubtitle}>
                  {t(
                    "download_recitations_first",
                    "Téléchargez des récitations en mode connecté pour les écouter hors ligne"
                  )}
                </Text>
              </View>
            ) : selectedOfflineReciter ? (
              // Vue des récitations du récitateur sélectionné
              <FlatList
                data={
                  groupRecitationsByReciter(offlineRecitations)[
                    selectedOfflineReciter
                  ] || []
                }
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => {
                  const isCurrentInPlaylist =
                    playlistMode &&
                    playlistItems[currentPlaylistIndex]?.id === item.id;
                  const isPlayingThis =
                    currentlyPlaying === item.id && isPlaying;

                  return (
                    <View
                      style={[
                        styles.offlineRecitationItem,
                        isCurrentInPlaylist &&
                          styles.offlineRecitationItemActive,
                      ]}
                    >
                      <View style={styles.offlineRecitationInfo}>
                        <View style={styles.offlineRecitationTitleContainer}>
                          {isCurrentInPlaylist && (
                            <MaterialCommunityIcons
                              name="music-note"
                              size={16}
                              color="#4ECDC4"
                              style={styles.playlistCurrentIcon}
                            />
                          )}
                          <Text
                            style={[
                              styles.offlineRecitationTitle,
                              isCurrentInPlaylist &&
                                styles.offlineRecitationTitleActive,
                            ]}
                          >
                            {item.title}
                          </Text>
                        </View>
                        <View style={styles.offlineRecitationBadgesContainer}>
                          <View style={styles.offlineRecitationBadge}>
                            <MaterialCommunityIcons
                              name="download"
                              size={12}
                              color="#4CAF50"
                            />
                            <Text style={styles.offlineRecitationBadgeText}>
                              {t("offline", "Hors ligne")}
                            </Text>
                          </View>
                          {playlistMode && index === currentPlaylistIndex && (
                            <View style={styles.playlistPositionBadge}>
                              <Text style={styles.playlistPositionText}>
                                {index + 1}/{playlistItems.length}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={styles.offlineRecitationActions}>
                        <TouchableOpacity
                          style={[
                            styles.offlineRecitationPlayButton,
                            currentlyPlaying === item.id &&
                              isPlaying &&
                              styles.offlineRecitationPlayButtonActive,
                          ]}
                          onPress={() => {
                            if (currentlyPlaying === item.id && isPlaying) {
                              stopRecitation();
                            } else {
                              playRecitation(item);
                            }
                          }}
                        >
                          <MaterialCommunityIcons
                            name={
                              currentlyPlaying === item.id && isPlaying
                                ? "pause"
                                : "play"
                            }
                            size={20}
                            color={
                              currentlyPlaying === item.id && isPlaying
                                ? "#FF6B6B"
                                : "#4ECDC4"
                            }
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.offlineRecitationDeleteButton}
                          onPress={async () => {
                            await handleDeleteRecitation(item);
                            // Rafraîchir la liste après suppression
                            loadOfflineRecitationsData();
                          }}
                        >
                          <MaterialCommunityIcons
                            name="delete"
                            size={18}
                            color="#FF6B6B"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.offlineRecitationsList}
              />
            ) : (
              // Vue liste des récitateurs
              <FlatList
                data={getOfflineReciters(offlineRecitations)}
                keyExtractor={(item) => item.name}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.offlineReciterItem}
                    onPress={() => setSelectedOfflineReciter(item.name)}
                  >
                    <View style={styles.offlineReciterInfo}>
                      <View style={styles.offlineReciterHeader}>
                        <MaterialCommunityIcons
                          name="account-music"
                          size={24}
                          color="#ba9c34"
                        />
                        <Text style={styles.offlineReciterName}>
                          {item.name}
                        </Text>
                      </View>
                      <Text style={styles.offlineReciterCount}>
                        {item.count} récitation{item.count > 1 ? "s" : ""}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color="#ba9c34"
                    />
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.offlineRecitersList}
              />
            )}
          </View>
        ) : (
          // 🌐 Mode en ligne : Affichage normal du Coran
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
                const translationText =
                  translationArr[originalIndex]?.text || "";

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
                            {item.verse_key.split(":")[1]}
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
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 60, // Ajout d'un padding en haut pour descendre le bouton
  },
  // 🎨 NOUVEAU : Styles pour le header compact
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
  compactSourateText: {
    flex: 1,
    fontSize: 14,
    color: "#483C1C",
    fontFamily: "ScheherazadeNew",
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedOptionStyle: {
    backgroundColor: "#fffbe6",
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
    backgroundColor: "#fffbe6",
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingRight: 50, // Espace pour le loader
    borderColor: "#ba9c34",
    borderWidth: 2,
    fontSize: 16,
    color: "#523f13",
    shadowColor: "#b59d42",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
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
    position: "relative",
    marginBottom: 16,
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
});
