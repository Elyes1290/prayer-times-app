import React, { useState, useEffect, useCallback, useMemo } from "react";
import { use } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Pressable,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { LinearGradient } from "@/components/ui/LinearGradientView";
import { useTranslation } from "react-i18next";
import ThemedImageBackground from "../components/ThemedImageBackground";
import {
  useThemeColors,
  useOverlayTextColor,
} from "../hooks/useThemeColor";
import { makeBoxShadow } from "../utils/shadowUtils";
import { SettingsContext } from "../contexts/SettingsContext";
import { useLocation } from "../hooks/useLocation";
import { debugLog, errorLog } from "../utils/logger";


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

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
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
}

function openDirections(mosque: Mosque) {
  const scheme = Platform.select({ ios: "maps:", android: "geo:" });
  const url = Platform.select({
    ios: `${scheme}?q=${mosque.name}&ll=${mosque.latitude},${mosque.longitude}`,
    android: `${scheme}${mosque.latitude},${mosque.longitude}?q=${mosque.name}`,
  });

  if (url) {
    Linking.openURL(url);
  }
}

function formatDistance(
  distanceMeters: number | undefined,
  unknownLabel: string,
): string {
  if (distanceMeters == null) {
    return unknownLabel;
  }
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

type MosqueListItemProps = {
  item: Mosque;
  primaryColor: string;
  onDirections: (mosque: Mosque) => void;
  onCall: (phone?: string) => void;
  directionsLabel: string;
  callLabel: string;
  distanceUnknownLabel: string;
};

const MosqueListItem = React.memo(function MosqueListItem({
  item,
  primaryColor,
  onDirections,
  onCall,
  directionsLabel,
  callLabel,
  distanceUnknownLabel,
}: MosqueListItemProps) {
  const hasPhone = !!item.phone;

  return (
    <View style={mosqueStyles.card}>
      <LinearGradient
        colors={["rgba(21, 34, 56, 0.96)", "rgba(11, 21, 32, 0.94)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={mosqueStyles.cardGradient}
      >
        <View style={mosqueStyles.cardTopRow}>
          <View style={mosqueStyles.iconBadge}>
            <MCIcon name="mosque" size={22} color={primaryColor} />
          </View>
          <View style={mosqueStyles.cardTitleBlock}>
            <Text style={mosqueStyles.mosqueName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={mosqueStyles.mosqueAddress} numberOfLines={2}>
              {item.address}
            </Text>
          </View>
          <View style={mosqueStyles.distanceBadge}>
            <MCIcon name="map-marker" size={14} color="#E8C872" />
            <Text style={mosqueStyles.distanceText}>
              {formatDistance(item.distance, distanceUnknownLabel)}
            </Text>
          </View>
        </View>

        <View style={mosqueStyles.actionsRow}>
          <Pressable
            style={[mosqueStyles.actionButton, mosqueStyles.actionPrimary]}
            onPress={() => onDirections(item)}
          >
            <MCIcon name="directions" size={18} color="#FFFFFF" />
            <Text style={mosqueStyles.actionPrimaryText}>{directionsLabel}</Text>
          </Pressable>
          <Pressable
            style={[
              mosqueStyles.actionButton,
              mosqueStyles.actionSecondary,
              !hasPhone && mosqueStyles.actionDisabled,
            ]}
            onPress={() => onCall(item.phone)}
            disabled={!hasPhone}
          >
            <MCIcon
              name="phone"
              size={18}
              color={hasPhone ? primaryColor : "rgba(255,255,255,0.35)"}
            />
            <Text
              style={[
                mosqueStyles.actionSecondaryText,
                !hasPhone && mosqueStyles.actionDisabledText,
              ]}
            >
              {callLabel}
            </Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
});

export default function MosqueScreen() {
  const { t } = useTranslation();
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Contextes et hooks
  const settings = use(SettingsContext);
  const { location } = useLocation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();

  const directionsLabel = t("mosque_screen.directions", "Itinéraire");
  const callLabel = t("mosque_screen.call", "Appeler");
  const distanceUnknownLabel = t(
    "mosque_screen.distance_unknown",
    "Distance inconnue",
  );

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
              const foundMosques: any[] = [];
              let idx = 0;
              for (const element of data.elements as any[]) {
                const lat = element.lat || element.center?.lat;
                const lon = element.lon || element.center?.lon;
                if (!lat || !lon) continue;

                // Construction très intelligente de l'adresse avec multiples fallbacks
                  let address = t(
                    "mosque_screen.address_not_available",
                    "Adresse non disponible"
                  );
                  if (element.tags) {
                    const tags = element.tags;
                    const mosqueName = tags.name;
                    const addressParts = [];

                    // ÉTAPE 1: Numéro + rue (priorité max)
                    if (tags["addr:housenumber"] && tags["addr:street"]) {
                      addressParts.push(
                        `${tags["addr:housenumber"]} ${tags["addr:street"]}`
                      );
                    } else if (tags["addr:street"]) {
                      addressParts.push(tags["addr:street"]);
                    }

                    // ÉTAPE 2: Localité (ordre de préférence intelligent)
                    const locality =
                      tags["addr:city"] ||
                      tags["addr:town"] ||
                      tags["addr:village"] ||
                      tags["addr:suburb"] ||
                      tags["addr:district"] ||
                      tags["addr:quarter"];

                    if (locality) {
                      addressParts.push(locality);
                    }

                    // ÉTAPE 3: Code postal
                    if (tags["addr:postcode"]) {
                      addressParts.push(tags["addr:postcode"]);
                    }

                    // ÉTAPE 4: Canton/État
                    if (tags["addr:state"]) {
                      addressParts.push(tags["addr:state"]);
                    }

                    // ÉTAPE 5: Pays (sauf Suisse)
                    if (tags["addr:country"] && tags["addr:country"] !== "CH") {
                      addressParts.push(tags["addr:country"]);
                    }

                    // ASSEMBLAGE: Si on a des parties d'adresse
                    if (addressParts.length > 0) {
                      address = addressParts.join(", ");
                    } else {
                      // FALLBACKS INTELLIGENTS (avant les coordonnées)
                      const fallbackOptions = [];

                      // Fallback 1: Nom de la mosquée + localité approximative
                      if (mosqueName) {
                        if (
                          lat >= 46.0 &&
                          lat <= 47.5 &&
                          lon >= 6.0 &&
                          lon <= 8.5
                        ) {
                          fallbackOptions.push(
                            `${mosqueName}, Région Genève-Lausanne`
                          );
                        } else if (
                          lat >= 47.0 &&
                          lat <= 48.0 &&
                          lon >= 7.5 &&
                          lon <= 9.0
                        ) {
                          fallbackOptions.push(
                            `${mosqueName}, Région Zurich-Bâle`
                          );
                        } else {
                          fallbackOptions.push(`${mosqueName}, Suisse`);
                        }
                      }

                      // Fallback 2: Quartier ou district seuls
                      const nearbyArea =
                        tags["addr:quarter"] ||
                        tags["addr:district"] ||
                        tags["addr:suburb"];
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

                foundMosques.push({
                  id: `osm_${element.id || idx}`,
                  name: element.tags?.name || `Mosquée ${idx + 1}`,
                  address,
                  latitude: lat,
                  longitude: lon,
                  distance: calculateDistance(latitude, longitude, lat, lon),
                  phone: element.tags?.phone,
                  website: element.tags?.website,
                });
                idx++;
              }

              const topMosques = foundMosques
                .sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0))
                .slice(0, 15);

              debugLog(
                `✅ Overpass réussi: ${topMosques.length} mosquées trouvées`
              );
              setMosques(topMosques);
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
          .reduce((acc: any[], mosque) => {
            const row = {
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
            };
            if (row.distance <= 100000) {
              acc.push(row);
            }
            return acc;
          }, [])
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

  const callMosque = useCallback(
    (phone?: string) => {
      if (phone) {
        Linking.openURL(`tel:${phone}`);
      } else {
        Alert.alert(
          "Info",
          t("mosque_screen.no_phone_available", "Numéro non disponible"),
        );
      }
    },
    [t],
  );

  const styles = getStyles(colors, overlayTextColor);

  const renderMosqueItem = useCallback(
    ({ item }: { item: Mosque }) => (
      <MosqueListItem
        item={item}
        primaryColor={colors.primary}
        onDirections={openDirections}
        onCall={callMosque}
        directionsLabel={directionsLabel}
        callLabel={callLabel}
        distanceUnknownLabel={distanceUnknownLabel}
      />
    ),
    [
      colors.primary,
      callMosque,
      directionsLabel,
      callLabel,
      distanceUnknownLabel,
    ],
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <MCIcon name="mosque" size={48} color="rgba(255,255,255,0.35)" />
        <Text style={styles.emptyText}>
          {t(
            "mosque_screen.no_mosques_found",
            "Aucune mosquée trouvée à proximité",
          )}
        </Text>
      </View>
    ),
    [styles.emptyContainer, styles.emptyText, t],
  );

  const handleRetry = useCallback(() => {
    const currentLocation = getCurrentLocation();
    if (currentLocation) {
      searchMosques(currentLocation.latitude, currentLocation.longitude);
    }
  }, [searchMosques]);

  const screenPadding = {
    paddingTop: insets.top + 8,
    paddingBottom: Math.max(insets.bottom, 16) + 120,
  };

  if (loading) {
    return (
      <ThemedImageBackground style={styles.container}>
        <View style={styles.overlay} pointerEvents="none" />
        <View style={[styles.centeredState, screenPadding]}>
          <ActivityIndicator size="large" color={colors.primary} />
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
        <View style={styles.overlay} pointerEvents="none" />
        <View style={[styles.centeredState, screenPadding]}>
          <View style={styles.errorIconWrap}>
            <MCIcon name="alert-circle" size={40} color="#FF8A8A" />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>
              {t("mosque_screen.retry", "Réessayer")}
            </Text>
          </Pressable>
        </View>
      </ThemedImageBackground>
    );
  }

  return (
    <ThemedImageBackground style={styles.container}>
      <View style={styles.overlay} pointerEvents="none" />
      <FlatList
        data={mosques}
        renderItem={renderMosqueItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, screenPadding]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerIconBadge}>
              <MCIcon name="mosque" size={28} color={colors.primary} />
            </View>
            <Text style={styles.title}>
              {t("mosque_screen.mosques_nearby", "Mosquées à proximité")}
            </Text>
            <Text style={styles.subtitle}>
              {mosques.length}{" "}
              {t("mosque_screen.mosque_found", "mosquée(s) trouvée(s)")}
            </Text>
          </View>
        }
        ListEmptyComponent={listEmpty}
      />
    </ThemedImageBackground>
  );
}

const mosqueStyles = StyleSheet.create({
  card: {
    marginBottom: 14,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardGradient: {
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  mosqueName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 22,
    marginBottom: 4,
  },
  mosqueAddress: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 18,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(232, 200, 114, 0.14)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    maxWidth: 96,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E8C872",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  actionPrimary: {
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  actionPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  actionSecondary: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  actionSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  actionDisabled: {
    opacity: 0.45,
  },
  actionDisabledText: {
    color: "rgba(255,255,255,0.45)",
  },
});

const getStyles = (colors: any, overlayTextColor: string) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.58)",
    },
    centeredState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: overlayTextColor,
      textAlign: "center",
      fontWeight: "500",
    },
    errorIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "rgba(255, 107, 107, 0.15)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    errorText: {
      fontSize: 16,
      color: overlayTextColor,
      textAlign: "center",
      marginVertical: 16,
      lineHeight: 24,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 8,
      boxShadow: makeBoxShadow(colors.shadow, 0, 2, 4, 0.2),
    },
    retryButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    header: {
      alignItems: "center",
      paddingHorizontal: 8,
      paddingBottom: 20,
    },
    headerIconBadge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(255,255,255,0.1)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: overlayTextColor,
      textAlign: "center",
      letterSpacing: 0.2,
    },
    subtitle: {
      fontSize: 14,
      color: "rgba(255,255,255,0.75)",
      marginTop: 6,
      textAlign: "center",
    },
    listContent: {
      paddingHorizontal: 16,
    },
    emptyContainer: {
      alignItems: "center",
      padding: 32,
      marginTop: 24,
      backgroundColor: "rgba(255,255,255,0.06)",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
    },
    emptyText: {
      fontSize: 15,
      color: overlayTextColor,
      textAlign: "center",
      marginTop: 12,
      lineHeight: 22,
      opacity: 0.85,
    },
  });
