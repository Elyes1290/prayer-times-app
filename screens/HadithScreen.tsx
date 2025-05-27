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
import ModalSelector from "react-native-modal-selector";
import { useTranslation } from "react-i18next";

type Book = { id: number; bookName: string; bookSlug: string };
type LocalChapter = {
  number: number;
  english: string;
  arabic: string;
  from: number;
  to: number;
};
type Hadith = {
  id: number;
  hadithNumber: string | number;
  hadithEnglish: string;
  hadithArabic?: string;
  [key: string]: any;
};

import * as hadithMappings from "../src/hadith-mapping";
const chapterMappings: Record<string, LocalChapter[]> = {
  "sahih-bukhari": hadithMappings.bukhariChapters,
  "sahih-muslim": hadithMappings.muslimChapters,
  "al-tirmidhi": hadithMappings.tirmidhiChapters,
  "abu-dawood": hadithMappings.abudawoodChapters,
  "sunan-nasai": hadithMappings.nasaiChapters,
  "ibn-e-majah": hadithMappings.ibnmajahChapters,
  mishkat: hadithMappings.mishkatChapters,
  "musnad-ahmad": hadithMappings.musnadAhmadChapters,
};

const API_KEY = "$2y$10$doCdBLfM0jONj1evceyDyuFQYeUBzyQsh9NL2sRIuT9wt8GKsXaa";
const PAGE_SIZE = 10;

export default function HadithScreen() {
  const { t } = useTranslation();

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [chapters, setChapters] = useState<LocalChapter[]>([]);
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

    if (chapterMappings[selectedBook]) {
      setChapters(chapterMappings[selectedBook]);
    } else {
      setLoadingChapters(true);
      fetch(
        `https://hadithapi.com/api/chapters?apiKey=${API_KEY}&book=${selectedBook}`
      )
        .then((res) => res.json())
        .then((data) => {
          setChapters((data.chapters && data.chapters.data) || []);
          setLoadingChapters(false);
        })
        .catch(() => {
          setChapters([]);
          setLoadingChapters(false);
        });
    }
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
    const found = chapters.find((c) => c.number.toString() === selectedChapter);
    if (!found) return t("select_chapter");
    return `${found.number}. ${found.english} ${found.arabic}`.trim();
  }

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
        <ModalSelector
          data={books.map((book) => ({
            key: book.bookSlug,
            label: book.bookName,
          }))}
          onChange={(option) => {
            setSelectedBook(option.key);
            setError(null);
          }}
          initValue={getSelectedBookLabel()}
          style={styles.modalSelector}
          selectStyle={styles.selectStyle}
          selectTextStyle={styles.selectTextStyle}
          initValueTextStyle={styles.selectTextStyle}
          optionStyle={styles.optionStyle}
          optionTextStyle={styles.optionTextStyle}
          cancelStyle={styles.cancelStyle}
          cancelTextStyle={styles.cancelTextStyle}
          backdropPressToClose={true}
        />

        {unavailableBooks.includes(selectedBook) && (
          <Text style={styles.unavailableMsg}>{t("book_unavailable")}</Text>
        )}

        {/* Sélecteur chapitre */}
        {selectedBook && !unavailableBooks.includes(selectedBook) && (
          <>
            {loadingChapters ? (
              <ActivityIndicator />
            ) : (
              <ModalSelector
                data={chapters.map((chapter) => ({
                  key: chapter.number.toString(),
                  label:
                    `${chapter.number}. ${chapter.english} ${chapter.arabic}`.trim(),
                }))}
                onChange={(option) => {
                  setSelectedChapter(option.key);
                  setCurrentPage(1);
                  setError(null);
                }}
                initValue={getSelectedChapterLabel()}
                style={styles.modalSelector}
                selectStyle={styles.selectStyle}
                selectTextStyle={styles.selectTextStyle}
                initValueTextStyle={styles.selectTextStyle}
                optionStyle={styles.optionStyle}
                optionTextStyle={styles.optionTextStyle}
                cancelStyle={styles.cancelStyle}
                cancelTextStyle={styles.cancelTextStyle}
                backdropPressToClose={true}
              />
            )}
          </>
        )}

        {/* Liste hadiths */}
        {loadingHadiths ? (
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
        )}

        {error && <Text style={{ color: "red", marginTop: 10 }}>{error}</Text>}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20, flex: 1, padding: 34 },
  modalSelector: {
    marginTop: 30,
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
  selectTextStyle: {
    fontSize: 18,
    color: "#fff",
    fontFamily: "ScheherazadeNew",
    textAlign: "left",
  },
  initValueTextStyle: {
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
    textAlign: "center",
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
