import React, { useState, useEffect } from "react";
import {
  Pressable,
  Animated,
  StyleSheet,
  View,
  Alert,
  Vibration,
  Platform,
} from "react-native";
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

// Fonction helper pour générer l'ID de contenu (cohérente avec le contexte)
const generateContentId = (
  favorite: Omit<Favorite, "id" | "dateAdded">
): string => {
  switch (favorite.type) {
    case "quran_verse":
      const quranFav = favorite as any;
      return `quran_${quranFav.chapterNumber}_${quranFav.verseNumber}`;
    case "hadith":
      const hadithFav = favorite as any;
      return `hadith_${hadithFav.bookSlug}_${hadithFav.hadithNumber}`;
    case "dhikr":
      const dhikrFav = favorite as any;
      return `dhikr_${dhikrFav.category}_${dhikrFav.arabicText
        .slice(0, 20)
        .replace(/\s/g, "")}`;
    case "asmaul_husna":
      const asmaFav = favorite as any;
      return `asmaul_husna_${asmaFav.number}`;
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

  const [isCurrentlyFavorite, setIsCurrentlyFavorite] = useState(false);
  const [scaleAnimation] = useState(new Animated.Value(1));
  const [pulseAnimation] = useState(new Animated.Value(1));
  const [isProcessing, setIsProcessing] = useState(false);

  // Mettre à jour l'état local quand les favoris changent
  useEffect(() => {
    const currentlyIsFavorite = isFavorite(favoriteData);
    setIsCurrentlyFavorite(currentlyIsFavorite);
  }, [favoriteData, isFavorite]);

  const handleToggleFavorite = async () => {
    if (isProcessing) return; // Éviter les clics multiples rapides

    try {
      setIsProcessing(true);

      // Animation de press
      if (showAnimation) {
        Animated.sequence([
          Animated.timing(scaleAnimation, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnimation, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();

        // Haptic feedback
        if (Platform.OS === "ios") {
          Vibration.vibrate(10);
        }
      }

      if (isCurrentlyFavorite) {
        // Retirer des favoris (toujours autorisé)
        // Générer l'ID du contenu pour pouvoir le supprimer
        const contentId = generateContentId(favoriteData);
        const success = await removeFavorite(contentId);
        if (success) {
          setIsCurrentlyFavorite(false);
          onToggle?.(false);

          // Animation de suppression
          if (showAnimation) {
            Animated.timing(pulseAnimation, {
              toValue: 0.8,
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
        }
      } else {
        // Vérifier si l'utilisateur peut ajouter ce type de favori
        const { canAdd, reason } = canAddFavorite(favoriteData.type);

        if (!canAdd) {
          // Afficher le message de limitation avec proposition d'upgrade
          Alert.alert(
            "🔒 " + (t("favorites.limit_reached") || "Limite atteinte"),
            reason || "Limite de favoris atteinte",
            [
              {
                text: t("cancel") || "Annuler",
                style: "cancel",
              },
              {
                text: user.isPremium
                  ? t("ok") || "OK"
                  : "✨ " + (t("upgrade_premium") || "Passer au Premium"),
                style: "default",
                onPress: () => {
                  if (!user.isPremium) {
                    // TODO: Ouvrir l'écran premium ou la modal d'upgrade
                    // console.log("🚀 Rediriger vers l'écran premium");
                  }
                },
              },
            ]
          );
          return;
        }

        // Ajouter aux favoris
        const success = await addFavorite(favoriteData);
        if (success) {
          setIsCurrentlyFavorite(true);
          onToggle?.(true);

          // Enregistrer dans les statistiques (si premium)
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
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: scaleAnimation }, { scale: pulseAnimation }],
          },
        ]}
      >
        <MCIcon
          testID="heart-icon"
          name={isCurrentlyFavorite ? "heart" : "heart-outline"}
          size={size}
          color={isCurrentlyFavorite ? iconColorActive : iconColor}
        />

        {/* Indicateur Premium pour les utilisateurs gratuits */}
        {!user.isPremium && !isCurrentlyFavorite && (
          <View style={styles.premiumBadge}>
            <MCIcon
              name="crown"
              size={size * 0.4}
              color="#FFD700"
            />
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
