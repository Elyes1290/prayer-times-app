import * as Font from "expo-font";
import React, { useEffect, useState, useRef } from "react";
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
} from "react-native";
import { useTranslation } from "react-i18next";

type Book = { id: number; bookName: string; bookSlug: string };
type Chapter = {
  id: number;
  chapterNumber: string;
  chapterEnglish: string;
  chapterArabic?: string;
  bookSlug?: string;
};

type Hadith = {
  id: number;
  hadithNumber: string | number;
  hadithEnglish: string;
  hadithArabic?: string;
  [key: string]: any;
};

const API_KEY = "$2y$10$doCdBLfM0jONj1evceyDyuFQYeUBzyQsh9NL2sRIuT9wt8GKsXaa";
const PAGE_SIZE = 10;

export default function HadithScreen() {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"book" | "chapter">("book");
  const windowHeight = Dimensions.get("window").height;
  const flatListRef = useRef<FlatList>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingHadiths, setLoadingHadiths] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unavailableBooks = ["musnad-ahmad", "al-silsila-sahiha"];

  const [fontsLoaded] = Font.useFonts({
    ScheherazadeNew: require("../assets/fonts/ScheherazadeNew-Regular.ttf"),
  });

  // Charger la liste des livres
  useEffect(() => {
    setLoadingBooks(true);
    fetch(`https://hadithapi.com/api/books?apiKey=${API_KEY}`)
      .then((res) => res.json())
      .then((data) => {
        setBooks(data.books || []);
        setLoadingBooks(false);
      })
      .catch(() => setLoadingBooks(false));
  }, []);

  // Charger les chapitres du livre sélectionné
  useEffect(() => {
    setChapters([]);
    setHadiths([]);
    setSelectedChapter("");
    setCurrentPage(1);
    setTotalPages(1);
    setError(null);

    if (!selectedBook) return;

    setLoadingChapters(true);
    fetch(
      `https://hadithapi.com/api/${selectedBook}/chapters?apiKey=${API_KEY}`
    )
      .then((res) => res.json())
      .then((data) => {
        setChapters(data.chapters || []);
        setLoadingChapters(false);
      })
      .catch(() => {
        setChapters([]);
        setLoadingChapters(false);
      });
  }, [selectedBook]);

  // Charger les hadiths du chapitre sélectionné
  useEffect(() => {
    setHadiths([]);
    setCurrentPage(1);
    setTotalPages(1);
    setError(null);

    if (!selectedBook || selectedChapter === "") return;

    setLoadingHadiths(true);
    fetch(
      `https://hadithapi.com/api/hadiths?apiKey=${API_KEY}&book=${selectedBook}&chapter=${selectedChapter}&page=${currentPage}&limit=${PAGE_SIZE}`
    )
      .then((res) => res.json())
      .then((data) => {
        const list = (data.hadiths && data.hadiths.data) || [];
        setHadiths(list);
        setTotalPages(data.hadiths?.last_page || 1);
        setLoadingHadiths(false);
      })
      .catch(() => {
        setHadiths([]);
        setLoadingHadiths(false);
        setError(t("no_hadith_found_or_connection_error"));
      });
  }, [selectedChapter, selectedBook, currentPage]);

  // Labels traduits
  function getSelectedBookLabel() {
    if (!selectedBook) return t("select_book");
    const found = books.find((b) => b.bookSlug === selectedBook);
    return found ? found.bookName : t("select_book");
  }

  function getSelectedChapterLabel() {
    if (!selectedChapter) return t("select_chapter");
    const found = chapters.find((c) => c.chapterNumber === selectedChapter);
    if (!found) return t("select_chapter");
    return `${found.chapterNumber}. ${found.chapterEnglish || ""} ${
      found.chapterArabic || ""
    }`.trim();
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
    </TouchableOpacity>
  );

  const renderChapterItem = ({ item }: { item: Chapter }) => (
    <TouchableOpacity
      style={[
        styles.optionStyle,
        selectedChapter === item.chapterNumber && styles.selectedOptionStyle,
      ]}
      onPress={() => {
        setSelectedChapter(item.chapterNumber);
        setModalVisible(false);
      }}
    >
      <Text
        style={[
          styles.optionTextStyle,
          selectedChapter === item.chapterNumber &&
            styles.selectedOptionTextStyle,
        ]}
      >
        {`${item.chapterNumber}. ${item.chapterEnglish || ""} ${
          item.chapterArabic || ""
        }`.trim()}
      </Text>
    </TouchableOpacity>
  );

  if (!fontsLoaded) return null;
  if (loadingBooks)
    return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;

  return (
    <ImageBackground
      source={require("../assets/images/parchment_bg.jpg")}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        {/* Sélecteur livre */}
        <TouchableOpacity
          style={styles.selectStyle}
          onPress={() => {
            setModalType("book");
            setModalVisible(true);
          }}
        >
          <Text style={styles.selectTextStyle}>{getSelectedBookLabel()}</Text>
        </TouchableOpacity>

        {unavailableBooks.includes(selectedBook) && (
          <Text style={styles.unavailableMsg}>{t("book_unavailable")}</Text>
        )}

        {/* Sélecteur chapitre */}
        {selectedBook && !unavailableBooks.includes(selectedBook) && (
          <>
            {loadingChapters ? (
              <ActivityIndicator />
            ) : (
              <TouchableOpacity
                style={styles.selectStyle}
                onPress={() => {
                  setModalType("chapter");
                  setModalVisible(true);
                }}
              >
                <Text style={styles.selectTextStyle}>
                  {getSelectedChapterLabel()}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

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
                  keyExtractor={(item) => item.chapterNumber}
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
          selectedChapter &&
          !unavailableBooks.includes(selectedBook) &&
          (loadingHadiths ? (
            <ActivityIndicator size="large" style={{ marginTop: 20 }} />
          ) : hadiths.length === 0 ? (
            <Text style={{ marginTop: 10 }}>{t("no_hadith_found")}</Text>
          ) : (
            <FlatList
              data={hadiths}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isBigNumber = Number(item.hadithNumber) > 999;
                return (
                  <View style={styles.ayahContainer}>
                    <View style={styles.arabicRow}>
                      <Text style={styles.arabic}>
                        {item.hadithArabic || "—"}
                      </Text>
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
                          {item.hadithNumber}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.traduction}>
                      {item.hadithEnglish && item.hadithEnglish.trim() !== ""
                        ? item.hadithEnglish
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 60,
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
    justifyContent: "flex-end",
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
});
