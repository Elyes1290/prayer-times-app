import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList } from "react-native";
import { useTranslation } from "react-i18next";
import QuranOfflineService from "../utils/QuranOfflineService";
import {
  normalizeQuranText,
  stripHtml,
} from "../utils/quranTextUtils";
import {
  fetchQuranTranslation,
  resolveQuranApiLang,
} from "../utils/quranTranslationApi";

type UseQuranSurahDataOptions = {
  isPremium: boolean;
  isConnected: boolean;
};

export function useQuranSurahData({
  isPremium,
  isConnected,
}: UseQuranSurahDataOptions) {
  const { t, i18n } = useTranslation();

  const [searchQuery, setSearchQuery] = useState("");
  const [sourates, setSourates] = useState<any[]>([]);
  const [selectedSourate, setSelectedSourate] = useState(1);
  const [arabicVerses, setArabicVerses] = useState<any[]>([]);
  const [phoneticArr, setPhoneticArr] = useState<any[]>([]);
  const [translationArr, setTranslationArr] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offlineSurahs, setOfflineSurahs] = useState<any[]>([]);
  const [loadingOfflineData, setLoadingOfflineData] = useState(false);

  const versesFlatListRef = useRef<FlatList>(null);
  const surahDataRequestIdRef = useRef(0);

  const lang = resolveQuranApiLang(i18n.language);

  const loadOfflineQuranData = useCallback(async () => {
    setLoadingOfflineData(true);
    try {
      const index = await QuranOfflineService.getQuranIndex();
      if (index) {
        setOfflineSurahs(index.surahs);
        console.log(
          `✅ [QuranOffline] ${index.surahs.length} sourates chargées`,
        );
      }
    } catch (error) {
      console.error("❌ [QuranOffline] Erreur chargement données:", error);
    } finally {
      setLoadingOfflineData(false);
    }
  }, []);

  const loadOfflineSurah = useCallback(
    async (surahNumber: number, requestId: number): Promise<boolean> => {
      try {
        console.log(
          `🔍 [QuranOffline] Tentative de chargement sourate ${surahNumber}...`,
        );
        const surahData = await QuranOfflineService.getSurah(surahNumber);
        if (surahData) {
          const arabic = surahData.verses.map((verse) => ({
            id: verse.verse_number,
            verse_number: verse.verse_number,
            verse_key: verse.verse_key,
            text_uthmani: verse.arabic_text,
          }));

          const phonetic = surahData.verses.map((verse) => ({
            id: verse.verse_number,
            verse_number: verse.verse_number,
            verse_key: verse.verse_key,
            text: verse.phonetic_text,
          }));

          const translation = surahData.verses.map((verse) => ({
            id: verse.verse_number,
            verse_number: verse.verse_number,
            verse_key: verse.verse_key,
            text:
              verse.translations[lang] ||
              verse.translations["en"] ||
              verse.translations["ar"] ||
              "",
          }));

          if (requestId !== surahDataRequestIdRef.current) {
            return false;
          }

          setArabicVerses(arabic);
          setPhoneticArr(phonetic);
          setTranslationArr(translation);
          console.log(`✅ [QuranOffline] Sourate ${surahNumber} chargée offline`);
          return true;
        }
        return false;
      } catch (error) {
        console.error(
          `❌ [QuranOffline] Erreur chargement sourate ${surahNumber}:`,
          error,
        );
        return false;
      }
    },
    [lang],
  );

  useEffect(() => {
    fetch(`https://api.quran.com/api/v4/chapters?language=${lang}`)
      .then((res) => res.json())
      .then((json) => setSourates(json.chapters))
      .catch(() => setSourates([]));
  }, [lang]);

  useEffect(() => {
    const requestId = ++surahDataRequestIdRef.current;
    const surahToLoad = selectedSourate;

    const isStale = () =>
      requestId !== surahDataRequestIdRef.current ||
      surahToLoad !== selectedSourate;

    async function fetchQuranData() {
      setLoading(true);

      if (isPremium) {
        const success = await loadOfflineSurah(surahToLoad, requestId);
        if (isStale()) return;
        if (success) {
          setLoading(false);
          return;
        }

        setArabicVerses([]);
        setPhoneticArr([]);
        setTranslationArr([]);
        setLoading(false);
        return;
      }

      if (!isConnected) {
        if (isStale()) return;
        setArabicVerses([]);
        setPhoneticArr([]);
        setTranslationArr([]);
        setLoading(false);
        return;
      }

      try {
        const [arabicRes, phoneticRes] = await Promise.all([
          fetch(
            `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahToLoad}`,
          ),
          fetch(
            `https://api.quran.com/api/v4/quran/translations/57?chapter_number=${surahToLoad}`,
          ),
        ]);

        if (isStale()) return;

        const arabicJson = await arabicRes.json();
        const phoneticJson = await phoneticRes.json();

        let translations: any[] = [];
        if (lang !== "ar") {
          translations = await fetchQuranTranslation(surahToLoad, lang);
          if (isStale()) return;
        }

        setArabicVerses(arabicJson.verses || []);
        setPhoneticArr(phoneticJson.translations || []);
        setTranslationArr(translations);
      } catch {
        if (isStale()) return;
        if (isPremium) {
          await loadOfflineSurah(surahToLoad, requestId);
        } else {
          setArabicVerses([]);
          setPhoneticArr([]);
          setTranslationArr([]);
        }
      }

      if (!isStale()) {
        setLoading(false);
      }
    }

    void fetchQuranData();
  }, [selectedSourate, lang, isPremium, isConnected, loadOfflineSurah]);

  useEffect(() => {
    if (isPremium) {
      void loadOfflineQuranData();
    }
  }, [isPremium, loadOfflineQuranData]);

  useEffect(() => {
    setSearchQuery("");
    requestAnimationFrame(() => {
      versesFlatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [selectedSourate]);

  const filteredVerses = useMemo(() => {
    if (!searchQuery.trim()) {
      return arabicVerses;
    }

    const normalizedSearch = normalizeQuranText(searchQuery);
    return arabicVerses.filter((verse, index) => {
      const phonetic = phoneticArr[index]?.text || "";
      const translation = translationArr[index]?.text || "";
      const normalizedArabic = normalizeQuranText(verse.text_uthmani || "");
      const normalizedPhonetic = normalizeQuranText(phonetic);
      const normalizedTranslation = normalizeQuranText(stripHtml(translation));
      const normalizedVerseKey = normalizeQuranText(verse.verse_key);

      return (
        normalizedArabic.includes(normalizedSearch) ||
        normalizedPhonetic.includes(normalizedSearch) ||
        normalizedTranslation.includes(normalizedSearch) ||
        normalizedVerseKey.includes(normalizedSearch)
      );
    });
  }, [searchQuery, arabicVerses, phoneticArr, translationArr]);

  const selectedSourateLabel = useMemo(() => {
    const current = sourates.find((s) => s.id === selectedSourate);
    return current
      ? `${current.id}. ${current.name_simple} (${current.name_arabic})`
      : t("choose_sourate");
  }, [sourates, selectedSourate, t]);

  const selectedChapterName = useMemo(() => {
    const current = sourates.find((s) => s.id === selectedSourate);
    return current ? current.name_simple : "Sourate inconnue";
  }, [sourates, selectedSourate]);

  const modalSourateData = useMemo(
    () =>
      sourates.map((s) => ({
        key: s.id,
        label: `${s.id}. ${s.name_simple} (${s.name_arabic})`,
      })),
    [sourates],
  );

  return {
    lang,
    searchQuery,
    setSearchQuery,
    sourates,
    selectedSourate,
    setSelectedSourate,
    arabicVerses,
    phoneticArr,
    translationArr,
    loading,
    offlineSurahs,
    loadingOfflineData,
    loadOfflineQuranData,
    loadOfflineSurah,
    filteredVerses,
    selectedSourateLabel,
    selectedChapterName,
    modalSourateData,
    versesFlatListRef,
    surahDataRequestIdRef,
  };
}
