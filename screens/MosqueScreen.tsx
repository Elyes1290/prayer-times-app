import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import ThemedImageBackground from "../components/ThemedImageBackground";
import {
  useThemeColors,
  useOverlayTextColor,
  useOverlayIconColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";
import { SettingsContext } from "../contexts/SettingsContext";
import { useLocation } from "../hooks/useLocation";
import { debugLog, errorLog } from "../utils/logger";

const { width: screenWidth } = Dimensions.get("window");

interface Mosque {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance?: number;
  phone?: string;
  website?: string;
}

export default function MosqueScreen() {
  const { t } = useTranslation();
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Contextes et hooks
  const settings = useContext(SettingsContext);
  const { location } = useLocation();
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const overlayIconColor = useOverlayIconColor();
  const currentTheme = useCurrentTheme();

  // Calcul de distance simple et efficace
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371000; // Rayon de la Terre en mètres
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 🕌 RECHERCHE SIMPLE ET EFFICACE
  const searchMosques = useCallback(
    async (latitude: number, longitude: number) => {
      debugLog("🕌 Début recherche mosquées - Approche simple");
      setLoading(true);
      setError(null);

      try {
        // 📍 ÉTAPE 1: Tentative Overpass API (timeout généreux)
        const radius = 15000; // 15km - raisonnable
        const query = `
        [out:json][timeout:25];
        (
          node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${latitude},${longitude});
          way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${latitude},${longitude});
          node["building"="mosque"](around:${radius},${latitude},${longitude});
          way["building"="mosque"](around:${radius},${latitude},${longitude});
        );
        out center;
      `;

        debugLog("🔍 Requête Overpass API...");

        // Timeout raisonnable : 20 secondes
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          debugLog("⏰ Timeout Overpass (20s) - passage au fallback");
        }, 20000);

        try {
          const response = await fetch(
            "https://overpass-api.de/api/interpreter",
            {
              method: "POST",
              body: query,
              headers: { "Content-Type": "text/plain" },
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            debugLog(
              `📊 Overpass: ${data.elements?.length || 0} éléments trouvés`
            );

            if (data.elements && data.elements.length > 0) {
              const foundMosques = data.elements
                .filter((element: any) => {
                  const lat = element.lat || element.center?.lat;
                  const lon = element.lon || element.center?.lon;
                  return lat && lon;
                })
                .map((element: any, index: number) => {
                  const lat = element.lat || element.center.lat;
                  const lon = element.lon || element.center.lon;

                  // Construction très intelligente de l'adresse avec multiples fallbacks
                  let address = t(
                    "mosque_screen.address_not_available",
                    "Adresse non disponible"
                  );
                  if (element.tags) {
                    const addressParts = [];

                    // ÉTAPE 1: Numéro + rue (priorité max)
                    if (
                      element.tags["addr:housenumber"] &&
                      element.tags["addr:street"]
                    ) {
                      addressParts.push(
                        `${element.tags["addr:housenumber"]} ${element.tags["addr:street"]}`
                      );
                    } else if (element.tags["addr:street"]) {
                      addressParts.push(element.tags["addr:street"]);
                    }

                    // ÉTAPE 2: Localité (ordre de préférence intelligent)
                    const locality =
                      element.tags["addr:city"] ||
                      element.tags["addr:town"] ||
                      element.tags["addr:village"] ||
                      element.tags["addr:suburb"] ||
                      element.tags["addr:district"] ||
                      element.tags["addr:quarter"];

                    if (locality) {
                      addressParts.push(locality);
                    }

                    // ÉTAPE 3: Code postal
                    if (element.tags["addr:postcode"]) {
                      addressParts.push(element.tags["addr:postcode"]);
                    }

                    // ÉTAPE 4: Canton/État
                    if (element.tags["addr:state"]) {
                      addressParts.push(element.tags["addr:state"]);
                    }

                    // ÉTAPE 5: Pays (sauf Suisse)
                    if (
                      element.tags["addr:country"] &&
                      element.tags["addr:country"] !== "CH"
                    ) {
                      addressParts.push(element.tags["addr:country"]);
                    }

                    // ASSEMBLAGE: Si on a des parties d'adresse
                    if (addressParts.length > 0) {
                      address = addressParts.join(", ");
                    } else {
                      // FALLBACKS INTELLIGENTS (avant les coordonnées)
                      const fallbackOptions = [];

                      // Fallback 1: Nom de la mosquée + localité approximative
                      if (element.tags.name) {
                        // Essayer d'extraire une localité des coordonnées (très basique)
                        if (
                          lat >= 46.0 &&
                          lat <= 47.5 &&
                          lon >= 6.0 &&
                          lon <= 8.5
                        ) {
                          fallbackOptions.push(
                            `${element.tags.name}, Région Genève-Lausanne`
                          );
                        } else if (
                          lat >= 47.0 &&
                          lat <= 48.0 &&
                          lon >= 7.5 &&
                          lon <= 9.0
                        ) {
                          fallbackOptions.push(
                            `${element.tags.name}, Région Zurich-Bâle`
                          );
                        } else {
                          fallbackOptions.push(`${element.tags.name}, Suisse`);
                        }
                      }

                      // Fallback 2: Quartier ou district seuls
                      const nearbyArea =
                        element.tags["addr:quarter"] ||
                        element.tags["addr:district"] ||
                        element.tags["addr:suburb"];
                      if (nearbyArea) {
                        fallbackOptions.push(nearbyArea);
                      }

                      // Fallback 3: Type d'établissement + zone approximative
                      if (
                        element.tags.amenity === "place_of_worship" &&
                        element.tags.religion === "muslim"
                      ) {
                        if (
                          lat >= 46.1 &&
                          lat <= 46.3 &&
                          lon >= 6.0 &&
                          lon <= 6.3
                        ) {
                          fallbackOptions.push("Mosquée, Genève");
                        } else if (
                          lat >= 47.3 &&
                          lat <= 47.4 &&
                          lon >= 8.4 &&
                          lon <= 8.6
                        ) {
                          fallbackOptions.push("Mosquée, Zurich");
                        } else {
                          fallbackOptions.push("Mosquée, Suisse");
                        }
                      }

                      // Choisir le meilleur fallback ou coordonnées en dernier recours
                      address =
                        fallbackOptions[0] ||
                        `Coordonnées: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                    }
                  }

                  return {
                    id: `osm_${element.id || index}`,
                    name: element.tags?.name || `Mosquée ${index + 1}`,
                    address,
                    latitude: lat,
                    longitude: lon,
                    distance: calculateDistance(latitude, longitude, lat, lon),
                    phone: element.tags?.phone,
                    website: element.tags?.website,
                  };
                })
                .sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0))
                .slice(0, 15);

              debugLog(
                `✅ Overpass réussi: ${foundMosques.length} mosquées trouvées`
              );
              setMosques(foundMosques);
              setLoading(false);
              return;
            }
          }
        } catch (fetchError) {
          debugLog("⚠️ Overpass échoué, passage au fallback local");
        }

        // 📍 ÉTAPE 2: Base de données locale (TOUJOURS disponible)
        debugLog("🗂️ Utilisation base de données locale...");

        const localMosques = [
          // Suisse
          {
            name: "Centre Islamique de Genève",
            lat: 46.2044,
            lng: 6.1432,
            city: "Genève",
            phone: "+41 22 734 10 47",
          },
          {
            name: "Mosquée de Zurich",
            lat: 47.3769,
            lng: 8.5417,
            city: "Zurich",
          },
          {
            name: "Centre Islamique de Lausanne",
            lat: 46.5197,
            lng: 6.6323,
            city: "Lausanne",
          },
          {
            name: "Mosquée Al-Farouk Bâle",
            lat: 47.5596,
            lng: 7.5886,
            city: "Bâle",
          },

          // France
          {
            name: "Grande Mosquée de Paris",
            lat: 48.8421,
            lng: 2.3554,
            city: "Paris",
            phone: "+33 1 45 35 97 33",
          },
          { name: "Mosquée de Lyon", lat: 45.764, lng: 4.8357, city: "Lyon" },
          {
            name: "Mosquée de Marseille",
            lat: 43.2965,
            lng: 5.3698,
            city: "Marseille",
          },
          {
            name: "Mosquée de Strasbourg",
            lat: 48.5734,
            lng: 7.7521,
            city: "Strasbourg",
          },

          // Allemagne
          {
            name: "Mosquée de Berlin",
            lat: 52.52,
            lng: 13.405,
            city: "Berlin",
          },
          {
            name: "Mosquée de Munich",
            lat: 48.1351,
            lng: 11.582,
            city: "Munich",
          },
          {
            name: "Mosquée de Francfort",
            lat: 50.1109,
            lng: 8.6821,
            city: "Francfort",
          },

          // Autres pays
          {
            name: "Grande Mosquée de Bruxelles",
            lat: 50.8503,
            lng: 4.3517,
            city: "Bruxelles",
          },
          { name: "Mosquée de Rome", lat: 41.9028, lng: 12.4964, city: "Rome" },
          {
            name: "Mosquée Hassan II",
            lat: 33.6084,
            lng: -7.6322,
            city: "Casablanca",
          },
          {
            name: "Mosquée Bleue",
            lat: 41.0054,
            lng: 28.9768,
            city: "Istanbul",
          },
          {
            name: "Grande Mosquée de Londres",
            lat: 51.5074,
            lng: -0.1278,
            city: "Londres",
          },
        ];

        const nearbyMosques = localMosques
          .map((mosque) => ({
            id: `local_${mosque.name.replace(/\s+/g, "_")}`,
            name: mosque.name,
            address: `${mosque.city}`,
            latitude: mosque.lat,
            longitude: mosque.lng,
            distance: calculateDistance(
              latitude,
              longitude,
              mosque.lat,
              mosque.lng
            ),
            phone: (mosque as any).phone,
          }))
          .filter((mosque) => mosque.distance <= 100000) // 100km max
          .sort((a: any, b: any) => a.distance - b.distance)
          .slice(0, 12);

        debugLog(`📍 Base locale: ${nearbyMosques.length} mosquées trouvées`);
        setMosques(nearbyMosques);

        if (nearbyMosques.length === 0) {
          setError(
            t(
              "mosque_screen.no_mosques_in_region",
              "Aucune mosquée trouvée dans cette région"
            )
          );
        }
      } catch (error) {
        errorLog("❌ Erreur générale recherche mosquées:", error);
        setError(
          t(
            "mosque_screen.mosque_search_error",
            "Erreur lors de la recherche de mosquées"
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [] // ✅ Pas de dépendances pour stabilité maximale
  );

  // Obtenir la position actuelle
  const getCurrentLocation = () => {
    if (settings.locationMode === "manual" && settings.manualLocation) {
      return {
        latitude: settings.manualLocation.lat,
        longitude: settings.manualLocation.lon,
      };
    }

    if (settings.locationMode === "auto" && location?.coords) {
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    }

    return null;
  };

  // Lancer la recherche (une seule fois)
  useEffect(() => {
    const currentLocation = getCurrentLocation();
    if (currentLocation) {
      debugLog(
        `🎯 Position détectée: ${currentLocation.latitude}, ${currentLocation.longitude}`
      );
      // ✅ Appel direct pour éviter la boucle infinie
      searchMosques(currentLocation.latitude, currentLocation.longitude);
    } else {
      debugLog("❌ Aucune position disponible");
      setError(
        t("mosque_screen.location_not_available", "Position non disponible")
      );
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings?.locationMode,
    settings?.manualLocation?.lat,
    settings?.manualLocation?.lon,
    location?.coords?.latitude,
    location?.coords?.longitude,
    // Ne PAS inclure searchMosques pour éviter la boucle infinie
  ]);

  // Actions
  const openDirections = (mosque: Mosque) => {
    const scheme = Platform.select({ ios: "maps:", android: "geo:" });
    const url = Platform.select({
      ios: `${scheme}?q=${mosque.name}&ll=${mosque.latitude},${mosque.longitude}`,
      android: `${scheme}${mosque.latitude},${mosque.longitude}?q=${mosque.name}`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const callMosque = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert(
        "Info",
        t("mosque_screen.no_phone_available", "Numéro non disponible")
      );
    }
  };

  // Définir styles AVANT renderMosqueItem pour éviter les problèmes
  const styles = getStyles(
    colors,
    overlayTextColor,
    overlayIconColor,
    currentTheme
  );

  // Rendu d'une mosquée
  const renderMosqueItem = ({ item }: { item: Mosque }) => (
    <View style={styles.mosqueCard}>
      <View style={styles.mosqueHeader}>
        <MaterialCommunityIcons
          name="mosque"
          size={24}
          color={colors.primary} // 🌅 Utilise la couleur du thème actif
          style={styles.mosqueIcon}
        />
        <View style={styles.mosqueInfo}>
          <Text style={styles.mosqueName}>{item.name}</Text>
          <Text style={styles.mosqueAddress}>{item.address}</Text>
          <Text style={styles.mosqueDistance}>
            📍{" "}
            {item.distance
              ? `${(item.distance / 1000).toFixed(1)} km`
              : t("mosque_screen.distance_unknown", "Distance inconnue")}
          </Text>
        </View>
      </View>

      <View style={styles.mosqueActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openDirections(item)}
        >
          <MaterialCommunityIcons name="directions" size={20} color={colors.primary} /> {/* 🌅 Utilise la couleur du thème actif */}
          <Text style={styles.actionText}>
            {t("mosque_screen.directions", "Itinéraire")}
          </Text>
        </TouchableOpacity>

        {item.phone && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => callMosque(item.phone)}
          >
            <MaterialCommunityIcons name="phone" size={20} color={colors.primary} /> {/* 🌅 Utilise la couleur du thème actif */}
            <Text style={styles.actionText}>
              {t("mosque_screen.call", "Appeler")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // États de chargement et d'erreur
  if (loading) {
    return (
      <ThemedImageBackground style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} /> {/* 🌅 Utilise la couleur du thème actif */}
          <Text style={styles.loadingText}>
            {t("mosque_screen.searching_mosques", "Recherche de mosquées...")}
          </Text>
        </View>
      </ThemedImageBackground>
    );
  }

  if (error) {
    return (
      <ThemedImageBackground style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={48}
            color="#FF6B6B"
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              const currentLocation = getCurrentLocation();
              if (currentLocation) {
                searchMosques(
                  currentLocation.latitude,
                  currentLocation.longitude
                );
              }
            }}
          >
            <Text style={styles.retryButtonText}>
              {t("mosque_screen.retry", "Réessayer")}
            </Text>
          </TouchableOpacity>
        </View>
      </ThemedImageBackground>
    );
  }

  // Interface principale
  return (
    <ThemedImageBackground style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="mosque"
          size={32}
          color={overlayTextColor}
        />
        <Text style={styles.title}>
          {t("mosque_screen.mosques_nearby", "Mosquées à proximité")}
        </Text>
        <Text style={styles.subtitle}>
          {mosques.length}{" "}
          {t("mosque_screen.mosque_found", "mosquée(s) trouvée(s)")}
        </Text>
      </View>

      <FlatList
        data={mosques}
        renderItem={renderMosqueItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="mosque" size={64} color="#94A3B8" />
            <Text style={styles.emptyText}>
              {t(
                "mosque_screen.no_mosques_found",
                "Aucune mosquée trouvée à proximité"
              )}
            </Text>
          </View>
        }
      />
    </ThemedImageBackground>
  );
}

// Styles dynamiques simples et clairs
const getStyles = (
  colors: any,
  overlayTextColor: string,
  overlayIconColor: string,
  currentTheme: "light" | "dark" | "morning" | "sunset"
) => {
  // 🆕 Les couleurs sont maintenant gérées directement via colors du thème actif
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: overlayTextColor,
      textAlign: "center",
      fontWeight: "500",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    errorText: {
      fontSize: 16,
      color: overlayTextColor,
      textAlign: "center",
      marginVertical: 16,
      lineHeight: 24,
    },
    retryButton: {
      backgroundColor: colors.primary, // 🌅 Utilise la couleur du thème actif
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    retryButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    header: {
      alignItems: "center",
      padding: 20,
      paddingTop: 60,
      backgroundColor: colors.surface, // 🌅 Utilise la couleur du thème actif
      borderRadius: 16,
      marginHorizontal: 16,
      marginBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: overlayTextColor,
      marginTop: 8,
      textAlign: "center",
      textShadowColor: colors.shadow, // 🌅 Utilise la couleur du thème actif
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    subtitle: {
      fontSize: 14,
      color: overlayTextColor,
      opacity: 0.9,
      marginTop: 4,
      textShadowColor: colors.shadow, // 🌅 Utilise la couleur du thème actif
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 1,
    },
    listContent: {
      padding: 16,
      paddingBottom: 120, // ✅ Plus d'espace pour éviter le menu de navigation
    },
    mosqueCard: {
      backgroundColor: colors.cardBG, // 🌅 Utilise la couleur du thème actif
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: colors.shadow, // 🌅 Utilise la couleur du thème actif
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
      borderWidth: 1,
      borderColor: colors.border, // 🌅 Utilise la couleur du thème actif
    },
    mosqueHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 16,
    },
    mosqueIcon: {
      marginRight: 12,
      marginTop: 2,
    },
    mosqueInfo: {
      flex: 1,
    },
    mosqueName: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text, // 🌅 Utilise la couleur du thème actif
      marginBottom: 6,
      lineHeight: 24,
    },
    mosqueAddress: {
      fontSize: 14,
      color: colors.textSecondary, // 🌅 Utilise la couleur du thème actif
      marginBottom: 6,
      lineHeight: 20,
    },
    mosqueDistance: {
      fontSize: 13,
      color: colors.primary, // 🌅 Utilise la couleur du thème actif
      fontWeight: "600",
    },
    mosqueActions: {
      flexDirection: "row",
      gap: 12,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceVariant, // 🌅 Utilise la couleur du thème actif
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border, // 🌅 Utilise la couleur du thème actif
      shadowColor: colors.shadow, // 🌅 Utilise la couleur du thème actif
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    actionText: {
      color: colors.primary, // 🌅 Utilise la couleur du thème actif
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
    },
    emptyContainer: {
      alignItems: "center",
      padding: 40,
      marginTop: 60,
      backgroundColor: colors.surface, // 🌅 Utilise la couleur du thème actif
      borderRadius: 16,
      marginHorizontal: 16,
    },
    emptyText: {
      fontSize: 16,
      color: overlayTextColor,
      textAlign: "center",
      marginTop: 16,
      opacity: 0.8,
      lineHeight: 24,
      textShadowColor: colors.shadow, // 🌅 Utilise la couleur du thème actif
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 1,
    },
  });
};
