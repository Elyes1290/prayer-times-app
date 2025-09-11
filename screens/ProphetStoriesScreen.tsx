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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { ThemedView } from "../components/ThemedView";
import { ThemedText } from "../components/ThemedText";
import { useThemeColors } from "../hooks/useThemeAssets";
import { useCurrentTheme } from "../hooks/useThemeColor";
import { usePremium } from "../contexts/PremiumContext";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUniversalStyles } from "../hooks/useUniversalLayout";
import {
  useFavorites,
  ProphetStoryFavorite,
} from "../contexts/FavoritesContext";

// Helper pour obtenir le token d'authentification
const getAuthToken = async (): Promise<string> => {
  const token = await AsyncStorage.getItem("auth_token");
  return token || "";
};

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
}

interface StoryStats {
  total_stories: number | string;
  free_stories: number | string;
  premium_stories: number | string;
  avg_reading_time: number | string;
}

const CATEGORY_ICONS: Record<string, string> = {
  childhood: "person-outline",
  revelation: "flash-outline",
  meccan_period: "home-outline",
  hijra: "walk-outline",
  medinian_period: "business-outline",
  battles: "shield-outline",
  companions: "people-outline",
  family_life: "heart-outline",
  final_years: "hourglass-outline",
  character_traits: "star-outline",
  miracles: "sparkles-outline",
  daily_life: "calendar-outline",
};

