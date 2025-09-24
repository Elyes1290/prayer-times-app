import * as Font from "expo-font";
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { usePremium } from "../contexts/PremiumContext";
import FavoriteButton from "../components/FavoriteButton";
import { HadithFavorite } from "../contexts/FavoritesContext";
import { HadithOfflineService } from "../utils/hadithOfflineService";
import { OfflineMessage } from "../components/OfflineMessage";
import { useNetworkStatus, useOfflineAccess } from "../hooks/useNetworkStatus";

type Book = {
  id: number;
  bookName: string;
  bookSlug: string;
  category: "main" | "additional" | "specialized";
};
type Chapter = {
  id: number;
  bookId: number;
  arabic: string;
  english: string;
};

type Hadith = {
  id: number;
  idInBook: number;
  chapterId: number;
  bookId: number;
  arabic: string;
  english: {
    narrator: string;
    text: string;
  };
};

const PAGE_SIZE = 10;

export default function HadithScreen() {
  const { t } = useTranslation();
  const { user } = usePremium();

  // Fonction pour convertir un hadith en format favori
  const convertToFavorite = (
    item: Hadith,
    bookName: string,
    bookSlug: string,
    chapterId: number
  ): Omit<HadithFavorite, "id" | "dateAdded"> => {
    return {
      type: "hadith",
      bookSlug: bookSlug,
      bookName: bookName,
      chapterNumber: chapterId,
      hadithNumber: item.idInBook,
      arabicText: item.arabic || "",
      translation: item.english?.text || "",
      narrator: item.english?.narrator || "",
    };
  };
  const [menuVisible, setMenuVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"book" | "chapter">("book");
  const windowHeight = Dimensions.get("window").height;
  const flatListRef = useRef<FlatList>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingHadiths, setLoadingHadiths] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fontsLoaded] = Font.useFonts({
    ScheherazadeNew: require("../assets/fonts/ScheherazadeNew-Regular.ttf"),
  });

  // Utiliser les hooks de réseau pour une logique plus simple
  const offlineAccess = useOfflineAccess(!!user?.isPremium);

  // Fonction pour réessayer la connexion
  const handleRetry = () => {
    // En React Native, on peut juste déclencher un re-render
    // Les hooks de réseau se mettront à jour automatiquement
  };

  // Charger la liste des livres
  useEffect(() => {
    if (!offlineAccess.canAccessOffline) return;

    setLoadingBooks(true);

    try {
      const allBooksConfig = HadithOfflineService.getAllBooks();
      const allBooks: Book[] = [
        ...allBooksConfig.main.map((book) => ({
          id: book.id,
          bookName: book.name,
          bookSlug: book.slug,
          category: "main" as const,
        })),
        ...allBooksConfig.additional.map((book) => ({
          id: book.id,
          bookName: book.name,
          bookSlug: book.slug,
          category: "additional" as const,
        })),
        ...allBooksConfig.specialized.map((book) => ({
          id: book.id,
          bookName: book.name,
          bookSlug: book.slug,
          category: "specialized" as const,
        })),
      ];

      setBooks(allBooks);
      setLoadingBooks(false);
      console.log(
        `✅ ${allBooks.length} livres chargés (${allBooksConfig.main.length} principaux, ${allBooksConfig.additional.length} complémentaires, ${allBooksConfig.specialized.length} spécialisés)`
      );
    } catch (error) {
      console.error("❌ Erreur chargement livres:", error);
      setLoadingBooks(false);
    }
  }, [offlineAccess.canAccessOffline, t]);

  // Charger les chapitres du livre sélectionné
  useEffect(() => {
    setChapters([]);
    setHadiths([]);
    setSelectedChapter(null);
    setCurrentPage(1);
    setSearchQuery(""); // Réinitialiser la recherche

    if (!selectedBook || !offlineAccess.canAccessOffline) return;

    setLoadingChapters(true);

    HadithOfflineService.getChapters(selectedBook)
      .then((chapters) => {
        if (chapters) {
          setChapters(chapters);
          console.log(
            `✅ ${chapters.length} chapitres chargés pour ${selectedBook}`
          );
        } else {
          setChapters([]);
        }
        setLoadingChapters(false);
      })
      .catch((error) => {
        console.error("❌ Erreur chargement chapitres:", error);
        setChapters([]);
        setLoadingChapters(false);
      });
  }, [selectedBook, offlineAccess.canAccessOffline, t]);

  // Fonction pour charger les hadiths
  const loadHadiths = useCallback(
    async (page: number) => {
      if (
        !selectedBook ||
        selectedChapter === null ||
        !offlineAccess.canAccessOffline
      )
        return;

      setLoadingHadiths(true);

      try {
        const result = await HadithOfflineService.getHadiths(
          selectedBook,
          selectedChapter,
          page,
          PAGE_SIZE
        );

        if (result) {
          setHadiths(result.hadiths);
          setTotalPages(result.totalPages);
          console.log(
            `✅ ${result.hadiths.length} hadiths chargés (page ${result.currentPage}/${result.totalPages})`
          );
        } else {
          setHadiths([]);
          setTotalPages(1);
        }
      } catch (error) {
        console.error("❌ Erreur chargement hadiths:", error);
        setHadiths([]);
      } finally {
        setLoadingHadiths(false);
      }
    },
    [selectedBook, selectedChapter, offlineAccess.canAccessOffline]
  );

  // Charger les hadiths quand on change de livre ou chapitre
  useEffect(() => {
    setHadiths([]);
    setCurrentPage(1);
    loadHadiths(1);
  }, [
    selectedChapter,
    selectedBook,
    offlineAccess.canAccessOffline,
    t,
    loadHadiths,
  ]);

  // Charger les hadiths quand on change de page
  useEffect(() => {
    if (
      selectedBook &&
      selectedChapter !== null &&
      offlineAccess.canAccessOffline &&
      currentPage > 1
    ) {
      loadHadiths(currentPage);
    }
  }, [
    currentPage,
    selectedBook,
    selectedChapter,
    offlineAccess.canAccessOffline,
    loadHadiths,
  ]);

  // Fonction pour rechercher directement dans l'API
  // Fonction pour normaliser le texte (supprimer accents et caractères spéciaux)
  const normalizeText = (text: string): string => {
    if (!text) return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Supprimer les diacritiques latins
      .replace(/[ًٌٍَُِّْ]/g, "") // Supprimer les diacritiques arabes
      .replace(/[^\w\s]/g, " ") // Remplacer caractères spéciaux par espaces
      .replace(/\s+/g, " ") // Normaliser les espaces multiples
      .trim();
  };

  // Labels traduits
  function getSelectedBookLabel() {
    if (!selectedBook) return t("select_book");
    const found = books.find((b) => b.bookSlug === selectedBook);
    return found ? found.bookName : t("select_book");
  }

  function getSelectedChapterLabel() {
    if (selectedChapter === null) return t("select_chapter");
    const found = chapters.find((c) => c.id === selectedChapter);
    if (!found) return t("select_chapter");
    const english = found.english || "";
    const arabic = found.arabic || "";
    const id = found.id || "";
    return `${id}. ${english} ${arabic}`.trim();
  }

  const renderBookItem = ({ item }: { item: Book }) => (
    <TouchableOpacity
      style={[
        styles.optionStyle,
        selectedBook === item.bookSlug && styles.selectedOptionStyle,
      ]}
      onPress={() => {
        setSelectedBook(item.bookSlug);
        setModalVisible(false);
      }}
    >
      <Text
        style={[
          styles.optionTextStyle,
          selectedBook === item.bookSlug && styles.selectedOptionTextStyle,
        ]}
      >
        {item.bookName}
      </Text>
      <Text style={styles.categoryText}>
        {item.category === "main"
          ? `📚 ${t("book_category_main")}`
          : item.category === "additional"
          ? `➕ ${t("book_category_additional")}`
          : `⭐ ${t("book_category_specialized")}`}
      </Text>
    </TouchableOpacity>
  );

  const renderChapterItem = ({ item }: { item: Chapter }) => (
    <TouchableOpacity
      style={[
        styles.optionStyle,
        selectedChapter === item.id && styles.selectedOptionStyle,
      ]}
      onPress={() => {
        setSelectedChapter(item.id);
        setModalVisible(false);
      }}
    >
      <Text
        style={[
          styles.optionTextStyle,
          selectedChapter === item.id && styles.selectedOptionTextStyle,
        ]}
      >
        {`${item.id || ""}. ${item.english || ""} ${item.arabic || ""}`.trim()}
      </Text>
    </TouchableOpacity>
  );

  // Filtrer les hadiths du chapitre sélectionné selon la recherche
  const filteredHadiths = useMemo(() => {
    if (!searchQuery.trim()) {
      return hadiths;
    }

    const query = searchQuery.trim();

    // Vérifier si la recherche est un numéro pur (que des chiffres)
    const isNumberSearch = /^\d+$/.test(query);

    return hadiths.filter((hadith) => {
      if (isNumberSearch) {
        // Recherche par numéro exact uniquement
        const hadithNumber = hadith.idInBook?.toString() || "";
        return hadithNumber === query;
      } else {
        // Recherche textuelle dans le contenu arabe et anglais
        const normalizedQuery = normalizeText(query);
        const arabicText = normalizeText(hadith.arabic || "");
        const englishText = normalizeText(hadith.english.text || "");
        const narratorText = normalizeText(hadith.english.narrator || "");

        return (
          arabicText.includes(normalizedQuery) ||
          englishText.includes(normalizedQuery) ||
          narratorText.includes(normalizedQuery)
        );
      }
    });
  }, [hadiths, searchQuery]);

  if (!fontsLoaded) return null;
  if (loadingBooks)
    return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;

  // Afficher le message offline si nécessaire
  if (offlineAccess.shouldShowOfflineMessage) {
    return (
      <OfflineMessage
        onRetry={handleRetry}
        customMessage={t("hadith_offline_premium_only")}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require("../assets/images/parchment_bg.jpg")}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.container}>
          {/* Header avec bouton menu */}
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>
                {selectedBook ? getSelectedBookLabel() : t("select_book")}
              </Text>
              {selectedBook && selectedChapter !== null && (
                <Text style={styles.headerSubtitle}>
                  {getSelectedChapterLabel()}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuVisible(true)}
            >
              <Text style={styles.menuButtonText}>☰</Text>
            </TouchableOpacity>
          </View>

          {/* Barre de recherche */}
          {selectedBook && selectedChapter !== null && (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder={
                  t("hadith_search_placeholder") ||
                  t(
                    "hadith.search_placeholder",
                    "Rechercher par texte ou numéro de hadith..."
                  )
                }
                placeholderTextColor="#ba9c34"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
                selectionColor="#ba9c34"
                underlineColorAndroid="transparent"
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
            </View>
          )}

          {/* Indicateur de recherche */}
          {searchQuery.trim() && (
            <Text style={styles.searchInfo}>
              🔍 Résultats pour &quot;{searchQuery}&quot; (
              {filteredHadiths.length} résultat
              {filteredHadiths.length > 1 ? "s" : ""})
            </Text>
          )}

          {/* Sélecteur de pagination */}
          {selectedBook &&
            selectedChapter !== null &&
            !searchQuery.trim() &&
            totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    currentPage === 1 && styles.paginationButtonDisabled,
                  ]}
                  onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <Text
                    style={[
                      styles.paginationButtonText,
                      currentPage === 1 && styles.paginationButtonTextDisabled,
                    ]}
                  >
                    ‹
                  </Text>
                </TouchableOpacity>

                <View style={styles.paginationInfo}>
                  <Text style={styles.paginationText}>
                    {t("page")} {currentPage} / {totalPages}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    currentPage === totalPages &&
                      styles.paginationButtonDisabled,
                  ]}
                  onPress={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <Text
                    style={[
                      styles.paginationButtonText,
                      currentPage === totalPages &&
                        styles.paginationButtonTextDisabled,
                    ]}
                  >
                    ›
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          {/* Menu flottant */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={menuVisible}
            onRequestClose={() => setMenuVisible(false)}
          >
            <SafeAreaView style={styles.menuOverlay}>
              <View style={styles.menuContent}>
                <View style={styles.menuHeader}>
                  <Text style={styles.menuTitle}>{t("hadith_navigation")}</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setMenuVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Sélection livre */}
                <View style={styles.menuSection}>
                  <Text style={styles.menuSectionTitle}>
                    {t("select_book")}
                  </Text>
                  <TouchableOpacity
                    style={styles.menuOption}
                    onPress={() => {
                      setModalType("book");
                      setModalVisible(true);
                      // Ne pas fermer le menu, seulement ouvrir la modal de sélection
                    }}
                  >
                    <Text style={styles.menuOptionText}>
                      {getSelectedBookLabel()}
                    </Text>
                    <Text style={styles.menuArrow}>›</Text>
                  </TouchableOpacity>
                </View>

                {/* Sélection chapitre */}
                {selectedBook && (
                  <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>
                      {t("select_chapter")}
                    </Text>
                    {loadingChapters ? (
                      <ActivityIndicator style={styles.menuLoader} />
                    ) : (
                      <TouchableOpacity
                        style={styles.menuOption}
                        onPress={() => {
                          setModalType("chapter");
                          setModalVisible(true);
                          setMenuVisible(false); // Fermer le menu seulement après sélection du chapitre
                        }}
                      >
                        <Text style={styles.menuOptionText}>
                          {getSelectedChapterLabel()}
                        </Text>
                        <Text style={styles.menuArrow}>›</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </SafeAreaView>
          </Modal>

          {/* Modal pour la sélection */}
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
                  <Text style={styles.modalTitle}>
                    {modalType === "book"
                      ? t("select_book")
                      : t("select_chapter")}
                  </Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
                {modalType === "book" ? (
                  <FlatList
                    ref={flatListRef}
                    data={books}
                    renderItem={renderBookItem}
                    keyExtractor={(item) => item.bookSlug}
                    initialNumToRender={20}
                    maxToRenderPerBatch={20}
                    windowSize={10}
                    getItemLayout={(data, index) => ({
                      length: 50,
                      offset: 50 * index,
                      index,
                    })}
                  />
                ) : (
                  <FlatList
                    ref={flatListRef}
                    data={chapters}
                    renderItem={renderChapterItem}
                    keyExtractor={(item) =>
                      item.id?.toString() || `chapter-${Math.random()}`
                    }
                    initialNumToRender={20}
                    maxToRenderPerBatch={20}
                    windowSize={10}
                    getItemLayout={(data, index) => ({
                      length: 50,
                      offset: 50 * index,
                      index,
                    })}
                  />
                )}
              </View>
            </SafeAreaView>
          </Modal>

          {/* Liste hadiths */}
          {selectedBook &&
            selectedChapter !== null &&
            (loadingHadiths ? (
              <ActivityIndicator size="large" style={{ marginTop: 20 }} />
            ) : filteredHadiths.length === 0 ? (
              <Text style={{ marginTop: 10 }}>
                {searchQuery.trim()
                  ? t("no_search_results")
                  : t("no_hadith_found")}
              </Text>
            ) : (
              <FlatList
                data={filteredHadiths}
                keyExtractor={(item) =>
                  item.id?.toString() || `hadith-${Math.random()}`
                }
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={10}
                removeClippedSubviews={true}
                updateCellsBatchingPeriod={100}
                getItemLayout={(data, index) => ({
                  length: 200, // hauteur estimée d'un hadith
                  offset: 200 * index,
                  index,
                })}
                renderItem={({ item }) => {
                  const isBigNumber = Number(item.idInBook) > 999;

                  // Obtenir les informations nécessaires pour les favoris
                  const currentBook = books.find(
                    (b) => b.bookSlug === selectedBook
                  );
                  const bookName = currentBook
                    ? currentBook.bookName
                    : "Livre inconnu";
                  const bookSlug = currentBook
                    ? currentBook.bookSlug
                    : "unknown";
                  const chapterNumber = selectedChapter || 1;

                  return (
                    <View style={styles.ayahContainer}>
                      <View style={styles.arabicRow}>
                        <Text style={styles.arabic}>{item.arabic || "—"}</Text>
                        <View style={styles.hadithActions}>
                          <View
                            style={[
                              styles.verseCircle,
                              isBigNumber && {
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                              },
                            ]}
                          >
                            <Text style={styles.verseNumber}>
                              {item.idInBook || "—"}
                            </Text>
                          </View>
                          <FavoriteButton
                            favoriteData={convertToFavorite(
                              item,
                              bookName,
                              bookSlug,
                              chapterNumber
                            )}
                            size={20}
                            iconColor="#ba9c34"
                            iconColorActive="#FFD700"
                            style={styles.favoriteButton}
                          />
                        </View>
                      </View>
                      {item.english?.narrator && (
                        <Text style={styles.narrator}>
                          {item.english.narrator}
                        </Text>
                      )}
                      <Text style={styles.traduction}>
                        {item.english?.text && item.english.text.trim() !== ""
                          ? item.english.text
                          : t("translation_not_available")}
                      </Text>
                      <Image
                        source={require("../assets/images/ayah_separator.png")}
                        style={styles.ayahSeparator}
                        resizeMode="contain"
                      />
                    </View>
                  );
                }}
              />
            ))}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#523f13",
    fontFamily: "ScheherazadeNew",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#2c1810", // Couleur plus sombre pour meilleure visibilité
    fontFamily: "ScheherazadeNew",
    marginTop: 4,
    fontWeight: "500", // Légèrement plus gras
  },
  menuButton: {
    backgroundColor: "#e7c86a",
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#ba9c34",
    borderWidth: 2,
    shadowColor: "#b59d42",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  menuButtonText: {
    fontSize: 24,
    color: "#523f13",
    fontWeight: "bold",
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  menuContent: {
    backgroundColor: "#fffbe6",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e7c86a",
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#523f13",
    fontFamily: "ScheherazadeNew",
  },
  menuSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ba9c34",
    marginBottom: 12,
    fontFamily: "ScheherazadeNew",
  },
  menuOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    padding: 16,
    borderRadius: 12,
    borderColor: "#e7c86a",
    borderWidth: 1,
  },
  menuOptionText: {
    fontSize: 16,
    color: "#523f13",
    fontFamily: "ScheherazadeNew",
    flex: 1,
  },
  menuArrow: {
    fontSize: 20,
    color: "#ba9c34",
    marginLeft: 10,
  },
  menuLoader: {
    marginVertical: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fffbe6",
    borderRadius: 20,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e7c86a",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#523f13",
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#523f13",
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
    color: "#fff",
    fontFamily: "ScheherazadeNew",
    textAlign: "left",
  },
  optionStyle: {
    backgroundColor: "#fffbe6",
    borderBottomWidth: 1,
    borderColor: "#e7c86a",
    padding: 12,
  },
  selectedOptionStyle: {
    backgroundColor: "#e7c86a",
  },
  optionTextStyle: {
    fontSize: 18,
    color: "#444",
    fontFamily: "ScheherazadeNew",
    textAlign: "left",
  },
  selectedOptionTextStyle: {
    color: "#fff",
  },
  ayahContainer: {
    marginVertical: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.7,
    borderColor: "#e7c86a",
    paddingHorizontal: 5,
    borderRadius: 10,
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  arabic: {
    fontSize: 28,
    textAlign: "right",
    color: "#523f13",
    marginBottom: 8,
    fontFamily: "ScheherazadeNew",
    lineHeight: 48,
    flex: 1,
  },
  traduction: {
    fontSize: 16,
    textAlign: "left",
    color: "#338",
    marginBottom: 2,
    marginLeft: 2,
  },
  ayahSeparator: {
    marginTop: 50,
    alignSelf: "center",
    width: 50,
    height: 50,
    marginVertical: 7,
  },
  arabicRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  verseCircle: {
    backgroundColor: "#e7c86a",
    borderRadius: 13,
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
    fontSize: 14,
    fontFamily: "ScheherazadeNew",
  },
  unavailableMsg: {
    color: "red",
    backgroundColor: "#ffeaea",
    padding: 12,
    textAlign: "center",
    borderRadius: 7,
    fontWeight: "bold",
    marginVertical: 14,
    fontSize: 16,
  },
  searchContainer: {
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  searchInput: {
    height: 40,
    backgroundColor: "#fffbe6",
    borderRadius: 20,
    borderColor: "#ba9c34",
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 14,
    color: "#523f13",
    textAlign: "left",
    shadowColor: "#b59d42",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  searchButton: {
    backgroundColor: "#ba9c34",
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "#b59d42",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonText: {
    fontSize: 14,
    color: "#fff",
  },
  searchLoader: {
    position: "absolute",
    right: 15,
    top: "50%",
    marginTop: -10,
  },
  categoryText: {
    fontSize: 12,
    color: "#ba9c34",
    fontStyle: "italic",
    marginTop: 2,
  },
  narrator: {
    fontSize: 14,
    color: "#ba9c34",
    fontStyle: "italic",
    marginTop: 8,
    marginBottom: 4,
    textAlign: "left",
    fontWeight: "500",
  },
  searchInfo: {
    fontSize: 12,
    color: "#ba9c34",
    textAlign: "center",
    marginBottom: 8,
    fontStyle: "italic",
  },
  chapterHeader: {
    backgroundColor: "#e7c86a",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  chapterName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#523f13",
    textAlign: "center",
  },
  hadithActions: {
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  favoriteButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "rgba(186, 156, 52, 0.08)",
  },
  // Styles pour la pagination
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
    paddingHorizontal: 15,
  },
  paginationButton: {
    backgroundColor: "#e7c86a",
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#ba9c34",
    borderWidth: 1,
    shadowColor: "#b59d42",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  paginationButtonDisabled: {
    backgroundColor: "#f0f0f0",
    borderColor: "#d0d0d0",
    shadowOpacity: 0,
    elevation: 0,
  },
  paginationButtonText: {
    fontSize: 14,
    color: "#523f13",
    fontWeight: "bold",
  },
  paginationButtonTextDisabled: {
    color: "#999",
  },
  paginationInfo: {
    marginHorizontal: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    borderColor: "#e7c86a",
    borderWidth: 1,
  },
  paginationText: {
    fontSize: 12,
    color: "#523f13",
    fontFamily: "ScheherazadeNew",
    fontWeight: "500",
  },
});
