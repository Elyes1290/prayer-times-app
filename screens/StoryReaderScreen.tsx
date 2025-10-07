import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Modal,
  Dimensions,
  Share,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

import { ThemedView } from "../components/ThemedView";
import { ThemedText } from "../components/ThemedText";
import { useThemeColors } from "../hooks/useThemeAssets";
import { useCurrentTheme } from "../hooks/useThemeColor";
import { usePremium } from "../contexts/PremiumContext";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

// Helper pour obtenir le token d'authentification
const getAuthToken = async (): Promise<string> => {
  const token = await AsyncStorage.getItem("auth_token");
  return token || "";
};

// 🆕 Helper pour récupérer une histoire téléchargée depuis le stockage local
const DOWNLOADED_STORIES_KEY = "downloaded_prophet_stories";

interface ProphetStory {
  id: string;
  title: string;
  title_arabic?: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  age_recommendation: number | string;
  reading_time: number | string;
  word_count: number | string;
  is_premium: boolean | number | string;
  user_progress: number | string;
  is_favorited: boolean | number | string;
  view_count: number | string;
  rating: number | string;
  historical_location?: string;
  isDownloaded?: boolean;
  fullData?: {
    story: any;
    chapters: StoryChapter[];
    references: StoryReference[];
    glossary: GlossaryTerm[];
  };
}

const getDownloadedStory = async (
  storyId: string
): Promise<ProphetStory | null> => {
  try {
    const data = await AsyncStorage.getItem(DOWNLOADED_STORIES_KEY);
    if (!data) return null;

    const stories: ProphetStory[] = JSON.parse(data);
    return stories.find((s) => s.id === storyId) || null;
  } catch (error) {
    console.error("Erreur lecture histoire téléchargée:", error);
    return null;
  }
};

interface StoryChapter {
  id: string;
  title: string;
  content: string;
  chapter_order: number;
  reading_time: number;
}

interface StoryReference {
  type: "quran" | "hadith" | "sira" | "historical";
  source: string;
  reference_text: string;
  authenticity?: string;
  content?: string;
  translation?: string;
  relevance?: string;
}

interface GlossaryTerm {
  term: string;
  arabic_term?: string;
  definition: string;
  pronunciation?: string;
}

interface StoryData {
  story: {
    id: string;
    title: string;
    title_arabic?: string;
    introduction: string;
    conclusion: string;
    moral_lesson?: string;
    category: string;
    difficulty: string;
    reading_time: number;
    historical_location?: string;
    historical_context?: string;
  };
  chapters: StoryChapter[];
  references: StoryReference[];
  glossary: GlossaryTerm[];
}

interface ReaderSettings {
  fontSize: "small" | "medium" | "large" | "extra-large";
  fontFamily: "system" | "serif" | "arabic";
  theme: "light" | "dark" | "sepia";
  showArabic: boolean;
  showGlossary: boolean;
  lineSpacing: number;
}

const { width: screenWidth } = Dimensions.get("window");

