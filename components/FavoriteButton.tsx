import React, { useState, useEffect } from "react";
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  View,
  Alert,
  Vibration,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFavorites, Favorite } from "../contexts/FavoritesContext";
import { usePremium } from "../contexts/PremiumContext";
import { FREE_LIMITS, getFavoritesLimitMessage } from "../utils/monetization";
import { useTranslation } from "react-i18next";

interface FavoriteButtonProps {
  favoriteData: Omit<Favorite, "id" | "dateAdded">;
  size?: number;
  iconColor?: string;
  iconColorActive?: string;
  style?: any;
  showAnimation?: boolean;
  onToggle?: (isFavorite: boolean) => void;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  favoriteData,
  size = 24,
  iconColor = "#666",
  iconColorActive = "#FFD700",
  style,
  showAnimation = true,
  onToggle,
}) => {
  const { addFavorite, removeFavorite, isFavorite, getFavoritesCountByType } =
    useFavorites();
  const { user } = usePremium();
  const { t } = useTranslation();

  const [isCurrentlyFavorite, setIsCurrentlyFavorite] = useState(false);
  const [scaleAnimation] = useState(new Animated.Value(1));
  const [pulseAnimation] = useState(new Animated.Value(1));

  // Mettre à jour l'état local quand les favoris changent
  useEffect(() => {
    const currentlyIsFavorite = isFavorite(favoriteData);
    setIsCurrentlyFavorite(currentlyIsFavorite);
  }, [favoriteData, isFavorite]);

  const handleToggleFavorite = async () => {
    try {
      // Animation au clic
      if (showAnimation) {
        Animated.sequence([
          Animated.timing(scaleAnimation, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnimation, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }

      // Vibration tactile (iOS uniquement pour ce type)
      if (Platform.OS === "ios") {
        Vibration.vibrate(10);
      }

      if (isCurrentlyFavorite) {
        // Retirer des favoris
        const contentId = generateContentId(favoriteData);
        await removeFavorite(contentId);
        setIsCurrentlyFavorite(false);
        onToggle?.(false);

        // Animation de suppression
        if (showAnimation) {
          Animated.timing(pulseAnimation, {
            toValue: 0.7,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            Animated.timing(pulseAnimation, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          });
        }
      } else {
        // Vérifier les limites pour les utilisateurs gratuits
        if (!user.isPremium) {
          const currentCount = getFavoritesCountByType(favoriteData.type);
          const limit = FREE_LIMITS.favorites[favoriteData.type];

          if (currentCount >= limit) {
            // Limite atteinte, afficher message d'upselling
            const upsellData = getFavoritesLimitMessage(favoriteData.type);
            Alert.alert(upsellData.title, upsellData.message, [
              {
                text: t("cancel") || "Annuler",
                style: "cancel",
              },
              {
                text: upsellData.cta,
                style: "default",
                onPress: () => {
                  // TODO: Ouvrir l'écran premium
                  console.log("🚀 Rediriger vers l'écran premium");
                },
              },
            ]);
            return; // Ne pas ajouter le favori
          }
        }

        // Ajouter aux favoris
        await addFavorite(favoriteData);
        setIsCurrentlyFavorite(true);
        onToggle?.(true);

        // Animation d'ajout (étoile qui brille)
        if (showAnimation) {
          Animated.sequence([
            Animated.timing(pulseAnimation, {
              toValue: 1.3,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnimation, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }
    } catch (error) {
      console.error("Erreur lors du toggle favori:", error);
      Alert.alert(
        t("error") || "Erreur",
        t("favorite_error") || "Erreur lors de la gestion des favoris"
      );
    }
  };

  const handleLongPress = () => {
    if (isCurrentlyFavorite) {
      Alert.alert(
        t("remove_favorite") || "Retirer des favoris",
        t("remove_favorite_confirm") ||
          "Êtes-vous sûr de vouloir retirer cet élément de vos favoris ?",
        [
          {
            text: t("cancel") || "Annuler",
            style: "cancel",
          },
          {
            text: t("remove") || "Retirer",
            style: "destructive",
            onPress: handleToggleFavorite,
          },
        ]
      );
    } else {
      handleToggleFavorite();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handleToggleFavorite}
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: scaleAnimation }, { scale: pulseAnimation }],
          },
        ]}
      >
        <View
          style={[
            styles.iconBackground,
            isCurrentlyFavorite && styles.iconBackgroundActive,
          ]}
        >
          <MaterialCommunityIcons
            name={isCurrentlyFavorite ? "heart" : "heart-outline"}
            size={size}
            color={isCurrentlyFavorite ? iconColorActive : iconColor}
            style={[styles.icon, isCurrentlyFavorite && styles.iconActive]}
          />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Fonction helper pour générer l'ID de contenu (cohérente avec le contexte)
const generateContentId = (favorite: any): string => {
  switch (favorite.type) {
    case "quran_verse":
      return `quran_${favorite.chapterNumber}_${favorite.verseNumber}`;
    case "hadith":
      return `hadith_${favorite.bookSlug}_${favorite.hadithNumber}`;
    case "dhikr":
      return `dhikr_${favorite.category}_${favorite.arabicText
        .slice(0, 20)
        .replace(/\s/g, "")}`;
    case "asmaul_husna":
      return `asmaul_husna_${favorite.number}`;
    default:
      return `unknown_${Date.now()}`;
  }
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconBackground: {
    borderRadius: 20,
    padding: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  iconBackgroundActive: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderColor: "rgba(255, 215, 0, 0.4)",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  iconActive: {
    textShadowColor: "rgba(255, 215, 0, 0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});

export default FavoriteButton;
