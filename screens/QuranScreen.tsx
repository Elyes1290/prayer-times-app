import * as Font from "expo-font";
import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Dimensions,
  TextInput,
} from "react-native";
import { useTranslation } from "react-i18next";
import FavoriteButton from "../components/FavoriteButton";
import { QuranVerseFavorite } from "../contexts/FavoritesContext";

export default function QuranScreen() {
  const { t, i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const windowHeight = Dimensions.get("window").height;

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
  const [searchQuery, setSearchQuery] = useState("");

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

  // Fonction pour normaliser le texte (supprimer accents et caractères spéciaux)
  function normalizeText(text: string) {
    return text
      .normalize("NFD") // Décompose les caractères accentués
      .replace(/[\u0300-\u036f]/g, "") // Supprime les diacritiques latins
      .replace(/[\u064B-\u0652]/g, "") // Supprime les diacritiques arabes (tashkeel)
      .replace(/[\u0653-\u065F]/g, "") // Supprime autres diacritiques arabes
      .replace(/[\u0670]/g, "") // Supprime alif khanjariyah
      .replace(/[\u06D6-\u06ED]/g, "") // Supprime les marques de récitation
      .replace(/[^\w\s\u0600-\u06FF\u0750-\u077F]/gi, "") // Garde seulement lettres, espaces et caractères arabes de base
      .toLowerCase()
      .trim();
  }

  // Fonction pour convertir un verset en format favori
  const convertToFavorite = (
    item: any,
    translationText: string,
    chapterName: string
  ): Omit<QuranVerseFavorite, "id" | "dateAdded"> => {
    return {
      type: "quran_verse",
      chapterNumber: selectedSourate,
      chapterName: chapterName,
      verseNumber: parseInt(item.verse_key.split(":")[1]),
      arabicText: item.text_uthmani,
      translation: stripHtml(translationText),
      transliteration: "", // Peut être ajouté plus tard si disponible
    };
  };

  // Filtrer les versets selon la recherche dans la sourate sélectionnée
  const filteredVerses = useMemo(() => {
    if (!searchQuery.trim()) {
      return arabicVerses;
    }

    // Rechercher uniquement dans la sourate sélectionnée avec normalisation
    const normalizedSearch = normalizeText(searchQuery);
    return arabicVerses.filter((verse, index) => {
      const phonetic = phoneticArr[index]?.text || "";
      const translation = translationArr[index]?.text || "";

      // Normaliser tous les textes pour la comparaison
      const normalizedArabic = normalizeText(verse.text_uthmani || "");
      const normalizedPhonetic = normalizeText(phonetic);
      const normalizedTranslation = normalizeText(stripHtml(translation));
      const normalizedVerseKey = normalizeText(verse.verse_key);

      return (
        normalizedArabic.includes(normalizedSearch) ||
        normalizedPhonetic.includes(normalizedSearch) ||
        normalizedTranslation.includes(normalizedSearch) ||
        normalizedVerseKey.includes(normalizedSearch)
      );
    });
  }, [searchQuery, arabicVerses, phoneticArr, translationArr]);

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

  const renderSourateItem = ({
    item,
  }: {
    item: { key: number; label: string };
  }) => (
    <TouchableOpacity
      style={[
        styles.optionStyle,
        selectedSourate === item.key && styles.selectedOptionStyle,
      ]}
      onPress={() => {
        setSelectedSourate(item.key);
        setModalVisible(false);
      }}
    >
      <Text
        style={[
          styles.optionTextStyle,
          selectedSourate === item.key && styles.selectedOptionTextStyle,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ImageBackground
      source={require("../assets/images/parchment_bg.jpg")}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.selectStyle}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.selectTextStyle}>
            {getSelectedSourateLabel()}
          </Text>
        </TouchableOpacity>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View
              style={[styles.modalContent, { maxHeight: windowHeight * 0.8 }]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("choose_sourate")}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                ref={flatListRef}
                data={modalData}
                renderItem={renderSourateItem}
                keyExtractor={(item) => item.key.toString()}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={10}
                getItemLayout={(data, index) => ({
                  length: 50,
                  offset: 50 * index,
                  index,
                })}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
              />
            </View>
          </SafeAreaView>
        </Modal>

        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={
              t("quran_search_placeholder") || "Rechercher dans la sourate..."
            }
            placeholderTextColor="#ba9c34"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* N'affiche pas Bismillah pour sourate 9 */}
        {selectedSourate !== 9 && (
          <Text style={styles.bismillah}>{t("bismillah")}</Text>
        )}

        <FlatList
          data={filteredVerses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item, index }) => {
            // Affichage normal d'une sourate
            const originalIndex = arabicVerses.findIndex(
              (v) => v.id === item.id
            );
            const phoneticText = phoneticArr[originalIndex]?.text || "";
            const translationText = translationArr[originalIndex]?.text || "";

            // Obtenir le nom de la sourate pour les favoris
            const currentSourate = sourates.find(
              (s) => s.id === selectedSourate
            );
            const chapterName = currentSourate
              ? currentSourate.name_simple
              : "Sourate inconnue";

            return (
              <View style={styles.ayahContainer}>
                <View style={styles.arabicRow}>
                  <Text style={styles.arabic}>{item.text_uthmani}</Text>
                  <View style={styles.verseActions}>
                    <View style={styles.verseCircle}>
                      <Text style={styles.verseNumber}>
                        {item.verse_key.split(":")[1]}
                      </Text>
                    </View>
                    <FavoriteButton
                      favoriteData={convertToFavorite(
                        item,
                        translationText,
                        chapterName
                      )}
                      size={20}
                      iconColor="#ba9c34"
                      iconColorActive="#FFD700"
                      style={styles.favoriteButtonCompact}
                    />
                  </View>
                </View>

                <Text style={styles.phonetic}>{phoneticText}</Text>

                {lang !== "ar" && (
                  <Text style={styles.traduction}>
                    {stripHtml(translationText)}
                  </Text>
                )}

                <Image
                  source={require("../assets/images/ayah_separator.png")}
                  style={styles.ayahSeparator}
                  resizeMode="contain"
                />
              </View>
            );
          }}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={100}
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 60, // Ajout d'un padding en haut pour descendre le bouton
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
  selectTextStyle: {
    fontSize: 18,
    color: "#483C1C",
    fontFamily: "ScheherazadeNew",
    textAlign: "left",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e7c86a",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#483C1C",
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: "#483C1C",
  },
  listContent: {
    paddingBottom: 20,
  },
  optionStyle: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedOptionStyle: {
    backgroundColor: "#fffbe6",
  },
  optionTextStyle: {
    fontSize: 18,
    color: "#444",
    fontFamily: "ScheherazadeNew",
  },
  selectedOptionTextStyle: {
    color: "#483C1C",
    fontWeight: "bold",
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
    justifyContent: "space-between",
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
  verseActions: {
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  favoriteButtonCompact: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "rgba(186, 156, 52, 0.08)",
  },
  searchInput: {
    backgroundColor: "#fffbe6",
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingRight: 50, // Espace pour le loader
    borderColor: "#ba9c34",
    borderWidth: 2,
    fontSize: 16,
    color: "#523f13",
    shadowColor: "#b59d42",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sourateHeader: {
    backgroundColor: "rgba(231, 200, 106, 0.2)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#e7c86a",
  },
  sourateName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#7c6720",
    textAlign: "center",
    fontFamily: "ScheherazadeNew",
  },
  searchContainer: {
    position: "relative",
    marginBottom: 16,
  },
  searchLoader: {
    position: "absolute",
    right: 15,
    top: "50%",
    marginTop: -10,
  },
  searchInfo: {
    fontSize: 14,
    color: "#7c6720",
    textAlign: "center",
    marginBottom: 12,
    fontStyle: "italic",
  },
});