export default function StoryReaderScreen() {
  const [storyId, setStoryId] = useState<string | null>(null);
  const colors = useThemeColors();
  const currentTheme = useCurrentTheme();
  const { user: premiumUser } = usePremium();
  const { t } = useTranslation();
  const router = useRouter();
  const networkStatus = useNetworkStatus(); // 🆕 Détection du mode hors ligne

  // État local
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [selectedGlossaryTerm, setSelectedGlossaryTerm] =
    useState<GlossaryTerm | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);

  // Paramètres de lecture
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>({
    fontSize: "medium",
    fontFamily: "system",
    theme: "light",
    showArabic: true,
    showGlossary: true,
    lineSpacing: 1.6,
  });

  // Références pour le scroll et la progression
  const scrollViewRef = useRef<ScrollView>(null);
  const contentHeight = useRef(0);
  const scrollPosition = useRef(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 🔄 Récupérer l'ID de l'histoire à chaque fois qu'on revient sur cette page
  useFocusEffect(
    useCallback(() => {
      const getStoredStoryId = async () => {
        const storedId = await AsyncStorage.getItem("current_story_id");
        console.log("📖 [StoryReader] ID récupéré (focus):", storedId);

        // 🚀 FORCER le rechargement si l'ID change
        if (storedId && storedId !== storyId) {
          console.log("📖 [StoryReader] Nouvel ID détecté, rechargement...");
          setStoryId(storedId);
          setStoryData(null); // Reset des données pour forcer le reload
          setLoading(true);
        } else if (storedId && !storyId) {
          setStoryId(storedId);
        }
      };
      getStoredStoryId();
    }, [storyId])
  );

  // 🆕 Charger l'histoire (en ligne ou hors ligne)
  useEffect(() => {
    if (!storyId) return;

    const loadStory = async () => {
      try {
        setLoading(true);

        // 🆕 Si hors ligne, essayer de charger depuis le stockage local
        if (!networkStatus.isConnected) {
          console.log(
            "📱 Mode hors ligne - chargement depuis le stockage local"
          );
          const downloadedStory = await getDownloadedStory(storyId);

          if (downloadedStory && downloadedStory.fullData) {
            // 🆕 Charger directement la structure complète sauvegardée
            const offlineStoryData: StoryData = downloadedStory.fullData;

            setStoryData(offlineStoryData);

            // Animation d'apparition
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }).start();
          } else {
            Alert.alert(
              "Histoire non disponible",
              "Cette histoire n'est pas téléchargée pour l'accès hors ligne.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    AsyncStorage.removeItem("current_story_id");
                    router.replace("/prophet-stories" as any);
                  },
                },
              ]
            );
          }
          setLoading(false);
          return;
        }

        // Mode en ligne : charger depuis l'API
        const token = await getAuthToken();
        const headers: any = {
          "Content-Type": "application/json",
        };

        // Ajouter le token seulement s'il existe
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(
          `https://myadhanapp.com/api/prophet-stories.php?action=story&id=${storyId}`,
          {
            method: "GET",
            headers: headers,
          }
        );
        const responseData = await response.json();

        if (responseData.success) {
          setStoryData(responseData.data);

          // Animation d'apparition
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }).start();
        } else {
          Alert.alert("Erreur", responseData.message || "Histoire introuvable");
          await AsyncStorage.removeItem("current_story_id");
          router.replace("/prophet-stories" as any);
        }
      } catch (error) {
        console.error("Erreur chargement histoire:", error);

        // 🆕 En cas d'erreur, essayer le mode hors ligne
        const downloadedStory = await getDownloadedStory(storyId);
        if (downloadedStory && downloadedStory.fullData) {
          const offlineStoryData: StoryData = downloadedStory.fullData;
          setStoryData(offlineStoryData);

          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }).start();
        } else {
          Alert.alert(
            "Erreur",
            "Erreur de connexion et histoire non téléchargée"
          );
          await AsyncStorage.removeItem("current_story_id");
          router.replace("/prophet-stories" as any);
        }
      } finally {
        setLoading(false);
      }
    };

    loadStory();
  }, [storyId, networkStatus.isConnected]);

  // 🧹 Nettoyer l'AsyncStorage quand le composant se démonte
  useEffect(() => {
    return () => {
      // Cleanup function qui s'exécute quand on quitte la page
      AsyncStorage.removeItem("current_story_id");
    };
  }, []);

  // Sauvegarder le progrès de lecture
  const saveProgress = useCallback(async () => {
    if (!storyData) return;

    try {
      const token = await getAuthToken();

      // Sauvegarder le progrès seulement si connecté et premium
      if (!token || !premiumUser.isPremium) {
        return;
      }

      await fetch(
        "https://myadhanapp.com/api/prophet-stories.php?action=progress",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            story_id: storyId,
            chapter_index: currentChapter,
            position: scrollPosition.current,
            completion_percentage: readingProgress,
            time_spent: 60, // Estimation basique
          }),
        }
      );
    } catch (error) {
      console.error("Erreur sauvegarde progrès:", error);
    }
  }, [
    storyId,
    currentChapter,
    readingProgress,
    storyData,
    premiumUser.isPremium,
  ]);

  // Calculer la progression de lecture basée sur les chapitres
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    scrollPosition.current = contentOffset.y;
    contentHeight.current = contentSize.height;

    // 📊 NOUVEAU : Progression basée sur les chapitres
    if (storyData && storyData.chapters.length > 0) {
      const totalChapters = storyData.chapters.length;
      const currentChapterProgress =
        currentChapter / Math.max(totalChapters - 1, 1); // 0 à 1

      // Position dans le chapitre actuel (basée sur le scroll)
      const scrollProgress = Math.min(
        1,
        Math.max(
          0,
          contentOffset.y / (contentSize.height - layoutMeasurement.height)
        )
      );

      // Progression d'un chapitre = 1 / nombre total de chapitres
      const chapterWeight = 1 / totalChapters;
      const chapterCompletion = scrollProgress * chapterWeight;

      // Progression totale = chapitres complets + progression chapitre actuel
      const totalProgress =
        (currentChapter * chapterWeight + chapterCompletion) * 100;

      setReadingProgress(Math.min(100, Math.max(0, totalProgress)));
    } else {
      // Fallback : progression basée sur le scroll simple
      const progress = Math.min(
        100,
        Math.max(
          0,
          (contentOffset.y / (contentSize.height - layoutMeasurement.height)) *
            100
        )
      );
      setReadingProgress(progress);
    }
  };

  // Partager l'histoire
  const shareStory = async () => {
    if (!storyData) return;

    try {
      await Share.share({
        title: storyData.story.title,
        message: `Découvrez cette belle histoire du Prophète (ﷺ): "${
          storyData.story.title
        }"\n\n${storyData.story.introduction.substring(
          0,
          200
        )}...\n\nTéléchargez MyAdhan pour lire la suite !`,
      });
    } catch (error) {
      console.error("Erreur partage:", error);
    }
  };

  // Toggle favori
  const toggleFavorite = async () => {
    try {
      const token = await getAuthToken();

      if (!token) {
        Alert.alert(
          "Connexion requise",
          "Vous devez être connecté pour gérer les favoris.",
          [{ text: "OK" }]
        );
        return;
      }

      await fetch(
        "https://myadhanapp.com/api/prophet-stories.php?action=favorites",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            story_id: storyId,
            action: isFavorited ? "remove" : "add",
          }),
        }
      );
      setIsFavorited(!isFavorited);
    } catch (error) {
      console.error("Erreur toggle favorite:", error);
    }
  };

  // Styles dynamiques basés sur les paramètres
  const getTextStyles = () => {
    const fontSizes = {
      small: 16,
      medium: 18,
      large: 20,
      "extra-large": 24,
    };

    const fontFamilies = {
      system: "System",
      serif: "Georgia",
      arabic: "Arial", // À remplacer par une police arabe
    };

    return {
      fontSize: fontSizes[readerSettings.fontSize],
      fontFamily: fontFamilies[readerSettings.fontFamily],
      lineHeight:
        fontSizes[readerSettings.fontSize] * readerSettings.lineSpacing,
      color: readerSettings.theme === "sepia" ? "#5D4037" : colors.text,
    };
  };

  const getBackgroundColor = () => {
    switch (readerSettings.theme) {
      case "dark":
        return colors.background;
      case "sepia":
        return "#FDF6E3";
      default:
        return colors.background;
    }
  };

  // Composant pour les paramètres de lecture
  const renderSettingsModal = () => (
    <Modal
      visible={showSettings}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSettings(false)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.settingsModal, { backgroundColor: colors.cardBG }]}
        >
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>
              Paramètres de lecture
            </ThemedText>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Taille de police */}
          <View style={styles.settingGroup}>
            <ThemedText style={styles.settingLabel}>
              Taille de police
            </ThemedText>
            <View style={styles.settingOptions}>
              {["small", "medium", "large", "extra-large"].map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.settingOption,
                    readerSettings.fontSize === size && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() =>
                    setReaderSettings((prev) => ({
                      ...prev,
                      fontSize: size as any,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.settingOptionText,
                      readerSettings.fontSize === size && { color: "white" },
                      { color: colors.text },
                    ]}
                  >
                    {size === "small"
                      ? "A"
                      : size === "medium"
                      ? "A"
                      : size === "large"
                      ? "A"
                      : "A"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Thème */}
          <View style={styles.settingGroup}>
            <ThemedText style={styles.settingLabel}>Thème</ThemedText>
            <View style={styles.settingOptions}>
              {[
                { key: "light", label: "☀️ Clair", color: "#FFFFFF" },
                { key: "dark", label: "🌙 Sombre", color: "#1a1a1a" },
                { key: "sepia", label: "📖 Sépia", color: "#FDF6E3" },
              ].map((theme) => (
                <TouchableOpacity
                  key={theme.key}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: theme.color,
                      borderColor: colors.border,
                    },
                    readerSettings.theme === theme.key && {
                      borderColor: colors.primary,
                      borderWidth: 3,
                    },
                  ]}
                  onPress={() =>
                    setReaderSettings((prev) => ({
                      ...prev,
                      theme: theme.key as any,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: theme.key === "dark" ? "#FFFFFF" : "#000000" },
                    ]}
                  >
                    {theme.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Options d'affichage */}
          <View style={styles.settingGroup}>
            <ThemedText style={styles.settingLabel}>
              Options d&apos;affichage
            </ThemedText>

            <TouchableOpacity
              style={styles.toggleOption}
              onPress={() =>
                setReaderSettings((prev) => ({
                  ...prev,
                  showArabic: !prev.showArabic,
                }))
              }
            >
              <ThemedText>Afficher les termes arabes</ThemedText>
              <View
                style={[
                  styles.toggle,
                  readerSettings.showArabic && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    readerSettings.showArabic && styles.toggleKnobActive,
                  ]}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleOption}
              onPress={() =>
                setReaderSettings((prev) => ({
                  ...prev,
                  showGlossary: !prev.showGlossary,
                }))
              }
            >
              <ThemedText>Surligner les termes du glossaire</ThemedText>
              <View
                style={[
                  styles.toggle,
                  readerSettings.showGlossary && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    readerSettings.showGlossary && styles.toggleKnobActive,
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Composant pour le contenu principal
  const renderStoryContent = () => {
    if (!storyData) return null;

    const textStyles = getTextStyles();
    const currentChapterData = storyData.chapters[currentChapter];

    return (
      <View style={styles.contentContainer}>
        {/* En-tête de l'histoire */}
        <View style={styles.storyHeader}>
          <ThemedText style={[styles.storyTitle, textStyles]}>
            {storyData.story.title}
          </ThemedText>

          {readerSettings.showArabic && storyData.story.title_arabic && (
            <Text style={[styles.storyTitleArabic, textStyles]}>
              {storyData.story.title_arabic}
            </Text>
          )}

          {storyData.story.historical_location && (
            <View style={styles.historicalInfo}>
              <Ionicons
                name="location-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.historicalText, { color: colors.textSecondary }]}
              >
                {storyData.story.historical_location}
              </Text>
            </View>
          )}
        </View>

        {/* Navigation des chapitres */}
        {storyData.chapters.length > 1 && (
          <View style={styles.chapterNavigation}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {storyData.chapters.map((chapter, index) => (
                <TouchableOpacity
                  key={chapter.id}
                  style={[
                    styles.chapterTab,
                    currentChapter === index && {
                      backgroundColor: colors.primary,
                    },
                    { borderColor: colors.border },
                  ]}
                  onPress={() => setCurrentChapter(index)}
                >
                  <Text
                    style={[
                      styles.chapterTabText,
                      currentChapter === index && { color: "white" },
                      { color: colors.text },
                    ]}
                  >
                    {index + 1}. {chapter.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Introduction (seulement pour le premier chapitre) */}
        {currentChapter === 0 && (
          <View style={styles.introductionContainer}>
            <Text style={[styles.introductionText, textStyles]}>
              {storyData.story.introduction}
            </Text>
          </View>
        )}

        {/* Contenu du chapitre */}
        <View style={styles.chapterContainer}>
          <ThemedText style={[styles.chapterTitle, textStyles]}>
            {currentChapterData.title}
          </ThemedText>

          <Text style={[styles.chapterContent, textStyles]}>
            {currentChapterData.content}
          </Text>
        </View>

        {/* Conclusion (seulement pour le dernier chapitre) */}
        {currentChapter === storyData.chapters.length - 1 && (
          <View style={styles.conclusionContainer}>
            <ThemedText style={[styles.sectionTitle, textStyles]}>
              🌟 Enseignement
            </ThemedText>
            <Text style={[styles.conclusionText, textStyles]}>
              {storyData.story.moral_lesson || storyData.story.conclusion}
            </Text>
          </View>
        )}

        {/* Navigation précédent/suivant */}
        <View style={styles.navigationButtons}>
          {currentChapter > 0 && (
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: colors.cardBG }]}
              onPress={() => setCurrentChapter(currentChapter - 1)}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
              <ThemedText style={styles.navButtonText}>Précédent</ThemedText>
            </TouchableOpacity>
          )}

          {currentChapter < storyData.chapters.length - 1 && (
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: colors.primary }]}
              onPress={() => setCurrentChapter(currentChapter + 1)}
            >
              <Text style={[styles.navButtonText, { color: "white" }]}>
                Suivant
              </Text>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView
        style={[styles.container, { backgroundColor: getBackgroundColor() }]}
      >
        <StatusBar
          barStyle={
            readerSettings.theme === "dark" ? "light-content" : "dark-content"
          }
        />
        <View style={styles.loadingContainer}>
          <ThemedText>Chargement de l&apos;histoire...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!storyData) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText>Histoire introuvable</ThemedText>
          <TouchableOpacity
            onPress={async () => {
              await AsyncStorage.removeItem("current_story_id");
              router.replace("/prophet-stories" as any);
            }}
            style={styles.backButton}
          >
            <ThemedText>Retour</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <StatusBar
        barStyle={
          readerSettings.theme === "dark" ? "light-content" : "dark-content"
        }
      />

      {/* Barre d'outils en haut */}
      <LinearGradient
        colors={
          readerSettings.theme === "dark"
            ? ["#1a1a1a", "#2a2a2a"]
            : ["#FFFFFF", "#F5F5F5"]
        }
        style={styles.toolbar}
      >
        <TouchableOpacity
          onPress={async () => {
            // 🧹 Nettoyer l'ID stocké pour éviter les conflits
            await AsyncStorage.removeItem("current_story_id");
            router.replace("/prophet-stories" as any);
          }}
          style={styles.toolbarButton}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={readerSettings.theme === "dark" ? "#FFFFFF" : "#000000"}
          />
        </TouchableOpacity>

        <View style={styles.toolbarCenter}>
          <Text
            style={[
              styles.toolbarTitle,
              {
                color: readerSettings.theme === "dark" ? "#FFFFFF" : "#000000",
              },
            ]}
            numberOfLines={1}
          >
            {storyData.story.title}
          </Text>
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  backgroundColor:
                    readerSettings.theme === "dark" ? "#444444" : "#E0E0E0",
                },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${readingProgress}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.progressText,
                {
                  color:
                    readerSettings.theme === "dark" ? "#CCCCCC" : "#666666",
                },
              ]}
            >
              {Math.round(readingProgress)}%
            </Text>
          </View>
        </View>

        <View style={styles.toolbarActions}>
          <TouchableOpacity
            onPress={toggleFavorite}
            style={styles.toolbarButton}
          >
            <Ionicons
              name={isFavorited ? "heart" : "heart-outline"}
              size={22}
              color={
                isFavorited
                  ? "#FF6B6B"
                  : readerSettings.theme === "dark"
                  ? "#FFFFFF"
                  : "#000000"
              }
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={shareStory} style={styles.toolbarButton}>
            <Ionicons
              name="share-outline"
              size={22}
              color={readerSettings.theme === "dark" ? "#FFFFFF" : "#000000"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            style={styles.toolbarButton}
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={readerSettings.theme === "dark" ? "#FFFFFF" : "#000000"}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Contenu principal */}
      <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          onMomentumScrollEnd={saveProgress}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {renderStoryContent()}
        </ScrollView>
      </Animated.View>

      {/* Barre d'outils en bas */}
      <View
        style={[
          styles.bottomToolbar,
          {
            backgroundColor: getBackgroundColor(),
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setShowReferences(true)}
          style={styles.bottomToolbarButton}
        >
          <Ionicons name="book-outline" size={22} color={colors.text} />
          <Text style={[styles.bottomToolbarText, { color: colors.text }]}>
            Références ({storyData.references.length})
          </Text>
        </TouchableOpacity>

        {storyData.glossary.length > 0 && (
          <TouchableOpacity
            onPress={() => setShowGlossary(true)}
            style={styles.bottomToolbarButton}
          >
            <Ionicons name="library-outline" size={22} color={colors.text} />
            <Text style={[styles.bottomToolbarText, { color: colors.text }]}>
              Glossaire ({storyData.glossary.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modals */}
      {renderSettingsModal()}

      {/* Modal Références - À implémenter */}
      {/* Modal Glossaire - À implémenter */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  backButton: {
    padding: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toolbarButton: {
    padding: 8,
  },
  toolbarCenter: {
    flex: 1,
    marginHorizontal: 15,
  },
  toolbarTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 1.5,
  },
  progressText: {
    fontSize: 11,
    minWidth: 35,
    textAlign: "right",
  },
  toolbarActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  contentWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  contentContainer: {
    padding: 20,
  },
  storyHeader: {
    alignItems: "center",
    marginBottom: 25,
  },
  storyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  storyTitleArabic: {
    fontSize: 18,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 10,
  },
  historicalInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historicalText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  chapterNavigation: {
    marginBottom: 20,
  },
  chapterTab: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    marginRight: 10,
  },
  chapterTabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  introductionContainer: {
    marginBottom: 25,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 8,
  },
  introductionText: {
    fontStyle: "italic",
  },
  chapterContainer: {
    marginBottom: 25,
  },
  chapterTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
  },
  chapterContent: {
    lineHeight: 28,
  },
  conclusionContainer: {
    marginTop: 25,
    padding: 15,
    borderRadius: 12,
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  conclusionText: {
    fontWeight: "500",
    fontStyle: "italic",
  },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    gap: 15,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    elevation: 2,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  bottomToolbar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    gap: 20,
  },
  bottomToolbarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bottomToolbarText: {
    fontSize: 13,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  settingsModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  settingGroup: {
    marginBottom: 25,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  settingOptions: {
    flexDirection: "row",
    gap: 10,
  },
  settingOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minWidth: 50,
    alignItems: "center",
  },
  settingOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  themeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  toggleOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  toggle: {
    width: 50,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E0E0E0",
    padding: 2,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "white",
    elevation: 2,
  },
  toggleKnobActive: {
    alignSelf: "flex-end",
  },
});
