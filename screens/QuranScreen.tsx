import ModalSelector from "react-native-modal-selector";
import * as Font from "expo-font";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

export default function QuranScreen() {
  const { t, i18n } = useTranslation();

  // Map langue => id traduction Quran.com (ajoute d'autres langues si besoin)
  const translationMap: Record<string, number | null> = {
    fr: 136,
    en: 85,
    ru: 45,
    tr: 52,
    de: 27,
    ar: null,
    es: 83,
    it: 153,
    pt: 43, // Portugais
    nl: 144, // Néerlandais
    ur: 97, // Ourdou
    bn: 120, // Bengali
    fa: 135, // Persan
  };

  const [sourates, setSourates] = useState<any[]>([]);
  const [selectedSourate, setSelectedSourate] = useState(1);
  const [arabicVerses, setArabicVerses] = useState<any[]>([]);
  const [phoneticArr, setPhoneticArr] = useState<any[]>([]);
  const [translationArr, setTranslationArr] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded] = Font.useFonts({
    ScheherazadeNew: require("../assets/fonts/ScheherazadeNew-Regular.ttf"),
  });

  // Détecter la langue à utiliser pour l'API Quran.com
  const lang = i18n.language.startsWith("fr")
    ? "fr"
    : i18n.language.startsWith("en")
    ? "en"
    : i18n.language.startsWith("ru")
    ? "ru"
    : i18n.language.startsWith("tr")
    ? "tr"
    : i18n.language.startsWith("de")
    ? "de"
    : i18n.language.startsWith("it")
    ? "it"
    : i18n.language.startsWith("es")
    ? "es"
    : i18n.language.startsWith("pt")
    ? "pt"
    : i18n.language.startsWith("ur")
    ? "ur"
    : i18n.language.startsWith("fa")
    ? "fa"
    : i18n.language.startsWith("ar")
    ? "ar"
    : i18n.language.startsWith("nl") // Ajout du néerlandais
    ? "nl"
    : i18n.language.startsWith("bn") // Ajout du bengali
    ? "bn"
    : "en";

  // Fonction fetch avec fallback sur anglais (id 85)
  async function fetchTranslation(chapterNumber: number, lang: string) {
    const translationId = translationMap[lang] || 85; // fallback anglais

    try {
      const res = await fetch(
        `https://api.quran.com/api/v4/quran/translations/${translationId}?chapter_number=${chapterNumber}`
      );
      const json = await res.json();

      if (json.translations && json.translations.length > 0) {
        return json.translations;
      } else if (translationId !== 85) {
        // fallback anglais si vide
        const fallbackRes = await fetch(
          `https://api.quran.com/api/v4/quran/translations/85?chapter_number=${chapterNumber}`
        );
        const fallbackJson = await fallbackRes.json();
        return fallbackJson.translations || [];
      }
      return [];
    } catch {
      // fallback en cas d'erreur réseau
      if (translationId !== 85) {
        const fallbackRes = await fetch(
          `https://api.quran.com/api/v4/quran/translations/85?chapter_number=${chapterNumber}`
        );
        const fallbackJson = await fallbackRes.json();
        return fallbackJson.translations || [];
      }
      return [];
    }
  }

  // Charger la liste des sourates selon la langue courante
  useEffect(() => {
    fetch(`https://api.quran.com/api/v4/chapters?language=${lang}`)
      .then((res) => res.json())
      .then((json) => setSourates(json.chapters))
      .catch(() => setSourates([]));
  }, [lang]);

  // Charger les versets, la translittération et la traduction selon la sourate et la langue
  useEffect(() => {
    async function fetchQuranData() {
      setLoading(true);
      try {
        // Fetch arabe (toujours même endpoint)
        const arabicRes = await fetch(
          `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${selectedSourate}`
        );
        const arabicJson = await arabicRes.json();

        // Fetch translittération (toujours id=57)
        const phoneticRes = await fetch(
          `https://api.quran.com/api/v4/quran/translations/57?chapter_number=${selectedSourate}`
        );
        const phoneticJson = await phoneticRes.json();

        // Fetch traduction avec fallback
        let translationJson = { translations: [] };
        if (lang !== "ar") {
          const translations = await fetchTranslation(selectedSourate, lang);
          translationJson.translations = translations;
        }

        setArabicVerses(arabicJson.verses || []);
        setPhoneticArr(phoneticJson.translations || []);
        setTranslationArr(translationJson.translations || []);
      } catch (error) {
        setArabicVerses([]);
        setPhoneticArr([]);
        setTranslationArr([]);
      }
      setLoading(false);
    }
    fetchQuranData();
  }, [selectedSourate, lang]);

  function stripHtml(text: string | undefined) {
    if (!text) return "";
    return text
      .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/(\.)(\d+)$/g, "$1")
      .trim();
  }

  if (loading)
    return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;
  if (!fontsLoaded) return null;

  const modalData = sourates.map((s) => ({
    key: s.id,
    label: `${s.id}. ${s.name_simple} (${s.name_arabic})`,
  }));

  function getSelectedSourateLabel() {
    const current = sourates.find((s) => s.id === selectedSourate);
    return current
      ? `${current.id}. ${current.name_simple} (${current.name_arabic})`
      : t("choose_sourate");
  }

  return (
    <ImageBackground
      source={require("../assets/images/parchment_bg.jpg")}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <ModalSelector
          data={modalData}
          onChange={(option) => setSelectedSourate(option.key)}
          initValue={getSelectedSourateLabel()}
          style={styles.modalSelector}
          selectStyle={styles.selectStyle}
          selectTextStyle={styles.selectTextStyle}
          optionStyle={styles.optionStyle}
          optionTextStyle={styles.optionTextStyle}
          cancelStyle={styles.cancelStyle}
          cancelTextStyle={styles.cancelTextStyle}
          backdropPressToClose={true}
          initValueTextStyle={styles.initValueTextStyle}
        />

        {/* N'affiche pas Bismillah pour sourate 9 */}
        {selectedSourate !== 9 && (
          <Text style={styles.bismillah}>{t("bismillah")}</Text>
        )}

        <FlatList
          data={arabicVerses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item, index }) => (
            <View style={styles.ayahContainer}>
              <View style={styles.arabicRow}>
                <Text style={styles.arabic}>{item.text_uthmani}</Text>
                <View style={styles.verseCircle}>
                  <Text style={styles.verseNumber}>
                    {item.verse_key.split(":")[1]}
                  </Text>
                </View>
              </View>

              <Text style={styles.phonetic}>
                {phoneticArr[index]?.text || ""}
              </Text>

              {lang !== "ar" && (
                <Text style={styles.traduction}>
                  {stripHtml(translationArr[index]?.text || "")}
                </Text>
              )}

              <Image
                source={require("../assets/images/ayah_separator.png")}
                style={styles.ayahSeparator}
                resizeMode="contain"
              />
            </View>
          )}
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  modalSelector: {
    marginTop: 70,
    marginBottom: 20,
    width: "100%",
  },
  selectStyle: {
    backgroundColor: "#e7c86a",
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderColor: "#ba9c34",
    borderWidth: 2,
    shadowColor: "#b59d42",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  initValueTextStyle: {
    fontSize: 18,
    color: "#fff",
    fontFamily: "ScheherazadeNew",
    textAlign: "left",
  },
  selectTextStyle: {
    fontSize: 18,
    color: "#483C1C",
    fontFamily: "ScheherazadeNew",
    textAlign: "left",
  },
  optionStyle: {
    backgroundColor: "#fffbe6",
    borderBottomWidth: 1,
    borderColor: "#e7c86a",
    padding: 12,
  },
  optionTextStyle: {
    fontSize: 18,
    color: "#444",
    fontFamily: "ScheherazadeNew",
    textAlign: "left",
  },
  cancelStyle: {
    backgroundColor: "#e7c86a",
    borderRadius: 12,
    marginTop: 10,
    borderColor: "#ba9c34",
    borderWidth: 2,
  },
  cancelTextStyle: {
    color: "#7c6720",
    fontSize: 17,
    fontWeight: "bold",
    fontFamily: "ScheherazadeNew",
  },
  ayahContainer: {
    marginVertical: 12,
    paddingVertical: 8,
  },
  arabic: {
    fontSize: 30,
    textAlign: "right",
    color: "#222",
    marginBottom: 8,
    fontFamily: "ScheherazadeNew",
    lineHeight: 60,
    flex: 1,
    flexShrink: 1,
  },
  phonetic: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#666",
    marginBottom: 2,
  },
  traduction: {
    fontSize: 16,
    textAlign: "left",
    color: "#338",
    marginBottom: 2,
  },
  ayahSeparator: {
    marginTop: 50,
    alignSelf: "center",
    width: 50,
    height: 50,
    marginVertical: 7,
  },
  bismillah: {
    textAlign: "center",
    color: "#7c6720",
    fontSize: 28,
    marginVertical: 12,
    fontFamily: "ScheherazadeNew",
    lineHeight: 44,
    letterSpacing: 1,
  },
  arabicRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 6,
  },
  verseCircle: {
    backgroundColor: "#e7c86a",
    borderRadius: 14,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#ba9c34",
    shadowColor: "#a0802a",
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  verseNumber: {
    color: "#6b510e",
    fontWeight: "bold",
    fontSize: 15,
    fontFamily: "ScheherazadeNew",
  },
});
