import React, { useContext, useState, useRef } from "react";
import { Picker } from "@react-native-picker/picker";
import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import {
  ImageBackground,
  FlatList,
  ScrollView,
  View,
  Text,
  Switch,
  Pressable,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Colors } from "../constants/Colors";
import bgImage from "../assets/images/prayer-bg.png";
import {
  SettingsContext,
  AdhanSoundKey,
  CalcMethodKey,
} from "../contexts/SettingsContext";
import { useCitySearch } from "../hooks/useCitySearch";
import { useTranslation } from "react-i18next";

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const {
    calcMethod,
    setCalcMethod,
    notificationsEnabled,
    setNotificationsEnabled,
    adhanSound,
    setAdhanSound,
    remindersEnabled,
    setRemindersEnabled,
    reminderOffset,
    setReminderOffset,
    locationMode,
    setLocationMode,
    manualLocation,
    setManualLocation,
  } = useContext(SettingsContext);

  // Sons & méthodes
  const sounds: AdhanSoundKey[] = [
    "adhamalsharqawe",
    "adhanaljazaer",
    "ahmedelkourdi",
  ];
  const methods: CalcMethodKey[] = [
    "MuslimWorldLeague",
    "Egyptian",
    "Karachi",
    "UmmAlQura",
    "NorthAmerica",
    "Kuwait",
    "Qatar",
    "Singapore",
    "Tehran",
  ];

  // Langues disponibles
  const languages = [
    { code: "fr", label: "Français" },
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
    { code: "it", label: "Italiano" },
    { code: "ar", label: "العربية" },
    { code: "ru", label: "Русский" },
    { code: "tr", label: "Türkçe" },
    { code: "de", label: "Deutsch" },
    { code: "pt", label: "Português" },
    { code: "nl", label: "Nederlands" },
    { code: "ur", label: "اردو" },
    { code: "bn", label: "বাংলা" },
    { code: "fa", label: "فارسی" },
    /*     { code: "id", label: "Bahasa Indonesia" },
     */
  ];

  const [selectedLang, setSelectedLang] = useState(i18n.language);
  function onChangeLanguage(langCode: string) {
    i18n.changeLanguage(langCode);
    setSelectedLang(langCode);
  }

  // Son Adhan - preview
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const soundMap: Record<AdhanSoundKey, number> = {
    adhamalsharqawe: require("../assets/sounds/adhamalsharqawe.wav"),
    adhanaljazaer: require("../assets/sounds/adhanaljazaer.wav"),
    ahmedelkourdi: require("../assets/sounds/ahmedelkourdi.wav"),
  };
  const playPreview = async () => {
    if (isPreviewing) return;
    try {
      setIsPreviewing(true);
      if (previewSound) {
        await previewSound.unloadAsync();
        setPreviewSound(null);
      }
      const { sound } = await Audio.Sound.createAsync(soundMap[adhanSound], {
        shouldPlay: true,
      });
      setPreviewSound(sound);
      setTimeout(async () => {
        await sound.stopAsync();
        await sound.unloadAsync();
        setIsPreviewing(false);
        setPreviewSound(null);
      }, 20000);
    } catch (e) {
      setIsPreviewing(false);
    }
  };
  const stopPreview = async () => {
    if (previewSound) {
      try {
        await previewSound.stopAsync();
        await previewSound.unloadAsync();
      } catch {}
      setIsPreviewing(false);
      setPreviewSound(null);
    }
  };

  // Ville autocomplete (pas de synchronisation automatique !)
  const [cityInput, setCityInput] = useState(manualLocation?.city || "");
  const [cityError, setCityError] = useState<string | null>(null);
  const { results, loading, searchCity, setResults } = useCitySearch();
  const lastManualSelection = useRef(false);

  // Picker change = reset l'input & localisation si on repasse en auto
  function handleLocationModeChange(v: "auto" | "manual") {
    setLocationMode(v);
    if (v === "auto") {
      setCityInput("");
      setManualLocation(null);
      setCityError(null);
    }
  }

  return (
    <ImageBackground
      source={bgImage}
      style={styles.background}
      resizeMode="cover"
    >
      {locationMode === "manual" ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.lat + item.lon}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.container}>
              <Text style={[styles.header, { color: Colors.text }]}>
                {t("settings")}
              </Text>
              {/* Picker de localisation */}
              <View style={styles.row}>
                <Text style={styles.label}>{t("location")}</Text>
                <Picker
                  selectedValue={locationMode}
                  style={styles.picker}
                  onValueChange={handleLocationModeChange}
                >
                  <Picker.Item label={t("automatic_gps")} value="auto" />
                  <Picker.Item label={t("manual_city")} value="manual" />
                </Picker>
              </View>
              {/* Saisie ville + suggestions */}
              <TextInput
                placeholder={t("city_placeholder")}
                value={cityInput}
                onChangeText={(txt) => {
                  setCityInput(txt);
                  setCityError(null);
                  if (!lastManualSelection.current) {
                    searchCity(txt);
                  }
                  lastManualSelection.current = false;
                }}
                style={styles.input}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {loading && <ActivityIndicator size="small" />}
              {cityError && (
                <Text style={{ color: "red", marginTop: 4 }}>{cityError}</Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                const rawCity =
                  item.address.city ||
                  item.address.town ||
                  item.address.village ||
                  item.address.county ||
                  item.display_name;
                const rawCountry = item.address.country || "";

                function sanitizeCountry(country: string) {
                  const parts = country.split("/");
                  const suisse = parts.find((p) =>
                    p.trim().toLowerCase().startsWith("sui")
                  );
                  return suisse ? suisse.trim() : parts[0].trim();
                }

                function removeTrailingCountry(city: string, country: string) {
                  const cityNorm = city.trim().toLowerCase();
                  const countryNorm = country.trim().toLowerCase();
                  if (
                    cityNorm.endsWith(countryNorm) ||
                    cityNorm.endsWith(", " + countryNorm) ||
                    cityNorm.endsWith(" " + countryNorm)
                  ) {
                    const lastComma = city.lastIndexOf(",");
                    if (lastComma !== -1) {
                      return city.substring(0, lastComma).trim();
                    } else {
                      return city
                        .replace(new RegExp(country + "$", "i"), "")
                        .trim();
                    }
                  }
                  return city;
                }

                const country = sanitizeCountry(rawCountry);
                const city = removeTrailingCountry(rawCity, country);

                const displayCity =
                  city && country ? `${city}, ${country}` : city || country;

                lastManualSelection.current = true;
                setCityInput(displayCity);
                setManualLocation({
                  lat: parseFloat(item.lat),
                  lon: parseFloat(item.lon),
                  city: displayCity,
                  country,
                });
                setResults([]);
              }}
            >
              <Text>{item.display_name}</Text>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <FooterSettings
              methods={methods}
              calcMethod={calcMethod}
              setCalcMethod={setCalcMethod}
              sounds={sounds}
              adhanSound={adhanSound}
              setAdhanSound={setAdhanSound}
              notificationsEnabled={notificationsEnabled}
              setNotificationsEnabled={setNotificationsEnabled}
              remindersEnabled={remindersEnabled}
              setRemindersEnabled={setRemindersEnabled}
              reminderOffset={reminderOffset}
              setReminderOffset={setReminderOffset}
              isPreviewing={isPreviewing}
              playPreview={playPreview}
              stopPreview={stopPreview}
              selectedLang={selectedLang}
              onChangeLanguage={onChangeLanguage}
              languages={languages}
            />
          }
          style={{ flex: 1, backgroundColor: "transparent" }}
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.header, { color: Colors.text }]}>
            {t("settings")}
          </Text>
          {/* Picker de localisation */}
          <View style={styles.row}>
            <Text style={styles.label}>{t("location")}</Text>
            <Picker
              selectedValue={locationMode}
              style={styles.picker}
              onValueChange={handleLocationModeChange}
            >
              <Picker.Item label={t("automatic_gps")} value="auto" />
              <Picker.Item label={t("manual_city")} value="manual" />
            </Picker>
          </View>
          <FooterSettings
            methods={methods}
            calcMethod={calcMethod}
            setCalcMethod={setCalcMethod}
            sounds={sounds}
            adhanSound={adhanSound}
            setAdhanSound={setAdhanSound}
            notificationsEnabled={notificationsEnabled}
            setNotificationsEnabled={setNotificationsEnabled}
            remindersEnabled={remindersEnabled}
            setRemindersEnabled={setRemindersEnabled}
            reminderOffset={reminderOffset}
            setReminderOffset={setReminderOffset}
            isPreviewing={isPreviewing}
            playPreview={playPreview}
            stopPreview={stopPreview}
            selectedLang={selectedLang}
            onChangeLanguage={onChangeLanguage}
            languages={languages}
          />
        </ScrollView>
      )}
    </ImageBackground>
  );
}

