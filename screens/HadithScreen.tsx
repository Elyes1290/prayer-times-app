import * as Font from "expo-font";
import React, {
  useEffect,
  useReducer,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  useWindowDimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { usePremium } from "../contexts/PremiumContext";
import FavoriteButton from "../components/FavoriteButton";
import { HadithFavorite } from "../contexts/FavoritesContext";
import CachedImageBackground from "../components/CachedImageBackground";
import { HadithOfflineService } from "../utils/hadithOfflineService";
import { OfflineMessage } from "../components/OfflineMessage";
import { useNetworkStatus, useOfflineAccess } from "../hooks/useNetworkStatus";
import { useUpdateUserStats } from "../hooks/useUpdateUserStats";

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

// ─── Reducer ───────────────────────────────────────────────────────────────

type HadithState = {
  menuVisible: boolean;
  modalVisible: boolean;
  modalType: "book" | "chapter";
  menuView: "main" | "bookList" | "chapterList";
  books: Book[];
  selectedBook: string;
  chapters: Chapter[];
  selectedChapter: number | null;
  hadiths: Hadith[];
  currentPage: number;
  totalPages: number;
  loadingBooks: boolean;
  loadingChapters: boolean;
  loadingHadiths: boolean;
  searchQuery: string;
};

type HadithAction =
  | { type: "MENU_OPEN" }
  | { type: "MENU_CLOSE" }
  | { type: "MENU_SET_VIEW"; payload: "main" | "bookList" | "chapterList" }
  | { type: "MODAL_OPEN"; payload: "book" | "chapter" }
  | { type: "MODAL_CLOSE" }
  | { type: "BOOKS_LOADING" }
  | { type: "BOOKS_LOADED"; payload: Book[] }
  | { type: "BOOKS_ERROR" }
  | { type: "BOOK_SELECT"; payload: string }
  | { type: "CHAPTERS_LOADING" }
  | { type: "CHAPTERS_LOADED"; payload: Chapter[] }
  | { type: "CHAPTERS_ERROR" }
  | { type: "CHAPTER_SELECT"; payload: number }
  | { type: "HADITHS_RESET_LOADING" }
  | { type: "HADITHS_LOADING" }
  | { type: "HADITHS_LOADED"; payload: { hadiths: Hadith[]; totalPages: number } }
  | { type: "HADITHS_ERROR" }
  | { type: "PAGE_SET"; payload: number }
  | { type: "SEARCH_SET"; payload: string };

const initialHadithState: HadithState = {
  menuVisible: false,
  modalVisible: false,
  modalType: "book",
  menuView: "main",
  books: [],
  selectedBook: "",
  chapters: [],
  selectedChapter: null,
  hadiths: [],
  currentPage: 1,
  totalPages: 1,
  loadingBooks: false,
  loadingChapters: false,
  loadingHadiths: false,
  searchQuery: "",
};

function hadithReducer(state: HadithState, action: HadithAction): HadithState {
  switch (action.type) {
    case "MENU_OPEN":
      return { ...state, menuVisible: true };
    case "MENU_CLOSE":
      return { ...state, menuVisible: false, menuView: "main" };
    case "MENU_SET_VIEW":
      return { ...state, menuView: action.payload };
    case "MODAL_OPEN":
      return { ...state, modalVisible: true, modalType: action.payload };
    case "MODAL_CLOSE":
      return { ...state, modalVisible: false };
    case "BOOKS_LOADING":
      return { ...state, loadingBooks: true };
    case "BOOKS_LOADED":
      return { ...state, books: action.payload, loadingBooks: false };
    case "BOOKS_ERROR":
      return { ...state, loadingBooks: false };
    case "BOOK_SELECT":
      return {
        ...state,
        selectedBook: action.payload,
        modalVisible: false,
        menuView: "main",
        chapters: [],
        hadiths: [],
        selectedChapter: null,
        currentPage: 1,
        searchQuery: "",
      };
    case "CHAPTERS_LOADING":
      return { ...state, loadingChapters: true };
    case "CHAPTERS_LOADED":
      return { ...state, chapters: action.payload, loadingChapters: false };
    case "CHAPTERS_ERROR":
      return { ...state, chapters: [], loadingChapters: false };
    case "CHAPTER_SELECT":
      return { ...state, selectedChapter: action.payload, modalVisible: false };
    case "HADITHS_RESET_LOADING":
      return { ...state, hadiths: [], currentPage: 1, loadingHadiths: true };
    case "HADITHS_LOADING":
      return { ...state, loadingHadiths: true };
    case "HADITHS_LOADED":
      return {
        ...state,
        hadiths: action.payload.hadiths,
        totalPages: action.payload.totalPages,
        loadingHadiths: false,
      };
    case "HADITHS_ERROR":
      return { ...state, hadiths: [], loadingHadiths: false };
    case "PAGE_SET":
      return { ...state, currentPage: action.payload };
    case "SEARCH_SET":
      return { ...state, searchQuery: action.payload };
    default:
      return state;
  }
}

function convertToFavorite(
  item: Hadith,
  bookName: string,
  bookSlug: string,
  chapterId: number
): Omit<HadithFavorite, "id" | "dateAdded"> {
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
}

function normalizeHadithText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ًٌٍَُِّْ]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const handleRetry = () => {
  // En React Native, on peut juste déclencher un re-render
  // Les hooks de réseau se mettront à jour automatiquement
};

