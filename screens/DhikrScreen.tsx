import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FlatList,
  Text,
  View,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  Platform,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import ThemedImageBackground from "../components/ThemedImageBackground";
import { useLocalSearchParams } from "expo-router";
import FavoriteButton from "../components/FavoriteButton";
import { DhikrFavorite } from "../contexts/FavoritesContext";
import { useUpdateUserStats } from "../hooks/useUpdateUserStats";
import { usePremium } from "../contexts/PremiumContext";

const CATEGORIES = [
  { key: "dailyDua", namespace: "dhikr" },
  { key: "morningDhikr", namespace: "dhikrMorning" },
  { key: "eveningDhikr", namespace: "eveningDhikr" },
  { key: "afterSalah", namespace: "afterSalah" },
  { key: "selectedDua", namespace: "selectedDua" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

function useDhikrData(namespace: string) {
  const { i18n } = useTranslation(namespace);
  const raw = (i18n.getResource(i18n.language, namespace, "") as any[]) || [];
  const hasMeta = raw.length > 0 && raw[0][namespace];
  const meta = hasMeta ? raw[0][namespace] : {};
  const duas = hasMeta ? raw.slice(1) : raw;
  return { meta, duas };
}

export default function DhikrScreen() {
  const params = useLocalSearchParams();

  // Fonction pour convertir un dhikr en format favori
  const convertToFavorite = (
    item: any,
    category: CategoryKey
  ): Omit<DhikrFavorite, "id" | "dateAdded"> => {
    return {
      type: "dhikr",
      category: category,
      arabicText: item.arabic || "",
      translation: item.translation || "",
      transliteration: item.latin || "",
      source: item.source || "",
      benefits: item.benefits || item.fawaid || "",
    };
  };

  const dhikrIndexParam = params.dhikrIndex
    ? parseInt(params.dhikrIndex as string, 10)
    : null;
  const categoryParam = params.category as CategoryKey | undefined;

  const [selectedKey, setSelectedKey] = useState<CategoryKey>(
    categoryParam && CATEGORIES.some((c) => c.key === categoryParam)
      ? categoryParam
      : CATEGORIES[0].key
  );
  const [search, setSearch] = useState("");

  const flatListRef = useRef<FlatList>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  const selectedCat = CATEGORIES.find((c) => c.key === selectedKey)!;
  const namespace = selectedCat.namespace;

  const { t, i18n } = useTranslation("");
  const { meta, duas } = useDhikrData(namespace);

  const CATEGORY_LABELS: Record<CategoryKey, string> = {
    dailyDua: t("dhikr.categories.dailyDua"),
    morningDhikr: t("dhikr.categories.morning"),
    eveningDhikr: t("dhikr.categories.evening"),
    afterSalah: t("dhikr.categories.afterSalah"),
    selectedDua: t("dhikr.categories.selectedDua"),
  };

  const title = t("dhikr.title");
  const noDhikr = meta.no_dhikr || "No dhikr found for this category.";

  const filteredDuas = duas.filter((item) => {
    const lowerSearch = search.trim().toLowerCase();
    if (!lowerSearch) return true;
    return (
      (item.arabic?.toLowerCase().includes(lowerSearch) ?? false) ||
      (item.latin?.toLowerCase().includes(lowerSearch) ?? false) ||
      (item.translation?.toLowerCase().includes(lowerSearch) ?? false)
    );
  });

  // Scroll quand la FlatList est prête ET si on n'a pas déjà scrollé
  useEffect(() => {
    if (
      dhikrIndexParam !== null &&
      flatListRef.current &&
      filteredDuas.length > 0 &&
      !hasScrolled
    ) {
      const indexToScroll =
        dhikrIndexParam < filteredDuas.length
          ? dhikrIndexParam
          : filteredDuas.length - 1;

      try {
        flatListRef.current.scrollToIndex({
          index: indexToScroll,
          animated: true,
        });
        setHasScrolled(true); // empêche de re-scroller sans cesse
      } catch (error) {
        // En cas d'erreur, scroll vers index 0
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    }
  }, [dhikrIndexParam, selectedKey, filteredDuas, hasScrolled]);

  useEffect(() => {
    if (
      categoryParam &&
      categoryParam !== selectedKey &&
      CATEGORIES.some((c) => c.key === categoryParam)
    ) {
      setSelectedKey(categoryParam);
      setSearch("");
      setHasScrolled(false); // reset scroll à chaque changement de catégorie
    }
  }, [categoryParam]);

  // Gestion du scrollToIndex fallback si l'index est hors écran
  const onScrollToIndexFailed = (info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) => {
    const wait = new Promise<void>((resolve) => setTimeout(resolve, 100));
    wait.then(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({
          offset: info.averageItemLength * info.index,
          animated: true,
        });
      }
    });
  };

  const { recordDhikr } = useUpdateUserStats();
  const { user } = usePremium();

  // Composant mémorisé pour les éléments dhikr
  const DhikrItem = React.memo(
    ({ item, selectedKey }: { item: any; selectedKey: CategoryKey }) => {
      const handleDhikrCompleted = async () => {
        if (!user.isPremium) {
          Alert.alert(
            "🔒 Fonctionnalité Premium",
            "Cette fonctionnalité est disponible uniquement pour les utilisateurs premium.",
            [
              { text: "Annuler", style: "cancel" },
              {
                text: "Passer au Premium",
                style: "default",
                onPress: () => {
                  // TODO: Ouvrir l'écran premium
                },
              },
            ]
          );
          return;
        }

        try {
          await recordDhikr(1, selectedKey);
          Alert.alert(
            "✅ Dhikr enregistré",
            "Ce dhikr a été ajouté à vos statistiques personnelles.",
            [{ text: "OK" }]
          );
        } catch (error) {
          console.error("Erreur enregistrement dhikr:", error);
          Alert.alert(
            "❌ Erreur",
            "Impossible d'enregistrer le dhikr dans les statistiques."
          );
        }
      };

      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.arabic}>{item.arabic}</Text>
            <View style={styles.cardActions}>
              <FavoriteButton
                favoriteData={convertToFavorite(item, selectedKey)}
                size={22}
                iconColor="#e4c678"
                iconColorActive="#FFD700"
                style={styles.favoriteButton}
              />
              <TouchableOpacity
                style={styles.dhikrButton}
                onPress={handleDhikrCompleted}
                testID="dhikr-completed-button"
              >
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={user.isPremium ? "#4ECDC4" : "#95A5A6"}
                />
              </TouchableOpacity>
            </View>
          </View>
          {!i18n.language.startsWith("ar") && item.latin && (
            <Text style={styles.translit}>{item.latin}</Text>
          )}
          {!i18n.language.startsWith("ar") && (
            <Text style={styles.translation}>{item.translation}</Text>
          )}
          {item.source && <Text style={styles.reference}>{item.source}</Text>}
          {!i18n.language.startsWith("ar") &&
            (item.benefits || item.fawaid) && (
              <Text style={styles.benefit}>{item.benefits ?? item.fawaid}</Text>
            )}
        </View>
      );
    }
  );

  DhikrItem.displayName = "DhikrItem";

  // Fonction renderItem optimisée
  const renderDhikrItem = useCallback(
    ({ item }: { item: any }) => (
      <DhikrItem item={item} selectedKey={selectedKey} />
    ),
    [selectedKey]
  );

  return (
    <ThemedImageBackground style={styles.background}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerWrap}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={selectedKey}
              style={styles.picker}
              onValueChange={(val) => {
                setSelectedKey(val as CategoryKey);
                setSearch("");
                setHasScrolled(false);
              }}
              mode={Platform.OS === "ios" ? "dialog" : "dropdown"}
              dropdownIconColor="#e4c678"
            >
              {CATEGORIES.map((cat) => (
                <Picker.Item
                  key={cat.key}
                  label={CATEGORY_LABELS[cat.key]}
                  value={cat.key}
                  color="#e4c678"
                />
              ))}
            </Picker>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder={t("dhikr.search_placeholder") || "Rechercher..."}
            placeholderTextColor="#e4c678"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>

        <FlatList
          ref={flatListRef}
          data={filteredDuas}
          keyExtractor={(_, idx) => idx.toString()}
          renderItem={renderDhikrItem}
          ListEmptyComponent={<Text style={styles.emptyText}>{noDhikr}</Text>}
          contentContainerStyle={{ paddingBottom: 150 }}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={100}
          getItemLayout={(data, index) => ({
            length: 150, // hauteur estimée d'une carte dhikr
            offset: 150 * index,
            index,
          })}
          onScrollToIndexFailed={onScrollToIndexFailed}
        />
      </SafeAreaView>
    </ThemedImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: "cover" },
  headerWrap: {
    paddingTop: 25,
    paddingBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(20,20,28,0.6)",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    marginBottom: 5,
  },
  title: {
    color: "#e4c678",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 15,
    textShadowColor: "rgba(0,0,0,0.18)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  pickerWrap: {
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 25,
    backgroundColor: "rgba(36, 36, 40, 0.6)",
    marginBottom: 10,
  },
  picker: {
    color: "#e4c678",
    width: "100%",
    fontWeight: "700",
  },
  searchInput: {
    marginHorizontal: 25,
    backgroundColor: "rgba(36, 36, 40, 0.6)",
    borderRadius: 12,
    color: "#e4c678",
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "rgba(36, 36, 40, 0.69)",
    marginBottom: 16,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 15,
    shadowColor: "#000",
    shadowOpacity: 0.11,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  arabic: {
    fontSize: 26,
    color: "#e4c678",
    fontWeight: "700",
    textAlign: "right",
    lineHeight: 34,
    flex: 1,
    marginRight: 8,
  },
  translit: {
    color: "#B5C9F0",
    fontSize: 16,
    marginBottom: 5,
    fontStyle: "italic",
    textAlign: "left",
  },
  translation: {
    color: "#fffbe8",
    fontSize: 15,
    marginBottom: 8,
    textAlign: "left",
    lineHeight: 21,
  },
  reference: {
    color: "#a2c8f0",
    fontSize: 13,
    textAlign: "right",
    marginTop: 10,
    fontStyle: "italic",
  },
  benefit: {
    color: "#cce6ff",
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 5,
    marginBottom: 3,
  },
  emptyText: {
    color: "#fffbe8",
    textAlign: "center",
    marginTop: 40,
  },
  favoriteButton: {
    padding: 2,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dhikrButton: {
    padding: 2,
    marginTop: 2,
  },
});
