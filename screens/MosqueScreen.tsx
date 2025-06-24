import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  TouchableOpacity,
  Linking,
  Platform,
  ImageBackground,
  StatusBar,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import bgImage from "../assets/images/prayer-bg.png";
import { Colors } from "../constants/Colors";
import { SettingsContext } from "../contexts/SettingsContext";
import { useLocation } from "../hooks/useLocation";
import { debugLog, errorLog } from "../utils/logger";

const { width: screenWidth } = Dimensions.get("window");

// 🎨 Design System - reprend le THEME du HomeScreen
const THEME = {
  colors: {
    primary: "#4ECDC4",
    secondary: "#FFD700",
    accent: "#F093FB",
    danger: "#FF6B6B",
    success: "#6BCF7F",
    warning: "#FFB366",

    gradients: {
      primary: ["#4ECDC4", "#2C7A7A"] as const,
      secondary: ["#FFD700", "#B8860B"] as const,
      accent: ["#F093FB", "#9B4B9B"] as const,
      mosque: ["rgba(184,134,11,0.13)", "rgba(255,215,0,0.10)"] as const,
      glass: ["rgba(44,205,196,0.12)", "rgba(240,147,251,0.10)"] as const,
      card: ["rgba(0,0,0,0.4)", "rgba(0,0,0,0.2)"] as const,
    },

    glass: {
      light: "rgba(255, 255, 255, 0.10)",
      medium: "rgba(44,205,196,0.18)",
      dark: "rgba(0, 0, 0, 0.25)",
    },

    text: {
      primary: "#FFFFFF",
      secondary: "rgba(255, 255, 255, 0.95)",
      muted: "rgba(255, 255, 255, 0.7)",
      accent: "#4ECDC4",
    },
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 25,
  },
};

interface Mosque {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance?: number;
  rating?: number;
  phone?: string;
  website?: string;
  openingHours?: string[];
}