type FooterProps = {
  methods: CalcMethodKey[];
  calcMethod: CalcMethodKey;
  setCalcMethod: (v: CalcMethodKey) => void;
  sounds: AdhanSoundKey[];
  adhanSound: AdhanSoundKey;
  setAdhanSound: (v: AdhanSoundKey) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  remindersEnabled: boolean;
  setRemindersEnabled: (v: boolean) => void;
  reminderOffset: number;
  setReminderOffset: (v: number) => void;
  isPreviewing: boolean;
  playPreview: () => void;
  stopPreview: () => void;

  selectedLang: string;
  onChangeLanguage: (langCode: string) => void;
  languages: { code: string; label: string }[];
};

function FooterSettings({
  methods,
  calcMethod,
  setCalcMethod,
  sounds,
  adhanSound,
  setAdhanSound,
  notificationsEnabled,
  setNotificationsEnabled,
  remindersEnabled,
  setRemindersEnabled,
  reminderOffset,
  setReminderOffset,
  isPreviewing,
  playPreview,
  stopPreview,

  selectedLang,
  onChangeLanguage,
  languages,
}: FooterProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Notifications */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: Colors.text }]}>
          {t("notifications")}
        </Text>
        <Switch
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={notificationsEnabled ? Colors.accent : "#f4f3f4"}
          onValueChange={setNotificationsEnabled}
          value={notificationsEnabled}
        />
      </View>
      {/* Sélection de la langue */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: Colors.text }]}>
          {t("language")}
        </Text>
        <Picker
          selectedValue={selectedLang}
          style={styles.picker}
          onValueChange={onChangeLanguage}
        >
          {languages.map(({ code, label }) => (
            <Picker.Item key={code} label={label} value={code} />
          ))}
        </Picker>
      </View>
      {/* Méthode de calcul */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: Colors.text }]}>
          {t("calculation_method")}
        </Text>
        <Picker
          selectedValue={calcMethod}
          style={styles.picker}
          onValueChange={setCalcMethod}
        >
          {methods.map((m) => (
            <Picker.Item key={m} label={t(`calc_method.${m}`)} value={m} />
          ))}
        </Picker>
      </View>
      {/* Son de l'adhan */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: Colors.text }]}>
          {t("adhan_sound")}
        </Text>
        <Picker
          selectedValue={adhanSound}
          style={styles.picker}
          onValueChange={setAdhanSound}
        >
          {sounds.map((s) => (
            <Picker.Item key={s} label={t(`adhan_sounds.${s}`)} value={s} />
          ))}
        </Picker>
      </View>
      <Pressable
        style={[styles.previewBtn, isPreviewing && styles.disabledBtn]}
        onPress={playPreview}
        disabled={isPreviewing}
      >
        <Text style={styles.previewBtnText}>
          {isPreviewing ? t("preview_playing") : t("preview")}
        </Text>
      </Pressable>
      {isPreviewing && (
        <Pressable style={styles.stopBtn} onPress={stopPreview}>
          <Text style={styles.stopBtnText}>{t("stop")}</Text>
        </Pressable>
      )}
      {/* Rappel avant la prière */}
      <View style={{ marginVertical: 20 }}>
        <Text style={{ fontWeight: "bold", fontSize: 16 }}>
          {t("prayer_reminder")}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text>{t("enable_reminder")}</Text>
          <Switch
            value={remindersEnabled}
            onValueChange={setRemindersEnabled}
          />
        </View>
        {remindersEnabled && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Text>{t("minutes_before")}</Text>
            <Slider
              style={{ flex: 1, marginHorizontal: 8 }}
              minimumValue={1}
              maximumValue={30}
              step={1}
              value={reminderOffset}
              onValueChange={setReminderOffset}
            />
            <Text>
              {reminderOffset} {t("minutes")}
            </Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scroll: { flex: 1, backgroundColor: "transparent" },
  container: { flexGrow: 1, padding: 20 },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 70,
    marginBottom: 20,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: { fontSize: 18, flex: 1 },
  picker: { width: 160 },
  previewBtn: {
    marginTop: 12,
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  previewBtnText: {
    color: Colors.background,
    fontSize: 16,
  },
  disabledBtn: {
    backgroundColor: Colors.border,
  },
  stopBtn: {
    marginTop: 12,
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#b00020",
    borderRadius: 6,
  },
  stopBtnText: {
    color: Colors.background,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 8,
    borderRadius: 5,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
});
