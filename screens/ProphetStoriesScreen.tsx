import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Alert,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import ThemedImageBackground from "../components/ThemedImageBackground";
import { useThemeColors } from "../hooks/useThemeAssets";
import { useCurrentTheme } from "../hooks/useThemeColor";
import { usePremium } from "../contexts/PremiumContext";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUniversalStyles } from "../hooks/useUniversalLayout";
import {
  useFavorites,
  ProphetStoryFavorite,
} from "../contexts/FavoritesContext";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import {
  ProphetSelector,
} from "../components/prophet-stories/ProphetSelector";
import { StoryCard } from "../components/prophet-stories/StoryCard";
import {
  getProphetLabel,
  VALID_PROPHET_IDS,
  type ProphetId,
} from "../constants/prophetStories";

// Helper pour obtenir le token d'authentification
const getAuthToken = async (): Promise<string> => {
  const token = await AsyncStorage.getItem("auth_token");
  return token || "";
};

// 🆕 Helper pour gérer le stockage local des histoires
const DOWNLOADED_STORIES_KEY = "downloaded_prophet_stories";

const getDownloadedStories = async (): Promise<ProphetStory[]> => {
  try {
    const data = await AsyncStorage.getItem(DOWNLOADED_STORIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Erreur lecture histoires téléchargées:", error);
    return [];
  }
};

const saveDownloadedStory = async (story: ProphetStory): Promise<boolean> => {
  try {
    const downloaded = await getDownloadedStories();
    const exists = downloaded.find((s) => s.id === story.id);
    if (!exists) {
      downloaded.push({ ...story, isDownloaded: true });
      await AsyncStorage.setItem(
        DOWNLOADED_STORIES_KEY,
        JSON.stringify(downloaded),
      );
    }
    return true;
  } catch (error) {
    console.error("Erreur sauvegarde histoire:", error);
    return false;
  }
};

const removeDownloadedStory = async (storyId: string): Promise<boolean> => {
  try {
    const downloaded = await getDownloadedStories();
    const filtered = downloaded.filter((s) => s.id !== storyId);
    await AsyncStorage.setItem(
      DOWNLOADED_STORIES_KEY,
      JSON.stringify(filtered),
    );
    return true;
  } catch (error) {
    console.error("Erreur suppression histoire:", error);
    return false;
  }
};

const isStoryDownloaded = async (storyId: string): Promise<boolean> => {
  const downloaded = await getDownloadedStories();
  return downloaded.some((s) => s.id === storyId);
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
}

interface GlossaryTerm {
  term: string;
  arabic_term?: string;
  definition: string;
  pronunciation?: string;
}

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
  isDownloaded?: boolean; // 🆕 Pour savoir si l'histoire est téléchargée
  // 🆕 Structure complète pour le mode hors ligne
  fullData?: {
    story: any;
    chapters: StoryChapter[];
    references: StoryReference[];
    glossary: GlossaryTerm[];
  };
}

interface StoryStats {
  total_stories: number | string;
  free_stories: number | string;
  premium_stories: number | string;
  avg_reading_time: number | string;
}

// Gradients du header selon le thème (cohérent avec le design system)
const getHeaderGradient = (
  theme: "light" | "dark" | "morning" | "sunset",
): [string, string] => {
  switch (theme) {
    case "light":
      return ["rgba(248,249,250,0.96)", "rgba(200,230,201,0.88)"];
    case "dark":
      return ["rgba(11,21,32,0.95)", "rgba(21,34,56,0.9)"];
    case "morning":
      return ["rgba(255,250,240,0.96)", "rgba(255,228,181,0.9)"];
    case "sunset":
      return ["rgba(42,31,26,0.95)", "rgba(61,43,34,0.9)"];
    default:
      return ["rgba(248,249,250,0.96)", "rgba(200,230,201,0.88)"];
  }
};

