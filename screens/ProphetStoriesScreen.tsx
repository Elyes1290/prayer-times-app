import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
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

interface CategoryInfo {
  category: string;
  count: number | string;
  free_count: number | string;
  premium_count: number | string;
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

  // État local
  const [stories, setStories] = useState<ProphetStory[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [stats, setStats] = useState<StoryStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Charger les données
  const loadStories = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);

        const params = new URLSearchParams();
        if (selectedCategory) params.append("category", selectedCategory);
        if (selectedDifficulty) params.append("difficulty", selectedDifficulty);

        const token = await getAuthToken();
        const headers: any = {
          "Content-Type": "application/json",
        };

        // Ajouter le token seulement s'il existe
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(
          `https://myadhanapp.com/api/prophet-stories.php?action=catalog&${params.toString()}`,
          {
            method: "GET",
            headers: headers,
          }
        );
        const responseData = await response.json();

        if (responseData.success) {
          setStories(responseData.data.stories || []);
          setCategories(responseData.data.categories || []);
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
    },
    [selectedCategory, selectedDifficulty]
  );

  useFocusEffect(
    useCallback(() => {
      loadStories();
    }, [loadStories])
  );

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
      const token = await getAuthToken();

      if (!token) {
        Alert.alert(
          "Connexion requise",
          "Vous devez être connecté pour ajouter des favoris.",
          [
            { text: "Annuler", style: "cancel" },
            { text: "Se connecter", onPress: () => router.push("/settings") },
          ]
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
            action: "toggle",
          }),
        }
      );

      // Mettre à jour l'état local
      setStories((prev) =>
        prev.map((story) =>
          story.id === storyId
            ? { ...story, is_favorited: !story.is_favorited }
            : story
        )
      );
    } catch (error) {
      console.error("Erreur toggle favorite:", error);
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

  const renderCategoryFilter = () => (
    <View style={styles.filtersContainer}>
      <Text style={[styles.filterTitle, { color: colors.text }]}>
        📂 Catégories
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            !selectedCategory && styles.categoryChipActive,
            {
              backgroundColor: !selectedCategory
                ? colors.primary
                : colors.cardBG,
            },
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text
            style={[
              styles.categoryChipText,
              { color: !selectedCategory ? "white" : colors.text },
            ]}
          >
            Toutes
          </Text>
        </TouchableOpacity>

        {(categories || []).map((cat) => {
          // Protection contre les objets malformés
          if (!cat || !cat.category) {
            return null;
          }

          return (
            <TouchableOpacity
              key={cat.category}
              style={[
                styles.categoryChip,
                selectedCategory === cat.category && styles.categoryChipActive,
                {
                  backgroundColor:
                    selectedCategory === cat.category
                      ? colors.primary
                      : colors.cardBG,
                },
              ]}
              onPress={() =>
                setSelectedCategory(
                  cat.category === selectedCategory ? null : cat.category
                )
              }
            >
              <Ionicons
                name={(CATEGORY_ICONS[cat.category] || "folder-outline") as any}
                size={16}
                color={
                  selectedCategory === cat.category ? "white" : colors.text
                }
                style={styles.categoryIcon}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color:
                      selectedCategory === cat.category ? "white" : colors.text,
                  },
                ]}
              >
                {getCategoryDisplayName(cat.category)} (
                {parseInt(cat.count?.toString() || "0")})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderDifficultyFilter = () => (
    <View style={styles.filtersContainer}>
      <Text style={[styles.filterTitle, { color: colors.text }]}>
        📊 Difficulté
      </Text>
      <View style={styles.difficultyContainer}>
        {["beginner", "intermediate", "advanced"].map((diff) => (
          <TouchableOpacity
            key={diff}
            style={[
              styles.difficultyChip,
              selectedDifficulty === diff && {
                backgroundColor:
                  DIFFICULTY_COLORS[diff as keyof typeof DIFFICULTY_COLORS],
              },
              {
                borderColor:
                  DIFFICULTY_COLORS[diff as keyof typeof DIFFICULTY_COLORS],
              },
            ]}
            onPress={() =>
              setSelectedDifficulty(diff === selectedDifficulty ? null : diff)
            }
          >
            <Text
              style={[
                styles.difficultyText,
                {
                  color:
                    selectedDifficulty === diff
                      ? "white"
                      : DIFFICULTY_COLORS[
                          diff as keyof typeof DIFFICULTY_COLORS
                        ],
                },
              ]}
            >
              {diff === "beginner"
                ? "Débutant"
                : diff === "intermediate"
                ? "Intermédiaire"
                : "Avancé"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

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
      is_favorited: Boolean(
        story.is_favorited === true ||
          story.is_favorited === 1 ||
          story.is_favorited === "1"
      ),
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
        style={[styles.storyCard, { backgroundColor: colors.cardBG }]}
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
        style={styles.headerGradient}
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

      <FlatList
        data={stories || []}
        renderItem={renderStoryCard}
        keyExtractor={(item) => item?.id || Math.random().toString()}
        ListHeaderComponent={
          <View>
            {renderHeader()}
            <View style={styles.filtersContainer}>
              <Text style={[styles.filterTitle, { color: colors.text }]}>
                📂 Histoires disponibles
              </Text>
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
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
    paddingHorizontal: 20,
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
    padding: 15,
    paddingBottom: 10,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  categoriesScroll: {
    marginLeft: -5,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    elevation: 1,
  },
  categoryChipActive: {
    elevation: 2,
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  difficultyContainer: {
    flexDirection: "row",
    gap: 10,
  },
  difficultyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1.5,
  },
  difficultyText: {
    fontSize: 13,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 20,
  },
  storyCard: {
    marginHorizontal: 15,
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