const DIFFICULTY_COLORS = {
  beginner: "#4CAF50",
  intermediate: "#FF9800",
  advanced: "#F44336",
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
        (fav as ProphetStoryFavorite).storyId === storyId
    );
  };

  // État local
  const [stories, setStories] = useState<ProphetStory[]>([]);
  const [stats, setStats] = useState<StoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Charger les données
  const loadStories = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const token = await getAuthToken();
      const headers: any = {
        "Content-Type": "application/json",
      };

      // Ajouter le token seulement s'il existe
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `https://myadhanapp.com/api/prophet-stories.php?action=catalog`,
        {
          method: "GET",
          headers: headers,
        }
      );
      const responseData = await response.json();

      if (responseData.success) {
        setStories(responseData.data.stories || []);
        setStats(responseData.data.stats || null);
      } else {
        Alert.alert(
          "Erreur",
          responseData.message || "Impossible de charger les histoires"
        );
      }
    } catch (error) {
      console.error("Erreur chargement histoires:", error);
      Alert.alert("Erreur", "Erreur de connexion");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStories();
    }, [loadStories])
  );

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
        ]
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
            (fav as ProphetStoryFavorite).storyId === storyId
        );

        if (favoriteToRemove) {
          const success = await removeFavorite(favoriteToRemove.id);
          if (success) {
            // Mettre à jour l'état local des histoires
            setStories((prev) =>
              prev.map((s) =>
                s.id === storyId ? { ...s, is_favorited: false } : s
              )
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
            ]
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
              story.is_premium === "1"
          ),
        };

        const success = await addFavorite(newFavorite);
        if (success) {
          // Mettre à jour l'état local des histoires
          setStories((prev) =>
            prev.map((s) =>
              s.id === storyId ? { ...s, is_favorited: true } : s
            )
          );
        }
      }
    } catch (error) {
      console.error("Erreur toggle favorite:", error);
      Alert.alert("Erreur", "Impossible de modifier les favoris");
    }
  };

  const getCategoryDisplayName = (category: string): string => {
    const translations: Record<string, string> = {
      childhood: "Enfance",
      revelation: "Révélation",
      meccan_period: "Période Mecquoise",
      hijra: "Hijra",
      medinian_period: "Période Médinoise",
      battles: "Batailles",
      companions: "Compagnons",
      family_life: "Vie Familiale",
      final_years: "Dernières Années",
      character_traits: "Traits de Caractère",
      miracles: "Miracles",
      daily_life: "Vie Quotidienne",
    };
    return translations[category] || category;
  };

  const renderStoryCard = ({ item: story }: { item: ProphetStory }) => {
    // Protection contre les objets undefined/null
    if (!story || !story.id || !story.title) {
      return null;
    }

    // 🚀 PROTECTION TOTALE : Normaliser toutes les valeurs pour éviter null/undefined
    const safeStory = {
      id: String(story.id || ""),
      title: String(story.title || "Histoire"),
      title_arabic: story.title_arabic ? String(story.title_arabic) : null,
      category: String(story.category || "daily_life"),
      difficulty: story.difficulty || "beginner",
      reading_time: Number(story.reading_time) || 0,
      view_count: Number(story.view_count) || 0,
      rating: Number(story.rating) || 0,
      user_progress: Number(story.user_progress) || 0,
      is_favorited: isStoryFavorited(String(story.id)), // 🚀 UTILISER LE SYSTÈME LOCAL
      is_premium: Boolean(
        story.is_premium === true ||
          story.is_premium === 1 ||
          story.is_premium === "1"
      ),
      historical_location: story.historical_location
        ? String(story.historical_location)
        : null,
    };

    return (
      <TouchableOpacity
        style={[
          styles.storyCard,
          {
            backgroundColor: colors.cardBG,
            // 🚀 RESPONSIVE : Marges adaptatives selon la taille d'écran
            marginHorizontal: Math.max(
              universalLayout.contentPaddingHorizontal - 4,
              12
            ),
          },
        ]}
        onPress={() => handleStoryPress(story)}
        activeOpacity={0.8}
      >
        <View style={styles.storyHeader}>
          <View style={styles.storyTitleContainer}>
            <ThemedText style={styles.storyTitle} numberOfLines={2}>
              {safeStory.title}
            </ThemedText>
            {safeStory.title_arabic && (
              <Text
                style={[
                  styles.storyTitleArabic,
                  { color: colors.textSecondary },
                ]}
              >
                {safeStory.title_arabic}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => toggleFavorite(safeStory.id)}
            style={styles.favoriteButton}
          >
            <Ionicons
              name={safeStory.is_favorited ? "heart" : "heart-outline"}
              size={24}
              color={safeStory.is_favorited ? "#FF6B6B" : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.storyMeta}>
          <View style={styles.metaRow}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons
                name={CATEGORY_ICONS[safeStory.category] as any}
                size={14}
                color="white"
              />
              <Text style={styles.categoryBadgeText}>
                {getCategoryDisplayName(safeStory.category)}
              </Text>
            </View>

            <View
              style={[
                styles.difficultyBadge,
                { backgroundColor: DIFFICULTY_COLORS[safeStory.difficulty] },
              ]}
            >
              <Text style={styles.difficultyBadgeText}>
                {safeStory.difficulty === "beginner"
                  ? "Débutant"
                  : safeStory.difficulty === "intermediate"
                  ? "Intermédiaire"
                  : "Avancé"}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons
                name="time-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {safeStory.reading_time} min
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Ionicons
                name="eye-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {safeStory.view_count}
              </Text>
            </View>

            {safeStory.rating > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text
                  style={[styles.metaText, { color: colors.textSecondary }]}
                >
                  {safeStory.rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Barre de progression si l'histoire a été commencée */}
        {safeStory.user_progress > 0 && (
          <View style={styles.progressContainer}>
            <View
              style={[styles.progressBar, { backgroundColor: colors.border }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${safeStory.user_progress}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.progressText, { color: colors.textSecondary }]}
            >
              {Math.round(safeStory.user_progress)}% lu
            </Text>
          </View>
        )}

        {/* Badge Premium */}
        {safeStory.is_premium && (
          <View style={[styles.premiumBadge, { backgroundColor: "#FFD700" }]}>
            <Ionicons name="star" size={12} color="#000" />
            <Text style={styles.premiumText}>Premium</Text>
          </View>
        )}

        {/* Badge localisation historique */}
        {safeStory.historical_location && (
          <View style={styles.locationContainer}>
            <Ionicons
              name="location-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text
              style={[styles.locationText, { color: colors.textSecondary }]}
            >
              {safeStory.historical_location}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={
          currentTheme === "dark"
            ? ["#1a472a", "#2d5a3d"]
            : ["#E8F5E8", "#C8E6C9"]
        }
        style={[
          styles.headerGradient,
          {
            // 🚀 RESPONSIVE : Adapte le padding selon l'appareil (S22, S24, S25 Ultra)
            paddingHorizontal: universalLayout.contentPaddingHorizontal,
            paddingTop: Math.max(universalLayout.safeAreaTop + 20, 60),
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <ThemedText style={styles.headerTitle}>
              📚 Histoires du Prophète
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Mohammad (ﷺ) - Paix et Bénédictions sur Lui
            </ThemedText>
          </View>

          {stats && (
            <View
              style={[
                styles.statsContainer,
                { backgroundColor: colors.cardBG },
              ]}
            >
              <View style={styles.statItem}>
                <ThemedText style={styles.statNumber}>
                  {parseInt(stats.total_stories?.toString() || "0")}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Histoires</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statNumber}>
                  {parseInt(stats.free_stories?.toString() || "0")}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Gratuites</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statNumber}>
                  {parseInt(stats.premium_stories?.toString() || "0")}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Premium</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statNumber}>
                  {Math.round(
                    parseFloat(stats.avg_reading_time?.toString() || "0")
                  )}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Min/histoire</ThemedText>
              </View>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar
          barStyle={currentTheme === "dark" ? "light-content" : "dark-content"}
          backgroundColor="transparent"
          translucent
        />
        <View style={styles.loadingContainer}>
          <ThemedText>Chargement des histoires...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar
        barStyle={currentTheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* 🚀 HEADER FIXE : Ne défile pas avec la liste */}
      {renderHeader()}

      {/* 📂 SECTION TITRE FIXE */}
      <View
        style={[
          styles.filtersContainer,
          {
            paddingHorizontal: universalLayout.contentPaddingHorizontal,
          },
        ]}
      >
        <Text style={[styles.filterTitle, { color: colors.text }]}>
          📂 Histoires disponibles
        </Text>
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
            <View style={{ padding: 20, alignItems: "center" }}>
              <ThemedText style={{ textAlign: "center", fontSize: 16 }}>
                Aucune histoire disponible pour le moment
              </ThemedText>
            </View>
          ) : null
        }
      />
    </ThemedView>
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
  headerContainer: {
    marginBottom: 0,
  },
  headerGradient: {
    paddingTop: 60,
    paddingHorizontal: 16, // Sera remplacé par le padding universel
    paddingBottom: 20,
  },
  headerContent: {
    alignItems: "center",
  },
  headerTextContainer: {
    alignItems: "center",
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: "center",
  },
  statsContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  filtersContainer: {
    paddingVertical: 15,
    paddingBottom: 10,
    // paddingHorizontal défini dynamiquement dans le composant
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  flatListContainer: {
    flex: 1, // 🚀 OCCUPER L'ESPACE RESTANT : Pour que la liste prenne tout l'espace disponible
  },
  listContent: {
    // paddingBottom calculé dynamiquement dans le composant pour éviter que le contenu soit masqué par la barre de navigation
  },
  storyCard: {
    marginHorizontal: 12, // Sera remplacé par le responsive margin
    marginVertical: 8,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: "relative",
  },
  storyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  storyTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  storyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    lineHeight: 24,
    marginBottom: 4,
  },
  storyTitleArabic: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "right",
  },
  favoriteButton: {
    padding: 5,
  },
  storyMeta: {
    gap: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  difficultyBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  progressContainer: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    minWidth: 60,
    textAlign: "right",
  },
  premiumBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 2,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#000",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontStyle: "italic",
  },
});
