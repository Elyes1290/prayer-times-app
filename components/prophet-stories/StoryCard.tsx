import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "../ThemedText";

export interface StoryCardData {
  id: string;
  title: string;
  title_arabic?: string | null;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  reading_time: number;
  view_count: number;
  rating: number;
  user_progress: number;
  is_favorited: boolean;
  is_premium: boolean;
  historical_location?: string | null;
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
  creation: "construct-outline",
  paradise: "leaf-outline",
  earth_life: "earth-outline",
  prophets_lineage: "git-branch-outline",
  prophethood: "book-outline",
};

const DIFFICULTY_COLORS = {
  beginner: "#4CAF50",
  intermediate: "#FF9800",
  advanced: "#F44336",
};

const CATEGORY_LABELS: Record<string, string> = {
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

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

interface StoryCardProps {
  story: StoryCardData;
  rawStory: { id: string; isDownloaded?: boolean };
  colors: {
    cardBG: string;
    border: string;
    primary: string;
    textSecondary: string;
  };
  contentPaddingHorizontal: number;
  onPress: () => void;
  onToggleFavorite: () => void;
  isConnected: boolean;
  isDownloading: boolean;
  onDownload: () => void;
  onDelete: () => void;
}

export function StoryCard({
  story,
  rawStory,
  colors,
  contentPaddingHorizontal,
  onPress,
  onToggleFavorite,
  isConnected,
  isDownloading,
  onDownload,
  onDelete,
}: StoryCardProps) {
  const handleDownloadPress = () => {
    if (rawStory.isDownloaded) {
      Alert.alert(
        "Supprimer",
        "Voulez-vous supprimer cette histoire téléchargée ?",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Supprimer", style: "destructive", onPress: onDelete },
        ],
      );
    } else {
      onDownload();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.storyCard,
        story.user_progress > 0 && styles.storyCardWithAccent,
        {
          backgroundColor: colors.cardBG,
          borderColor: colors.border,
          marginHorizontal: Math.max(contentPaddingHorizontal - 4, 12),
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Barre d'accent gauche quand l'histoire a été commencée */}
      {story.user_progress > 0 && (
        <View
          style={[styles.accentBar, { backgroundColor: colors.primary }]}
        />
      )}

      <View style={styles.storyHeader}>
        <View style={styles.storyTitleContainer}>
          <ThemedText style={styles.storyTitle} numberOfLines={2}>
            {story.title}
          </ThemedText>
          {story.title_arabic && (
            <Text
              style={[styles.storyTitleArabic, { color: colors.textSecondary }]}
            >
              {story.title_arabic}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={onToggleFavorite}
          style={styles.favoriteButton}
        >
          <Ionicons
            name={story.is_favorited ? "heart" : "heart-outline"}
            size={22}
            color={story.is_favorited ? "#FF6B6B" : colors.textSecondary}
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
              name={(CATEGORY_ICONS[story.category] ?? "book-outline") as any}
              size={12}
              color="white"
            />
            <Text style={styles.categoryBadgeText}>
              {CATEGORY_LABELS[story.category] ?? story.category}
            </Text>
          </View>

          <View
            style={[
              styles.difficultyBadge,
              { backgroundColor: DIFFICULTY_COLORS[story.difficulty] },
            ]}
          >
            <Text style={styles.difficultyBadgeText}>
              {DIFFICULTY_LABELS[story.difficulty]}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons
              name="time-outline"
              size={15}
              color={colors.textSecondary}
            />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {story.reading_time} min
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Ionicons
              name="eye-outline"
              size={15}
              color={colors.textSecondary}
            />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {story.view_count}
            </Text>
          </View>

          {story.rating > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="star" size={15} color="#FFD700" />
              <Text
                style={[styles.metaText, { color: colors.textSecondary }]}
              >
                {story.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {story.user_progress > 0 && (
        <View style={styles.progressContainer}>
          <View
            style={[styles.progressBar, { backgroundColor: colors.border }]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${story.user_progress}%`,
                },
              ]}
            />
          </View>
          <Text
            style={[styles.progressText, { color: colors.textSecondary }]}
          >
            {Math.round(story.user_progress)}% lu
          </Text>
        </View>
      )}

      {story.is_premium && (
        <View style={[styles.premiumBadge, { backgroundColor: "#FFD700" }]}>
          <Ionicons name="star" size={11} color="#000" />
          <Text style={styles.premiumText}>Premium</Text>
        </View>
      )}

      {story.historical_location && (
        <View style={styles.locationContainer}>
          <Ionicons
            name="location-outline"
            size={13}
            color={colors.textSecondary}
          />
          <Text
            style={[styles.locationText, { color: colors.textSecondary }]}
          >
            {story.historical_location}
          </Text>
        </View>
      )}

      {isConnected && (
        <TouchableOpacity
          style={[
            styles.downloadButton,
            rawStory.isDownloaded && styles.downloadedButton,
          ]}
          onPress={(e) => {
            e.stopPropagation();
            handleDownloadPress();
          }}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name={
                  rawStory.isDownloaded ? "checkmark-circle" : "download-outline"
                }
                size={18}
                color="#fff"
              />
              <Text style={styles.downloadButtonText}>
                {rawStory.isDownloaded ? "Téléchargée" : "Télécharger"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  storyCard: {
    marginVertical: 6,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    position: "relative",
    overflow: "hidden",
  },
  storyCardWithAccent: {
    paddingLeft: 22,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
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
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  downloadedButton: {
    backgroundColor: "#2E7D32",
  },
  downloadButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