export default function MosqueScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Référence pour éviter les rechargements inutiles
  const lastSearchLocation = useRef<{ lat: number; lon: number } | null>(null);

  // Utiliser les contextes comme dans PrayerScreen
  const settings = useContext(SettingsContext);
  const { location } = useLocation();

  // Animations
  const fadeAnim = new Animated.Value(1);
  const slideAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(1);

  // Créer l'objet de localisation comme dans PrayerScreen
  const manualLocationObj = useMemo(
    () =>
      settings.manualLocation &&
      settings.manualLocation.lat &&
      settings.manualLocation.lon
        ? {
            coords: {
              latitude: settings.manualLocation.lat,
              longitude: settings.manualLocation.lon,
              altitude: 0,
              accuracy: 10,
              altitudeAccuracy: 10,
              heading: 0,
              speed: 0,
            },
            timestamp: Date.now(),
            mocked: true,
          }
        : null,
    [settings.manualLocation?.lat, settings.manualLocation?.lon]
  );

  // Obtenir la localisation selon le mode choisi (mémorisée pour éviter les re-renders)
  const locationToUse = useMemo(() => {
    if (settings.locationMode === "manual" && manualLocationObj) {
      return manualLocationObj;
    }
    if (settings.locationMode === "auto" && location) {
      return location;
    }
    return null;
  }, [settings.locationMode, manualLocationObj, location]);

  // Fonction mémorisée pour éviter les re-renders
  const findNearbyMosques = useCallback(
    async (latitude: number, longitude: number) => {
      // Vérifier si on a déjà cherché à cette position
      const currentLoc = { lat: latitude, lon: longitude };
      if (
        lastSearchLocation.current &&
        Math.abs(lastSearchLocation.current.lat - currentLoc.lat) < 0.001 &&
        Math.abs(lastSearchLocation.current.lon - currentLoc.lon) < 0.001
      ) {
        debugLog("🔄 Position identique, pas de nouvelle recherche");
        return;
      }

      lastSearchLocation.current = currentLoc;
      setLoading(true);

      try {
        // Essai avec Google Places API d'abord
        const realMosques = await searchMosquesWithGooglePlaces(
          latitude,
          longitude
        );

        if (realMosques.length > 0) {
          setMosques(realMosques);
          setLoading(false);
          return;
        }

        // Fallback avec Overpass API (OpenStreetMap) - gratuit et mondial
        const osmMosques = await searchMosquesWithOSM(latitude, longitude);

        if (osmMosques.length > 0) {
          setMosques(osmMosques);
          setLoading(false);
          return;
        }

        // Dernier fallback avec des données locales
        const fallbackMosques = await searchFallbackMosques(
          latitude,
          longitude
        );
        setMosques(fallbackMosques);
        setLoading(false);
      } catch (error) {
        errorLog("Erreur recherche mosquées:", error);
        // En cas d'erreur, utiliser le fallback
        const fallbackMosques = await searchFallbackMosques(
          latitude,
          longitude
        );
        setMosques(fallbackMosques);
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (locationToUse?.coords) {
      // Utiliser la localisation disponible
      setLocationError(null);
      findNearbyMosques(
        locationToUse.coords.latitude,
        locationToUse.coords.longitude
      );
    } else if (settings.locationMode === "auto") {
      // Si mode auto mais pas de localisation, demander
      getCurrentLocation();
    } else {
      // Pas de localisation configurée
      setLocationError(t("no_city_selected"));
      setLoading(false);
    }
  }, [locationToUse, settings.locationMode, findNearbyMosques]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(t("location_permission_denied"));
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocationError(null);
      await findNearbyMosques(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );
    } catch (error) {
      errorLog("Erreur de localisation:", error);
      setLocationError(t("location_error"));
      setLoading(false);
    }
  };

  // Fonction pour forcer l'actualisation de la localisation
  const refreshLocation = useCallback(async () => {
    lastSearchLocation.current = null; // Réinitialiser pour forcer la recherche
    setLoading(true);
    setLocationError(null);

    if (locationToUse?.coords) {
      await findNearbyMosques(
        locationToUse.coords.latitude,
        locationToUse.coords.longitude
      );
    } else {
      await getCurrentLocation();
    }
  }, [locationToUse, findNearbyMosques]);

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Rayon de la Terre en km
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

  // API Google Places (New) - Version moderne
  const searchMosquesWithGooglePlaces = async (
    latitude: number,
    longitude: number
  ): Promise<Mosque[]> => {
    try {
      // Clé API récupérée depuis plusieurs sources (ordre de priorité)
      let GOOGLE_PLACES_API_KEY =
        process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || // 1. Variable d'environnement
        Constants.expoConfig?.extra?.googlePlacesApiKey || // 2. app.config.js
        (Constants.manifest as any)?.extra?.googlePlacesApiKey || // 3. Fallback manifest
        "AIzaSyDUDBly4IpLneSJlVXUPVBaQrZIrMYImWU"; // 4. Clé temporaire pour debug

      if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY.length < 10) {
        debugLog(
          "🔑 Clé API manquante ou invalide, utilisation du fallback OSM"
        );
        return []; // Passer au fallback si pas de clé
      }

      // Essayons d'abord une recherche par texte qui est plus fiable
      const textSearchBody = {
        textQuery: "mosquée near me",
        locationBias: {
          circle: {
            center: {
              latitude: latitude,
              longitude: longitude,
            },
            radius: 10000.0,
          },
        },
        maxResultCount: 20,
      };

      // Essayons la recherche textuelle d'abord
      const textResponse = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.regularOpeningHours,places.nationalPhoneNumber,places.websiteUri",
          },
          body: JSON.stringify(textSearchBody),
        }
      );

      const textData = await textResponse.json();

      if (textData.places && textData.places.length > 0) {
        const mosques: Mosque[] = textData.places
          .slice(0, 15)
          .map((place: any, index: number) => ({
            id: place.id || `google_text_${index}`,
            name: place.displayName?.text || `Mosquée ${index + 1}`,
            address: place.formattedAddress || "Adresse non disponible",
            latitude: place.location?.latitude || latitude,
            longitude: place.location?.longitude || longitude,
            rating: place.rating || undefined,
            phone: place.nationalPhoneNumber || undefined,
            website: place.websiteUri || undefined,
            distance: calculateDistance(
              latitude,
              longitude,
              place.location?.latitude || latitude,
              place.location?.longitude || longitude
            ),
            openingHours:
              place.regularOpeningHours?.weekdayDescriptions || undefined,
          }));

        return mosques.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      // Si pas de résultats avec la recherche textuelle, essayons la recherche par type
      const requestBody = {
        includedTypes: ["mosque"], // Type spécifique pour mosquées
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: latitude,
              longitude: longitude,
            },
            radius: 10000.0, // 10km en mètres
          },
        },
        // Champs que nous voulons récupérer
        fieldMask:
          "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.regularOpeningHours,places.nationalPhoneNumber,places.websiteUri",
      };

      const response = await fetch(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.regularOpeningHours,places.nationalPhoneNumber,places.websiteUri",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      debugLog("📡 Réponse Google Places API:", {
        status: response.status,
        placesCount: data.places?.length || 0,
        errorMessage: data.error_message,
        data: data,
      });

      if (data.places && data.places.length > 0) {
        const mosques: Mosque[] = data.places
          .slice(0, 15)
          .map((place: any, index: number) => ({
            id: place.id || `google_new_${index}`,
            name: place.displayName?.text || `Mosquée ${index + 1}`,
            address: place.formattedAddress || "Adresse non disponible",
            latitude: place.location?.latitude || latitude,
            longitude: place.location?.longitude || longitude,
            rating: place.rating || undefined,
            phone: place.nationalPhoneNumber || undefined,
            website: place.websiteUri || undefined,
            distance: calculateDistance(
              latitude,
              longitude,
              place.location?.latitude || latitude,
              place.location?.longitude || longitude
            ),
            openingHours:
              place.regularOpeningHours?.weekdayDescriptions || undefined,
          }));

        return mosques.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      return [];
    } catch (error) {
      errorLog("Erreur Google Places (New):", error);
      return [];
    }
  };

  // API Overpass (OpenStreetMap) - Gratuit et mondial
  const searchMosquesWithOSM = async (
    latitude: number,
    longitude: number
  ): Promise<Mosque[]> => {
    try {
      debugLog("🗺️ Recherche avec OpenStreetMap API...");
      const radius = 10000; // 10km
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${latitude},${longitude});
          way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${latitude},${longitude});
          relation["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${latitude},${longitude});
        );
        out geom;
      `;

      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
        headers: {
          "Content-Type": "text/plain",
        },
      });

      const data = await response.json();

      debugLog("📍 Réponse OSM:", {
        elementsCount: data.elements?.length || 0,
        elements: data.elements?.slice(0, 3), // Premier 3 pour debug
      });

      if (data.elements && data.elements.length > 0) {
        const mosques: Mosque[] = data.elements
          .filter((element: any) => element.tags && element.tags.name)
          .slice(0, 15)
          .map((element: any, index: number) => {
            const lat =
              element.lat || (element.center ? element.center.lat : null);
            const lon =
              element.lon || (element.center ? element.center.lon : null);

            if (!lat || !lon) return null;

            return {
              id: `osm_${element.id || index}`,
              name: element.tags.name || `Mosquée ${index + 1}`,
              address:
                [
                  element.tags["addr:street"],
                  element.tags["addr:housenumber"],
                  element.tags["addr:city"],
                  element.tags["addr:postcode"],
                ]
                  .filter(Boolean)
                  .join(" ") || "Adresse non disponible",
              latitude: lat,
              longitude: lon,
              phone: element.tags.phone || undefined,
              website: element.tags.website || undefined,
              distance: calculateDistance(latitude, longitude, lat, lon),
              openingHours: element.tags.opening_hours
                ? [element.tags.opening_hours]
                : undefined,
            };
          })
          .filter(Boolean) as Mosque[];

        return mosques.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      return [];
    } catch (error) {
      errorLog("Erreur Overpass API:", error);
      return [];
    }
  };

  // Recherche de secours avec base locale
  const searchFallbackMosques = async (
    latitude: number,
    longitude: number
  ): Promise<Mosque[]> => {
    // Base de données locale de mosquées importantes dans le monde
    const worldMosques = [
      // Suisse
      {
        name: "Centre Islamique de Genève",
        lat: 46.2044,
        lng: 6.1432,
        city: "Genève",
        country: "Suisse",
        phone: "+41 22 734 10 47",
      },
      {
        name: "Mosquée de Zurich",
        lat: 47.3769,
        lng: 8.5417,
        city: "Zurich",
        country: "Suisse",
      },
      {
        name: "Centre Islamique de Lausanne",
        lat: 46.5197,
        lng: 6.6323,
        city: "Lausanne",
        country: "Suisse",
      },

      // France
      {
        name: "Grande Mosquée de Paris",
        lat: 48.8421,
        lng: 2.3554,
        city: "Paris",
        country: "France",
        phone: "+33 1 45 35 97 33",
      },
      {
        name: "Mosquée de Lyon",
        lat: 45.764,
        lng: 4.8357,
        city: "Lyon",
        country: "France",
      },
      {
        name: "Mosquée de Marseille",
        lat: 43.2965,
        lng: 5.3698,
        city: "Marseille",
        country: "France",
      },

      // Belgique
      {
        name: "Grande Mosquée de Bruxelles",
        lat: 50.8503,
        lng: 4.3517,
        city: "Bruxelles",
        country: "Belgique",
      },

      // Allemagne
      {
        name: "Mosquée de Berlin",
        lat: 52.52,
        lng: 13.405,
        city: "Berlin",
        country: "Allemagne",
      },
      {
        name: "Mosquée de Munich",
        lat: 48.1351,
        lng: 11.582,
        city: "Munich",
        country: "Allemagne",
      },

      // Italie
      {
        name: "Mosquée de Rome",
        lat: 41.9028,
        lng: 12.4964,
        city: "Rome",
        country: "Italie",
      },
      {
        name: "Mosquée de Milan",
        lat: 45.4642,
        lng: 9.19,
        city: "Milan",
        country: "Italie",
      },

      // Espagne
      {
        name: "Mosquée de Madrid",
        lat: 40.4168,
        lng: -3.7038,
        city: "Madrid",
        country: "Espagne",
      },
      {
        name: "Mosquée de Barcelone",
        lat: 41.3851,
        lng: 2.1734,
        city: "Barcelone",
        country: "Espagne",
      },

      // Royaume-Uni
      {
        name: "Mosquée de Londres",
        lat: 51.5074,
        lng: -0.1278,
        city: "Londres",
        country: "Royaume-Uni",
      },

      // Maroc
      {
        name: "Mosquée Hassan II",
        lat: 33.6084,
        lng: -7.6322,
        city: "Casablanca",
        country: "Maroc",
      },
      {
        name: "Mosquée Kutubiyya",
        lat: 31.6295,
        lng: -7.9811,
        city: "Marrakech",
        country: "Maroc",
      },

      // Turquie
      {
        name: "Mosquée Bleue",
        lat: 41.0054,
        lng: 28.9768,
        city: "Istanbul",
        country: "Turquie",
      },
      {
        name: "Sainte-Sophie",
        lat: 41.0086,
        lng: 28.9802,
        city: "Istanbul",
        country: "Turquie",
      },
    ];

    // Trouver les mosquées les plus proches (dans un rayon de 100km)
    const nearbyMosques = worldMosques
      .map((mosque, index) => {
        const distance = calculateDistance(
          latitude,
          longitude,
          mosque.lat,
          mosque.lng
        );
        return {
          id: `world_${index}`,
          name: mosque.name,
          address: `${mosque.city}, ${mosque.country}`,
          latitude: mosque.lat,
          longitude: mosque.lng,
          distance,
          phone: mosque.phone,
          rating: 4.0 + Math.random() * 1, // Rating aléatoire entre 4 et 5
          openingHours: ["05:00 - 22:00", "Prières quotidiennes"],
        };
      })
      .filter((mosque) => mosque.distance <= 100) // Maximum 100km
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8); // Max 8 mosquées

    return nearbyMosques;
  };

  const openDirections = (mosque: Mosque) => {
    const scheme = Platform.select({
      ios: "maps:0,0?q=",
      android: "geo:0,0?q=",
    });
    const latLng = `${mosque.latitude},${mosque.longitude}`;
    const label = mosque.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const callMosque = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const renderMosqueItem = ({
    item,
    index,
  }: {
    item: Mosque;
    index: number;
  }) => (
    <View style={styles.mosqueCard}>
      <LinearGradient
        colors={THEME.colors.gradients.card}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() =>
            setSelectedMosque(selectedMosque?.id === item.id ? null : item)
          }
          activeOpacity={0.8}
        >
          {/* Header de la carte */}
          <View style={styles.mosqueHeader}>
            <View style={styles.nameSection}>
              <MaterialCommunityIcons
                name="mosque"
                size={24}
                color={THEME.colors.secondary}
                style={styles.mosqueIcon}
              />
              <Text style={styles.mosqueName}>{item.name}</Text>
            </View>
            <View style={styles.distanceContainer}>
              <MaterialCommunityIcons
                name="map-marker-distance"
                size={16}
                color={THEME.colors.accent}
              />
              <Text style={styles.distanceText}>
                {item.distance?.toFixed(1)} km
              </Text>
            </View>
          </View>

          {/* Adresse */}
          <Text style={styles.mosqueAddress}>{item.address}</Text>

          {/* Rating et horaires */}
          <View style={styles.infoRow}>
            {item.rating && (
              <View style={styles.ratingContainer}>
                <MaterialCommunityIcons
                  name="star"
                  size={16}
                  color={THEME.colors.secondary}
                />
                <Text style={styles.ratingText}>{item.rating}/5</Text>
              </View>
            )}
            {item.openingHours && (
              <View style={styles.hoursContainer}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={14}
                  color={THEME.colors.text.muted}
                />
                <Text style={styles.hoursText}>{item.openingHours[0]}</Text>
              </View>
            )}
          </View>

          {/* Actions étendues si sélectionnée */}
          {selectedMosque?.id === item.id && (
            <View style={styles.expandedActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { borderColor: THEME.colors.primary },
                ]}
                onPress={() => openDirections(item)}
              >
                <LinearGradient
                  colors={THEME.colors.gradients.primary}
                  style={styles.actionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialCommunityIcons
                    name="navigation"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.actionText}>{t("get_directions")}</Text>
                </LinearGradient>
              </TouchableOpacity>

              {item.phone && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { borderColor: THEME.colors.accent },
                  ]}
                  onPress={() => callMosque(item.phone)}
                >
                  <LinearGradient
                    colors={THEME.colors.gradients.accent}
                    style={styles.actionGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialCommunityIcons
                      name="phone"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.actionText}>{t("call")}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { borderColor: THEME.colors.secondary },
                ]}
                onPress={() => {
                  /* Fonction future pour plus d'infos */
                }}
              >
                <LinearGradient
                  colors={THEME.colors.gradients.secondary}
                  style={styles.actionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialCommunityIcons
                    name="information"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.actionText}>{t("more_info")}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  if (loading) {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <ImageBackground source={bgImage} style={styles.background}>
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <LinearGradient
                colors={THEME.colors.gradients.glass}
                style={styles.loadingGradient}
              >
                <MaterialCommunityIcons
                  name="mosque"
                  size={48}
                  color={THEME.colors.primary}
                  style={styles.loadingIcon}
                />
                <ActivityIndicator size="large" color={THEME.colors.primary} />
                <Text style={styles.loadingText}>
                  {t("finding_nearby_mosques")}
                </Text>
              </LinearGradient>
            </View>
          </View>
        </ImageBackground>
      </>
    );
  }

  if (locationError || (!locationToUse?.coords && !loading)) {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <ImageBackground source={bgImage} style={styles.background}>
          <View style={styles.errorContainer}>
            <View style={styles.errorCard}>
              <LinearGradient
                colors={THEME.colors.gradients.card}
                style={styles.errorGradient}
              >
                <MaterialCommunityIcons
                  name="map-marker-off"
                  size={64}
                  color={THEME.colors.danger}
                />
                <Text style={styles.errorTitle}>
                  {locationError || t("location_required_for_mosques")}
                </Text>
                <Text style={styles.errorDescription}>
                  {t("configure_location_in_settings")}
                </Text>
                <View style={styles.errorActions}>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => router.push("/settings")}
                  >
                    <LinearGradient
                      colors={THEME.colors.gradients.secondary}
                      style={styles.retryGradient}
                    >
                      <MaterialCommunityIcons
                        name="cog"
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.retryButtonText}>
                        {t("settings")}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  {settings.locationMode === "auto" && (
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={refreshLocation}
                    >
                      <LinearGradient
                        colors={THEME.colors.gradients.primary}
                        style={styles.retryGradient}
                      >
                        <MaterialCommunityIcons
                          name="refresh"
                          size={20}
                          color="#fff"
                        />
                        <Text style={styles.retryButtonText}>{t("retry")}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </LinearGradient>
            </View>
          </View>
        </ImageBackground>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={bgImage} style={styles.background}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Header Dashboard */}
          <View style={styles.dashboardHeader}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={24}
                  color={THEME.colors.text.primary}
                />
              </TouchableOpacity>

              <View style={styles.titleSection}>
                <Text style={styles.title}>{t("nearby_mosques")}</Text>
                <View style={styles.statsContainer}>
                  <MaterialCommunityIcons
                    name="mosque"
                    size={16}
                    color={THEME.colors.secondary}
                  />
                  <Text style={styles.statsText}>
                    {mosques.length} {t("mosques_found")}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.refreshIconButton}
                onPress={refreshLocation}
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={24}
                  color={THEME.colors.text.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Liste des mosquées */}
          <FlatList
            data={mosques}
            renderItem={renderMosqueItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </ScrollView>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingCard: {
    borderRadius: THEME.borderRadius.xl,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  loadingGradient: {
    padding: 32,
    alignItems: "center",
  },
  loadingIcon: {
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: THEME.colors.text.primary,
    fontWeight: "600",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorCard: {
    borderRadius: THEME.borderRadius.xl,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: THEME.colors.danger,
    shadowColor: THEME.colors.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  errorGradient: {
    padding: 32,
    alignItems: "center",
  },
  errorTitle: {
    fontSize: 18,
    color: THEME.colors.text.primary,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 16,
    lineHeight: 24,
  },
  errorDescription: {
    fontSize: 14,
    color: THEME.colors.text.muted,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  errorActions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  retryButton: {
    borderRadius: THEME.borderRadius.md,
    overflow: "hidden",
    marginTop: 16,
  },
  retryGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  dashboardHeader: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: THEME.borderRadius.xl,
    marginTop: 60,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.glass.light,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: THEME.colors.text.primary,
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsText: {
    color: THEME.colors.text.secondary,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  refreshIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.glass.light,
    justifyContent: "center",
    alignItems: "center",
  },
  mosqueCard: {
    marginBottom: 16,
    borderRadius: THEME.borderRadius.xl,
    overflow: "hidden",
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  cardGradient: {
    borderRadius: THEME.borderRadius.xl,
  },
  cardContent: {
    padding: 20,
  },
  mosqueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  nameSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  mosqueIcon: {
    marginRight: 8,
  },
  mosqueName: {
    fontSize: 18,
    fontWeight: "bold",
    color: THEME.colors.text.primary,
    flex: 1,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.glass.light,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.accent,
  },
  distanceText: {
    marginLeft: 4,
    color: THEME.colors.text.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  mosqueAddress: {
    color: THEME.colors.text.muted,
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: THEME.colors.text.secondary,
    fontWeight: "600",
  },
  hoursContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 16,
  },
  hoursText: {
    marginLeft: 6,
    color: THEME.colors.text.muted,
    fontSize: 12,
    flex: 1,
  },
  expandedActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: THEME.borderRadius.md,
    overflow: "hidden",
    borderWidth: 1.5,
  },
  actionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  actionText: {
    marginLeft: 6,
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
