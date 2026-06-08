import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  Alert,
  Vibration,
  Platform,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useFavorites, Favorite } from "../contexts/FavoritesContext";
import { usePremium } from "../contexts/PremiumContext";
import { useTranslation } from "react-i18next";
import { useUpdateUserStats } from "../hooks/useUpdateUserStats";

interface FavoriteButtonProps {
  favoriteData: Omit<Favorite, "id" | "dateAdded">;
  size?: number;
  iconColor?: string;
  iconColorActive?: string;
  style?: any;
  showAnimation?: boolean;
  onToggle?: (isFavorite: boolean) => void;
}

const generateContentId = (
  favorite: Omit<Favorite, "id" | "dateAdded">
): string => {
  switch (favorite.type) {
    case "quran_verse": {
      const quranFav = favorite as any;
      return `quran_${quranFav.chapterNumber}_${quranFav.verseNumber}`;
    }
    case "hadith": {
      const hadithFav = favorite as any;
      return `hadith_${hadithFav.bookSlug}_${hadithFav.hadithNumber}`;
    }
    case "dhikr": {
      const dhikrFav = favorite as any;
      return `dhikr_${dhikrFav.category}_${dhikrFav.arabicText
        .slice(0, 20)
        .replace(/\s/g, "")}`;
    }
    case "asmaul_husna": {
      const asmaFav = favorite as any;
      return `asmaul_husna_${asmaFav.number}`;
    }
    default:
      return `unknown_${Date.now()}`;
  }
};

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  favoriteData,
  size = 24,
  iconColor = "#666",
  iconColorActive = "#FFD700",
  style,
  showAnimation = true,
  onToggle,
}) => {
  const { addFavorite, removeFavorite, isFavorite, canAddFavorite } =
    useFavorites();
  const { user } = usePremium();
  const { t } = useTranslation();
  const { recordFavoriteAdded } = useUpdateUserStats();

  const isCurrentlyFavorite = useMemo(
    () => isFavorite(favoriteData),
    [favoriteData, isFavorite]
  );

  const scaleAnimation = useSharedValue(1);
  const pulseAnimation = useSharedValue(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scaleAnimation.value * pulseAnimation.value },
    ],
  }));

  const playPressAnimation = () => {
    scaleAnimation.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
  };

  const playPulseAnimation = (peak: number) => {
    pulseAnimation.value = withSequence(
      withTiming(peak, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );
  };

  const handleToggleFavorite = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      if (showAnimation) {
        playPressAnimation();
        if (Platform.OS === "ios") {
          Vibration.vibrate(10);
        }
      }

      if (isCurrentlyFavorite) {
        const contentId = generateContentId(favoriteData);
        const success = await removeFavorite(contentId);
        if (success) {
          onToggle?.(false);
          if (showAnimation) {
            pulseAnimation.value = withSequence(
              withTiming(0.8, { duration: 200 }),
              withTiming(1, { duration: 200 })
            );
          }
        }
      } else {
        const { canAdd, reason } = canAddFavorite(favoriteData.type);

        if (!canAdd) {
          Alert.alert(
            "🔒 " + (t("favorites.limit_reached") || "Limite atteinte"),
            reason || "Limite de favoris atteinte",
            [
              { text: t("cancel") || "Annuler", style: "cancel" },
              {
                text: user.isPremium
                  ? t("ok") || "OK"
                  : "✨ " + (t("upgrade_premium") || "Passer au Premium"),
                style: "default",
              },
            ]
          );
          return;
        }

        const success = await addFavorite(favoriteData);
        if (success) {
          onToggle?.(true);

          if (user.isPremium) {
            try {
              const title =
                (favoriteData as any).title ||
                (favoriteData as any).arabicText ||
                "Favori";
              await recordFavoriteAdded(favoriteData.type, title);
            } catch (error) {
              console.log("Erreur enregistrement stats favori:", error);
            }
          }

          if (showAnimation) {
            playPulseAnimation(1.3);
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors du toggle favori:", error);
      Alert.alert(
        t("error") || "Erreur",
        t("favorite_error") || "Erreur lors de la gestion des favoris"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Pressable
      testID="favorite-button"
      accessibilityLabel={
        isCurrentlyFavorite ? "Retirer des favoris" : "Ajouter aux favoris"
      }
      accessibilityRole="button"
      style={[styles.container, style]}
      onPress={handleToggleFavorite}
      disabled={isProcessing}
    >
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        <MCIcon
          testID="heart-icon"
          name={isCurrentlyFavorite ? "heart" : "heart-outline"}
          size={size}
          color={isCurrentlyFavorite ? iconColorActive : iconColor}
        />

        {!user.isPremium && !isCurrentlyFavorite && (
          <View style={styles.premiumBadge}>
            <MCIcon name="crown" size={size * 0.4} color="#FFD700" />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 4,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  premiumBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFD700",
  },
});

export default FavoriteButton;