type HadithListItemProps = {
  item: Hadith;
  bookName: string;
  bookSlug: string;
  chapterNumber: number;
  t: (key: string, fallback?: string) => string;
};

const HadithListItem = React.memo(function HadithListItem({
  item,
  bookName,
  bookSlug,
  chapterNumber,
  t,
}: HadithListItemProps) {
  const isBigNumber = Number(item.idInBook) > 999;
  const { recordHadithRead } = useUpdateUserStats();
  const hasRecordedRef = useRef(false);

  useEffect(() => {
    if (hasRecordedRef.current) return;
    hasRecordedRef.current = true;
    void recordHadithRead(
      `${bookSlug}-${chapterNumber}-${item.idInBook}`,
      bookName,
    );
  }, [bookSlug, chapterNumber, item.idInBook, bookName, recordHadithRead]);

  return (
    <View style={styles.ayahContainer}>
      <View style={styles.arabicRow}>
        <Text style={styles.arabic}>{item.arabic || "—"}</Text>
        <View style={styles.hadithActions}>
          <View
            style={[
              styles.verseCircle,
              isBigNumber && styles.verseCircleLarge,
            ]}
          >
            <Text style={styles.verseNumber}>{item.idInBook || "—"}</Text>
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
        <Text style={styles.narrator}>{item.english.narrator}</Text>
      )}
      <Text style={styles.traduction}>
        {item.english?.text && item.english.text.trim() !== ""
          ? item.english.text
          : t("translation_not_available")}
      </Text>
      <Image
        source={require("../assets/images/ayah_separator.png")}
        style={styles.ayahSeparator}
        contentFit="contain"
      />
    </View>
  );
});