export default function ProphetStoriesScreen() {
  const colors = useThemeColors();
  const currentTheme = useCurrentTheme();
  const { user: premiumUser } = usePremium();
  const { t } = useTranslation();
  const router = useRouter();

  // 🚀 NOUVEAU : Hook pour les favoris avec limitations
  const { favorites, addFavorite, removeFavorite, canAddFavorite } =
    useFavorites();

  // 🚀 SOLUTION UNIVERSELLE : Compatible avec tous les appareils Android (S22, S24, S25 Ultra, etc.)
  const universalLayout = useUniversalStyles({
    includeNavigationPadding: true, // Pour le padding bottom de la FlatList
    safeMarginMultiplier: 1.2, // Marge légèrement augmentée pour les histoires
  });

  // 🛠️ DEBUG : Pour diagnostiquer les problèmes de layout, décommente ces lignes :
  // import { useLayoutDebug } from "../hooks/useUniversalLayout";
  // const { logLayoutInfo } = useLayoutDebug();
  // React.useEffect(() => { logLayoutInfo(); }, [logLayoutInfo]);

  // 🚀 Helper pour vérifier si une histoire est en favori
  const isStoryFavorited = (storyId: string): boolean => {
    return favorites.some(
      (fav) =>
        fav.type === "prophet_story" &&
        (fav as ProphetStoryFavorite).storyId === storyId,
    );
  };

  // 🆕 Hook pour détecter le mode hors ligne
  const networkStatus = useNetworkStatus();

  // État local
  const [stories, setStories] = useState<ProphetStory[]>([]);
  const [stats, setStats] = useState<StoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingStories, setDownloadingStories] = useState<Set<string>>(
    new Set(),
  );
  // 🆕 État pour le prophète sélectionné
  const [selectedProphet, setSelectedProphet] = useState<ProphetId>("muhammad");

  // 🆕 Charger les données (en ligne ou hors ligne)
  const loadStories = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);

        // 🆕 Si hors ligne, charger depuis le stockage local
        if (!networkStatus.isConnected) {
          console.log(
            "📱 Mode hors ligne - chargement des histoires téléchargées",
          );
          const downloadedStories = await getDownloadedStories();
          setStories(downloadedStories);
          setStats(null); // Pas de stats en mode hors ligne
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

        // Récupérer la langue actuelle de l'app
        const currentLang = i18n.language || "fr";

        const response = await fetch(
          `https://myadhanapp.com/api/prophet-stories.php?action=catalog&prophet=${selectedProphet}&lang=${currentLang}`,
          {
            method: "GET",
            headers: headers,
          },
        );
        const responseData = await response.json();

        if (responseData.success) {
          // 🆕 Vérifier quelles histoires sont téléchargées
          const storiesWithDownloadStatus = await Promise.all(
            (responseData.data.stories || []).map(
              async (story: ProphetStory) => ({
                ...story,
                isDownloaded: await isStoryDownloaded(story.id),
              }),
            ),
          );
          setStories(storiesWithDownloadStatus);
          setStats(responseData.data.stats || null);
        } else {
          Alert.alert(
            "Erreur",
            responseData.message || "Impossible de charger les histoires",
          );
        }
      } catch (error) {
        console.error("Erreur chargement histoires:", error);
        // 🆕 En cas d'erreur, essayer de charger depuis le local
        const downloadedStories = await getDownloadedStories();
        if (downloadedStories.length > 0) {
          setStories(downloadedStories);
        }
        // Ne pas afficher d'alerte ici, géré dans le rendu
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [networkStatus.isConnected, selectedProphet],
  );

  useFocusEffect(
    useCallback(() => {
      loadStories();
    }, [loadStories]),
  );

  // 🆕 Fonction pour changer de prophète
  const handleProphetChange = (
    prophet:
      | "muhammad"
      | "adam"
      | "nuh"
      | "hud"
      | "salih"
      | "ibrahim"
      | "lut"
      | "yusuf"
      | "musa"
      | "dawud"
      | "sulayman"
      | "yunus"
      | "ayyub"
      | "zakariya"
      | "yahya"
      | "ilyas"
      | "alyasa"
      | "shuayb"
      | "isa",
  ) => {
    if (prophet !== selectedProphet) {
      setSelectedProphet(prophet);
      setLoading(true);
      // Sauvegarder la préférence
      AsyncStorage.setItem("selected_prophet", prophet);
    }
  };

  // 🆕 Charger la préférence sauvegardée au démarrage
  React.useEffect(() => {
    AsyncStorage.getItem("selected_prophet").then((saved) => {
      if (saved && VALID_PROPHET_IDS.includes(saved as ProphetId)) {
        setSelectedProphet(saved as ProphetId);
      }
    });
  }, []);

  // 🚀 Synchroniser l'état des favoris quand les favoris changent
  React.useEffect(() => {
    // Forcer la mise à jour de l'affichage des favoris
    setStories((prevStories) => [...prevStories]);
  }, [favorites]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStories(false);
  };

  const handleStoryPress = async (story: ProphetStory) => {
    const isPremiumStory =
      story.is_premium === true ||
      story.is_premium === 1 ||
      story.is_premium === "1";

    if (isPremiumStory && !premiumUser.isPremium) {
      Alert.alert(
        t("premium_required"),
        `Cette histoire "${story.title}" nécessite un abonnement Premium pour être lue.`,
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("upgrade"),
            onPress: () => router.push("/premium-payment"),
          },
        ],
      );
      return;
    }

    // Stocker l'ID de l'histoire temporairement pour la navigation
    await AsyncStorage.setItem("current_story_id", story.id);
    router.replace("/story-reader" as any);
  };

  const toggleFavorite = async (storyId: string) => {
    try {
      const story = stories.find((s) => s.id === storyId);
      if (!story) return;

      const isFavorited = isStoryFavorited(storyId);

      if (isFavorited) {
        // 🗑️ RETIRER DES FAVORIS
        const favoriteToRemove = favorites.find(
          (fav) =>
            fav.type === "prophet_story" &&
            (fav as ProphetStoryFavorite).storyId === storyId,
        );

        if (favoriteToRemove) {
          const success = await removeFavorite(favoriteToRemove.id);
          if (success) {
            // Mettre à jour l'état local des histoires
            setStories((prev) =>
              prev.map((s) =>
                s.id === storyId ? { ...s, is_favorited: false } : s,
              ),
            );
          }
        }
      } else {
        // ➕ AJOUTER AUX FAVORIS
        // Vérifier d'abord si l'utilisateur peut ajouter un favori
        const canAdd = canAddFavorite("prophet_story");

        if (!canAdd.canAdd) {
          Alert.alert(
            "Limite atteinte",
            canAdd.reason || "Impossible d'ajouter ce favori",
            [
              { text: "Compris", style: "cancel" },
              {
                text: "Passer au Premium",
                onPress: () => router.push("/premium-payment"),
              },
            ],
          );
          return;
        }

        // Créer l'objet favori
        const newFavorite: Omit<ProphetStoryFavorite, "id" | "dateAdded"> = {
          type: "prophet_story",
          storyId: story.id,
          title: story.title,
          titleArabic: story.title_arabic || undefined,
          category: story.category,
          difficulty: story.difficulty as
            | "beginner"
            | "intermediate"
            | "advanced",
          readingTime: Number(story.reading_time) || 0,
          isPremium: Boolean(
            story.is_premium === true ||
            story.is_premium === 1 ||
            story.is_premium === "1",
          ),
        };

        const success = await addFavorite(newFavorite);
        if (success) {
          // Mettre à jour l'état local des histoires
          setStories((prev) =>
            prev.map((s) =>
              s.id === storyId ? { ...s, is_favorited: true } : s,
            ),
          );
        }
      }
    } catch (error) {
      console.error("Erreur toggle favorite:", error);
      Alert.alert("Erreur", "Impossible de modifier les favoris");
    }
  };

  // 🆕 Télécharger une histoire pour l'accès hors ligne
  const handleDownloadStory = async (story: ProphetStory) => {
    try {
      setDownloadingStories((prev) => new Set(prev).add(story.id));

      // Charger le contenu complet de l'histoire depuis l'API
      const token = await getAuthToken();
      const headers: any = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Récupérer la langue actuelle de l'app
      const currentLang = i18n.language || "fr";

      const response = await fetch(
        `https://myadhanapp.com/api/prophet-stories.php?action=story&id=${story.id}&prophet=${selectedProphet}&lang=${currentLang}`,
        {
          method: "GET",
          headers: headers,
        },
      );
      const responseData = await response.json();

      if (responseData.success && responseData.data) {
        // 🆕 Sauvegarder toute la structure de l'histoire (chapitres, références, glossaire)
        const storyWithFullData: ProphetStory = {
          ...story,
          isDownloaded: true,
          fullData: {
            story: responseData.data.story,
            chapters: responseData.data.chapters || [],
            references: responseData.data.references || [],
            glossary: responseData.data.glossary || [],
          },
        };

        const success = await saveDownloadedStory(storyWithFullData);
        if (success) {
          // Mettre à jour l'état local
          setStories((prev) =>
            prev.map((s) =>
              s.id === story.id ? { ...s, isDownloaded: true } : s,
            ),
          );
          Alert.alert("Succès", "Histoire téléchargée avec succès");
        }
      } else {
        Alert.alert(
          "Erreur",
          responseData.message ||
            "Impossible de télécharger le contenu de l'histoire",
        );
      }
    } catch (error) {
      console.error("Erreur téléchargement histoire:", error);
      Alert.alert("Erreur", "Erreur lors du téléchargement");
    } finally {
      setDownloadingStories((prev) => {
        const newSet = new Set(prev);
        newSet.delete(story.id);
        return newSet;
      });
    }
  };

  // 🆕 Supprimer une histoire téléchargée
  const handleDeleteStory = async (storyId: string) => {
    try {
      const success = await removeDownloadedStory(storyId);
      if (success) {
        // Mettre à jour l'état local
        setStories((prev) =>
          prev.map((s) =>
            s.id === storyId ? { ...s, isDownloaded: false } : s,
          ),
        );
        Alert.alert("Succès", "Histoire supprimée du stockage local");
      }
    } catch (error) {
      console.error("Erreur suppression histoire:", error);
      Alert.alert("Erreur", "Erreur lors de la suppression");
    }
  };

  const renderStoryCard = ({ item: story }: { item: ProphetStory }) => {
    if (!story || !story.id || !story.title) return null;

    const safeStory = {
      id: String(story.id || ""),
      title: String(story.title || "Histoire"),
      title_arabic: story.title_arabic ? String(story.title_arabic) : null,
      category: String(story.category || "daily_life"),
      difficulty: (story.difficulty || "beginner") as
        | "beginner"
        | "intermediate"
        | "advanced",
      reading_time: Number(story.reading_time) || 0,
      view_count: Number(story.view_count) || 0,
      rating: Number(story.rating) || 0,
      user_progress: Number(story.user_progress) || 0,
      is_favorited: isStoryFavorited(String(story.id)),
      is_premium: Boolean(
        story.is_premium === true ||
          story.is_premium === 1 ||
          story.is_premium === "1",
      ),
      historical_location: story.historical_location
        ? String(story.historical_location)
        : null,
    };

    return (
      <StoryCard
        story={safeStory}
        rawStory={{ id: story.id, isDownloaded: story.isDownloaded }}
        colors={{
          cardBG: colors.cardBG,
          border: colors.border,
          primary: colors.primary,
          textSecondary: colors.textSecondary,
        }}
        contentPaddingHorizontal={universalLayout.contentPaddingHorizontal}
        onPress={() => handleStoryPress(story)}
        onToggleFavorite={() => toggleFavorite(safeStory.id)}
        isConnected={networkStatus.isConnected}
        isDownloading={downloadingStories.has(safeStory.id)}
        onDownload={() => handleDownloadStory(story)}
        onDelete={() => handleDeleteStory(safeStory.id)}
      />
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={getHeaderGradient(currentTheme)}
        style={[
          styles.headerGradient,
          {
            paddingHorizontal: universalLayout.contentPaddingHorizontal,
            paddingTop: Math.max(universalLayout.safeAreaTop + 16, 56),
          },
        ]}
      >
        {/* Titre principal avec icône */}
        <View style={styles.headerHero}>
          <View style={[styles.headerIconWrap, { backgroundColor: colors.primary }]}>
            <Ionicons name="book" size={28} color={colors.textOnPrimary} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t("prophets_stories") || "Histoires des Prophètes"}
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {getProphetLabel(selectedProphet)}
            </Text>
          </View>
        </View>

        <ProphetSelector
          selectedProphet={selectedProphet}
          onProphetChange={handleProphetChange}
          colors={{
            primary: colors.primary,
            text: colors.text,
            textOnPrimary: colors.textOnPrimary,
            surfaceVariant: colors.surfaceVariant,
            cardBG: colors.cardBG,
            border: colors.border,
          }}
        />

        {stats && (
          <View style={styles.statsRow}>
            <View
              style={[
                styles.statPill,
                { backgroundColor: colors.cardBG, borderColor: colors.border },
              ]}
            >
              <Ionicons name="library" size={18} color={colors.primary} />
              <Text style={[styles.statPillNumber, { color: colors.text }]}>
                {parseInt(stats.total_stories?.toString() || "0")}
              </Text>
              <Text style={[styles.statPillLabel, { color: colors.textSecondary }]}>
                Histoires
              </Text>
            </View>
            <View
              style={[
                styles.statPill,
                { backgroundColor: colors.cardBG, borderColor: colors.border },
              ]}
            >
              <Ionicons name="gift" size={18} color="#4CAF50" />
              <Text style={[styles.statPillNumber, { color: colors.text }]}>
                {parseInt(stats.free_stories?.toString() || "0")}
              </Text>
              <Text style={[styles.statPillLabel, { color: colors.textSecondary }]}>
                Gratuites
              </Text>
            </View>
            <View
              style={[
                styles.statPill,
                { backgroundColor: colors.cardBG, borderColor: colors.border },
              ]}
            >
              <Ionicons name="star" size={18} color="#FFD700" />
              <Text style={[styles.statPillNumber, { color: colors.text }]}>
                {parseInt(stats.premium_stories?.toString() || "0")}
              </Text>
              <Text style={[styles.statPillLabel, { color: colors.textSecondary }]}>
                Premium
              </Text>
            </View>
            <View
              style={[
                styles.statPill,
                { backgroundColor: colors.cardBG, borderColor: colors.border },
              ]}
            >
              <Ionicons name="time" size={18} color={colors.primary} />
              <Text style={[styles.statPillNumber, { color: colors.text }]}>
                {Math.round(
                  parseFloat(stats.avg_reading_time?.toString() || "0"),
                )}
              </Text>
              <Text style={[styles.statPillLabel, { color: colors.textSecondary }]}>
                min
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );

  if (loading) {
    return (
      <ThemedImageBackground style={styles.container}>
        <StatusBar
          barStyle={
            currentTheme === "dark" || currentTheme === "sunset"
              ? "light-content"
              : "dark-content"
          }
          backgroundColor="transparent"
          translucent
        />
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingIconWrap, { backgroundColor: colors.primary }]}>
            <Ionicons name="book" size={40} color={colors.textOnPrimary} />
          </View>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Chargement des histoires...
          </Text>
        </View>
      </ThemedImageBackground>
    );
  }

  if (!networkStatus.isConnected && stories.length === 0) {
    return (
      <ThemedImageBackground style={styles.container}>
        <StatusBar
          barStyle={
            currentTheme === "dark" || currentTheme === "sunset"
              ? "light-content"
              : "dark-content"
          }
          backgroundColor="transparent"
          translucent
        />
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceVariant }]}>
            <Ionicons
              name="cloud-offline-outline"
              size={56}
              color={colors.textSecondary}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Mode hors ligne
          </Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            Aucune histoire téléchargée
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Connectez-vous à Internet et téléchargez des histoires pour y accéder hors ligne
          </Text>
        </View>
      </ThemedImageBackground>
    );
  }

  return (
    <ThemedImageBackground style={styles.container}>
      <StatusBar
        barStyle={currentTheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* 🚀 HEADER FIXE : Ne défile pas avec la liste */}
      {renderHeader()}

      {/* Section titre + refresh */}
      <View
        style={[
          styles.filtersContainer,
          {
            paddingHorizontal: universalLayout.contentPaddingHorizontal,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.filterRow}>
          <View style={styles.filterLeft}>
            <Ionicons
              name={networkStatus.isConnected ? "library-outline" : "cloud-download-outline"}
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.filterTitle, { color: colors.text }]}>
              {networkStatus.isConnected
                ? "Histoires disponibles"
                : "Histoires téléchargées"}
            </Text>
          </View>
          {networkStatus.isConnected && (
            <TouchableOpacity
              onPress={onRefresh}
              style={[styles.refreshButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={18} color={colors.textOnPrimary} />
              <Text
                style={[
                  styles.refreshButtonText,
                  { color: colors.textOnPrimary },
                ]}
              >
                {t("refresh")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 📜 LISTE DÉFILABLE UNIQUEMENT */}
      <FlatList
        data={stories || []}
        renderItem={renderStoryCard}
        keyExtractor={(item) => item?.id || Math.random().toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          {
            // 🚀 PADDING BOTTOM : Seulement pour la navigation, pas le header
            paddingBottom: universalLayout.contentPaddingBottom,
          },
        ]}
        style={styles.flatListContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyListContainer}>
              <View style={[styles.emptyListIconWrap, { backgroundColor: colors.surfaceVariant }]}>
                <Ionicons
                  name="book-outline"
                  size={40}
                  color={colors.textTertiary}
                />
              </View>
              <Text
                style={[styles.emptyListText, { color: colors.textSecondary }]}
              >
                Aucune histoire disponible pour le moment
              </Text>
            </View>
          ) : null
        }
      />
    </ThemedImageBackground>
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
  loadingIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  headerContainer: {
    marginBottom: 0,
    overflow: "hidden",
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  headerHero: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 14,
  },
  headerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.85,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  statPill: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
  },
  statPillNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  statPillLabel: {
    fontSize: 10,
    opacity: 0.85,
  },
  filtersContainer: {
    paddingVertical: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  refreshButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  flatListContainer: {
    flex: 1, // 🚀 OCCUPER L'ESPACE RESTANT : Pour que la liste prenne tout l'espace disponible
  },
  listContent: {
    // paddingBottom calculé dynamiquement dans le composant pour éviter que le contenu soit masqué par la barre de navigation
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.75,
    textAlign: "center",
    lineHeight: 22,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptyListContainer: {
    padding: 48,
    alignItems: "center",
    gap: 16,
  },
  emptyListIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyListText: {
    fontSize: 16,
    textAlign: "center",
  },
});
