import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
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
}

export default function LocationSection({
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
}: LocationSectionProps) {
  const { t } = useTranslation();

  return [
    {
      key: "location",
      title: t("location_method", "Méthode de localisation"),
      data: [
        {
          key: "location_content",
          component: (
            <View>
              <View style={styles.locationToggle}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    locationMode === "auto" && styles.toggleButtonActive,
                  ]}
                  onPress={() => setLocationMode("auto")}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      locationMode === "auto" && styles.toggleButtonTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {t("automatic")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    locationMode === "manual" && styles.toggleButtonActive,
                  ]}
                  onPress={() => setLocationMode("manual")}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      locationMode === "manual" &&
                        styles.toggleButtonTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {t("manual")}
                  </Text>
                </TouchableOpacity>
              </View>

              {locationMode === "auto" && (
                <View style={styles.autoLocationSection}>
                  <TouchableOpacity
                    onPress={refreshAutoLocation}
                    style={styles.refreshButton}
                    disabled={isRefreshingLocation}
                  >
                    <Text style={styles.refreshButtonText}>
                      {isRefreshingLocation
                        ? t("updating_location", "Mise à jour...")
                        : t("refresh_location", "Actualiser la position")}
                    </Text>
                  </TouchableOpacity>
                  {autoLocation && (
                    <Text style={styles.locationText}>
                      {t("location_detected", "Position détectée")}:{" "}
                      {autoLocation.lat.toFixed(3)},{" "}
                      {autoLocation.lon.toFixed(3)}
                    </Text>
                  )}
                </View>
              )}

              {locationMode === "manual" && (
                <View>
                  <TextInput
                    style={styles.input}
                    placeholder={t("search_city", "Rechercher une ville")}
                    placeholderTextColor="#999"
                    value={cityInput}
                    onChangeText={handleCityInputChange}
                  />
                  {citySearchLoading && (
                    <ActivityIndicator
                      size="small"
                      color="#D4AF37"
                      style={{ marginVertical: 10 }}
                    />
                  )}
                  {citySearchResults.length > 0 && (
                    <View style={styles.resultsList}>
                      {citySearchResults.map((item) => (
                        <TouchableOpacity
                          key={item.place_id}
                          style={styles.resultItem}
                          onPress={() => selectCity(item)}
                        >
                          <Text>{item.display_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ),
        },
      ],
    },
  ];
}
