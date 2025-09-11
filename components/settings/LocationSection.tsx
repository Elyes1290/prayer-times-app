import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { NominatimResult } from "../../hooks/useCitySearch";

interface LocationSectionProps {
  // États location
  locationMode: "auto" | "manual";
  autoLocation: { lat: number; lon: number } | null;
  isRefreshingLocation: boolean;

  // États recherche ville
  cityInput: string;
  citySearchResults: NominatimResult[];
  citySearchLoading: boolean;

  // Fonctions location
  setLocationMode: (mode: "auto" | "manual") => void;
  refreshAutoLocation: () => Promise<void>;

  // Fonctions recherche ville
  handleCityInputChange: (text: string) => void;
  selectCity: (city: NominatimResult) => void;

  // Styles
  styles: any;

  // 🚀 NOUVEAU : Gestion section active
  setActiveSection?: (sectionId: string | null) => void;

  // 🚀 NOUVEAU : UI Mode externe (stable)
  uiMode?: "auto" | "manual";
  setUIMode?: (mode: "auto" | "manual") => void;
}

// 🔥 VRAI COMPOSANT REACT SÉPARÉ
function LocationSectionComponent({
  locationMode,
  autoLocation,
  isRefreshingLocation,
  cityInput,
  citySearchResults,
  citySearchLoading,
  setLocationMode,
  refreshAutoLocation,
  handleCityInputChange,
  selectCity,
  styles,
  setActiveSection,
  uiMode,
  setUIMode,
}: LocationSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();

  // 🚀 STATE LOCAL pour l'input - séparé de la recherche !
  const [localCityInput, setLocalCityInput] = useState(cityInput || "");

  // 🚀 UI MODE : utiliser l'état externe ou local de fallback
  const currentUIMode = uiMode || locationMode;
  const setCurrentUIMode = setUIMode || (() => {});

  // 🚀 SYNCHRONISATION : Mettre à jour l'UI externe quand le mode réel change
  useEffect(() => {
    if (locationMode === "manual" && setUIMode) {
      setUIMode("manual");
    }
  }, [locationMode, setUIMode]);

  // 🚀 Fonction pour rechercher manuellement
  const handleSearch = () => {
    if (localCityInput.trim().length >= 2) {
      // ✅ MAINTENIR la section location OUVERTE pendant la recherche !
      if (setActiveSection) {
        setActiveSection("location");
      }
      handleCityInputChange(localCityInput.trim());
    }
  };

  // 🚀 Fonction pour sélectionner une ville
  const handleSelectCity = (city: any) => {
    setLocalCityInput(city.display_name.split(",")[0].trim());

    // ✅ MAINTENIR la section location OUVERTE après sélection !
    if (setActiveSection) {
      setActiveSection("location");
    }

    // ✅ MAINTENANT on active vraiment le mode manuel
    setLocationMode("manual");
    setCurrentUIMode("manual"); // ✅ MISE À JOUR IMMÉDIATE de l'UI
    selectCity(city);

    // 🚀 REDIRECTION vers HomeScreen pour voir les horaires
    setTimeout(() => {
      router.push("/");
    }, 500); // Petit délai pour laisser le temps à la sauvegarde
  };

  return (
    <View>
      <View style={styles.locationToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            currentUIMode === "auto" && styles.toggleButtonActive,
          ]}
          onPress={() => {
            setCurrentUIMode("auto");
            setLocationMode("auto"); // ✅ Mode auto = activation immédiate
          }}
        >
          <Text
            style={[
              styles.toggleButtonText,
              currentUIMode === "auto" && styles.toggleButtonTextActive,
            ]}
            numberOfLines={1}
          >
            {t("automatic")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            currentUIMode === "manual" && styles.toggleButtonActive,
          ]}
          onPress={() => {
            setCurrentUIMode("manual"); // ✅ Interface manuel SANS activer le vrai mode
            // Le vrai setLocationMode("manual") se fera dans handleSelectCity
          }}
        >
          <Text
            style={[
              styles.toggleButtonText,
              currentUIMode === "manual" && styles.toggleButtonTextActive,
            ]}
            numberOfLines={1}
          >
            {t("manual")}
          </Text>
        </TouchableOpacity>
      </View>

      {currentUIMode === "auto" && (
        <View style={styles.autoLocationSection}>
          <TouchableOpacity
            onPress={refreshAutoLocation}
            style={styles.refreshButton}
            disabled={isRefreshingLocation}
          >
            <Text style={styles.refreshButtonText}>
              {isRefreshingLocation
                ? t("location.updating", "Mise à jour...")
                : t("refresh_location", "Actualiser la position")}
            </Text>
          </TouchableOpacity>
          {autoLocation && (
            <Text style={styles.locationText}>
              {t("location.detected", "Position détectée")}:{" "}
              {autoLocation.lat.toFixed(3)}, {autoLocation.lon.toFixed(3)}
            </Text>
          )}
        </View>
      )}

      {currentUIMode === "manual" && (
        <View style={styles.manualLocationContainer}>
          <View style={styles.searchContainer}>
            {/* 🔥 INPUT LOCAL - ne met pas à jour la localisation ! */}
            <TextInput
              style={[styles.input, styles.searchInput]}
              placeholder={t("search_city", "Rechercher une ville")}
              placeholderTextColor="#999"
              value={localCityInput}
              onChangeText={setLocalCityInput}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
              blurOnSubmit={false}
              enablesReturnKeyAutomatically={true}
              keyboardType="default"
              autoFocus={false}
              selectTextOnFocus={false}
              textContentType="none"
              importantForAutofill="no"
              onSubmitEditing={handleSearch}
            />
            {/* 🔥 BOUTON RECHERCHER */}
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
              disabled={localCityInput.trim().length < 2}
            >
              <Text style={styles.searchButtonText}>
                {t("search", "Rechercher")}
              </Text>
            </TouchableOpacity>
          </View>
          {citySearchLoading && (
            <ActivityIndicator
              size="small"
              color="#D4AF37"
              style={{ marginVertical: 10 }}
            />
          )}
          {citySearchResults.length > 0 && (
            <View style={[styles.resultsList, styles.resultsListFixed]}>
              {citySearchResults.map((item, index) => (
                <TouchableOpacity
                  key={item.place_id || `result-${index}`}
                  style={styles.resultItem}
                  onPress={() => handleSelectCity(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resultText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// 🔥 WRAPPER FONCTION pour compatibilité - SANS HOOKS !
export default function LocationSection(props: LocationSectionProps) {
  return [
    {
      key: "location",
      title: "Localisation", // Titre fixe pour éviter useTranslation ici
      data: [
        {
          key: "location_content",
          component: <LocationSectionComponent {...props} />,
        },
      ],
    },
  ];
}
