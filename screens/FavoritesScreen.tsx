import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  Share,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import ThemedImageBackground from "../components/ThemedImageBackground";
import {
  useFavorites,
  Favorite,
  FavoriteType,
  ProphetStoryFavorite,
} from "../contexts/FavoritesContext";
import { useThemeColors } from "../hooks/useThemeAssets";
import { useOverlayTextColor, useCurrentTheme } from "../hooks/useThemeColor";

const { width } = Dimensions.get("window");

// Types de filtres
type FilterType = "all" | FavoriteType;

const FavoritesScreen: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const currentTheme = useCurrentTheme();
  const isLightTheme = currentTheme === "light" || currentTheme === "morning";

  const {
    favorites,
    removeFavorite,
    clearAllFavorites,
    getFavoritesCountByType,
  } = useFavorites();

  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");

  // 🚀 Fonction pour rediriger vers la page de lecture d'une histoire du Prophète
  const handleProphetStoryPress = useCallback(
    async (storyId: string) => {
      try {
        // 📦 STOCKER L'ID dans AsyncStorage comme le fait ProphetStoriesScreen
        await AsyncStorage.setItem("current_story_id", storyId);
        // 📖 Naviguer vers la page de lecture
        router.push("/story-reader" as any);
      } catch (error) {
        console.error("Erreur lors de la navigation vers l'histoire:", error);
        // Fallback: navigation directe avec paramètres si AsyncStorage échoue
        router.push({
          pathname: "/story-reader",
          params: { storyId },
        });
      }
    },
    [router]
  );

  // Configuration des filtres
  const filterOptions: {
    key: FilterType;
    label: string;
    icon: string;
    count: number;
  }[] = [
    {
      key: "all",
      label: t("favorites_screen.all") || "Tous",
      icon: "heart-multiple",
      count: favorites.length,
    },
    {
      key: "quran_verse",
      label: t("favorites_screen.quran") || "Coran",
      icon: "book-open-variant",
      count: getFavoritesCountByType("quran_verse"),
    },
    {
      key: "hadith",
      label: t("favorites_screen.hadith") || "Hadiths",
      icon: "book",
      count: getFavoritesCountByType("hadith"),
    },
    {
      key: "dhikr",
      label: t("favorites_screen.dhikr") || "Dhikr",
      icon: "hand-heart",
      count: getFavoritesCountByType("dhikr"),
    },
    {
      key: "asmaul_husna",
      label: t("favorites_screen.names") || "Noms d'Allah",
      icon: "star-circle",
      count: getFavoritesCountByType("asmaul_husna"),
    },
    {
      key: "prophet_story",
      label: t("favorites_screen.prophet_stories") || "Histoires du Prophète",
      icon: "book-open-page-variant",
      count: getFavoritesCountByType("prophet_story"),
    },
  ];

  // Favoris filtrés
  const filteredFavorites = useMemo(() => {
    if (selectedFilter === "all") {
      return favorites;
    }
    return favorites.filter((fav) => fav.type === selectedFilter);
  }, [favorites, selectedFilter]);

  // Fonction pour partager un favori
  const handleShare = async (favorite: Favorite) => {
    try {
      let message = "";

      switch (favorite.type) {
        case "quran_verse":
          message = `${favorite.arabicText}\n\n${favorite.translation}\n\n${
            favorite.chapterName
          } - ${favorite.verseNumber}\n\n${t(
            "favorites_screen.shared_from_app"
          )}`;
          break;
        case "hadith":
          message = `${favorite.arabicText || ""}\n\n${
            favorite.translation
          }\n\n${favorite.bookName} - ${favorite.hadithNumber}\n\n${t(
            "favorites_screen.shared_from_app"
          )}`;
          break;
        case "dhikr":
          message = `${favorite.arabicText}\n\n${favorite.translation}\n\n${
            favorite.source || ""
          }\n\n${t("favorites_screen.shared_from_app")}`;
          break;
        case "asmaul_husna":
          message = `${favorite.arabicName}\n\n${favorite.transliteration}\n\n${
            favorite.meaning
          }\n\n${t("favorites_screen.shared_from_app")}`;
          break;
      }

      await Share.share({ message });
    } catch (error) {
      console.error(t("favorites_screen.share_error"), error);
    }
  };

  // Fonction pour supprimer un favori avec confirmation
  const handleRemoveFavorite = (favorite: Favorite) => {
    Alert.alert(
      t("favorites_screen.remove_title") || "Retirer des favoris",
      t("favorites_screen.remove_confirm") ||
        "Êtes-vous sûr de vouloir retirer cet élément de vos favoris ?",
      [
        {
          text: t("cancel") || "Annuler",
          style: "cancel",
        },
        {
          text: t("remove") || "Retirer",
          style: "destructive",
          onPress: () => removeFavorite(favorite.id),
        },
      ]
    );
  };

  // Fonction pour supprimer tous les favoris
  const handleClearAll = () => {
    if (favorites.length === 0) return;

    Alert.alert(
      t("favorites_screen.clear_all_title") || "Vider les favoris",
      t("favorites_screen.clear_all_confirm") ||
        "Êtes-vous sûr de vouloir supprimer tous vos favoris ? Cette action est irréversible.",
      [
        {
          text: t("cancel") || "Annuler",
          style: "cancel",
        },
        {
          text: t("clear_all") || "Tout supprimer",
          style: "destructive",
          onPress: clearAllFavorites,
        },
      ]
    );
  };

  // Composant mémorisé pour les éléments favoris
  const FavoriteItem = React.memo(({ item }: { item: Favorite }) => (
    <View style={styles.favoriteCard}>
      <LinearGradient
        colors={getGradientForType(item.type, currentTheme)}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header de la carte */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <MaterialCommunityIcons
              name={getIconForType(item.type) as any}
              size={20}
              color={colors.islamicGold} // 🌅 Utilise la couleur du thème actif
            />
            <Text style={styles.cardType}>{getTypeLabel(item.type, t)}</Text>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleShare(item)}
            >
              <MaterialCommunityIcons
                name="share-variant"
                size={20}
                color={isLightTheme ? colors.text : "#fff"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleRemoveFavorite(item)}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={20}
                color="#ff6b6b"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Contenu de la carte */}
        <View style={styles.cardContent}>{renderCardContent(item)}</View>

        {/* Date d'ajout */}
        <Text style={styles.dateAdded}>
          {t("favorites.added_on") || "Ajouté le"}{" "}
          {item.dateAdded.toLocaleDateString()}
        </Text>

        {/* Note personnelle si elle existe */}
        {item.note && (
          <View style={styles.noteContainer}>
            <MaterialCommunityIcons
              name="note-text"
              size={16}
              color={colors.islamicGold} // 🌅 Utilise la couleur du thème actif
            />
            <Text style={styles.noteText}>{item.note}</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  ));

  FavoriteItem.displayName = "FavoriteItem";

  // Fonction renderItem optimisée
  const renderFavoriteItem = useCallback(
    ({ item }: { item: Favorite }) => <FavoriteItem item={item} />,
    []
  );

  // Rendu du contenu spécifique selon le type
  const renderCardContent = (item: Favorite) => {
    switch (item.type) {
      case "quran_verse":
        return (
          <>
            <Text style={styles.arabicText}>{item.arabicText}</Text>
            <Text style={styles.translationText}>{item.translation}</Text>
            <Text style={styles.referenceText}>
              {item.chapterName} - {t("verse")} {item.verseNumber}
            </Text>
          </>
        );

      case "hadith":
        return (
          <>
            {item.arabicText && (
              <Text style={styles.arabicText}>{item.arabicText}</Text>
            )}
            <Text style={styles.translationText}>{item.translation}</Text>
            <Text style={styles.referenceText}>
              {item.bookName} - {item.hadithNumber}
            </Text>
          </>
        );

      case "dhikr":
        return (
          <>
            <Text style={styles.arabicText}>{item.arabicText}</Text>
            <Text style={styles.translationText}>{item.translation}</Text>
            {item.source && (
              <Text style={styles.referenceText}>{item.source}</Text>
            )}
          </>
        );

      case "asmaul_husna":
        return (
          <>
            <Text style={styles.arabicText}>{item.arabicName}</Text>
            <Text style={styles.transliterationText}>
              {item.transliteration}
            </Text>
            <Text style={styles.translationText}>{item.meaning}</Text>
          </>
        );

      case "prophet_story":
        const prophetStory = item as ProphetStoryFavorite;
        return (
          <>
            <TouchableOpacity
              onPress={() => handleProphetStoryPress(prophetStory.storyId)}
              style={styles.prophetStoryContainer}
              activeOpacity={0.7}
            >
              <Text style={styles.prophetStoryTitle}>{prophetStory.title}</Text>
              {prophetStory.titleArabic && (
                <Text style={styles.prophetStoryTitleArabic}>
                  {prophetStory.titleArabic}
                </Text>
              )}
              <View style={styles.prophetStoryMeta}>
                <Text style={styles.prophetStoryCategory}>
                  📂 {prophetStory.category}
                </Text>
                <Text style={styles.prophetStoryDifficulty}>
                  📊{" "}
                  {prophetStory.difficulty === "beginner"
                    ? "Débutant"
                    : prophetStory.difficulty === "intermediate"
                    ? "Intermédiaire"
                    : "Avancé"}
                </Text>
                <Text style={styles.prophetStoryTime}>
                  ⏱️ {prophetStory.readingTime} min
                </Text>
                {prophetStory.isPremium && (
                  <Text style={styles.prophetStoryPremium}>👑 Premium</Text>
                )}
              </View>
              <Text style={styles.prophetStoryAction}>
                📖 Appuyer pour lire l'histoire complète
              </Text>
            </TouchableOpacity>
          </>
        );

      default:
        return null;
    }
  };

  // État vide
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="heart-outline"
        size={80}
        color="rgba(255, 255, 255, 0.3)"
      />
      <Text style={styles.emptyTitle}>
        {selectedFilter === "all"
          ? t("favorites_screen.empty_all") || "Aucun favori"
          : t("favorites_screen.empty_filter") ||
            t(
              "favorites.no_favorites_in_category",
              "Aucun favori dans cette catégorie"
            )}
      </Text>
      <Text style={styles.emptySubtitle}>
        {t("favorites_screen.empty_subtitle") ||
          t(
            "favorites.press_heart_to_add",
            "Appuyez sur ❤️ pour ajouter vos contenus préférés"
          )}
      </Text>
    </View>
  );

  const styles = getStyles(colors, overlayTextColor, currentTheme);

  return (
    <ThemedImageBackground
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={overlayTextColor}
            />
          </TouchableOpacity>
          <Text style={styles.title}>
            {t("favorites_screen.title") || "Mes Favoris"}
          </Text>
        </View>

        {favorites.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
            <MaterialCommunityIcons
              name="delete-sweep"
              size={24}
              color="#ff6b6b"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={filterOptions}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === item.key && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(item.key)}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={18}
                color={
                  selectedFilter === item.key
                    ? "#000"
                    : isLightTheme
                    ? colors.text
                    : "#fff"
                }
              />
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === item.key && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
              {item.count > 0 && (
                <View
                  style={[
                    styles.countBadge,
                    selectedFilter === item.key && styles.countBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      selectedFilter === item.key && styles.countTextActive,
                    ]}
                  >
                    {item.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Liste des favoris */}
      <FlatList
        data={filteredFavorites}
        renderItem={renderFavoriteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          filteredFavorites.length === 0 && styles.listContainerEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={10}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={100}
        getItemLayout={(data, index) => ({
          length: 180, // hauteur estimée d'une carte favori
          offset: 180 * index,
          index,
        })}
      />
    </ThemedImageBackground>
  );
};

// Fonctions utilitaires
const getGradientForType = (
  type: FavoriteType,
  currentTheme: "light" | "dark" | "morning" | "sunset"
): [string, string] => {
  const isLightTheme = currentTheme === "light" || currentTheme === "morning";
  if (isLightTheme) {
    switch (type) {
      case "quran_verse":
        return ["rgba(78,205,196,0.15)", "rgba(78,205,196,0.05)"];
      case "hadith":
        return ["rgba(255,215,0,0.15)", "rgba(255,215,0,0.05)"];
      case "dhikr":
        return ["rgba(240,147,251,0.15)", "rgba(240,147,251,0.05)"];
      case "asmaul_husna":
        return ["rgba(255,107,107,0.15)", "rgba(255,107,107,0.05)"];
      case "prophet_story":
        return ["rgba(34,139,34,0.15)", "rgba(34,139,34,0.05)"];
      default:
        return ["rgba(0,0,0,0.05)", "rgba(0,0,0,0.02)"];
    }
  } else {
    switch (type) {
      case "quran_verse":
        return ["rgba(78,205,196,0.2)", "rgba(44,122,122,0.1)"];
      case "hadith":
        return ["rgba(255,215,0,0.2)", "rgba(255,179,102,0.1)"];
      case "dhikr":
        return ["rgba(240,147,251,0.2)", "rgba(155,75,155,0.1)"];
      case "asmaul_husna":
        return ["rgba(255,107,107,0.2)", "rgba(139,0,0,0.1)"];
      case "prophet_story":
        return ["rgba(34,139,34,0.2)", "rgba(0,100,0,0.1)"];
      default:
        return ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"];
    }
  }
};

const getIconForType = (type: FavoriteType): string => {
  switch (type) {
    case "quran_verse":
      return "book-open-variant";
    case "hadith":
      return "book";
    case "dhikr":
      return "hand-heart";
    case "asmaul_husna":
      return "star-circle";
    case "prophet_story":
      return "book-open-page-variant";
    default:
      return "heart";
  }
};

const getTypeLabel = (type: FavoriteType, t: any): string => {
  switch (type) {
    case "quran_verse":
      return t("favorites_screen.quran");
    case "hadith":
      return t("favorites_screen.hadith");
    case "dhikr":
      return t("favorites_screen.dhikr");
    case "asmaul_husna":
      return t("favorites_screen.names");
    case "prophet_story":
      return t("favorites_screen.prophet_stories");
    default:
      return "Favori";
  }
};

// Styles
const getStyles = (
  colors: any,
  overlayTextColor: string,
  currentTheme: "light" | "dark" | "morning" | "sunset"
) => {
  const isLightTheme = currentTheme === "light" || currentTheme === "morning";
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor:
        isLightTheme ? colors.border : "rgba(255, 255, 255, 0.1)",
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    backButton: {
      marginRight: 15,
      padding: 5,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: overlayTextColor,
    },
    clearButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: "rgba(255, 107, 107, 0.2)",
    },
    filtersContainer: {
      paddingVertical: 15,
    },
    filtersList: {
      paddingHorizontal: 20,
    },
    filterButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginRight: 12,
      borderRadius: 20,
      backgroundColor:
        isLightTheme ? colors.surface : "rgba(255, 255, 255, 0.1)",
      borderWidth: 1,
      borderColor:
        isLightTheme ? colors.border : "rgba(255, 255, 255, 0.2)",
    },
    filterButtonActive: {
      backgroundColor: colors.islamicGold, // 🌅 Utilise la couleur du thème actif
      borderColor: colors.islamicGold, // 🌅 Utilise la couleur du thème actif
    },
    filterText: {
      color: isLightTheme ? colors.text : "#fff",
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
    },
    filterTextActive: {
      color: "#000",
    },
    countBadge: {
      marginLeft: 8,
      backgroundColor:
        isLightTheme
          ? "rgba(0, 0, 0, 0.1)"
          : "rgba(255, 255, 255, 0.2)",
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: "center",
    },
    countBadgeActive: {
      backgroundColor: "rgba(0, 0, 0, 0.2)",
    },
    countText: {
      color: isLightTheme ? colors.text : "#fff",
      fontSize: 12,
      fontWeight: "700",
    },
    countTextActive: {
      color: "#000",
    },
    listContainer: {
      padding: 20,
      paddingBottom: 100,
    },
    listContainerEmpty: {
      flex: 1,
      justifyContent: "center",
    },
    favoriteCard: {
      marginBottom: 16,
      borderRadius: 16,
      overflow: "hidden",
    },
    cardGradient: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        isLightTheme ? colors.border : "rgba(255, 255, 255, 0.1)",
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    cardHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    cardType: {
      color: colors.islamicGold, // 🌅 Utilise la couleur du thème actif
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 8,
    },
    cardActions: {
      flexDirection: "row",
    },
    actionButton: {
      padding: 8,
      marginLeft: 8,
      borderRadius: 8,
      backgroundColor:
        isLightTheme ? colors.surface : "rgba(255, 255, 255, 0.1)",
    },
    cardContent: {
      marginBottom: 12,
    },
    arabicText: {
      fontSize: 20,
      color: overlayTextColor,
      fontFamily: "ScheherazadeNew",
      textAlign: "center",
      marginBottom: 8,
      lineHeight: 30,
    },
    transliterationText: {
      fontSize: 16,
      color: colors.islamicGold, // 🌅 Utilise la couleur du thème actif
      fontStyle: "italic",
      textAlign: "center",
      marginBottom: 6,
    },
    translationText: {
      fontSize: 16,
      color:
        isLightTheme
          ? colors.textSecondary
          : "rgba(255, 255, 255, 0.9)",
      textAlign: "center",
      marginBottom: 8,
      lineHeight: 22,
    },
    referenceText: {
      fontSize: 14,
      color:
        isLightTheme
          ? colors.textTertiary
          : "rgba(255, 255, 255, 0.7)",
      textAlign: "center",
      fontStyle: "italic",
    },
    dateAdded: {
      fontSize: 12,
      color:
        isLightTheme
          ? colors.textTertiary
          : "rgba(255, 255, 255, 0.6)",
      textAlign: "right",
    },
    noteContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginTop: 8,
      padding: 8,
      backgroundColor: "rgba(255, 215, 0, 0.1)",
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: colors.islamicGold, // 🌅 Utilise la couleur du thème actif
    },
    noteText: {
      flex: 1,
      color:
        isLightTheme
          ? colors.textSecondary
          : "rgba(255, 255, 255, 0.9)",
      fontSize: 14,
      marginLeft: 8,
      fontStyle: "italic",
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: overlayTextColor,
      marginTop: 20,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: 16,
      color:
        isLightTheme
          ? colors.textSecondary
          : "rgba(255, 255, 255, 0.7)",
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: 40,
    },
    // 🚀 NOUVEAUX STYLES : Pour les histoires du Prophète dans les favoris
    prophetStoryContainer: {
      width: "100%",
    },
    prophetStoryTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: isLightTheme ? colors.text : "#fff",
      marginBottom: 6,
      lineHeight: 22,
    },
    prophetStoryTitleArabic: {
      fontSize: 14,
      fontWeight: "600",
      color:
        isLightTheme
          ? colors.textSecondary
          : "rgba(255, 255, 255, 0.8)",
      marginBottom: 8,
      textAlign: "right",
      fontFamily: "serif",
    },
    prophetStoryMeta: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 10,
    },
    prophetStoryCategory: {
      fontSize: 12,
      color: isLightTheme ? "#2E8B57" : "#90EE90",
      fontWeight: "600",
    },
    prophetStoryDifficulty: {
      fontSize: 12,
      color: isLightTheme ? "#FF6B6B" : "#FFB6C1",
      fontWeight: "600",
    },
    prophetStoryTime: {
      fontSize: 12,
      color: colors.primary, // 🌅 Utilise la couleur du thème actif
      fontWeight: "600",
    },
    prophetStoryPremium: {
      fontSize: 12,
      color: colors.islamicGold, // 🌅 Utilise la couleur du thème actif
      fontWeight: "700",
    },
    prophetStoryAction: {
      fontSize: 13,
      color: colors.info, // 🌅 Utilise la couleur du thème actif
      fontWeight: "600",
      fontStyle: "italic",
      textAlign: "center",
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor:
        isLightTheme
          ? "rgba(0, 0, 0, 0.1)"
          : "rgba(255, 255, 255, 0.2)",
    },
  });
};

export default FavoritesScreen;
