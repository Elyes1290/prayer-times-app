import * as Font from "expo-font";
import React, { useEffect, useState, useRef, useMemo } from "react";
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
} from "react-native";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import FavoriteButton from "../components/FavoriteButton";
import { QuranVerseFavorite } from "../contexts/FavoritesContext";
import { usePremium } from "../contexts/PremiumContext";
import { useToast } from "../contexts/ToastContext";
import PremiumContentManager, { PremiumContent } from "../utils/premiumContent";

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
  const [downloadingRecitations, setDownloadingRecitations] = useState<
    Set<string>
  >(new Set());
  const [downloadProgress, setDownloadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const premiumManager = PremiumContentManager.getInstance();

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
  }, []);

  // Nettoyer l'audio à la fermeture
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadAvailableRecitations = async () => {
    try {
      const catalog = await premiumManager.getPremiumCatalog();
      if (catalog && catalog.quranRecitations) {
        setAvailableRecitations(catalog.quranRecitations);

        // Sélectionner automatiquement le premier récitateur s'il n'y en a pas
        if (!selectedReciter && catalog.quranRecitations.length > 0) {
          const firstReciter = catalog.quranRecitations[0].reciter;
          if (firstReciter) {
            setSelectedReciter(firstReciter);
          }
        }
      }
    } catch (error) {
      console.error("Erreur chargement récitations:", error);
    }
  };

  const getAvailableReciters = () => {
    const reciters = new Set<string>();
    availableRecitations.forEach((recitation) => {
      if (recitation.reciter) {
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

  const handleDownloadRecitation = async (recitation: PremiumContent) => {
    if (!user.isPremium) {
      showToast({
        type: "error",
        title: "Premium requis",
        message: "Les récitations sont réservées aux utilisateurs premium",
      });
      return;
    }

    try {
      setDownloadingRecitations((prev) => new Set(prev).add(recitation.id));

      const success = await premiumManager.downloadPremiumContent(
        recitation,
        (progress) => {
          setDownloadProgress((prev) => ({
            ...prev,
            [recitation.id]: progress,
          }));
        }
      );

      if (success) {
        showToast({
          type: "success",
          title: "Téléchargement terminé",
          message: `${recitation.title} téléchargé`,
        });
        await loadAvailableRecitations(); // Recharger pour mettre à jour les statuts
      } else {
        showToast({
          type: "error",
          title: "Échec du téléchargement",
          message: `Impossible de télécharger ${recitation.title}`,
        });
      }
    } catch (error) {
      console.error("Erreur téléchargement:", error);
    } finally {
      setDownloadingRecitations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(recitation.id);
        return newSet;
      });
      setDownloadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[recitation.id];
        return newProgress;
      });
    }
  };

  const handleDeleteRecitation = async (recitation: PremiumContent) => {
    Alert.alert(
      "Supprimer la récitation",
      `Voulez-vous supprimer "${recitation.title}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            const success = await premiumManager.deletePremiumContent(
              recitation.id
            );
            if (success) {
              showToast({
                type: "info",
                title: "Récitation supprimée",
                message: `${recitation.title} supprimé`,
              });
              await loadAvailableRecitations();
              if (currentlyPlaying === recitation.id) {
                await stopRecitation();
              }
            }
          },
        },
      ]
    );
  };

  const playRecitation = async (recitation: PremiumContent) => {
    try {
      if (!recitation.downloadPath) {
        showToast({
          type: "error",
          title: "Récitation non disponible",
          message: "Veuillez d'abord télécharger cette récitation",
        });
        return;
      }

      // Si c'est la même récitation, reprendre ou mettre en pause
      if (currentlyPlaying === recitation.id && sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            await sound.playAsync();
            setIsPlaying(true);
          }
          return;
        }
      }

      // Arrêter l'audio actuel s'il y en a un différent
      if (sound && currentlyPlaying !== recitation.id) {
        await sound.unloadAsync();
        setSound(null);
        setPlaybackPosition(0);
        setPlaybackDuration(0);
      }

      setIsLoading(true);

      // Créer et jouer le nouvel audio
      const { sound: newSound } = await Audio.Sound.createAsync({
        uri: `file://${recitation.downloadPath}`,
      });

      setSound(newSound);
      setCurrentlyPlaying(recitation.id);
      setIsPlaying(true);
      setIsLoading(false);

      await newSound.playAsync();

      // Gérer les mises à jour de statut
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackPosition(status.positionMillis || 0);
          setPlaybackDuration(status.durationMillis || 0);

          if (status.didJustFinish) {
            setIsPlaying(false);
            setCurrentlyPlaying(null);
            setPlaybackPosition(0);
            setPlaybackDuration(0);
          }
        }
      });

      showToast({
        type: "success",
        title: "Lecture en cours",
        message: recitation.title,
      });
    } catch (error) {
      console.error("Erreur lecture audio:", error);
      setIsLoading(false);
      showToast({
        type: "error",
        title: "Erreur de lecture",
        message: "Impossible de lire cette récitation",
      });
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
      type: "quran_verse",
      chapterNumber: selectedSourate,
      chapterName: chapterName,
      verseNumber: parseInt(item.verse_key.split(":")[1]),
      arabicText: item.text_uthmani,
      translation: stripHtml(translationText),
      transliteration: "", // Peut être ajouté plus tard si disponible
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

  return (
    <ImageBackground
      source={require("../assets/images/parchment_bg.jpg")}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.selectStyle}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.selectTextStyle}>
            {getSelectedSourateLabel()}
          </Text>
        </TouchableOpacity>

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

        {/* Section Récitateur Premium */}
        {user.isPremium && getAvailableReciters().length > 0 && (
          <View style={styles.reciterSection}>
            <TouchableOpacity
              style={styles.reciterSelector}
              onPress={() => setReciterModalVisible(true)}
            >
              <MaterialCommunityIcons
                name="account-music"
                size={20}
                color="#ba9c34"
              />
              <Text style={styles.reciterText}>
                {selectedReciter || "Sélectionner un récitateur"}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color="#ba9c34"
              />
            </TouchableOpacity>

            {/* Contrôles audio pour la sourate actuelle */}
            {selectedReciter && (
              <View style={styles.audioControls}>
                {(() => {
                  const currentRecitation = getCurrentRecitation();
                  if (!currentRecitation) {
                    return (
                      <Text style={styles.noRecitationText}>
                        Récitation non disponible pour cette sourate
                      </Text>
                    );
                  }

                  const isDownloading = downloadingRecitations.has(
                    currentRecitation.id
                  );
                  const progress = downloadProgress[currentRecitation.id] || 0;
                  const isCurrentlyPlaying =
                    currentlyPlaying === currentRecitation.id && isPlaying;

                  if (isDownloading) {
                    return (
                      <View style={styles.downloadProgress}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${progress}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>{progress}%</Text>
                      </View>
                    );
                  }

                  if (!currentRecitation.isDownloaded) {
                    return (
                      <TouchableOpacity
                        style={styles.downloadButton}
                        onPress={() =>
                          handleDownloadRecitation(currentRecitation)
                        }
                      >
                        <MaterialCommunityIcons
                          name="download"
                          size={20}
                          color="#4ECDC4"
                        />
                        <Text style={styles.downloadButtonText}>
                          Télécharger
                        </Text>
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <View style={styles.playbackControlsContainer}>
                      {/* Contrôles principaux */}
                      <View style={styles.playbackControls}>
                        <TouchableOpacity
                          style={styles.playButton}
                          onPress={() => playRecitation(currentRecitation)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <MaterialCommunityIcons
                              name="loading"
                              size={24}
                              color="#fff"
                            />
                          ) : (
                            <MaterialCommunityIcons
                              name={isCurrentlyPlaying ? "pause" : "play"}
                              size={24}
                              color="#fff"
                            />
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.stopButton}
                          onPress={() => stopRecitation()}
                          disabled={!isCurrentlyPlaying}
                        >
                          <MaterialCommunityIcons
                            name="stop"
                            size={20}
                            color="#fff"
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() =>
                            handleDeleteRecitation(currentRecitation)
                          }
                        >
                          <MaterialCommunityIcons
                            name="delete"
                            size={20}
                            color="#FF6B6B"
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Jauge de progression */}
                      {isCurrentlyPlaying && playbackDuration > 0 && (
                        <View style={styles.progressContainer}>
                          <Text style={styles.timeText}>
                            {formatTime(playbackPosition)}
                          </Text>

                          <TouchableOpacity
                            style={styles.progressBarContainer}
                            onPress={(event) => {
                              const { locationX } = event.nativeEvent;
                              const progressBarWidth = 200; // width fixe pour éviter les erreurs
                              const newPosition =
                                (locationX / progressBarWidth) *
                                playbackDuration;
                              seekToPosition(newPosition);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.audioProgressBar}>
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
                            </View>
                          </TouchableOpacity>

                          <Text style={styles.timeText}>
                            {formatTime(playbackDuration)}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })()}
              </View>
            )}
          </View>
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
                <Text style={styles.modalTitle}>Choisir un récitateur</Text>
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

        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <TextInput
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

            return (
              <View style={styles.ayahContainer}>
                <View style={styles.arabicRow}>
                  <Text style={styles.arabic}>{item.text_uthmani}</Text>
                  <View style={styles.verseActions}>
                    <View style={styles.verseCircle}>
                      <Text style={styles.verseNumber}>
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

  // Styles pour la section récitateur premium
  reciterSection: {
    backgroundColor: "rgba(231, 200, 106, 0.15)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e7c86a",
  },
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
    marginLeft: 8,
    fontSize: 14,
    color: "#4ECDC4",
    fontWeight: "600",
  },
  playbackControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  playButton: {
    backgroundColor: "#4ECDC4",
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4ECDC4",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  deleteButton: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },

  // Nouveaux styles pour les contrôles audio avancés
  playbackControlsContainer: {
    width: "100%",
    gap: 12,
  },
  stopButton: {
    backgroundColor: "rgba(231, 200, 106, 0.2)",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e7c86a",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: "#7c6720",
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
  audioProgressBar: {
    height: 6,
    backgroundColor: "rgba(186, 156, 52, 0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  audioProgressFill: {
    height: "100%",
    backgroundColor: "#4ECDC4",
    borderRadius: 3,
  },
});
