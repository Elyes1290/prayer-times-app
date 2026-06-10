import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
} from "react-native";
import Animated, {
  interpolate,
  makeMutable,
  runOnJS,
  useAnimatedStyle,
  type SharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "@/components/ui/LinearGradientView";
import { IonIcon } from "@/components/icons/AppVectorIcons";
import ThemedImageBackground from "../components/ThemedImageBackground";
import FavoriteButton from "../components/FavoriteButton";
import { AsmaulHusnaFavorite } from "../contexts/FavoritesContext";

interface Nom {
  key: string;
  number: number;
  arabic: string;
  translit: string;
  french: string;
  meaning: string;
  occurrences?: string;
  benefits?: string;
  usage?: string;
  hadith?: string;
  details?: string;
  reference?: string;
  spiritual_effect?: string;
  citation?: string;
}


function normalizeText(str: string) {
  return str
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

const expandAnimationsRef = { current: new Map<string, SharedValue<number>>() };

const getExpandAnimation = (id: string): SharedValue<number> => {
  let animation = expandAnimationsRef.current.get(id);
  if (!animation) {
    animation = makeMutable(0);
    expandAnimationsRef.current.set(id, animation);
  }
  return animation;
};

function convertToFavorite(
  cardItem: Nom
): Omit<AsmaulHusnaFavorite, "id" | "dateAdded"> {
  return {
    type: "asmaul_husna",
    number: cardItem.number,
    arabicName: cardItem.arabic,
    transliteration: cardItem.translit,
    meaning: cardItem.meaning,
    benefits: cardItem.benefits,
    usage: cardItem.usage,
  };
}

const NameCard = ({
  item,
  isExpanded,
  onToggle,
  tAsma,
  i18n,
}: {
  item: Nom;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  tAsma: (key: string) => string;
  i18n: { language: string };
}) => {
  const expandProgress = getExpandAnimation(item.key);
  const animatedDetailsStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(expandProgress.value, [0, 1], [0, 1200]),
    overflow: "hidden" as const,
  }));

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
        style={styles.cardGradient}
      >
        <Pressable
          style={styles.cardHeader}
          onPress={() => onToggle(item.key)}
        >
          <View style={styles.cardTopRow}>
            <View style={styles.numberContainer}>
              <Text style={styles.number}>{item.number}</Text>
            </View>

            <View style={styles.cardActions}>
              <FavoriteButton
                favoriteData={convertToFavorite(item)}
                size={22}
                iconColor="rgba(255, 255, 255, 0.7)"
                iconColorActive="#FFD700"
                style={styles.favoriteButton}
              />
              <IonIcon
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={24}
                color="#fff"
                style={styles.expandIcon}
              />
            </View>
          </View>
          <View style={styles.arabicNameContainer}>
            <Text style={styles.arabic}>{item.arabic}</Text>
          </View>
          {!i18n.language.startsWith("ar") && (
            <View style={styles.nameDetailsContainer}>
              <Text style={styles.translit}>{item.translit}</Text>
              <Text style={styles.french}>{item.french}</Text>
            </View>
          )}
        </Pressable>

        <Animated.View style={[styles.cardDetails, animatedDetailsStyle]}>
          <View style={styles.contentContainer}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {tAsma("sections.meaning")}
              </Text>
              <Text style={styles.sectionText}>{item.meaning}</Text>
            </View>
            {item.occurrences && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {tAsma("sections.occurrences")}
                </Text>
                <Text style={styles.sectionText}>{item.occurrences}</Text>
              </View>
            )}
            {item.benefits && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {tAsma("sections.benefits")}
                </Text>
                <Text style={styles.sectionText}>{item.benefits}</Text>
              </View>
            )}
            {item.usage && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {tAsma("sections.usage")}
                </Text>
                <Text style={styles.sectionText}>{item.usage}</Text>
              </View>
            )}
            {item.hadith && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {tAsma("sections.hadith")}
                </Text>
                <Text style={styles.sectionText}>{item.hadith}</Text>
              </View>
            )}
            {item.details && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {tAsma("sections.details")}
                </Text>
                <Text style={styles.sectionText}>{item.details}</Text>
              </View>
            )}
            {item.reference && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {tAsma("sections.reference")}
                </Text>
                <Text style={styles.sectionText}>{item.reference}</Text>
              </View>
            )}
            {item.spiritual_effect && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {tAsma("sections.spiritual_effect")}
                </Text>
                <Text style={styles.sectionText}>{item.spiritual_effect}</Text>
              </View>
            )}
            {item.citation && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {tAsma("sections.citation")}
                </Text>
                <Text style={styles.sectionText}>{item.citation}</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const AsmaulHusnaScreen = () => {
  const { t: tAsma, i18n } = useTranslation("asmaulhusna");
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expandedIdRef = useRef<string | null>(null);

  const filteredNames = Array.from({ length: 99 }, (_, i) => {
    const num = i + 1;
    return {
      key: `name_${num}`,
      number: num,
      arabic: tAsma(`name_${num}.arabic`),
      translit: tAsma(`name_${num}.translit`),
      french: tAsma(`name_${num}.french`),
      meaning: tAsma(`name_${num}.meaning`),
      occurrences: tAsma(`name_${num}.occurrences`),
      benefits: tAsma(`name_${num}.benefits`),
      usage: tAsma(`name_${num}.usage`),
      hadith: tAsma(`name_${num}.hadith`),
      details: tAsma(`name_${num}.details`),
      reference: tAsma(`name_${num}.reference`),
      spiritual_effect: tAsma(`name_${num}.spiritual_effect`),
      citation: tAsma(`name_${num}.citation`),
    };
  }).filter((item) => {
    const normalizedSearch = normalizeText(searchQuery);
    return (
      normalizeText(item.arabic).includes(normalizedSearch) ||
      normalizeText(item.translit).includes(normalizedSearch) ||
      normalizeText(item.french).includes(normalizedSearch) ||
      normalizeText(item.meaning).includes(normalizedSearch)
    );
  });

  const clearExpandedId = useCallback(() => {
    expandedIdRef.current = null;
    setExpandedId(null);
  }, []);

  const toggleExpand = useCallback(
    (id: string) => {
      const animation = getExpandAnimation(id);

      if (expandedIdRef.current === id) {
        animation.value = withTiming(0, { duration: 200 }, (finished) => {
          if (finished) {
            runOnJS(clearExpandedId)();
          }
        });
      } else {
        if (expandedIdRef.current) {
          getExpandAnimation(expandedIdRef.current).value = withTiming(0, {
            duration: 200,
          });
        }
        expandedIdRef.current = id;
        setExpandedId(id);
        animation.value = withTiming(1, { duration: 300 });
      }
    },
    [clearExpandedId]
  );

  const renderNameCard = useCallback(
    ({ item }: { item: Nom }) => (
      <NameCard
        item={item}
        isExpanded={expandedId === item.key}
        onToggle={toggleExpand}
        tAsma={tAsma}
        i18n={i18n}
      />
    ),
    [expandedId, toggleExpand, tAsma, i18n]
  );

  return (
    <ThemedImageBackground
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.overlay} />
      <View style={styles.header}>
        <Text style={styles.title}>{tAsma("title")}</Text>
        <Text style={styles.subtitle}>{tAsma("subtitle")}</Text>
      </View>

      <View style={styles.searchContainer}>
        <IonIcon
          name="search"
          size={20}
          color="#666"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={tAsma("search_placeholder")}
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredNames}
        renderItem={renderNameCard}
        keyExtractor={(item) => item.key}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 150 }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={8}
        removeClippedSubviews={false}
        updateCellsBatchingPeriod={150}
      />
    </ThemedImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
    marginBottom: 20,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: "#fff",
    fontSize: 16,
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  card: {
    marginBottom: 15,
    borderRadius: 16,
    overflow: "hidden",
  },
  cardGradient: {
    borderRadius: 16,
  },
  cardHeader: {
    padding: 15,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  numberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  number: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  favoriteButton: {
    marginRight: 8,
  },
  expandIcon: {
    marginLeft: 10,
  },
  arabicNameContainer: {
    alignItems: "center",
    marginBottom: 15,
  },
  arabic: {
    fontSize: 40,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  nameDetailsContainer: {
    alignItems: "center",
  },
  translit: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 4,
    textAlign: "center",
  },
  french: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  cardDetails: {
    overflow: "hidden",
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  contentContainer: {
    paddingHorizontal: 0,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
  },
});

export default AsmaulHusnaScreen;