export default function HadithScreen() {
  const { t } = useTranslation();
  const { user } = usePremium();

  const [state, dispatch] = useReducer(hadithReducer, initialHadithState);
  const {
    menuVisible,
    modalVisible,
    modalType,
    menuView,
    books,
    selectedBook,
    chapters,
    selectedChapter,
    hadiths,
    currentPage,
    totalPages,
    loadingBooks,
    loadingChapters,
    loadingHadiths,
    searchQuery,
  } = state;

  const { height: windowHeight } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const [fontsLoaded] = Font.useFonts({
    ScheherazadeNew: require("../assets/fonts/ScheherazadeNew-Regular.ttf"),
  });

  // Utiliser les hooks de réseau pour une logique plus simple
  const offlineAccess = useOfflineAccess(!!user?.isPremium);

  // 🍎 iOS: Fonctions pour gérer les sélections depuis le menu
  const handleBookChange = useCallback((bookSlug: string) => {
    dispatch({ type: "BOOK_SELECT", payload: bookSlug });
  }, []);

  const handleChapterChange = useCallback((chapterId: number) => {
    dispatch({ type: "CHAPTER_SELECT", payload: chapterId });
  }, []);

  // Charger la liste des livres
  useEffect(() => {
    dispatch({ type: "BOOKS_LOADING" });
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
      dispatch({ type: "BOOKS_LOADED", payload: allBooks });
    } catch (error) {
      dispatch({ type: "BOOKS_ERROR" });
    }
  }, [t]);

  // Charger les chapitres du livre sélectionné (reset géré par BOOK_SELECT dans le reducer)
  useEffect(() => {
    if (!selectedBook) return;
    dispatch({ type: "CHAPTERS_LOADING" });
    HadithOfflineService.getChapters(selectedBook)
      .then((chaps) => {
        dispatch({ type: chaps ? "CHAPTERS_LOADED" : "CHAPTERS_ERROR", payload: chaps ?? [] } as HadithAction);
      })
      .catch(() => {
        dispatch({ type: "CHAPTERS_ERROR" });
      });
  }, [selectedBook]);

  // Fonction pour charger les hadiths
  const loadHadiths = useCallback(
    async (page: number) => {
      if (!selectedBook || selectedChapter === null) return;

      // Bloquer seulement si hors ligne ET non-premium
      if (offlineAccess.shouldShowOfflineMessage) {
        console.log("⚠️ Accès hadiths bloqué : hors ligne sans premium");
        return;
      }

      dispatch({ type: "HADITHS_LOADING" });
      try {
        const result = await HadithOfflineService.getHadiths(
          selectedBook,
          selectedChapter,
          page,
          PAGE_SIZE
        );
        if (result) {
          dispatch({ type: "HADITHS_LOADED", payload: { hadiths: result.hadiths, totalPages: result.totalPages } });
        } else {
          dispatch({ type: "HADITHS_ERROR" });
        }
      } catch (error) {
        dispatch({ type: "HADITHS_ERROR" });
      }
    },
    [selectedBook, selectedChapter, offlineAccess.shouldShowOfflineMessage]
  );

  // Charger les hadiths quand on change de chapitre
  useEffect(() => {
    dispatch({ type: "HADITHS_RESET_LOADING" });
    loadHadiths(1);
  }, [
    selectedChapter,
    selectedBook,
    offlineAccess.shouldShowOfflineMessage,
    t,
    loadHadiths,
  ]);

  // Charger les hadiths quand on change de page
  useEffect(() => {
    if (
      selectedBook &&
      selectedChapter !== null &&
      !offlineAccess.shouldShowOfflineMessage && // En ligne OU premium
      currentPage > 1
    ) {
      loadHadiths(currentPage);
    }
  }, [
    currentPage,
    selectedBook,
    selectedChapter,
    offlineAccess.shouldShowOfflineMessage,
    loadHadiths,
  ]);

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

  const renderBookItem = useCallback(
    ({ item }: { item: Book }) => (
      <Pressable
        style={[
          styles.optionStyle,
          selectedBook === item.bookSlug && styles.selectedOptionStyle,
        ]}
        onPress={() => dispatch({ type: "BOOK_SELECT", payload: item.bookSlug })}
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
      </Pressable>
    ),
    [selectedBook, t]
  );

  const renderChapterItem = useCallback(
    ({ item }: { item: Chapter }) => (
      <Pressable
        style={[
          styles.optionStyle,
          selectedChapter === item.id && styles.selectedOptionStyle,
        ]}
        onPress={() => dispatch({ type: "CHAPTER_SELECT", payload: item.id })}
      >
        <Text
          style={[
            styles.optionTextStyle,
            selectedChapter === item.id && styles.selectedOptionTextStyle,
          ]}
        >
          {`${item.id || ""}. ${item.english || ""} ${item.arabic || ""}`.trim()}
        </Text>
      </Pressable>
    ),
    [selectedChapter]
  );

  const renderIosBookMenuItem = useCallback(
    ({ item }: { item: Book }) => (
      <Pressable
        style={[
          styles.menuOption,
          selectedBook === item.bookSlug && styles.selectedOptionStyle,
        ]}
        onPress={() => handleBookChange(item.bookSlug)}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.menuOptionText}>{item.bookName}</Text>
          <Text style={styles.menuOptionSubtitle}>
            {item.category === "main"
              ? t("book_category_main", "Principal")
              : item.category === "additional"
                ? t("book_category_additional", "Complémentaire")
                : t("book_category_specialized", "Spécialisé")}
          </Text>
        </View>
        {selectedBook === item.bookSlug && (
          <Text style={styles.checkMark}>✓</Text>
        )}
      </Pressable>
    ),
    [selectedBook, handleBookChange, t]
  );

  const renderIosChapterMenuItem = useCallback(
    ({ item }: { item: Chapter }) => (
      <Pressable
        style={[
          styles.menuOption,
          selectedChapter === item.id && styles.selectedOptionStyle,
        ]}
        onPress={() => {
          handleChapterChange(item.id);
          dispatch({ type: "MENU_CLOSE" });
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.menuOptionText}>
            {`${item.id || ""}. ${item.english || ""} ${item.arabic || ""}`.trim()}
          </Text>
        </View>
        {selectedChapter === item.id && (
          <Text style={styles.checkMark}>✓</Text>
        )}
      </Pressable>
    ),
    [selectedChapter, handleChapterChange]
  );

  const hadithBookMeta = useMemo(() => {
    const currentBook = books.find((b) => b.bookSlug === selectedBook);
    return {
      bookName: currentBook?.bookName ?? "Livre inconnu",
      bookSlug: currentBook?.bookSlug ?? "unknown",
      chapterNumber: selectedChapter ?? 1,
    };
  }, [books, selectedBook, selectedChapter]);

  const renderHadithItem = useCallback(
    ({ item }: { item: Hadith }) => (
      <HadithListItem
        item={item}
        bookName={hadithBookMeta.bookName}
        bookSlug={hadithBookMeta.bookSlug}
        chapterNumber={hadithBookMeta.chapterNumber}
        t={t}
      />
    ),
    [hadithBookMeta, t]
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
        const normalizedQuery = normalizeHadithText(query);
        const arabicText = normalizeHadithText(hadith.arabic || "");
        const englishText = normalizeHadithText(hadith.english.text || "");
        const narratorText = normalizeHadithText(hadith.english.narrator || "");

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
      <CachedImageBackground
        source={require("../assets/images/parchment_bg.jpg")}
        style={StyleSheet.absoluteFillObject}
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
            <Pressable
              style={styles.menuButton}
              onPress={() => dispatch({ type: "MENU_OPEN" })}
            >
              <Text style={styles.menuButtonText}>☰</Text>
            </Pressable>
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
                onChangeText={(text) => dispatch({ type: "SEARCH_SET", payload: text })}
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
                <Pressable
                  style={[
                    styles.paginationButton,
                    currentPage === 1 && styles.paginationButtonDisabled,
                  ]}
                  onPress={() => dispatch({ type: "PAGE_SET", payload: Math.max(1, currentPage - 1) })}
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
                </Pressable>

                <View style={styles.paginationInfo}>
                  <Text style={styles.paginationText}>
                    {t("page")} {currentPage} / {totalPages}
                  </Text>
                </View>

                <Pressable
                  style={[
                    styles.paginationButton,
                    currentPage === totalPages &&
                      styles.paginationButtonDisabled,
                  ]}
                  onPress={() =>
                    dispatch({ type: "PAGE_SET", payload: Math.min(totalPages, currentPage + 1) })
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
                </Pressable>
              </View>
            )}

          {/* Menu flottant */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={menuVisible}
            onRequestClose={() => dispatch({ type: "MENU_CLOSE" })}
          >
            <SafeAreaView style={styles.menuOverlay}>
              <View style={styles.menuContent}>
                <View style={styles.menuHeader}>
                  {/* 🍎 iOS: Bouton retour si on est dans une sous-vue */}
                  {Platform.OS === 'ios' && menuView !== 'main' && (
                    <Pressable
                      style={styles.backButton}
                      onPress={() => dispatch({ type: "MENU_SET_VIEW", payload: "main" })}
                    >
                      <Text style={styles.backButtonText}>‹ {t("back", "Retour")}</Text>
                    </Pressable>
                  )}
                  <Text style={styles.menuTitle}>
                    {Platform.OS === 'ios' && menuView === 'bookList' 
                      ? t("select_book")
                      : Platform.OS === 'ios' && menuView === 'chapterList'
                      ? t("select_chapter")
                      : t("hadith_navigation")}
                  </Text>
                  <Pressable
                    style={styles.closeButton}
                    onPress={() => dispatch({ type: "MENU_CLOSE" })}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </Pressable>
                </View>

                {/* 🍎 iOS: Affichage conditionnel selon la vue */}
                {Platform.OS === 'ios' ? (
                  <>
                    {menuView === 'main' && (
                      <>
                        {/* Sélection livre */}
                        <View style={styles.menuSection}>
                          <Text style={styles.menuSectionTitle}>
                            {t("select_book")}
                          </Text>
                          <Pressable
                            style={styles.menuOption}
                            onPress={() => dispatch({ type: "MENU_SET_VIEW", payload: "bookList" })}
                          >
                            <Text style={styles.menuOptionText}>
                              {getSelectedBookLabel()}
                            </Text>
                            <Text style={styles.menuArrow}>›</Text>
                          </Pressable>
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
                              <Pressable
                                style={styles.menuOption}
                                onPress={() => dispatch({ type: "MENU_SET_VIEW", payload: "chapterList" })}
                              >
                                <Text style={styles.menuOptionText}>
                                  {getSelectedChapterLabel()}
                                </Text>
                                <Text style={styles.menuArrow}>›</Text>
                              </Pressable>
                            )}
                          </View>
                        )}
                      </>
                    )}

                    {menuView === 'bookList' && (
                      <FlatList
                        data={books}
                        keyExtractor={(item) => item.bookSlug}
                        renderItem={renderIosBookMenuItem}
                      />
                    )}

                    {menuView === 'chapterList' && (
                      <FlatList
                        data={chapters}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderIosChapterMenuItem}
                      />
                    )}
                  </>
                ) : (
                  /* 🤖 Android: Comportement original */
                  <>
                    {/* Sélection livre */}
                    <View style={styles.menuSection}>
                      <Text style={styles.menuSectionTitle}>
                        {t("select_book")}
                      </Text>
                      <Pressable
                        style={styles.menuOption}
                        onPress={() => dispatch({ type: "MODAL_OPEN", payload: "book" })}
                      >
                        <Text style={styles.menuOptionText}>
                          {getSelectedBookLabel()}
                        </Text>
                        <Text style={styles.menuArrow}>›</Text>
                      </Pressable>
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
                          <Pressable
                            style={styles.menuOption}
                            onPress={() => dispatch({ type: "MODAL_OPEN", payload: "chapter" })}
                          >
                            <Text style={styles.menuOptionText}>
                              {getSelectedChapterLabel()}
                            </Text>
                            <Text style={styles.menuArrow}>›</Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
            </SafeAreaView>
          </Modal>

          {/* Modal pour la sélection */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => dispatch({ type: "MODAL_CLOSE" })}
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
                  <Pressable
                    style={styles.closeButton}
                    onPress={() => dispatch({ type: "MODAL_CLOSE" })}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </Pressable>
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
                    keyExtractor={(item, index) =>
                      item.id?.toString() || `chapter-${index}`
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
                keyExtractor={(item, index) =>
                  item.id?.toString() || `hadith-${index}`
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
                renderItem={renderHadithItem}
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
    boxShadow: "0px 2px 8px rgba(181,157,66,0.3)",
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
  menuOptionSubtitle: {
    fontSize: 12,
    color: "#8b7355",
    fontStyle: "italic",
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 20,
    color: "#ba9c34",
    marginLeft: 10,
  },
  backButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 10,
  },
  backButtonText: {
    fontSize: 18,
    color: "#ba9c34",
    fontWeight: "600",
  },
  checkMark: {
    fontSize: 18,
    color: "#ba9c34",
    marginLeft: 10,
    fontWeight: "bold",
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
    boxShadow: "0px 2px 4px rgba(0,0,0,0.25)",
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
    boxShadow: "0px 2px 8px rgba(181,157,66,0.3)",
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
    boxShadow: "0px 1px 2px rgba(160,128,42,0.12)",
  },
  verseCircleLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    boxShadow: "0px 1px 4px rgba(181,157,66,0.2)",
  },
  searchButton: {
    backgroundColor: "#ba9c34",
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    boxShadow: "0px 1px 4px rgba(181,157,66,0.2)",
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
    boxShadow: "0px 1px 3px rgba(181,157,66,0.2)",
  },
  paginationButtonDisabled: {
    backgroundColor: "#f0f0f0",
    borderColor: "#d0d0d0",
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
